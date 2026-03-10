#!/bin/bash
# Workstream F5: Backup and Recovery Automation
# Automated database backup with verification and restore drills
# 
# Usage:
#   ./backup-automation.sh backup    # Create backup
#   ./backup-automation.sh verify    # Verify latest backup
#   ./backup-automation.sh restore <backup_file>  # Restore from backup
#   ./backup-automation.sh drill     # Run restore drill (test environment)

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/var/backups/postgres}"
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
S3_BUCKET="${BACKUP_S3_BUCKET}"
ENABLE_COMPRESSION=true
ENABLE_S3_UPLOAD=false

# Timestamp
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
LOG_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Create backup directory
mkdir -p "$BACKUP_DIR"

# List of databases to backup
declare -a DATABASES=(
    "users"
    "content"
    "messages"
    "collaboration"
    "media"
    "shop"
)

# Backup function
backup_database() {
    local db_name=$1
    local backup_file="${BACKUP_DIR}/${db_name}_${TIMESTAMP}.sql"
    
    log_info "Starting backup of database: ${db_name}"
    
    # Set password for pg_dump
    export PGPASSWORD="$POSTGRES_PASSWORD"
    
    # Create backup
    if $ENABLE_COMPRESSION; then
        backup_file="${backup_file}.gz"
        pg_dump -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" \
            -F c -b -v -f "${backup_file%.gz}" "$db_name" 2>&1 | tee -a "$LOG_FILE"
        gzip "${backup_file%.gz}"
    else
        pg_dump -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" \
            -F c -b -v -f "$backup_file" "$db_name" 2>&1 | tee -a "$LOG_FILE"
    fi
    
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        local size=$(du -h "$backup_file" | cut -f1)
        log_info "Backup completed: ${backup_file} (${size})"
        
        # Calculate checksum
        local checksum=$(sha256sum "$backup_file" | awk '{print $1}')
        echo "$checksum" > "${backup_file}.sha256"
        log_info "Checksum: ${checksum}"
        
        # Upload to S3 if enabled
        if [ "$ENABLE_S3_UPLOAD" = true ] && [ -n "$S3_BUCKET" ]; then
            upload_to_s3 "$backup_file"
        fi
        
        return 0
    else
        log_error "Backup failed for database: ${db_name}"
        return 1
    fi
}

# Upload to S3
upload_to_s3() {
    local file=$1
    local s3_path="s3://${S3_BUCKET}/backups/$(basename $file)"
    
    log_info "Uploading to S3: ${s3_path}"
    
    if command -v aws &> /dev/null; then
        aws s3 cp "$file" "$s3_path" --storage-class STANDARD_IA
        aws s3 cp "${file}.sha256" "${s3_path}.sha256"
        log_info "S3 upload completed"
    else
        log_warn "AWS CLI not found, skipping S3 upload"
    fi
}

# Verify backup integrity
verify_backup() {
    local backup_file=$1
    
    log_info "Verifying backup: ${backup_file}"
    
    # Check if backup file exists
    if [ ! -f "$backup_file" ]; then
        log_error "Backup file not found: ${backup_file}"
        return 1
    fi
    
    # Verify checksum if available
    if [ -f "${backup_file}.sha256" ]; then
        local expected_checksum=$(cat "${backup_file}.sha256")
        local actual_checksum=$(sha256sum "$backup_file" | awk '{print $1}')
        
        if [ "$expected_checksum" = "$actual_checksum" ]; then
            log_info "Checksum verification passed"
        else
            log_error "Checksum verification failed!"
            log_error "Expected: ${expected_checksum}"
            log_error "Actual: ${actual_checksum}"
            return 1
        fi
    fi
    
    # Check if backup is readable by pg_restore
    export PGPASSWORD="$POSTGRES_PASSWORD"
    
    if $ENABLE_COMPRESSION; then
        gunzip -t "$backup_file" 2>&1 | tee -a "$LOG_FILE"
        local gunzip_exit=$?
        if [ $gunzip_exit -ne 0 ]; then
            log_error "Backup file is corrupted (gunzip failed)"
            return 1
        fi
    fi
    
    # List contents of backup
    local contents=$(pg_restore -l "${backup_file%.gz}" 2>&1 | wc -l)
    if [ $contents -gt 0 ]; then
        log_info "Backup contains ${contents} database objects"
        log_info "Backup verification passed"
        return 0
    else
        log_error "Backup appears to be empty or corrupted"
        return 1
    fi
}

# Restore from backup
restore_database() {
    local backup_file=$1
    local target_db=$2
    
    log_warn "Starting restore from: ${backup_file} to database: ${target_db}"
    log_warn "This will DROP and recreate the database!"
    
    # Safety check - require confirmation for production
    if [ "$ENVIRONMENT" = "production" ] && [ -z "$FORCE_RESTORE" ]; then
        log_error "Refusing to restore in production without FORCE_RESTORE=true"
        return 1
    fi
    
    # Verify backup before restoring
    verify_backup "$backup_file"
    if [ $? -ne 0 ]; then
        log_error "Backup verification failed, aborting restore"
        return 1
    fi
    
    export PGPASSWORD="$POSTGRES_PASSWORD"
    
    # Drop existing database (with caution!)
    log_warn "Dropping database: ${target_db}"
    psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" \
        -c "DROP DATABASE IF EXISTS ${target_db};" 2>&1 | tee -a "$LOG_FILE"
    
    # Create fresh database
    log_info "Creating database: ${target_db}"
    psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" \
        -c "CREATE DATABASE ${target_db};" 2>&1 | tee -a "$LOG_FILE"
    
    # Restore backup
    log_info "Restoring backup..."
    if $ENABLE_COMPRESSION; then
        gunzip -c "$backup_file" | pg_restore -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" \
            -U "$POSTGRES_USER" -d "$target_db" -v 2>&1 | tee -a "$LOG_FILE"
    else
        pg_restore -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" \
            -d "$target_db" -v "$backup_file" 2>&1 | tee -a "$LOG_FILE"
    fi
    
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        log_info "Restore completed successfully"
        return 0
    else
        log_error "Restore failed with exit code: ${exit_code}"
        return 1
    fi
}

# Run restore drill (test restore in separate database)
restore_drill() {
    log_info "Starting restore drill"
    
    # Find latest backup
    local latest_backup=$(ls -t ${BACKUP_DIR}/*.sql* 2>/dev/null | head -1)
    
    if [ -z "$latest_backup" ]; then
        log_error "No backups found in ${BACKUP_DIR}"
        return 1
    fi
    
    log_info "Using backup: ${latest_backup}"
    
    # Create test database
    local test_db="restore_drill_$(date '+%Y%m%d_%H%M%S')"
    log_info "Creating test database: ${test_db}"
    
    export PGPASSWORD="$POSTGRES_PASSWORD"
    psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" \
        -c "CREATE DATABASE ${test_db};" 2>&1 | tee -a "$LOG_FILE"
    
    # Restore to test database
    restore_database "$latest_backup" "$test_db"
    local restore_exit=$?
    
    # Run validation queries
    if [ $restore_exit -eq 0 ]; then
        log_info "Running validation queries..."
        
        # Count tables
        local table_count=$(psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" \
            -d "$test_db" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
        log_info "Restored ${table_count} tables"
        
        # Check for data
        local row_count=$(psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" \
            -d "$test_db" -t -c "SELECT COUNT(*) FROM information_schema.columns;")
        log_info "Restored ${row_count} columns across all tables"
    fi
    
    # Cleanup test database
    log_info "Cleaning up test database: ${test_db}"
    psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" \
        -c "DROP DATABASE ${test_db};" 2>&1 | tee -a "$LOG_FILE"
    
    if [ $restore_exit -eq 0 ]; then
        log_info "Restore drill PASSED ✓"
        return 0
    else
        log_error "Restore drill FAILED ✗"
        return 1
    fi
}

# Cleanup old backups
cleanup_old_backups() {
    log_info "Cleaning up backups older than ${RETENTION_DAYS} days"
    
    find "$BACKUP_DIR" -name "*.sql*" -type f -mtime +${RETENTION_DAYS} -print -delete | tee -a "$LOG_FILE"
    
    log_info "Cleanup completed"
}

# Main execution
case "${1:-}" in
    backup)
        log_info "=== Starting backup operation ==="
        failed=0
        for db in "${DATABASES[@]}"; do
            backup_database "$db"
            if [ $? -ne 0 ]; then
                ((failed++))
            fi
        done
        
        cleanup_old_backups
        
        if [ $failed -eq 0 ]; then
            log_info "=== All backups completed successfully ==="
            exit 0
        else
            log_error "=== ${failed} backup(s) failed ==="
            exit 1
        fi
        ;;
    
    verify)
        log_info "=== Starting backup verification ==="
        backup_file="${2:-$(ls -t ${BACKUP_DIR}/*.sql* 2>/dev/null | head -1)}"
        verify_backup "$backup_file"
        exit $?
        ;;
    
    restore)
        if [ -z "$2" ] || [ -z "$3" ]; then
            log_error "Usage: $0 restore <backup_file> <target_database>"
            exit 1
        fi
        log_info "=== Starting restore operation ==="
        restore_database "$2" "$3"
        exit $?
        ;;
    
    drill)
        log_info "=== Starting restore drill ==="
        restore_drill
        exit $?
        ;;
    
    *)
        echo "Usage: $0 {backup|verify|restore|drill}"

        echo "  backup          - Create backups of all databases"
        echo "  verify [file]   - Verify backup integrity"
        echo "  restore <file> <db> - Restore from backup"
        echo "  drill           - Run restore drill (test restore)"
        exit 1
        ;;
esac
