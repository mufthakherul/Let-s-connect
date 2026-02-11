#!/bin/bash
# Phase 6: Database Backup Script
# Automated PostgreSQL backup with point-in-time recovery support

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATABASES=("users" "content" "messages" "collaboration" "media" "shop" "ai")

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" >&2
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

log "Starting database backup process..."

# PostgreSQL connection details
PG_HOST="${POSTGRES_HOST:-postgres}"
PG_PORT="${POSTGRES_PORT:-5432}"
PG_USER="${POSTGRES_USER:-postgres}"
PG_PASSWORD="${POSTGRES_PASSWORD:-postgres}"

export PGPASSWORD="$PG_PASSWORD"

# Function to backup a single database
backup_database() {
    local db_name=$1
    local backup_file="$BACKUP_DIR/${db_name}_${TIMESTAMP}.sql.gz"
    
    log "Backing up database: $db_name"
    
    if pg_dump -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$db_name" | gzip > "$backup_file"; then
        local size=$(du -h "$backup_file" | cut -f1)
        log "✓ Database '$db_name' backed up successfully ($size)"
        
        # Create metadata file
        cat > "${backup_file}.meta" <<EOF
{
  "database": "$db_name",
  "timestamp": "$TIMESTAMP",
  "date": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "size": "$(stat -f%z "$backup_file" 2>/dev/null || stat -c%s "$backup_file")",
  "host": "$PG_HOST",
  "type": "full",
  "compression": "gzip"
}
EOF
        return 0
    else
        error "Failed to backup database '$db_name'"
        return 1
    fi
}

# Backup all databases
success_count=0
failure_count=0

for db in "${DATABASES[@]}"; do
    if backup_database "$db"; then
        ((success_count++))
    else
        ((failure_count++))
    fi
done

# Backup Redis data (if available)
if command -v redis-cli &> /dev/null; then
    log "Backing up Redis data..."
    REDIS_HOST="${REDIS_HOST:-redis}"
    REDIS_PORT="${REDIS_PORT:-6379}"
    
    if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" --rdb "$BACKUP_DIR/redis_${TIMESTAMP}.rdb"; then
        log "✓ Redis backed up successfully"
        ((success_count++))
    else
        warn "Failed to backup Redis"
        ((failure_count++))
    fi
fi

# Clean up old backups
log "Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "*.meta" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "*.rdb" -mtime +$RETENTION_DAYS -delete

log "Backup cleanup completed"

# Create backup summary
SUMMARY_FILE="$BACKUP_DIR/backup_${TIMESTAMP}_summary.txt"
cat > "$SUMMARY_FILE" <<EOF
Backup Summary - $(date)
====================================
Total databases: ${#DATABASES[@]}
Successful: $success_count
Failed: $failure_count
Retention period: $RETENTION_DAYS days
Backup location: $BACKUP_DIR

Database backups:
EOF

for db in "${DATABASES[@]}"; do
    backup_file="$BACKUP_DIR/${db}_${TIMESTAMP}.sql.gz"
    if [ -f "$backup_file" ]; then
        size=$(du -h "$backup_file" | cut -f1)
        echo "  ✓ $db ($size)" >> "$SUMMARY_FILE"
    else
        echo "  ✗ $db (failed)" >> "$SUMMARY_FILE"
    fi
done

log "======================================"
log "Backup Summary:"
log "  Successful: $success_count"
log "  Failed: $failure_count"
log "  Location: $BACKUP_DIR"
log "======================================"

if [ $failure_count -gt 0 ]; then
    error "Backup completed with $failure_count failures"
    exit 1
else
    log "✓ All backups completed successfully"
    exit 0
fi
