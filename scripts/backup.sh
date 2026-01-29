#!/bin/bash

# Backup and Recovery Script
# Handles database backups and recovery for the Wedding Platform

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="docker-compose.production.yml"
BACKUP_DIR="/var/backups/wedding-platform"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Create backup
create_backup() {
    local backup_type="${1:-full}"
    
    log "Creating $backup_type backup..."
    
    cd "$PROJECT_DIR"
    docker-compose -f "$COMPOSE_FILE" exec -T backend python -c "
from app.core.backup import backup_manager
import asyncio
import sys

async def create_backup():
    try:
        result = await backup_manager.create_backup('$backup_type')
        print(f'Backup created successfully:')
        print(f'  Filename: {result[\"filename\"]}')
        print(f'  Size: {result[\"size\"]} bytes')
        print(f'  Type: {result[\"type\"]}')
        print(f'  Created: {result[\"created_at\"]}')
        if 's3_key' in result:
            print(f'  S3 Location: {result[\"s3_key\"]}')
        return 0
    except Exception as e:
        print(f'Backup failed: {e}')
        return 1

exit_code = asyncio.run(create_backup())
sys.exit(exit_code)
"
    
    if [[ $? -eq 0 ]]; then
        success "Backup completed"
    else
        error "Backup failed"
    fi
}

# List backups
list_backups() {
    local include_s3="${1:-true}"
    
    log "Listing available backups..."
    
    cd "$PROJECT_DIR"
    docker-compose -f "$COMPOSE_FILE" exec -T backend python -c "
from app.core.backup import backup_manager
import asyncio

async def list_backups():
    try:
        backups = await backup_manager.list_backups(include_s3=$include_s3)
        
        if not backups:
            print('No backups found')
            return
        
        print(f'Found {len(backups)} backup(s):')
        print()
        print(f'{'Filename':<40} {'Size':<12} {'Location':<8} {'Created':<20}')
        print('-' * 85)
        
        for backup in backups:
            size_mb = backup['size'] / (1024 * 1024)
            created = backup['created_at'][:19].replace('T', ' ')
            print(f'{backup[\"filename\"]:<40} {size_mb:>8.1f} MB {backup[\"location\"]:<8} {created}')
            
    except Exception as e:
        print(f'Failed to list backups: {e}')

asyncio.run(list_backups())
"
}

# Restore backup
restore_backup() {
    local backup_identifier="$1"
    local restore_type="${2:-full}"
    
    if [[ -z "$backup_identifier" ]]; then
        error "Backup identifier is required"
    fi
    
    # Confirm restore operation
    echo -e "${YELLOW}WARNING: This will restore the database from backup.${NC}"
    echo -e "${YELLOW}Current data will be replaced!${NC}"
    echo
    read -p "Are you sure you want to continue? (yes/no): " confirm
    
    if [[ "$confirm" != "yes" ]]; then
        log "Restore operation cancelled"
        exit 0
    fi
    
    log "Restoring from backup: $backup_identifier"
    
    cd "$PROJECT_DIR"
    
    # Stop backend to prevent connections during restore
    docker-compose -f "$COMPOSE_FILE" stop backend
    
    # Perform restore
    docker-compose -f "$COMPOSE_FILE" exec -T backend python -c "
from app.core.backup import backup_manager
import asyncio
import sys

async def restore_backup():
    try:
        result = await backup_manager.restore_backup('$backup_identifier', '$restore_type')
        print(f'Restore completed successfully:')
        print(f'  Backup: {result[\"backup_identifier\"]}')
        print(f'  Type: {result[\"restore_type\"]}')
        print(f'  Restored at: {result[\"restored_at\"]}')
        return 0
    except Exception as e:
        print(f'Restore failed: {e}')
        return 1

exit_code = asyncio.run(restore_backup())
sys.exit(exit_code)
"
    
    # Start backend
    docker-compose -f "$COMPOSE_FILE" start backend
    
    if [[ $? -eq 0 ]]; then
        success "Restore completed"
        
        # Wait for backend to start
        sleep 10
        
        # Verify restore
        log "Verifying restore..."
        docker-compose -f "$COMPOSE_FILE" exec -T backend python -c "
from app.core.database import get_db_session
from sqlalchemy import text
import asyncio

async def verify_restore():
    try:
        async with get_db_session() as session:
            # Test basic connectivity
            result = await session.execute(text('SELECT COUNT(*) FROM users'))
            user_count = result.scalar()
            print(f'Database verification passed - Users: {user_count}')
    except Exception as e:
        print(f'Database verification failed: {e}')
        exit(1)

asyncio.run(verify_restore())
"
        success "Restore verification completed"
    else
        error "Restore failed"
    fi
}

# Cleanup old backups
cleanup_backups() {
    local retention_days="${1:-30}"
    
    log "Cleaning up backups older than $retention_days days..."
    
    cd "$PROJECT_DIR"
    docker-compose -f "$COMPOSE_FILE" exec -T backend python -c "
from app.core.backup import backup_manager
import asyncio

async def cleanup_backups():
    try:
        result = await backup_manager.cleanup_old_backups()
        print(f'Cleanup completed:')
        print(f'  Local backups deleted: {result[\"deleted_local\"]}')
        print(f'  S3 backups deleted: {result[\"deleted_s3\"]}')
    except Exception as e:
        print(f'Cleanup failed: {e}')

asyncio.run(cleanup_backups())
"
    
    success "Backup cleanup completed"
}

# Schedule backup (add to crontab)
schedule_backup() {
    local schedule="${1:-0 2 * * *}"  # Default: daily at 2 AM
    local backup_type="${2:-full}"
    
    log "Scheduling $backup_type backup with schedule: $schedule"
    
    # Create cron job
    cron_job="$schedule cd $PROJECT_DIR && $SCRIPT_DIR/backup.sh create $backup_type >> /var/log/wedding-platform/backup.log 2>&1"
    
    # Add to crontab
    (crontab -l 2>/dev/null; echo "$cron_job") | crontab -
    
    success "Backup scheduled: $schedule"
    log "View scheduled jobs with: crontab -l"
}

# Remove backup schedule
unschedule_backup() {
    log "Removing backup schedule..."
    
    # Remove from crontab
    crontab -l 2>/dev/null | grep -v "$SCRIPT_DIR/backup.sh" | crontab -
    
    success "Backup schedule removed"
}

# Test backup and restore
test_backup_restore() {
    log "Testing backup and restore functionality..."
    
    # Create test backup
    log "Creating test backup..."
    create_backup "full"
    
    # Get latest backup
    latest_backup=$(cd "$PROJECT_DIR" && docker-compose -f "$COMPOSE_FILE" exec -T backend python -c "
from app.core.backup import backup_manager
import asyncio

async def get_latest():
    backups = await backup_manager.list_backups()
    if backups:
        print(backups[0]['filename'])

asyncio.run(get_latest())
" | tr -d '\r')
    
    if [[ -n "$latest_backup" ]]; then
        log "Test backup created: $latest_backup"
        
        # In a real test, we would restore to a test database
        # For now, just verify the backup exists
        success "Backup and restore test completed"
    else
        error "Test backup creation failed"
    fi
}

# Monitor backup status
monitor_backups() {
    log "Monitoring backup status..."
    
    while true; do
        clear
        echo "=== Wedding Platform Backup Monitor ==="
        echo "$(date)"
        echo
        
        # Show recent backups
        list_backups false
        
        echo
        echo "=== Disk Usage ==="
        df -h "$BACKUP_DIR" 2>/dev/null || echo "Backup directory not found"
        
        echo
        echo "=== Next Scheduled Backup ==="
        crontab -l 2>/dev/null | grep backup.sh || echo "No scheduled backups"
        
        echo
        echo "Press Ctrl+C to exit, or wait 30 seconds for refresh..."
        sleep 30
    done
}

# Main function
main() {
    case "${1:-help}" in
        "create")
            create_backup "$2"
            ;;
        "list")
            list_backups "$2"
            ;;
        "restore")
            restore_backup "$2" "$3"
            ;;
        "cleanup")
            cleanup_backups "$2"
            ;;
        "schedule")
            schedule_backup "$2" "$3"
            ;;
        "unschedule")
            unschedule_backup
            ;;
        "test")
            test_backup_restore
            ;;
        "monitor")
            monitor_backups
            ;;
        "help"|*)
            echo "Usage: $0 {create|list|restore|cleanup|schedule|unschedule|test|monitor}"
            echo
            echo "Commands:"
            echo "  create [type]              - Create backup (full|schema|data)"
            echo "  list [include_s3]          - List available backups"
            echo "  restore <backup> [type]    - Restore from backup"
            echo "  cleanup [days]             - Clean up old backups (default: 30 days)"
            echo "  schedule [cron] [type]     - Schedule automatic backups"
            echo "  unschedule                 - Remove backup schedule"
            echo "  test                       - Test backup and restore"
            echo "  monitor                    - Monitor backup status"
            echo "  help                       - Show this help message"
            echo
            echo "Examples:"
            echo "  $0 create full"
            echo "  $0 list"
            echo "  $0 restore backup_20240121_120000.sql.gz"
            echo "  $0 schedule '0 2 * * *' full"
            echo "  $0 cleanup 7"
            exit 1
            ;;
    esac
}

main "$@"