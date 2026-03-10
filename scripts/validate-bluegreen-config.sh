#!/usr/bin/env bash
# validate-bluegreen-config.sh — Pre-deployment config validation for blue-green swaps
#
# Validates that the "green" (new) deployment environment is fully configured
# before traffic is switched from "blue" (live). Prevents deploying a release
# that is missing critical secrets, has unhealthy pods, or has unrun migrations.
#
# Usage:
#   ./scripts/validate-bluegreen-config.sh --target green --namespace milonexa
#   ./scripts/validate-bluegreen-config.sh --target green --skip-migrations
#
# Exit codes:
#   0 — All checks pass; safe to switch traffic
#   1 — One or more checks failed; do NOT switch traffic
#   2 — Prerequisite error

set -euo pipefail

# ── Defaults ──────────────────────────────────────────────────────────────────
TARGET="${TARGET:-green}"
NAMESPACE="${NAMESPACE:-milonexa}"
SKIP_MIGRATIONS=false
FAIL_COUNT=0
CHECK_COUNT=0

REQUIRED_SECRETS=(
  milonexa-core-secrets
  milonexa-database-secret
  milonexa-redis-secret
  milonexa-jwt-secret
)

REQUIRED_CONFIGMAPS=(
  milonexa-config
)

# Core services that must be Ready before traffic switches
CRITICAL_SERVICES=(
  api-gateway
  user-service
  content-service
  messaging-service
  media-service
  shop-service
)

# ── Argument parsing ──────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --target)           TARGET="$2";          shift 2 ;;
    --namespace)        NAMESPACE="$2";       shift 2 ;;
    --skip-migrations)  SKIP_MIGRATIONS=true; shift ;;
    --help|-h)
      echo "Usage: $0 [--target green|blue] [--namespace <ns>] [--skip-migrations]"
      exit 0 ;;
    *) echo "Unknown option: $1"; exit 2 ;;
  esac
done

# ── Colour helpers ────────────────────────────────────────────────────────────
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

pass() {
  CHECK_COUNT=$((CHECK_COUNT+1))
  echo -e "${GREEN}[PASS]${RESET} $*"
}
fail() {
  CHECK_COUNT=$((CHECK_COUNT+1))
  FAIL_COUNT=$((FAIL_COUNT+1))
  echo -e "${RED}[FAIL]${RESET} $*"
}
info()    { echo -e "${CYAN}[INFO]${RESET} $*"; }
section() { echo ""; echo -e "${BOLD}── $* ──────────────────────────────────────────────${RESET}"; }
hr()      { echo -e "${BOLD}────────────────────────────────────────────────────────${RESET}"; }

# ── 1. Cluster connectivity ───────────────────────────────────────────────────
check_cluster_access() {
  section "Cluster Access"
  if ! command -v kubectl &>/dev/null; then
    echo "kubectl not found."
    exit 2
  fi
  if ! kubectl get namespace "$NAMESPACE" &>/dev/null; then
    echo "Namespace '${NAMESPACE}' not found."
    exit 2
  fi
  pass "kubectl connected; namespace '${NAMESPACE}' exists"
}

# ── 2. Required secrets present ──────────────────────────────────────────────
check_secrets() {
  section "Required Secrets"
  for secret in "${REQUIRED_SECRETS[@]}"; do
    if kubectl get secret "$secret" -n "$NAMESPACE" &>/dev/null; then
      pass "Secret '${secret}' exists"
      # Check no CHANGEME placeholder remains
      local raw
      raw=$(kubectl get secret "$secret" -n "$NAMESPACE" \
            -o jsonpath='{.data}' 2>/dev/null | base64 -d 2>/dev/null || true)
      if echo "$raw" | grep -qi "CHANGEME"; then
        fail "Secret '${secret}' still contains CHANGEME placeholder(s)"
      fi
    else
      fail "Secret '${secret}' is MISSING"
    fi
  done
}

# ── 3. Required ConfigMaps present ───────────────────────────────────────────
check_configmaps() {
  section "Required ConfigMaps"
  for cm in "${REQUIRED_CONFIGMAPS[@]}"; do
    if kubectl get configmap "$cm" -n "$NAMESPACE" &>/dev/null; then
      pass "ConfigMap '${cm}' exists"
    else
      fail "ConfigMap '${cm}' is MISSING"
    fi
  done
}

# ── 4. Critical pods Ready ────────────────────────────────────────────────────
# Looks for pods with label app={service} and slot={target} (blue or green).
# Falls back to checking simply by app label if slot label isn't used.
check_pods_ready() {
  section "Pod Readiness — Slot: ${TARGET}"

  for svc in "${CRITICAL_SERVICES[@]}"; do
    local selector="app=${svc},slot=${TARGET}"

    # Try slot-labelled pods first, fall back to app-only
    local ready_count total_count
    ready_count=$(kubectl get pods -n "$NAMESPACE" -l "$selector" \
                  --field-selector=status.phase=Running \
                  -o jsonpath='{range .items[*]}{.status.containerStatuses[0].ready}{"\n"}{end}' \
                  2>/dev/null | grep -c "^true$" || true)

    total_count=$(kubectl get pods -n "$NAMESPACE" -l "$selector" \
                  -o jsonpath='{.items}' 2>/dev/null | python3 -c \
                  "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo 0)

    if [[ "$total_count" -eq 0 ]]; then
      # Retry without slot label (for non-blue-green clusters)
      ready_count=$(kubectl get pods -n "$NAMESPACE" -l "app=${svc}" \
                    --field-selector=status.phase=Running \
                    -o jsonpath='{range .items[*]}{.status.containerStatuses[0].ready}{"\n"}{end}' \
                    2>/dev/null | grep -c "^true$" || true)
      total_count=$(kubectl get pods -n "$NAMESPACE" -l "app=${svc}" \
                    -o jsonpath='{.items}' 2>/dev/null | python3 -c \
                    "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo 0)
    fi

    if [[ "$total_count" -eq 0 ]]; then
      fail "Service '${svc}' — no pods found (is '${TARGET}' deployment applied?)"
    elif [[ "$ready_count" -gt 0 ]]; then
      pass "Service '${svc}' — ${ready_count}/${total_count} pods Ready"
    else
      fail "Service '${svc}' — 0/${total_count} pods Ready"
    fi
  done
}

# ── 5. Health endpoint smoke test ─────────────────────────────────────────────
SERVICE_PORTS=(
  "api-gateway:8000"
  "user-service:8001"
  "content-service:8002"
  "messaging-service:8003"
  "media-service:8004"
  "shop-service:8005"
)

check_health_endpoints() {
  section "Health Endpoints"

  if ! command -v curl &>/dev/null; then
    info "curl not available — skipping health endpoint checks"
    return
  fi

  for entry in "${SERVICE_PORTS[@]}"; do
    local svc="${entry%%:*}"
    local port="${entry##*:}"

    # Use kubectl port-forward for in-cluster health check (non-blocking, background)
    local pf_pid=""
    local local_port=$((RANDOM % 10000 + 30000))

    kubectl port-forward "svc/${svc}" "${local_port}:${port}" -n "$NAMESPACE" \
      &>/dev/null &
    pf_pid=$!
    sleep 1  # let port-forward establish

    local http_status
    http_status=$(curl -s -o /dev/null -w "%{http_code}" \
                  "http://localhost:${local_port}/health" \
                  --connect-timeout 3 --max-time 5 2>/dev/null || echo "000")

    kill "$pf_pid" 2>/dev/null || true

    if [[ "$http_status" == "200" ]]; then
      pass "Service '${svc}' /health → HTTP ${http_status}"
    elif [[ "$http_status" == "000" ]]; then
      fail "Service '${svc}' /health → UNREACHABLE (port-forward failed or service not ready)"
    else
      fail "Service '${svc}' /health → HTTP ${http_status} (expected 200)"
    fi
  done
}

# ── 6. Database migration status ─────────────────────────────────────────────
check_migrations() {
  section "Database Migration Status"

  if [[ "$SKIP_MIGRATIONS" == "true" ]]; then
    info "Migration check skipped (--skip-migrations)"
    return
  fi

  # Look for a migration job that completed successfully
  local migration_job
  migration_job=$(kubectl get jobs -n "$NAMESPACE" \
                  -l "type=migration" \
                  -o jsonpath='{.items[-1].metadata.name}' 2>/dev/null || true)

  if [[ -z "$migration_job" ]]; then
    info "No migration job with label type=migration found — checking by name pattern"
    migration_job=$(kubectl get jobs -n "$NAMESPACE" \
                    -o jsonpath='{.items[*].metadata.name}' 2>/dev/null | \
                    tr ' ' '\n' | grep -i "migrat" | tail -1 || true)
  fi

  if [[ -z "$migration_job" ]]; then
    fail "No database migration job found — run migrations before switching traffic"
    return
  fi

  local succeeded
  succeeded=$(kubectl get job "$migration_job" -n "$NAMESPACE" \
              -o jsonpath='{.status.succeeded}' 2>/dev/null || echo "0")

  if [[ "$succeeded" -ge 1 ]]; then
    pass "Migration job '${migration_job}' completed (succeeded=${succeeded})"
  else
    fail "Migration job '${migration_job}' has NOT completed successfully (succeeded=${succeeded})"
  fi
}

# ── 7. Verify PersistentVolumeClaims bound ────────────────────────────────────
check_pvcs() {
  section "PersistentVolumeClaim Status"

  local pvcs
  pvcs=$(kubectl get pvc -n "$NAMESPACE" \
         -o jsonpath='{range .items[*]}{.metadata.name} {.status.phase}{"\n"}{end}' \
         2>/dev/null || true)

  if [[ -z "$pvcs" ]]; then
    info "No PVCs found in namespace (stateless or PVCs not yet applied)"
    return
  fi

  while IFS=$' ' read -r name phase; do
    [[ -z "$name" ]] && continue
    if [[ "$phase" == "Bound" ]]; then
      pass "PVC '${name}' is Bound"
    else
      fail "PVC '${name}' is in state '${phase}' — not Bound"
    fi
  done <<< "$pvcs"
}

# ── 8. Container image tags not using :latest in production ───────────────────
check_image_pins() {
  section "Image Tag Policy"

  local images
  images=$(kubectl get deployments -n "$NAMESPACE" \
           -o jsonpath='{range .items[*]}{.metadata.name}={.spec.template.spec.containers[0].image}{"\n"}{end}' \
           2>/dev/null || true)

  if [[ -z "$images" ]]; then
    info "No deployments found"
    return
  fi

  while IFS='=' read -r dep image; do
    [[ -z "$dep" ]] && continue
    if [[ "$image" == *":latest" ]]; then
      fail "Deployment '${dep}' uses ':latest' — pin to a specific SHA or semver tag"
    else
      pass "Deployment '${dep}' image: ${image##*/}"
    fi
  done <<< "$images"
}

# ── Summary & gate ────────────────────────────────────────────────────────────
print_summary() {
  echo ""
  hr
  echo -e "${BOLD}Validation Summary — Target: ${TARGET} | Namespace: ${NAMESPACE}${RESET}"
  echo "  Total checks : ${CHECK_COUNT}"
  echo "  Passed       : $((CHECK_COUNT - FAIL_COUNT))"
  echo "  Failed       : ${FAIL_COUNT}"
  hr
  echo ""

  if [[ $FAIL_COUNT -eq 0 ]]; then
    echo -e "${GREEN}${BOLD}✓ ALL CHECKS PASSED — Safe to switch traffic to '${TARGET}'.${RESET}"
    echo ""
  else
    echo -e "${RED}${BOLD}✗ ${FAIL_COUNT} CHECK(S) FAILED — DO NOT switch traffic to '${TARGET}'.${RESET}"
    echo ""
    echo "  Remediation:"
    echo "  1. Fix all [FAIL] items above."
    echo "  2. Re-run: ./scripts/validate-bluegreen-config.sh --target ${TARGET}"
    echo "  3. Only proceed with traffic switch once all checks pass."
    echo ""
  fi
}

# ── Main ──────────────────────────────────────────────────────────────────────
main() {
  hr
  echo -e "${BOLD}Let's Connect — Blue/Green Deployment Config Validator${RESET}"
  echo "  Target slot : ${TARGET}"
  echo "  Namespace   : ${NAMESPACE}"
  hr

  check_cluster_access
  check_secrets
  check_configmaps
  check_pods_ready
  check_health_endpoints
  check_migrations
  check_pvcs
  check_image_pins
  print_summary

  [[ $FAIL_COUNT -eq 0 ]] && exit 0 || exit 1
}

main "$@"
