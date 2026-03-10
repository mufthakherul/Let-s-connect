#!/usr/bin/env bash
# config-drift-detect.sh — Environment configuration drift detection
#
# Compares live Kubernetes ConfigMaps/Secrets against the expected
# values defined in your env template files, then reports any
# discrepancies so you can catch configuration drift early.
#
# Usage:
#   ./scripts/config-drift-detect.sh [--env <dev|staging|prod>] [--namespace <ns>]
#
# Exit codes:
#   0  — No drift detected
#   1  — Drift detected (see output for details)
#   2  — Prerequisite not met (kubectl unavailable, namespace not found)

set -euo pipefail

# ── Defaults ─────────────────────────────────────────────────────────────────
ENV="${ENV:-staging}"
NAMESPACE="${NAMESPACE:-milonexa}"
CONFIGMAP_NAME="milonexa-config"
DRIFT_FOUND=0
WARNINGS=0

# ── Argument parsing ──────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --env)       ENV="$2";       shift 2 ;;
    --namespace) NAMESPACE="$2"; shift 2 ;;
    --help|-h)
      echo "Usage: $0 [--env dev|staging|prod] [--namespace <ns>]"
      exit 0 ;;
    *) echo "Unknown option: $1"; exit 2 ;;
  esac
done

# ── Helpers ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

info()  { echo -e "${CYAN}[INFO]${RESET}  $*"; }
ok()    { echo -e "${GREEN}[OK]${RESET}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${RESET}  $*"; WARNINGS=$((WARNINGS+1)); }
drift() { echo -e "${RED}[DRIFT]${RESET} $*"; DRIFT_FOUND=1; }
hr()    { echo -e "${BOLD}────────────────────────────────────────────────────${RESET}"; }

# ── Prerequisites ─────────────────────────────────────────────────────────────
check_prereqs() {
  if ! command -v kubectl &>/dev/null; then
    echo "kubectl not found. Install kubectl to use this script."
    exit 2
  fi

  if ! kubectl get namespace "$NAMESPACE" &>/dev/null; then
    echo "Namespace '$NAMESPACE' not found. Is the cluster configured?"
    exit 2
  fi

  info "Checking drift for env=${ENV}, namespace=${NAMESPACE}"
  hr
}

# ── Expected values per environment ──────────────────────────────────────────
# Keys are the ConfigMap data keys; values are the expected values for the env.
declare -A EXPECTED_CONFIG

load_expected_config() {
  case "$ENV" in
    dev)
      EXPECTED_CONFIG=(
        [NODE_ENV]="development"
        [LOG_LEVEL]="debug"
        [ENABLE_METRICS]="true"
        [ENABLE_HEALTH_CHECKS]="true"
        [CACHE_TTL]="3600"
        [S3_BUCKET]="milonexa-dev"
      )
      ;;
    staging)
      EXPECTED_CONFIG=(
        [NODE_ENV]="production"
        [LOG_LEVEL]="info"
        [ENABLE_METRICS]="true"
        [ENABLE_HEALTH_CHECKS]="true"
        [CACHE_TTL]="7200"
        [S3_BUCKET]="milonexa-staging"
      )
      ;;
    prod|production)
      EXPECTED_CONFIG=(
        [NODE_ENV]="production"
        [LOG_LEVEL]="warn"
        [ENABLE_METRICS]="true"
        [ENABLE_HEALTH_CHECKS]="true"
        [CACHE_TTL]="14400"
        [S3_BUCKET]="milonexa-prod"
      )
      ;;
    *)
      echo "Unknown env: $ENV. Use dev, staging, or prod."
      exit 2
      ;;
  esac
}

# ── Check ConfigMap values ────────────────────────────────────────────────────
check_configmap() {
  info "Checking ConfigMap: ${CONFIGMAP_NAME}"

  if ! kubectl get configmap "$CONFIGMAP_NAME" -n "$NAMESPACE" &>/dev/null; then
    drift "ConfigMap '${CONFIGMAP_NAME}' is MISSING from namespace '${NAMESPACE}'"
    return
  fi

  # Fetch the entire CM as key=value pairs
  local live_data
  live_data=$(kubectl get configmap "$CONFIGMAP_NAME" -n "$NAMESPACE" \
              -o jsonpath='{range .data}{@}{"\n"}{end}' 2>/dev/null || true)

  for key in "${!EXPECTED_CONFIG[@]}"; do
    local expected="${EXPECTED_CONFIG[$key]}"
    local live
    live=$(kubectl get configmap "$CONFIGMAP_NAME" -n "$NAMESPACE" \
           -o jsonpath="{.data.${key}}" 2>/dev/null || true)

    if [[ -z "$live" ]]; then
      drift "ConfigMap key '${key}' is MISSING (expected: '${expected}')"
    elif [[ "$live" != "$expected" ]]; then
      drift "ConfigMap key '${key}' MISMATCH — live: '${live}' | expected: '${expected}'"
    else
      ok "ConfigMap[${key}] = '${live}'"
    fi
  done
}

# ── Check required Secret keys exist ─────────────────────────────────────────
REQUIRED_SECRET_KEYS=(
  JWT_SECRET
  DATABASE_PASSWORD
)

check_secrets() {
  info "Checking required Secret keys exist"

  local secret_name="milonexa-core-secrets"
  if kubectl get secret "$secret_name" -n "$NAMESPACE" &>/dev/null; then
    for key in "${REQUIRED_SECRET_KEYS[@]}"; do
      local val
      val=$(kubectl get secret "$secret_name" -n "$NAMESPACE" \
            -o jsonpath="{.data.${key}}" 2>/dev/null | base64 -d 2>/dev/null || true)
      if [[ -z "$val" ]]; then
        drift "Secret '${secret_name}' key '${key}' is MISSING or EMPTY"
      elif echo "$val" | grep -qi "CHANGEME"; then
        drift "Secret '${secret_name}' key '${key}' still contains PLACEHOLDER value"
      else
        ok "Secret[${key}] is set (non-empty, no placeholder)"
      fi
    done
  else
    # Fall back to the legacy single-secret name
    local fallback_secret="milonexa-secrets"
    if kubectl get secret "$fallback_secret" -n "$NAMESPACE" &>/dev/null; then
      for key in "${REQUIRED_SECRET_KEYS[@]}"; do
        local val
        val=$(kubectl get secret "$fallback_secret" -n "$NAMESPACE" \
              -o jsonpath="{.data.${key}}" 2>/dev/null | base64 -d 2>/dev/null || true)
        if [[ -z "$val" ]]; then
          drift "Secret '${fallback_secret}' key '${key}' is MISSING or EMPTY"
        elif echo "$val" | grep -qi "CHANGEME"; then
          drift "Secret '${fallback_secret}' key '${key}' still contains PLACEHOLDER value"
        else
          ok "Secret[${key}] is set"
        fi
      done
    else
      drift "No secrets resource found (tried '${secret_name}' and '${fallback_secret}')"
    fi
  fi
}

# ── Check image tags on running deployments ───────────────────────────────────
check_image_tags() {
  info "Checking container image tag consistency"

  local deployments
  deployments=$(kubectl get deployments -n "$NAMESPACE" \
                -o jsonpath='{.items[*].metadata.name}' 2>/dev/null || true)

  if [[ -z "$deployments" ]]; then
    warn "No deployments found in namespace '${NAMESPACE}'"
    return
  fi

  for dep in $deployments; do
    local image
    image=$(kubectl get deployment "$dep" -n "$NAMESPACE" \
            -o jsonpath='{.spec.template.spec.containers[0].image}' 2>/dev/null || true)

    if [[ -z "$image" ]]; then
      warn "Deployment '${dep}': could not read image"
      continue
    fi

    # Warn on :latest tag in staging/prod
    if [[ "$ENV" != "dev" && "$image" == *":latest" ]]; then
      warn "Deployment '${dep}' uses ':latest' tag in ${ENV} — use pinned SHA or semver tags"
    fi

    # Check for placeholder IMAGE_TAG
    if echo "$image" | grep -qi "IMAGE_TAG\|PLACEHOLDER\|CHANGEME"; then
      drift "Deployment '${dep}' image contains unresolved placeholder: '${image}'"
    else
      ok "Deployment[${dep}] image: ${image}"
    fi
  done
}

# ── Check for missing health probe definitions ────────────────────────────────
check_health_probes() {
  info "Checking liveness/readiness probes on deployments"

  local deployments
  deployments=$(kubectl get deployments -n "$NAMESPACE" \
                -o jsonpath='{.items[*].metadata.name}' 2>/dev/null || true)

  for dep in $deployments; do
    local liveness readiness
    liveness=$(kubectl get deployment "$dep" -n "$NAMESPACE" \
               -o jsonpath='{.spec.template.spec.containers[0].livenessProbe}' 2>/dev/null || true)
    readiness=$(kubectl get deployment "$dep" -n "$NAMESPACE" \
                -o jsonpath='{.spec.template.spec.containers[0].readinessProbe}' 2>/dev/null || true)

    [[ -z "$liveness"  ]] && warn "Deployment '${dep}' has NO livenessProbe"
    [[ -z "$readiness" ]] && warn "Deployment '${dep}' has NO readinessProbe"

    if [[ -n "$liveness" && -n "$readiness" ]]; then
      ok "Deployment[${dep}] probes: configured"
    fi
  done
}

# ── Environment file baseline check ──────────────────────────────────────────
check_env_file() {
  local env_file=".env.${ENV}"
  # dev uses .env.dev; prod uses .env.production
  [[ "$ENV" == "prod" || "$ENV" == "production" ]] && env_file=".env.production"

  if [[ -f "$env_file" ]]; then
    info "Checking ${env_file} for CHANGEME placeholders"
    local count
    count=$(grep -c "CHANGEME" "$env_file" || true)
    if [[ "$count" -gt 0 ]]; then
      warn "${env_file} still has ${count} CHANGEME placeholder(s) — replace before deploying"
    else
      ok "${env_file}: no CHANGEME placeholders found"
    fi
  else
    warn "Env file '${env_file}' not found locally — skipping baseline check"
  fi
}

# ── Summary ───────────────────────────────────────────────────────────────────
print_summary() {
  hr
  echo ""
  if [[ $DRIFT_FOUND -eq 0 && $WARNINGS -eq 0 ]]; then
    echo -e "${GREEN}${BOLD}✓ No drift detected. Configuration matches expected state for '${ENV}'.${RESET}"
    echo ""
  elif [[ $DRIFT_FOUND -eq 0 ]]; then
    echo -e "${YELLOW}${BOLD}⚠  No critical drift, but ${WARNINGS} warning(s) found. Review above.${RESET}"
    echo ""
  else
    echo -e "${RED}${BOLD}✗ DRIFT DETECTED — ${DRIFT_FOUND} issue(s) require attention (${WARNINGS} warning(s)).${RESET}"
    echo ""
    echo "  Remediation steps:"
    echo "  1. Review the [DRIFT] lines above."
    echo "  2. Apply the correct ConfigMap/Secret values: kubectl apply -f k8s/"
    echo "  3. Restart affected pods: kubectl rollout restart deployment -n ${NAMESPACE}"
    echo "  4. Re-run this script to confirm resolution."
    echo ""
  fi
}

# ── Main ──────────────────────────────────────────────────────────────────────
main() {
  check_prereqs
  load_expected_config
  check_env_file
  check_configmap
  check_secrets
  check_image_tags
  check_health_probes
  print_summary

  [[ $DRIFT_FOUND -eq 0 ]] && exit 0 || exit 1
}

main "$@"
