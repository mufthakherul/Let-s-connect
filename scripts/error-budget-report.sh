#!/usr/bin/env bash
# error-budget-report.sh — Generate SLO / error-budget report from Prometheus
#
# Usage:
#   ./scripts/error-budget-report.sh
#   ./scripts/error-budget-report.sh --window 7d --prometheus-url http://localhost:9090
#   ./scripts/error-budget-report.sh --fail-on-breach
#
# Output:
#   Markdown report in docs/development/operations/reports/
#
# Exit codes:
#   0  = report generated and all classes within budget (or fail-on disabled)
#   1  = report generated but at least one service class exceeded budget with --fail-on-breach
#   2  = usage or dependency errors

set -euo pipefail

PROMETHEUS_URL="${PROMETHEUS_URL:-http://localhost:9090}"
WINDOW="${WINDOW:-30d}"
FAIL_ON_BREACH=false

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPORT_DIR="${ROOT_DIR}/docs/development/operations/reports"
mkdir -p "${REPORT_DIR}"

TS_UTC="$(date -u +%Y-%m-%dT%H-%M-%SZ)"
REPORT_FILE="${REPORT_DIR}/error-budget-report-${TS_UTC}.md"

# Service class definitions aligned with docs/development/operations/ERROR_BUDGET_POLICY.md
# Tier1 = 99.9% (critical paths)
# Tier2 = 99.5% (important, non-core)
# Tier3 = 99.0% (best effort)
declare -A CLASS_SLO=(
  [Tier1]=0.999
  [Tier2]=0.995
  [Tier3]=0.990
)

declare -A CLASS_SERVICES=(
  [Tier1]="api-gateway|user-service|content-service|messaging-service"
  [Tier2]="collaboration-service|media-service|shop-service|security-service|ai-service"
  [Tier3]="streaming-service|admin-frontend|frontend"
)

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RESET='\033[0m'

usage() {
  cat <<EOF
Usage: $(basename "$0") [options]

Options:
  --window <duration>         Prometheus range window (default: 30d)
  --prometheus-url <url>      Prometheus base URL (default: http://localhost:9090)
  --fail-on-breach            Exit non-zero if any class consumes >100% budget
  --help, -h                  Show help

Examples:
  $(basename "$0")
  $(basename "$0") --window 7d
  $(basename "$0") --prometheus-url http://prometheus:9090 --fail-on-breach
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --window)          WINDOW="$2"; shift 2 ;;
    --prometheus-url)  PROMETHEUS_URL="$2"; shift 2 ;;
    --fail-on-breach)  FAIL_ON_BREACH=true; shift ;;
    --help|-h)         usage; exit 0 ;;
    *)
      echo "Unknown option: $1"
      usage
      exit 2
      ;;
  esac
done

if ! command -v curl &>/dev/null; then
  echo "curl is required."
  exit 2
fi

if ! command -v python3 &>/dev/null; then
  echo "python3 is required."
  exit 2
fi

encode_query() {
  python3 - "$1" <<'PY'
import sys
import urllib.parse
print(urllib.parse.quote(sys.argv[1], safe=''))
PY
}

prom_query() {
  local query="$1"
  local encoded
  encoded="$(encode_query "$query")"

  local payload
  payload="$(curl -s --max-time 10 "${PROMETHEUS_URL}/api/v1/query?query=${encoded}" || true)"

  python3 - "$payload" <<'PY'
import json
import math
import sys

payload = sys.argv[1]
try:
    data = json.loads(payload)
    if data.get("status") != "success":
        print("NaN")
        raise SystemExit(0)

    result = data.get("data", {}).get("result", [])
    if not result:
        print("0")
        raise SystemExit(0)

    value = result[0].get("value", [None, "0"])[1]
    print(value)
except Exception:
    print("NaN")
PY
}

calc_budget() {
  local total="$1"
  local errors="$2"
  local slo="$3"

  python3 - "$total" "$errors" "$slo" <<'PY'
import math
import sys

def to_float(value, default=0.0):
    try:
        if value in ("NaN", "nan", ""):
            return default
        return float(value)
    except Exception:
        return default

total = to_float(sys.argv[1], 0.0)
errors = to_float(sys.argv[2], 0.0)
slo = to_float(sys.argv[3], 0.999)
window_minutes = 30 * 24 * 60

if total <= 0:
    error_ratio = 0.0
else:
    error_ratio = max(0.0, min(1.0, errors / total))

availability = 1.0 - error_ratio
budget_minutes = (1.0 - slo) * window_minutes
consumed_minutes = error_ratio * window_minutes
consumed_percent = (consumed_minutes / budget_minutes * 100.0) if budget_minutes > 0 else 0.0
burn_rate = (error_ratio / (1.0 - slo)) if (1.0 - slo) > 0 else 0.0

print(f"{availability:.6f}|{error_ratio:.6f}|{burn_rate:.2f}|{budget_minutes:.1f}|{consumed_minutes:.1f}|{consumed_percent:.1f}")
PY
}

safe_percent() {
  local value="$1"
  python3 - "$value" <<'PY'
import sys
try:
    v = float(sys.argv[1])
    print(f"{v:.1f}")
except Exception:
    print("0.0")
PY
}

status_for_budget() {
  local percent="$1"
  python3 - "$percent" <<'PY'
import sys
p = float(sys.argv[1])
if p < 50:
    print("GREEN")
elif p < 100:
    print("YELLOW")
else:
    print("RED")
PY
}

human_percent() {
  local val="$1"
  python3 - "$val" <<'PY'
import sys
print(f"{float(sys.argv[1]) * 100:.3f}%")
PY
}

echo -e "${CYAN}[INFO]${RESET} Generating error-budget report"
echo "       Prometheus: ${PROMETHEUS_URL}"
echo "       Window: ${WINDOW}"
echo ""

# Check Prometheus reachability
if ! curl -sS --max-time 5 "${PROMETHEUS_URL}/-/ready" >/dev/null 2>&1; then
  echo -e "${YELLOW}[WARN]${RESET} Prometheus not ready at ${PROMETHEUS_URL}; report will include zero/NaN values"
fi

BREACH_COUNT=0

{
  echo "# Error Budget Report"
  echo ""
  echo "- **Generated (UTC):** ${TS_UTC}"
  echo "- **Prometheus URL:** ${PROMETHEUS_URL}"
  echo "- **Query Window:** ${WINDOW}"
  echo "- **Policy Reference:** docs/development/operations/ERROR_BUDGET_POLICY.md"
  echo ""
  echo "## Summary by Service Class"
  echo ""
  echo "| Class | Services (job labels) | SLO | Availability | Error Ratio | Burn Rate | Budget (min) | Consumed (min) | Budget Used | Status | p95 Latency (s) | p99 Latency (s) |"
  echo "|---|---|---:|---:|---:|---:|---:|---:|---:|---|---:|---:|"

  for class in Tier1 Tier2 Tier3; do
    slo="${CLASS_SLO[$class]}"
    regex="${CLASS_SERVICES[$class]}"

    total_query="sum(increase(http_requests_total{job=~\"${regex}\"}[${WINDOW}]))"
    error_query="sum(increase(http_requests_total{job=~\"${regex}\",status=~\"5..\"}[${WINDOW}]))"

    p95_query="histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{job=~\"${regex}\"}[5m])) by (le))"
    p99_query="histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket{job=~\"${regex}\"}[5m])) by (le))"

    total="$(prom_query "$total_query")"
    errors="$(prom_query "$error_query")"
    p95="$(prom_query "$p95_query")"
    p99="$(prom_query "$p99_query")"

    calc="$(calc_budget "$total" "$errors" "$slo")"
    availability="${calc%%|*}"; rest="${calc#*|}"
    error_ratio="${rest%%|*}"; rest="${rest#*|}"
    burn_rate="${rest%%|*}"; rest="${rest#*|}"
    budget_minutes="${rest%%|*}"; rest="${rest#*|}"
    consumed_minutes="${rest%%|*}"; rest="${rest#*|}"
    consumed_percent="${rest%%|*}"

    status="$(status_for_budget "$consumed_percent")"

    if [[ "$status" == "RED" ]]; then
      BREACH_COUNT=$((BREACH_COUNT + 1))
    fi

    # Normalize latency output
    if [[ "$p95" == "NaN" || -z "$p95" ]]; then p95="0"; fi
    if [[ "$p99" == "NaN" || -z "$p99" ]]; then p99="0"; fi

    availability_pct="$(human_percent "$availability")"
    error_ratio_pct="$(human_percent "$error_ratio")"
    consumed_pct_fmt="$(safe_percent "$consumed_percent")%"

    echo "| ${class} | ${regex} | ${slo} | ${availability_pct} | ${error_ratio_pct} | ${burn_rate}x | ${budget_minutes} | ${consumed_minutes} | ${consumed_pct_fmt} | ${status} | ${p95} | ${p99} |"
  done

  echo ""
  echo "## Interpretation"
  echo ""
  echo "- **GREEN**: < 50% budget used — normal delivery pace."
  echo "- **YELLOW**: 50% to < 100% budget used — reliability review before risky changes."
  echo "- **RED**: >= 100% budget used — change freeze for non-critical features."
  echo ""
  echo "## Recommended Follow-ups"
  echo ""
  echo "1. Review Tier1 burn-rate trend and open incidents if burn > 2x sustained."
  echo "2. Cross-check latency alerts in deploy/monitoring/alerts/slo-alerts.yml."
  echo "3. Attach this report to weekly SRE/modernization update."
} > "${REPORT_FILE}"

echo -e "${GREEN}[OK]${RESET} Report written: ${REPORT_FILE}"

if [[ "$BREACH_COUNT" -gt 0 ]]; then
  echo -e "${YELLOW}[WARN]${RESET} ${BREACH_COUNT} class(es) exceeded error budget"
  if [[ "$FAIL_ON_BREACH" == "true" ]]; then
    echo -e "${RED}[FAIL]${RESET} Failing due to --fail-on-breach"
    exit 1
  fi
else
  echo -e "${GREEN}[OK]${RESET} No class exceeded error budget"
fi

exit 0
