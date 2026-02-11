#!/bin/bash
# Phase 6: Database Restore Script
# Restore PostgreSQL databases from backup files

set -e

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

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups}"
PG_HOST="${POSTGRES_HOST:-postgres}"
PG_PORT="${POSTGRES_PORT:-5432}"
PG_USER="${POSTGRES_USER:-postgres}"
PG_PASSWORD="${POSTGRES_PASSWORD:-postgres}"

export PGPASSWORD="$PG_PASSWORD"

# Display usage
usage() {
    cat <<EOF
Usage: $0 [OPTIONS]

Restore PostgreSQL databases from backup files.

Options:
  -f FILE          Backup file to restore (required)
  -d DATABASE      Target database name (required)
  -t TIMESTAMP     Restore from specific timestamp (format: YYYYMMDD_HHMMSS)
  -l               List available backups
  -h               Display this help message

Examples:
  # Restore from specific file
  $0 -f /backups/users_20260211_120000.sql.gz -d users

  # Restore from timestamp
  $0 -d users -t 20260211_120000

  # List available backups
  $0 -l
EOF
    exit 1
}

# List available backups
list_backups() {
    log "Available backups in $BACKUP_DIR:"
    echo ""
    
    if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A $BACKUP_DIR/*.sql.gz 2>/dev/null)" ]; then
        warn "No backups found in $BACKUP_DIR"
        exit 0
    fi
    
    for backup in "$BACKUP_DIR"/*.sql.gz; do
        if [ -f "${backup}.meta" ]; then
            # Parse metadata
            db=$(grep '"database"' "${backup}.meta" | cut -d'"' -f4)
            timestamp=$(grep '"timestamp"' "${backup}.meta" | cut -d'"' -f4)
            date=$(grep '"date"' "${backup}.meta" | cut -d'"' -f4)
            size=$(du -h "$backup" | cut -f1)
            
            echo "  Database: $db"
            echo "  Timestamp: $timestamp"
            echo "  Date: $date"
            echo "  Size: $size"
            echo "  File: $(basename $backup)"
            echo "  ---"
        else
            echo "  File: $(basename $backup) (no metadata)"
            echo "  Size: $(du -h "$backup" | cut -f1)"
            echo "  ---"
        fi
    done
    
    exit 0
}

# Restore database from backup file
restore_database() {
    local backup_file=$1
    local db_name=$2
    
    if [ ! -f "$backup_file" ]; then
        error "Backup file not found: $backup_file"
        exit 1
    fi
    
    log "Restoring database '$db_name' from backup..."
    log "Backup file: $backup_file"
    
    # Confirm restore
    warn "This will REPLACE the current database '$db_name' with the backup!"
    read -p "Are you sure you want to continue? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        log "Restore cancelled"
        exit 0
    fi
    
    # Drop existing connections
    log "Terminating existing connections to database '$db_name'..."
    psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d postgres -c \
        "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$db_name' AND pid <> pg_backend_pid();" \
        2>/dev/null || true
    
    # Drop and recreate database
    log "Dropping database '$db_name'..."
    psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d postgres -c "DROP DATABASE IF EXISTS $db_name;" || {
        error "Failed to drop database"
        exit 1
    }
    
    log "Creating database '$db_name'..."
    psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d postgres -c "CREATE DATABASE $db_name;" || {
        error "Failed to create database"
        exit 1
    }
    
    # Restore from backup
    log "Restoring data from backup..."
    if gunzip -c "$backup_file" | psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$db_name"; then
        log "✓ Database '$db_name' restored successfully"
        
        # Verify restore
        log "Verifying restore..."
        table_count=$(psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$db_name" -t -c \
            "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
        log "✓ Restored $table_count tables"
        
        return 0
    else
        error "Failed to restore database"
        return 1
    fi
}

# Parse command line arguments
BACKUP_FILE=""
DATABASE=""
TIMESTAMP=""
LIST_BACKUPS=false

while getopts "f:d:t:lh" opt; do
    case $opt in
        f) BACKUP_FILE="$OPTARG" ;;
        d) DATABASE="$OPTARG" ;;
        t) TIMESTAMP="$OPTARG" ;;
        l) LIST_BACKUPS=true ;;
        h) usage ;;
        *) usage ;;
    esac
done

# List backups if requested
if [ "$LIST_BACKUPS" = true ]; then
    list_backups
fi

# Validate arguments
if [ -z "$DATABASE" ]; then
    error "Database name is required (-d option)"
    usage
fi

# Determine backup file
if [ -n "$BACKUP_FILE" ]; then
    # Use specified file
    if [ ! -f "$BACKUP_FILE" ]; then
        error "Backup file not found: $BACKUP_FILE"
        exit 1
    fi
elif [ -n "$TIMESTAMP" ]; then
    # Find backup by timestamp
    BACKUP_FILE="$BACKUP_DIR/${DATABASE}_${TIMESTAMP}.sql.gz"
    if [ ! -f "$BACKUP_FILE" ]; then
        error "Backup not found for database '$DATABASE' at timestamp '$TIMESTAMP'"
        exit 1
    fi
else
    # Find latest backup for database
    BACKUP_FILE=$(ls -t "$BACKUP_DIR/${DATABASE}_"*.sql.gz 2>/dev/null | head -1)
    if [ -z "$BACKUP_FILE" ]; then
        error "No backups found for database '$DATABASE'"
        exit 1
    fi
    log "Using latest backup: $(basename $BACKUP_FILE)"
fi

# Perform restore
restore_database "$BACKUP_FILE" "$DATABASE"
