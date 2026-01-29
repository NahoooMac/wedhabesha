#!/bin/bash

# Wedding Platform Deployment Script
# This script automates the deployment process for the Wedding Platform

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="docker-compose.production.yml"
BACKUP_DIR="/var/backups/wedding-platform"
LOG_FILE="/var/log/wedding-platform/deploy.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        error "This script should not be run as root for security reasons"
    fi
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed"
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed"
    fi
    
    # Check if user is in docker group
    if ! groups $USER | grep -q docker; then
        error "User $USER is not in the docker group"
    fi
    
    # Check environment files
    if [[ ! -f "$PROJECT_DIR/backend/.env" ]]; then
        error "Backend environment file not found: $PROJECT_DIR/backend/.env"
    fi
    
    if [[ ! -f "$PROJECT_DIR/frontend/.env" ]]; then
        error "Frontend environment file not found: $PROJECT_DIR/frontend/.env"
    fi
    
    # Check SSL certificates
    if [[ ! -f "$PROJECT_DIR/ssl/wedhabesha.com.crt" ]] || [[ ! -f "$PROJECT_DIR/ssl/wedhabesha.com.key" ]]; then
        warning "SSL certificates not found. HTTPS will not work properly."
    fi
    
    success "Prerequisites check completed"
}

# Create required directories
create_directories() {
    log "Creating required directories..."
    
    sudo mkdir -p /var/lib/wedding-platform/{postgres,redis}
    sudo mkdir -p /var/log/wedding-platform
    sudo mkdir -p "$BACKUP_DIR"
    
    # Set permissions
    sudo chown -R $USER:$USER /var/lib/wedding-platform
    sudo chown -R $USER:$USER /var/log/wedding-platform
    sudo chown -R $USER:$USER "$BACKUP_DIR"
    
    success "Directories created"
}

# Backup current deployment
backup_current() {
    log "Creating backup of current deployment..."
    
    if docker-compose -f "$PROJECT_DIR/$COMPOSE_FILE" ps | grep -q "Up"; then
        # Create database backup
        docker-compose -f "$PROJECT_DIR/$COMPOSE_FILE" exec -T backend python -c "
from app.core.backup import backup_manager
import asyncio
try:
    result = asyncio.run(backup_manager.create_backup('full'))
    print(f'Backup created: {result[\"filename\"]}')
except Exception as e:
    print(f'Backup failed: {e}')
    exit(1)
" || warning "Database backup failed"
        
        success "Backup completed"
    else
        log "No running services to backup"
    fi
}

# Pull latest images
pull_images() {
    log "Pulling latest Docker images..."
    
    cd "$PROJECT_DIR"
    docker-compose -f "$COMPOSE_FILE" pull
    
    success "Images pulled"
}

# Build custom images
build_images() {
    log "Building custom Docker images..."
    
    cd "$PROJECT_DIR"
    docker-compose -f "$COMPOSE_FILE" build --no-cache
    
    success "Images built"
}

# Run database migrations
run_migrations() {
    log "Running database migrations..."
    
    cd "$PROJECT_DIR"
    
    # Wait for database to be ready
    timeout=60
    while ! docker-compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -U wedding_user -d wedding_platform; do
        sleep 2
        timeout=$((timeout - 2))
        if [[ $timeout -le 0 ]]; then
            error "Database failed to start within 60 seconds"
        fi
    done
    
    # Run migrations
    docker-compose -f "$COMPOSE_FILE" exec -T backend alembic upgrade head
    
    success "Migrations completed"
}

# Deploy services
deploy_services() {
    log "Deploying services..."
    
    cd "$PROJECT_DIR"
    
    # Stop existing services
    docker-compose -f "$COMPOSE_FILE" down
    
    # Start services
    docker-compose -f "$COMPOSE_FILE" up -d
    
    success "Services deployed"
}

# Health check
health_check() {
    log "Performing health check..."
    
    # Wait for services to start
    sleep 30
    
    # Check backend health
    max_attempts=10
    attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f -s http://localhost:8000/health > /dev/null; then
            success "Backend health check passed"
            break
        else
            log "Health check attempt $attempt/$max_attempts failed, retrying..."
            sleep 10
            attempt=$((attempt + 1))
        fi
    done
    
    if [[ $attempt -gt $max_attempts ]]; then
        error "Backend health check failed after $max_attempts attempts"
    fi
    
    # Check frontend health
    if curl -f -s http://localhost/ > /dev/null; then
        success "Frontend health check passed"
    else
        warning "Frontend health check failed"
    fi
    
    # Check HTTPS if certificates exist
    if [[ -f "$PROJECT_DIR/ssl/wedhabesha.com.crt" ]]; then
        if curl -f -s https://localhost/ > /dev/null; then
            success "HTTPS health check passed"
        else
            warning "HTTPS health check failed"
        fi
    fi
}

# Cleanup old images and containers
cleanup() {
    log "Cleaning up old Docker resources..."
    
    # Remove unused images
    docker image prune -f
    
    # Remove unused containers
    docker container prune -f
    
    # Remove unused volumes (be careful with this)
    # docker volume prune -f
    
    success "Cleanup completed"
}

# Show deployment status
show_status() {
    log "Deployment Status:"
    echo
    
    cd "$PROJECT_DIR"
    docker-compose -f "$COMPOSE_FILE" ps
    
    echo
    log "Service URLs:"
    echo "  Frontend: http://localhost/"
    echo "  Backend API: http://localhost:8000/"
    echo "  API Documentation: http://localhost:8000/docs"
    
    if [[ -f "$PROJECT_DIR/ssl/wedhabesha.com.crt" ]]; then
        echo "  HTTPS Frontend: https://localhost/"
        echo "  HTTPS Backend API: https://localhost:8000/"
    fi
    
    echo
    log "Logs:"
    echo "  View all logs: docker-compose -f $COMPOSE_FILE logs -f"
    echo "  View backend logs: docker-compose -f $COMPOSE_FILE logs -f backend"
    echo "  View frontend logs: docker-compose -f $COMPOSE_FILE logs -f frontend"
}

# Rollback function
rollback() {
    log "Rolling back deployment..."
    
    cd "$PROJECT_DIR"
    
    # Stop current services
    docker-compose -f "$COMPOSE_FILE" down
    
    # Restore from backup if available
    latest_backup=$(ls -t "$BACKUP_DIR"/*.sql.gz 2>/dev/null | head -n1)
    if [[ -n "$latest_backup" ]]; then
        log "Restoring from backup: $(basename "$latest_backup")"
        
        # Start database only
        docker-compose -f "$COMPOSE_FILE" up -d postgres redis
        sleep 10
        
        # Restore backup
        docker-compose -f "$COMPOSE_FILE" exec -T backend python -c "
from app.core.backup import backup_manager
import asyncio
try:
    result = asyncio.run(backup_manager.restore_backup('$(basename "$latest_backup")'))
    print(f'Restore completed: {result}')
except Exception as e:
    print(f'Restore failed: {e}')
    exit(1)
"
        
        # Start all services
        docker-compose -f "$COMPOSE_FILE" up -d
        
        success "Rollback completed"
    else
        warning "No backup found for rollback"
    fi
}

# Main deployment function
main() {
    log "Starting Wedding Platform deployment..."
    
    case "${1:-deploy}" in
        "deploy")
            check_root
            check_prerequisites
            create_directories
            backup_current
            pull_images
            build_images
            deploy_services
            run_migrations
            health_check
            cleanup
            show_status
            success "Deployment completed successfully!"
            ;;
        "rollback")
            check_root
            rollback
            ;;
        "status")
            show_status
            ;;
        "backup")
            backup_current
            ;;
        "health")
            health_check
            ;;
        "cleanup")
            cleanup
            ;;
        *)
            echo "Usage: $0 {deploy|rollback|status|backup|health|cleanup}"
            echo
            echo "Commands:"
            echo "  deploy   - Full deployment (default)"
            echo "  rollback - Rollback to previous version"
            echo "  status   - Show deployment status"
            echo "  backup   - Create backup only"
            echo "  health   - Run health checks only"
            echo "  cleanup  - Clean up Docker resources"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"