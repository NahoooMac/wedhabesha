#!/bin/bash

# Database Migration Script
# Handles database migrations and seeding for the Wedding Platform

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="docker-compose.production.yml"

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

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Check if database is ready
wait_for_db() {
    log "Waiting for database to be ready..."
    
    timeout=60
    while ! docker-compose -f "$PROJECT_DIR/$COMPOSE_FILE" exec -T postgres pg_isready -U wedding_user -d wedding_platform; do
        sleep 2
        timeout=$((timeout - 2))
        if [[ $timeout -le 0 ]]; then
            error "Database failed to start within 60 seconds"
        fi
    done
    
    success "Database is ready"
}

# Run migrations
run_migrations() {
    log "Running database migrations..."
    
    cd "$PROJECT_DIR"
    docker-compose -f "$COMPOSE_FILE" exec -T backend alembic upgrade head
    
    success "Migrations completed"
}

# Create migration
create_migration() {
    local message="$1"
    if [[ -z "$message" ]]; then
        error "Migration message is required"
    fi
    
    log "Creating new migration: $message"
    
    cd "$PROJECT_DIR"
    docker-compose -f "$COMPOSE_FILE" exec -T backend alembic revision --autogenerate -m "$message"
    
    success "Migration created"
}

# Show migration history
show_history() {
    log "Migration history:"
    
    cd "$PROJECT_DIR"
    docker-compose -f "$COMPOSE_FILE" exec -T backend alembic history --verbose
}

# Show current revision
show_current() {
    log "Current database revision:"
    
    cd "$PROJECT_DIR"
    docker-compose -f "$COMPOSE_FILE" exec -T backend alembic current --verbose
}

# Rollback migration
rollback_migration() {
    local revision="$1"
    if [[ -z "$revision" ]]; then
        revision="-1"  # Rollback one revision
    fi
    
    log "Rolling back to revision: $revision"
    
    cd "$PROJECT_DIR"
    docker-compose -f "$COMPOSE_FILE" exec -T backend alembic downgrade "$revision"
    
    success "Rollback completed"
}

# Seed database with initial data
seed_database() {
    log "Seeding database with initial data..."
    
    cd "$PROJECT_DIR"
    docker-compose -f "$COMPOSE_FILE" exec -T backend python -c "
import asyncio
from app.core.database import get_db_session
from app.models.user import User, UserType, AuthProvider
from app.models.vendor import VendorCategory
from app.core.security import get_password_hash
from sqlalchemy import text

async def seed_data():
    async with get_db_session() as session:
        # Check if admin user exists
        admin_exists = await session.execute(
            text('SELECT COUNT(*) FROM users WHERE user_type = :user_type'),
            {'user_type': 'ADMIN'}
        )
        
        if admin_exists.scalar() == 0:
            # Create admin user
            admin = User(
                email='admin@wedhabesha.com',
                password_hash=get_password_hash('admin123!@#'),
                user_type=UserType.ADMIN,
                auth_provider=AuthProvider.EMAIL,
                is_active=True
            )
            session.add(admin)
            print('Admin user created: admin@wedhabesha.com')
        else:
            print('Admin user already exists')
        
        # Create vendor categories if they don't exist
        categories = [
            'Photography', 'Videography', 'Catering', 'Venue', 'Music & DJ',
            'Flowers & Decoration', 'Wedding Dress', 'Makeup & Hair',
            'Transportation', 'Wedding Cake', 'Jewelry', 'Invitations'
        ]
        
        for category in categories:
            exists = await session.execute(
                text('SELECT COUNT(*) FROM vendor_categories WHERE name = :name'),
                {'name': category}
            )
            
            if exists.scalar() == 0:
                await session.execute(
                    text('INSERT INTO vendor_categories (name, description) VALUES (:name, :desc)'),
                    {'name': category, 'desc': f'{category} services for weddings'}
                )
                print(f'Created vendor category: {category}')
        
        await session.commit()
        print('Database seeding completed')

asyncio.run(seed_data())
"
    
    success "Database seeded"
}

# Reset database (DANGEROUS - only for development)
reset_database() {
    if [[ "$ENVIRONMENT" == "production" ]]; then
        error "Database reset is not allowed in production"
    fi
    
    read -p "Are you sure you want to reset the database? This will delete all data! (yes/no): " confirm
    if [[ "$confirm" != "yes" ]]; then
        log "Database reset cancelled"
        exit 0
    fi
    
    log "Resetting database..."
    
    cd "$PROJECT_DIR"
    
    # Stop services
    docker-compose -f "$COMPOSE_FILE" stop backend
    
    # Drop and recreate database
    docker-compose -f "$COMPOSE_FILE" exec -T postgres psql -U wedding_user -c "DROP DATABASE IF EXISTS wedding_platform;"
    docker-compose -f "$COMPOSE_FILE" exec -T postgres psql -U wedding_user -c "CREATE DATABASE wedding_platform;"
    
    # Start backend
    docker-compose -f "$COMPOSE_FILE" start backend
    
    # Wait for backend to be ready
    sleep 10
    
    # Run migrations
    run_migrations
    
    # Seed database
    seed_database
    
    success "Database reset completed"
}

# Backup database before migration
backup_before_migration() {
    log "Creating backup before migration..."
    
    cd "$PROJECT_DIR"
    docker-compose -f "$COMPOSE_FILE" exec -T backend python -c "
from app.core.backup import backup_manager
import asyncio
try:
    result = asyncio.run(backup_manager.create_backup('full'))
    print(f'Pre-migration backup created: {result[\"filename\"]}')
except Exception as e:
    print(f'Backup failed: {e}')
    exit(1)
"
    
    success "Pre-migration backup completed"
}

# Validate database schema
validate_schema() {
    log "Validating database schema..."
    
    cd "$PROJECT_DIR"
    docker-compose -f "$COMPOSE_FILE" exec -T backend python -c "
import asyncio
from app.core.database import get_db_session
from sqlalchemy import text, inspect

async def validate_schema():
    async with get_db_session() as session:
        # Check if all required tables exist
        required_tables = [
            'users', 'couples', 'vendors', 'weddings', 'guests', 
            'checkins', 'budgets', 'budget_categories', 'expenses',
            'vendor_leads', 'reviews', 'alembic_version'
        ]
        
        inspector = inspect(session.bind)
        existing_tables = inspector.get_table_names()
        
        missing_tables = [table for table in required_tables if table not in existing_tables]
        
        if missing_tables:
            print(f'Missing tables: {missing_tables}')
            exit(1)
        else:
            print('All required tables exist')
        
        # Check alembic version
        result = await session.execute(text('SELECT version_num FROM alembic_version'))
        version = result.scalar()
        print(f'Current database version: {version}')
        
        print('Schema validation passed')

asyncio.run(validate_schema())
"
    
    success "Schema validation completed"
}

# Main function
main() {
    case "${1:-help}" in
        "migrate")
            wait_for_db
            backup_before_migration
            run_migrations
            validate_schema
            ;;
        "create")
            create_migration "$2"
            ;;
        "history")
            show_history
            ;;
        "current")
            show_current
            ;;
        "rollback")
            backup_before_migration
            rollback_migration "$2"
            validate_schema
            ;;
        "seed")
            wait_for_db
            seed_database
            ;;
        "reset")
            reset_database
            ;;
        "validate")
            validate_schema
            ;;
        "help"|*)
            echo "Usage: $0 {migrate|create|history|current|rollback|seed|reset|validate}"
            echo
            echo "Commands:"
            echo "  migrate           - Run all pending migrations"
            echo "  create <message>  - Create new migration"
            echo "  history          - Show migration history"
            echo "  current          - Show current revision"
            echo "  rollback [rev]   - Rollback to revision (default: -1)"
            echo "  seed             - Seed database with initial data"
            echo "  reset            - Reset database (development only)"
            echo "  validate         - Validate database schema"
            echo "  help             - Show this help message"
            exit 1
            ;;
    esac
}

main "$@"