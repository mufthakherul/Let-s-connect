#!/usr/bin/env bash

# Release health gate for canary/full rollout.
# Usage:
#   ./scripts/release-health-check.sh
# Optional env:
#   API_GATEWAY_URL=http://localhost:8000
#   PROMETHEUS_URL=http://localhost:9090
#   TIMEOUT=5

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

API_GATEWAY_URL="${API_GATEWAY_URL:-http://localhost:8000}"
PROMETHEUS_URL="${PROMETHEUS_URL:-http://localhost:9090}"
TIMEOUT="${TIMEOUT:-5}"

PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

pass() {
  echo -e "${GREEN}✓${NC} $1"
  PASS_COUNT=$((PASS_COUNT + 1))
}

fail() {
  echo -e "${RED}✗${NC} $1"
  FAIL_COUNT=$((FAIL_COUNT + 1))
}

warn() {
  echo -e "${YELLOW}⚠${NC} $1"
  WARN_COUNT=$((WARN_COUNT + 1))
}

check_http() {
  local name="$1"
  local url="$2"
  local expected="${3:-200}"

  local code
  code=$(curl -sS -o /tmp/release_check_body.txt -w "%{http_code}" --connect-timeout "$TIMEOUT" --max-time "$TIMEOUT" "$url" || echo "000")

  if [[ "$code" == "$expected" ]]; then
    pass "$name (HTTP $code)"
  else
    fail "$name expected HTTP $expected, got $code"
  fi
}

get_prom_query_value() {
  local query="$1"
  local url="${PROMETHEUS_URL}/api/v1/query?query=${query}"

  local payload
  payload=$(curl -sS --connect-timeout "$TIMEOUT" --max-time "$TIMEOUT" "$url" || true)

  if [[ -z "$payload" ]]; then
    echo "NaN"
    return
  fi

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
    else:
        value = result[0].get("value", [None, "0"])[1]
        print(value)
except Exception:
    print("NaN")
PY
}

echo -e "${BLUE}===========================================${NC}"
echo -e "${BLUE}Release Health & Canary Safety Check${NC}"
echo -e "${BLUE}===========================================${NC}"
echo "Gateway: ${API_GATEWAY_URL}"
echo "Prometheus: ${PROMETHEUS_URL}"
echo

# Reuse existing broad health check if available.
if [[ -f "${ROOT_DIR}/scripts/verify-health-checks.sh" ]]; then
  echo -e "${BLUE}Running baseline health verification...${NC}"
  if API_GATEWAY_URL="$API_GATEWAY_URL" TIMEOUT="$TIMEOUT" "${ROOT_DIR}/scripts/verify-health-checks.sh" >/tmp/release_health_baseline.log 2>&1; then
    pass "Baseline service health verification"
  else
    fail "Baseline service health verification failed"
    echo -e "${YELLOW}--- Baseline health output (tail) ---${NC}"
    tail -n 20 /tmp/release_health_baseline.log || true
  fi
  echo
fi

echo -e "${BLUE}Gateway readiness checks...${NC}"
check_http "Gateway /health" "${API_GATEWAY_URL}/health" 200
check_http "Gateway /health/ready" "${API_GATEWAY_URL}/health/ready" 200
check_http "Gateway /health/circuits" "${API_GATEWAY_URL}/health/circuits" 200
echo

echo -e "${BLUE}Prometheus readiness checks...${NC}"
if curl -sS --connect-timeout "$TIMEOUT" --max-time "$TIMEOUT" "${PROMETHEUS_URL}/-/ready" >/dev/null 2>&1; then
  pass "Prometheus /-/ready"
else
  warn "Prometheus not reachable at ${PROMETHEUS_URL}; skipping alert posture checks"
fi

echo
if [[ "$WARN_COUNT" -eq 0 ]] || curl -sS --connect-timeout "$TIMEOUT" --max-time "$TIMEOUT" "${PROMETHEUS_URL}/-/ready" >/dev/null 2>&1; then
  echo -e "${BLUE}Alert posture checks...${NC}"

  critical_firing=$(get_prom_query_value "sum(ALERTS%7Balertstate%3D%22firing%22%2Cseverity%3D%22critical%22%7D)")
  if [[ "$critical_firing" == "NaN" ]]; then
    warn "Unable to evaluate critical firing alerts"
  else
    critical_int=$(printf "%.0f" "$critical_firing" 2>/dev/null || echo "-1")
    if [[ "$critical_int" -gt 0 ]]; then
      fail "Critical alerts firing: ${critical_firing}"
    else
      pass "No critical alerts firing"
    fi
  fi

  fast_burn=$(get_prom_query_value "sum(ALERTS%7Balertname%3D%22ErrorBudgetBurnFast%22%2Calertstate%3D%22firing%22%7D)")
  if [[ "$fast_burn" == "NaN" ]]; then
    warn "Unable to evaluate fast-burn error budget alert"
  else
    fast_burn_int=$(printf "%.0f" "$fast_burn" 2>/dev/null || echo "-1")
    if [[ "$fast_burn_int" -gt 0 ]]; then
      fail "Fast error-budget burn alert is firing"
    else
      pass "Fast error-budget burn alert not firing"
    fi
  fi
fi

echo
echo -e "${BLUE}===========================================${NC}"
echo -e "Passed: ${GREEN}${PASS_COUNT}${NC}"
echo -e "Failed: ${RED}${FAIL_COUNT}${NC}"
echo -e "Warnings: ${YELLOW}${WARN_COUNT}${NC}"
echo -e "${BLUE}===========================================${NC}"

if [[ "$FAIL_COUNT" -gt 0 ]]; then
  echo -e "${RED}Release health gate FAILED. Do not continue canary progression.${NC}"
  exit 1
fi

echo -e "${GREEN}Release health gate PASSED. Safe to proceed with canary progression.${NC}"
exit 0
