#!/usr/bin/env bash
# validate-image-tags.sh — Container image tagging standards enforcement
#
# Enforces semantic image tagging for all services. Called in CI before
# a build is pushed, and during deployment gating.
#
# Tagging convention:
#   main branch  →  ghcr.io/org/app/service:latest
#                   ghcr.io/org/app/service:v{semver}
#                   ghcr.io/org/app/service:{branch}-{sha:8}
#   any branch   →  ghcr.io/org/app/service:{branch}-{sha:8}
#   PR builds    →  ghcr.io/org/app/service:pr-{number}
#
# Usage:
#   ./scripts/validate-image-tags.sh --service user-service --tag pr-42
#   ./scripts/validate-image-tags.sh --service user-service --tag feature-auth-abc1234f
#   ./scripts/validate-image-tags.sh --service user-service --tag v1.2.3
#   ./scripts/validate-image-tags.sh --all          (scan all running images in cluster)
#
# Exit codes:
#   0 — Tag is valid / all images pass
#   1 — Tag is invalid / cluster images violate policy
#   2 — Missing prerequisite

set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────────────
REGISTRY="ghcr.io"
ORG="let-s-connect-org"
APP="lets-connect"
NAMESPACE="${NAMESPACE:-milonexa}"

SERVICES=(
  api-gateway
  user-service
  content-service
  messaging-service
  media-service
  shop-service
  collaboration-service
  streaming-service
  security-service
  ai-service
  admin-frontend
  frontend
)

# ── Helpers ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

info()  { echo -e "${CYAN}[INFO]${RESET}  $*"; }
ok()    { echo -e "${GREEN}[OK]${RESET}    $*"; }
fail()  { echo -e "${RED}[FAIL]${RESET}  $*"; VIOLATIONS=$((VIOLATIONS+1)); }
warn()  { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
hr()    { echo -e "${BOLD}────────────────────────────────────────────────────${RESET}"; }

VIOLATIONS=0

# ── Tag pattern validation ────────────────────────────────────────────────────
# Valid patterns:
#   v{semver}              e.g. v1.2.3, v10.0.0-rc1
#   {branch}-{sha8}        e.g. main-abc12345, feature-login-def56789
#   {branch}-{sha8+}       sha can be 8–40 hex chars
#   pr-{number}            e.g. pr-42
#   latest                 ONLY from verified main branch (checked externally)
validate_tag_format() {
  local tag="$1"
  local context="${2:-tag}"

  # Allow semantic version tags
  if [[ "$tag" =~ ^v[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9._-]+)?$ ]]; then
    ok "${context}: '${tag}' matches semver format"
    return 0
  fi

  # Allow {branch}-{sha} patterns (branch can include hyphens and slashes normalised)
  if [[ "$tag" =~ ^[a-zA-Z0-9._/-]+-[0-9a-f]{8,40}$ ]]; then
    ok "${context}: '${tag}' matches branch-sha format"
    return 0
  fi

  # Allow PR tags
  if [[ "$tag" =~ ^pr-[0-9]+$ ]]; then
    ok "${context}: '${tag}' matches PR format"
    return 0
  fi

  # Allow 'latest' with explicit acknowledgement (CI sets ALLOW_LATEST=true on main only)
  if [[ "$tag" == "latest" ]]; then
    if [[ "${ALLOW_LATEST:-false}" == "true" ]]; then
      warn "${context}: ':latest' is allowed here but must only be pushed from main"
      return 0
    else
      fail "${context}: ':latest' tag is NOT allowed outside the main branch (set ALLOW_LATEST=true only on main)"
      return 1
    fi
  fi

  # All other tags are rejected
  fail "${context}: '${tag}' does NOT match any allowed pattern"
  echo "        Allowed patterns:"
  echo "          v{major}.{minor}.{patch}[-prerelease]   (e.g. v1.2.3, v2.0.0-rc1)"
  echo "          {branch}-{sha8..40}                     (e.g. main-a1b2c3d4)"
  echo "          pr-{number}                             (e.g. pr-42)"
  return 1
}

# ── Build the expected image ref for a service ────────────────────────────────
image_ref() {
  local service="$1"
  local tag="$2"
  echo "${REGISTRY}/${ORG}/${APP}/${service}:${tag}"
}

# ── Validate a single service + tag ──────────────────────────────────────────
validate_single() {
  local service="$1"
  local tag="$2"

  # Check service is in the known list
  local found=false
  for s in "${SERVICES[@]}"; do
    [[ "$s" == "$service" ]] && found=true && break
  done
  if [[ "$found" == false ]]; then
    warn "Service '${service}' is not in the known services list — proceeding anyway"
  fi

  validate_tag_format "$tag" "Service[${service}]"

  local full_ref
  full_ref="$(image_ref "$service" "$tag")"
  info "Full image ref: ${full_ref}"
}

# ── Validate all running images in the cluster ────────────────────────────────
validate_cluster_images() {
  if ! command -v kubectl &>/dev/null; then
    echo "kubectl not found — cannot check cluster images."
    exit 2
  fi

  info "Scanning all images in namespace '${NAMESPACE}'"
  hr

  # Collect all container images from pods
  local images
  images=$(kubectl get pods -n "$NAMESPACE" \
           -o jsonpath='{range .items[*]}{range .spec.containers[*]}{.image}{"\n"}{end}{end}' \
           2>/dev/null | sort -u || true)

  if [[ -z "$images" ]]; then
    warn "No running pods found in namespace '${NAMESPACE}'"
    return
  fi

  while IFS= read -r image; do
    [[ -z "$image" ]] && continue

    # Extract tag portion (after last colon)
    local tag="${image##*:}"
    local base="${image%:*}"

    # Determine whether this is one of our images
    if echo "$base" | grep -q "${REGISTRY}/${ORG}"; then
      validate_tag_format "$tag" "Image[${image}]"
    else
      info "Skipping third-party image: ${image}"
    fi
  done <<< "$images"
}

# ── Generate image tags for CI ────────────────────────────────────────────────
# Print the set of tags that should be applied to a given image build.
generate_tags() {
  local service="$1"
  local branch="${2:-$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')}"
  local sha="${3:-$(git rev-parse --short=8 HEAD 2>/dev/null || echo 'deadbeef')}"

  # Normalise branch name: replace / with - and strip invalid chars
  local safe_branch
  safe_branch=$(echo "$branch" | tr '/' '-' | tr -cd 'a-zA-Z0-9._-')

  echo ""
  echo "  Recommended image tags for: ${service}"
  echo "  Branch: ${branch}  SHA: ${sha}"
  hr

  local base_ref
  base_ref="$(image_ref "$service" "")"
  base_ref="${base_ref%:}"  # strip trailing colon

  echo "  Branch+SHA tag:  ${base_ref}:${safe_branch}-${sha}"

  if [[ "$branch" == "main" ]]; then
    echo "  Latest tag:      ${base_ref}:latest"
  fi

  # If the commit is tagged with a semver, suggest it
  if git describe --exact-match --match "v[0-9]*" HEAD &>/dev/null 2>&1; then
    local ver
    ver=$(git describe --exact-match --match "v[0-9]*" HEAD 2>/dev/null)
    echo "  Semver tag:      ${base_ref}:${ver}"
  fi

  echo ""
  echo "  Docker build example:"
  echo "    docker build \\"
  echo "      -t ${base_ref}:${safe_branch}-${sha} \\"
  if [[ "$branch" == "main" ]]; then
    echo "      -t ${base_ref}:latest \\"
  fi
  echo "      -f services/${service}/Dockerfile ."
  echo ""
}

# ── Usage ─────────────────────────────────────────────────────────────────────
usage() {
  cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Options:
  --service <name>    Service name (e.g. user-service)
  --tag <tag>         Image tag to validate
  --generate <name>   Generate recommended tags for a service
  --all               Validate all running images in the cluster
  --namespace <ns>    K8s namespace (default: ${NAMESPACE})
  --help, -h          Show this help

Examples:
  $(basename "$0") --service user-service --tag main-abc12345
  $(basename "$0") --service user-service --tag v1.2.3
  $(basename "$0") --generate user-service
  $(basename "$0") --all
EOF
}

# ── Main ──────────────────────────────────────────────────────────────────────
main() {
  local mode=""
  local service=""
  local tag=""
  local generate_service=""

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --service)    service="$2";           shift 2 ;;
      --tag)        tag="$2";               shift 2 ;;
      --generate)   generate_service="$2";  shift 2 ;;
      --all)        mode="all";             shift ;;
      --namespace)  NAMESPACE="$2";         shift 2 ;;
      --help|-h)    usage; exit 0 ;;
      *)            echo "Unknown option: $1"; usage; exit 2 ;;
    esac
  done

  hr
  echo -e "${BOLD}Let's Connect — Image Tag Standards Validator${RESET}"
  hr

  if [[ "$mode" == "all" ]]; then
    validate_cluster_images
  elif [[ -n "$generate_service" ]]; then
    generate_tags "$generate_service"
    exit 0
  elif [[ -n "$service" && -n "$tag" ]]; then
    validate_single "$service" "$tag"
  else
    usage
    exit 2
  fi

  hr
  if [[ $VIOLATIONS -eq 0 ]]; then
    echo -e "${GREEN}${BOLD}✓ All image tags pass standards.${RESET}"
    echo ""
    exit 0
  else
    echo -e "${RED}${BOLD}✗ ${VIOLATIONS} image tag violation(s) found.${RESET}"
    echo ""
    echo "  Fix: use branch-sha (e.g. main-a1b2c3d4) or semver (v1.2.3) tags."
    echo ""
    exit 1
  fi
}

main "$@"
