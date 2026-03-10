#!/usr/bin/env bash
# backup-restore.sh — Comprehensive backup & restore for postgres, redis, and minio
#
# Commands:
#   backup   [postgres|redis|minio|all]         Create a backup
#   restore  [postgres|redis|minio] <file>      Restore from a backup file
#   list     [postgres|redis|minio|all]         List available backup files
#   verify   <file>                              Verify backup integrity
#   prune    [--days <n>]                        Delete backups older than N days
#   schedule                                     Print recommended cron schedule
#
# Environment variables (override defaults):
#   BACKUP_DIR        — Local or mounted backup destination (default: /backups)
#   POSTGRES_HOST     — default: postgres
#   POSTGRES_PORT     — default: 5432
#   POSTGRES_USER     — default: postgres
#   POSTGRES_PASSWORD — required for postgres operations
#   REDIS_HOST        — default: redis
#   REDIS_PORT        — default: 6379
#   REDIS_AUTH        — redis AUTH password (optional)
#   MINIO_ENDPOINT    — default: http://minio:9000
#   MINIO_ACCESS_KEY  — required for minio operations
#   MINIO_SECRET_KEY  — required for minio operations
#   MINIO_BUCKET      — default: milonexa-media
#   RETENTION_DAYS    — days to keep backups (default: 30)
#   SLACK_WEBHOOK_URL — optional; post backup summary to Slack
#
# Usage examples:
#   ./scripts/backup-restore.sh backup all
#   ./scripts/backup-restore.sh restore postgres /backups/postgres/postgres-2025-01-15T02-00-00.sql.gz
#   ./scripts/backup-restore.sh list all
#   ./scripts/backup-restore.sh prune --days 14
#   ./scripts/backup-restore.sh verify /backups/postgres/postgres-2025-01-15T02-00-00.sql.gz

set -euo pipefail

# ── Defaults ──────────────────────────────────────────────────────────────────
BACKUP_DIR="${BACKUP_DIR:-/backups}"
POSTGRES_HOST="${POSTGRES_HOST:-postgres}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
REDIS_HOST="${REDIS_HOST:-redis}"
REDIS_PORT="${REDIS_PORT:-6379}"
MINIO_ENDPOINT="${MINIO_ENDPOINT:-http://minio:9000}"
MINIO_BUCKET="${MINIO_BUCKET:-milonexa-media}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

TIMESTAMP="$(date -u +%Y-%m-%dT%H-%M-%S)"

# ── Colour helpers ────────────────────────────────────────────────────────────
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

log()     { echo -e "${CYAN}[$(date -u +%H:%M:%S)]${RESET} $*"; }
ok()      { echo -e "${GREEN}[OK]${RESET}    $*"; }
fail()    { echo -e "${RED}[FAIL]${RESET}  $*" >&2; }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
die()     { fail "$*"; exit 1; }
hr()      { echo -e "${BOLD}────────────────────────────────────────────────────${RESET}"; }
section() { echo ""; echo -e "${BOLD}── $* ──────────────────────────────────────────────────${RESET}"; }

# ── Slack notification (optional) ────────────────────────────────────────────
notify_slack() {
  local status="$1"
  local message="$2"
  if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
    local emoji="✅"
    [[ "$status" != "ok" ]] && emoji="❌"
    curl -s -X POST -H 'Content-type: application/json' \
      --data "{\"text\":\"${emoji} *Let's Connect Backup* — ${message}\"}" \
      "$SLACK_WEBHOOK_URL" &>/dev/null || true
  fi
}

# ── Tool availability checks ──────────────────────────────────────────────────
require_tool() {
  local tool="$1"
  if ! command -v "$tool" &>/dev/null; then
    die "Required tool not found: ${tool}. Install it before running this script."
  fi
}

check_postgres_tools() {
  require_tool pg_dump
  require_tool psql
  require_tool gzip
}

check_redis_tools() {
  require_tool redis-cli
}

check_minio_tools() {
  # prefer mc (MinIO Client), fall back to aws-cli s3 API
  if ! command -v mc &>/dev/null && ! command -v aws &>/dev/null; then
    die "Neither 'mc' (MinIO Client) nor 'aws' (AWS CLI) found. Install one to proceed."
  fi
}

# ── PostgreSQL backup ─────────────────────────────────────────────────────────
backup_postgres() {
  check_postgres_tools

  local dest_dir="${BACKUP_DIR}/postgres"
  mkdir -p "$dest_dir"

  local file="${dest_dir}/postgres-${TIMESTAMP}.sql.gz"

  log "Starting PostgreSQL backup → ${file}"
  export PGPASSWORD="${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}"
  pg_dump \
    -h "$POSTGRES_HOST" \
    -p "$POSTGRES_PORT" \
    -U "$POSTGRES_USER" \
    --format=plain \
    --no-owner \
    --no-acl \
    --clean \
    --if-exists \
    --blobs \
    postgres 2>/dev/null \
    | gzip -9 > "$file"
  unset PGPASSWORD

  local size
  size=$(du -sh "$file" | cut -f1)
  ok "PostgreSQL backup complete: ${file} (${size})"

  # Write a SHA-256 checksum alongside the dump
  sha256sum "$file" > "${file}.sha256"
  ok "Checksum written: ${file}.sha256"

  notify_slack "ok" "PostgreSQL backup succeeded (${size}) at ${TIMESTAMP}"
  echo "$file"
}

# ── Redis backup ──────────────────────────────────────────────────────────────
backup_redis() {
  check_redis_tools

  local dest_dir="${BACKUP_DIR}/redis"
  mkdir -p "$dest_dir"

  local file="${dest_dir}/redis-${TIMESTAMP}.rdb.gz"

  log "Starting Redis backup → ${file}"

  # Build redis-cli connection args
  local redis_args=("-h" "$REDIS_HOST" "-p" "$REDIS_PORT")
  [[ -n "${REDIS_AUTH:-}" ]] && redis_args+=("-a" "$REDIS_AUTH") && redis_args+=("--no-auth-warning")

  # Trigger a background save and wait for it to complete
  redis-cli "${redis_args[@]}" BGSAVE

  local max_wait=30
  local waited=0
  while [[ "$waited" -lt "$max_wait" ]]; do
    local status
    status=$(redis-cli "${redis_args[@]}" LASTSAVE 2>/dev/null || echo "0")
    sleep 2
    local new_status
    new_status=$(redis-cli "${redis_args[@]}" LASTSAVE 2>/dev/null || echo "0")
    if [[ "$new_status" != "$status" ]]; then
      break
    fi
    waited=$((waited+2))
  done

  if [[ "$waited" -ge "$max_wait" ]]; then
    warn "BGSAVE may not have completed within ${max_wait}s — copying last known RDB"
  fi

  # Retrieve the RDB file path
  local rdb_path
  rdb_path=$(redis-cli "${redis_args[@]}" CONFIG GET dir 2>/dev/null | tail -1)
  local rdb_file_name
  rdb_file_name=$(redis-cli "${redis_args[@]}" CONFIG GET dbfilename 2>/dev/null | tail -1)

  if [[ -f "${rdb_path}/${rdb_file_name}" ]]; then
    gzip -9 -c "${rdb_path}/${rdb_file_name}" > "$file"
    local size
    size=$(du -sh "$file" | cut -f1)
    ok "Redis backup complete: ${file} (${size})"
    sha256sum "$file" > "${file}.sha256"
    ok "Checksum written: ${file}.sha256"
    notify_slack "ok" "Redis backup succeeded (${size}) at ${TIMESTAMP}"
    echo "$file"
  else
    # Fallback: dump RESP using redis-cli --rdb
    redis-cli "${redis_args[@]}" --rdb - 2>/dev/null | gzip -9 > "$file"
    local size
    size=$(du -sh "$file" | cut -f1)
    ok "Redis backup (pipe) complete: ${file} (${size})"
    sha256sum "$file" > "${file}.sha256"
    notify_slack "ok" "Redis backup succeeded (${size}) at ${TIMESTAMP}"
    echo "$file"
  fi
}

# ── MinIO backup (metadata mirror) ───────────────────────────────────────────
backup_minio() {
  check_minio_tools

  local dest_dir="${BACKUP_DIR}/minio"
  mkdir -p "$dest_dir"

  log "Starting MinIO bucket mirror → ${dest_dir}/${MINIO_BUCKET}-${TIMESTAMP}/"

  if command -v mc &>/dev/null; then
    # MinIO Client path
    mc alias set backup-src \
      "$MINIO_ENDPOINT" \
      "${MINIO_ACCESS_KEY:?MINIO_ACCESS_KEY is required}" \
      "${MINIO_SECRET_KEY:?MINIO_SECRET_KEY is required}" &>/dev/null

    mc mirror \
      --remove \
      --overwrite \
      "backup-src/${MINIO_BUCKET}" \
      "${dest_dir}/${MINIO_BUCKET}-${TIMESTAMP}/"

    mc alias rm backup-src &>/dev/null || true
  else
    # AWS CLI s3 sync fallback
    AWS_ACCESS_KEY_ID="${MINIO_ACCESS_KEY:?MINIO_ACCESS_KEY is required}" \
    AWS_SECRET_ACCESS_KEY="${MINIO_SECRET_KEY:?MINIO_SECRET_KEY is required}" \
    aws s3 sync \
      --endpoint-url "$MINIO_ENDPOINT" \
      "s3://${MINIO_BUCKET}" \
      "${dest_dir}/${MINIO_BUCKET}-${TIMESTAMP}/" \
      --delete
  fi

  local size
  size=$(du -sh "${dest_dir}/${MINIO_BUCKET}-${TIMESTAMP}/" | cut -f1)
  ok "MinIO backup complete: ${dest_dir}/${MINIO_BUCKET}-${TIMESTAMP}/ (${size})"
  notify_slack "ok" "MinIO backup succeeded (${size}) at ${TIMESTAMP}"
}

# ── Restore: PostgreSQL ───────────────────────────────────────────────────────
restore_postgres() {
  local file="${1:?Usage: restore postgres <backup-file>}"
  check_postgres_tools

  if [[ ! -f "$file" ]]; then
    die "Backup file not found: ${file}"
  fi

  # Optionally verify checksum before restoring
  if [[ -f "${file}.sha256" ]]; then
    log "Verifying checksum..."
    sha256sum -c "${file}.sha256" || die "Checksum mismatch — aborting restore"
    ok "Checksum verified"
  else
    warn "No checksum file found — proceeding without integrity check"
  fi

  log "Restoring PostgreSQL from: ${file}"
  echo -e "${RED}${BOLD}WARNING: This will overwrite ALL data in the PostgreSQL database.${RESET}"
  read -r -p "Type 'CONFIRM' to proceed: " confirm
  if [[ "$confirm" != "CONFIRM" ]]; then
    log "Aborted by user."
    exit 0
  fi

  export PGPASSWORD="${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}"
  gunzip -c "$file" | psql \
    -h "$POSTGRES_HOST" \
    -p "$POSTGRES_PORT" \
    -U "$POSTGRES_USER" \
    -d postgres \
    -v ON_ERROR_STOP=1
  unset PGPASSWORD

  ok "PostgreSQL restore complete from ${file}"
  notify_slack "ok" "PostgreSQL restore completed at ${TIMESTAMP}"
}

# ── Restore: Redis ────────────────────────────────────────────────────────────
restore_redis() {
  local file="${1:?Usage: restore redis <backup-file>}"
  check_redis_tools

  if [[ ! -f "$file" ]]; then
    die "Backup file not found: ${file}"
  fi

  if [[ -f "${file}.sha256" ]]; then
    log "Verifying checksum..."
    sha256sum -c "${file}.sha256" || die "Checksum mismatch — aborting restore"
    ok "Checksum verified"
  fi

  log "Restoring Redis from: ${file}"
  echo -e "${RED}${BOLD}WARNING: This will replace all Redis data.${RESET}"
  read -r -p "Type 'CONFIRM' to proceed: " confirm
  if [[ "$confirm" != "CONFIRM" ]]; then
    log "Aborted by user."
    exit 0
  fi

  local redis_args=("-h" "$REDIS_HOST" "-p" "$REDIS_PORT")
  [[ -n "${REDIS_AUTH:-}" ]] && redis_args+=("-a" "$REDIS_AUTH") && redis_args+=("--no-auth-warning")

  # Get RDB path from running Redis
  local rdb_dir rdb_name
  rdb_dir=$(redis-cli "${redis_args[@]}" CONFIG GET dir 2>/dev/null | tail -1)
  rdb_name=$(redis-cli "${redis_args[@]}" CONFIG GET dbfilename 2>/dev/null | tail -1)

  # Flush existing data and copy in new RDB
  redis-cli "${redis_args[@]}" CONFIG SET save ""          # disable auto-save temporarily
  redis-cli "${redis_args[@]}" DEBUG SLEEP 0 &>/dev/null || true

  gunzip -c "$file" > "${rdb_dir}/${rdb_name}.restore.$$"
  mv -f "${rdb_dir}/${rdb_name}.restore.$$" "${rdb_dir}/${rdb_name}"

  # Trigger reload
  redis-cli "${redis_args[@]}" DEBUG RELOAD &>/dev/null || \
    warn "DEBUG RELOAD not available — pod restart may be needed"

  ok "Redis restore complete from ${file}"
  notify_slack "ok" "Redis restore completed at ${TIMESTAMP}"
}

# ── Restore: MinIO ────────────────────────────────────────────────────────────
restore_minio() {
  local src_dir="${1:?Usage: restore minio <backup-directory>}"
  check_minio_tools

  if [[ ! -d "$src_dir" ]]; then
    die "Backup directory not found: ${src_dir}"
  fi

  log "Restoring MinIO bucket '${MINIO_BUCKET}' from: ${src_dir}"
  echo -e "${RED}${BOLD}WARNING: This will upload all files from ${src_dir} to the live bucket.${RESET}"
  read -r -p "Type 'CONFIRM' to proceed: " confirm
  if [[ "$confirm" != "CONFIRM" ]]; then
    log "Aborted by user."
    exit 0
  fi

  if command -v mc &>/dev/null; then
    mc alias set restore-target \
      "$MINIO_ENDPOINT" \
      "${MINIO_ACCESS_KEY:?}" \
      "${MINIO_SECRET_KEY:?}" &>/dev/null

    mc mirror \
      --overwrite \
      "${src_dir}/" \
      "restore-target/${MINIO_BUCKET}"

    mc alias rm restore-target &>/dev/null || true
  else
    AWS_ACCESS_KEY_ID="${MINIO_ACCESS_KEY:?}" \
    AWS_SECRET_ACCESS_KEY="${MINIO_SECRET_KEY:?}" \
    aws s3 sync \
      --endpoint-url "$MINIO_ENDPOINT" \
      "${src_dir}/" \
      "s3://${MINIO_BUCKET}"
  fi

  ok "MinIO restore complete from ${src_dir}"
  notify_slack "ok" "MinIO restore completed at ${TIMESTAMP}"
}

# ── List backups ──────────────────────────────────────────────────────────────
list_backups() {
  local target="${1:-all}"

  list_one() {
    local dir="$1"
    local label="$2"
    section "$label backups in ${dir}"
    if [[ -d "$dir" ]]; then
      find "$dir" -maxdepth 2 \( -name "*.gz" -o -name "*.sql.gz" -o -name "*.rdb.gz" \) \
        -printf "%TY-%Tm-%Td %TH:%TM  %s  %p\n" 2>/dev/null | sort -r | head -20 || \
        ls -lh "$dir" 2>/dev/null || echo "(empty)"
    else
      echo "  (directory not found: ${dir})"
    fi
  }

  [[ "$target" == "postgres" || "$target" == "all" ]] && list_one "${BACKUP_DIR}/postgres" "PostgreSQL"
  [[ "$target" == "redis"    || "$target" == "all" ]] && list_one "${BACKUP_DIR}/redis"    "Redis"
  [[ "$target" == "minio"    || "$target" == "all" ]] && list_one "${BACKUP_DIR}/minio"    "MinIO"
}

# ── Verify backup integrity ───────────────────────────────────────────────────
verify_backup() {
  local file="${1:?Usage: verify <backup-file>}"

  if [[ ! -f "$file" ]]; then
    die "File not found: ${file}"
  fi

  log "Verifying: ${file}"

  # 1. Checksum check
  if [[ -f "${file}.sha256" ]]; then
    sha256sum -c "${file}.sha256" && ok "SHA-256 checksum: VALID" || { fail "SHA-256 checksum: MISMATCH"; exit 1; }
  else
    warn "No .sha256 file found — skipping checksum verification"
  fi

  # 2. gzip integrity check
  if [[ "$file" == *.gz ]]; then
    if gzip -t "$file" 2>/dev/null; then
      ok "gzip integrity: VALID"
    else
      die "gzip integrity check FAILED — file may be corrupt"
    fi
  fi

  # 3. Content sanity for SQL dumps
  if [[ "$file" == *postgres*.sql.gz ]]; then
    local lines
    lines=$(gunzip -c "$file" | head -5 2>/dev/null)
    if echo "$lines" | grep -qi "PostgreSQL database dump"; then
      ok "SQL content: Looks like a valid PostgreSQL dump"
    else
      warn "SQL content: Could not confirm PostgreSQL dump header — inspect manually"
    fi
  fi

  ok "Verification complete: ${file}"
}

# ── Prune old backups ─────────────────────────────────────────────────────────
prune_backups() {
  local days="${RETENTION_DAYS}"

  # Parse --days flag
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --days) days="$2"; shift 2 ;;
      *) shift ;;
    esac
  done

  log "Pruning backups older than ${days} days from ${BACKUP_DIR}"

  local count=0
  while IFS= read -r -d '' f; do
    rm -f "$f" "${f}.sha256" 2>/dev/null || true
    log "Removed: ${f}"
    count=$((count+1))
  done < <(find "$BACKUP_DIR" -type f \( -name "*.gz" \) -mtime "+${days}" -print0 2>/dev/null)

  ok "Pruned ${count} backup file(s) older than ${days} days"
  notify_slack "ok" "Backup prune complete — removed ${count} file(s) older than ${days} days"
}

# ── Cron schedule guide ───────────────────────────────────────────────────────
print_schedule() {
  cat <<'EOF'

Recommended backup cron schedule
──────────────────────────────────────────────────────────────────────────────
 # Daily full backup at 02:00 UTC
 0 2 * * *  /app/scripts/backup-restore.sh backup all  >> /var/log/backup.log 2>&1

 # Weekly verification of yesterday's backup
 0 6 * * 1  /app/scripts/backup-restore.sh verify \
              $(ls -t /backups/postgres/*.sql.gz | head -1) \
              >> /var/log/backup-verify.log 2>&1

 # Monthly prune (keep 30 days)
 0 3 1 * *  /app/scripts/backup-restore.sh prune --days 30 \
              >> /var/log/backup-prune.log 2>&1
──────────────────────────────────────────────────────────────────────────────
The Kubernetes CronJob in k8s/backup-cronjob.yaml runs 'backup all' on this
same schedule. Ensure BACKUP_DIR is the same path as the PVC mount point.

EOF
}

# ── Usage ─────────────────────────────────────────────────────────────────────
usage() {
  cat <<EOF
Usage: $(basename "$0") <command> [target] [options]

Commands:
  backup   [postgres|redis|minio|all]          Create backup(s)
  restore  <postgres|redis|minio> <file>       Restore from backup file
  list     [postgres|redis|minio|all]          List available backups
  verify   <file>                              Verify backup integrity
  prune    [--days <n>]                        Delete backups older than N days
  schedule                                     Print recommended cron schedule
  help                                         Show this message

Environment variables:
  BACKUP_DIR, POSTGRES_HOST, POSTGRES_PORT, POSTGRES_USER, POSTGRES_PASSWORD,
  REDIS_HOST, REDIS_PORT, REDIS_AUTH,
  MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_BUCKET,
  RETENTION_DAYS, SLACK_WEBHOOK_URL

Examples:
  $0 backup all
  $0 backup postgres
  $0 restore postgres /backups/postgres/postgres-2025-01-15T02-00-00.sql.gz
  $0 list all
  $0 verify /backups/postgres/postgres-2025-01-15T02-00-00.sql.gz
  $0 prune --days 14
EOF
}

# ── Main ──────────────────────────────────────────────────────────────────────
main() {
  local command="${1:-help}"
  shift || true

  hr
  echo -e "${BOLD}Let's Connect — Backup & Restore${RESET}  |  $(date -u)"
  hr

  case "$command" in
    backup)
      local target="${1:-all}"
      case "$target" in
        postgres) backup_postgres ;;
        redis)    backup_redis ;;
        minio)    backup_minio ;;
        all)
          section "Full backup: all datastores"
          backup_postgres
          backup_redis
          backup_minio
          ok "All backups complete."
          ;;
        *) die "Unknown target: ${target}. Use postgres, redis, minio, or all." ;;
      esac
      ;;

    restore)
      local subtarget="${1:?Usage: restore <postgres|redis|minio> <file>}"
      local file="${2:?Usage: restore <target> <file>}"
      case "$subtarget" in
        postgres) restore_postgres "$file" ;;
        redis)    restore_redis    "$file" ;;
        minio)    restore_minio    "$file" ;;
        *) die "Unknown target: ${subtarget}. Use postgres, redis, or minio." ;;
      esac
      ;;

    list)    list_backups   "${1:-all}" ;;
    verify)  verify_backup  "${1:?Usage: verify <file>}" ;;
    prune)   prune_backups  "$@" ;;
    schedule) print_schedule ;;
    help|--help|-h) usage ;;
    *) fail "Unknown command: ${command}"; usage; exit 2 ;;
  esac
}

main "$@"
