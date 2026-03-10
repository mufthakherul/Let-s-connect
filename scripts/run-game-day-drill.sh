#!/usr/bin/env bash

# Operational drill executor (incident / rollback / security tabletop)
# Usage:
#   ./scripts/run-game-day-drill.sh [incident|rollback|security]
# Optional env:
#   API_GATEWAY_URL=http://localhost:8000
#   PROMETHEUS_URL=http://localhost:9090
#   DRILL_NOTES="optional notes"

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

DRILL_TYPE="${1:-incident}"
API_GATEWAY_URL="${API_GATEWAY_URL:-http://localhost:8000}"
PROMETHEUS_URL="${PROMETHEUS_URL:-http://localhost:9090}"
DRILL_NOTES="${DRILL_NOTES:-}"

case "$DRILL_TYPE" in
  incident|rollback|security) ;;
  *)
    echo -e "${RED}Invalid drill type: ${DRILL_TYPE}${NC}"
    echo "Usage: $0 [incident|rollback|security]"
    exit 1
    ;;
esac

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPORT_DIR="${ROOT_DIR}/docs/development/operations/reports"
mkdir -p "${REPORT_DIR}"

TS="$(date -u +%Y%m%d-%H%M%S)"
REPORT_FILE="${REPORT_DIR}/drill-${DRILL_TYPE}-${TS}.md"

START_UTC="$(date -u +"%Y-%m-%d %H:%M:%S UTC")"

print_step() {
  echo -e "${BLUE}==>${NC} $1"
}

status_text() {
  local code="$1"
  if [[ "$code" -eq 0 ]]; then
    echo "PASS"
  else
    echo "FAIL"
  fi
}

run_check() {
  local label="$1"
  shift

  set +e
  "$@" >/tmp/drill_cmd_output.log 2>&1
  local code=$?
  set -e

  echo "$code"
}

print_step "Starting ${DRILL_TYPE} drill"

echo "# Drill Report: ${DRILL_TYPE^}"
  > "${REPORT_FILE}"
cat >> "${REPORT_FILE}" <<EOF

- **Start Time (UTC):** ${START_UTC}
- **Type:** ${DRILL_TYPE}
- **API Gateway URL:** ${API_GATEWAY_URL}
- **Prometheus URL:** ${PROMETHEUS_URL}
- **Notes:** ${DRILL_NOTES:-N/A}

## Validation Checks

| Check | Result |
|---|---|
EOF

# Baseline health check
if [[ -f "${ROOT_DIR}/scripts/verify-health-checks.sh" ]]; then
  print_step "Running baseline health checks"
  code=$(run_check "verify-health-checks" env API_GATEWAY_URL="${API_GATEWAY_URL}" "${ROOT_DIR}/scripts/verify-health-checks.sh")
  echo "| Baseline service health | $(status_text "$code") |" >> "${REPORT_FILE}"
else
  echo "| Baseline service health | SKIPPED (script missing) |" >> "${REPORT_FILE}"
fi

# Release health gate
if [[ -f "${ROOT_DIR}/scripts/release-health-check.sh" ]]; then
  print_step "Running release health gate"
  code=$(run_check "release-health-check" env API_GATEWAY_URL="${API_GATEWAY_URL}" PROMETHEUS_URL="${PROMETHEUS_URL}" "${ROOT_DIR}/scripts/release-health-check.sh")
  echo "| Release health gate | $(status_text "$code") |" >> "${REPORT_FILE}"
else
  echo "| Release health gate | SKIPPED (script missing) |" >> "${REPORT_FILE}"
fi

print_step "Recording drill workflow checkpoints"
cat >> "${REPORT_FILE}" <<'EOF'

## Workflow Checklist

- [ ] Incident declared and severity classified
- [ ] Communication updates sent at agreed cadence
- [ ] Mitigation/rollback decision documented
- [ ] Recovery criteria validated
- [ ] PIR draft created

## Timeline (Fill During Drill)

| Time (UTC) | Event | Owner |
|---|---|---|
|  | Detection |  |
|  | Incident declaration |  |
|  | Mitigation start |  |
|  | Stabilization |  |
|  | Drill close |  |

## Findings

### What worked
- 

### Gaps
- 

### Action items
| Action | Owner | Priority | Due Date |
|---|---|---|---|
|  |  | P0/P1/P2 |  |
EOF

END_UTC="$(date -u +"%Y-%m-%d %H:%M:%S UTC")"
cat >> "${REPORT_FILE}" <<EOF

- **End Time (UTC):** ${END_UTC}
EOF

echo -e "${GREEN}Drill report created:${NC} ${REPORT_FILE}"
