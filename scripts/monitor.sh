#!/bin/bash

# Monitoring Script
# Real-time monitoring and alerting for the Wedding Platform

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
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Check system health
check_health() {
    log "Checking system health..."
    
    cd "$PROJECT_DIR"
    
    # Check if services are running
    if ! docker-compose -f "$COMPOSE_FILE" ps | grep -q "Up"; then
        error "Some services are not running"
        docker-compose -f "$COMPOSE_FILE" ps
        return 1
    fi
    
    # Check application health endpoint
    if curl -f -s http://localhost:8000/health > /dev/null; then
        success "Backend health check passed"
    else
        error "Backend health check failed"
        return 1
    fi
    
    # Check frontend
    if curl -f -s http://localhost/ > /dev/null; then
        success "Frontend health check passed"
    else
        warning "Frontend health check failed"
    fi
    
    # Check database connectivity
    if docker-compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -U wedding_user -d wedding_platform > /dev/null; then
        success "Database connectivity check passed"
    else
        error "Database connectivity check failed"
        return 1
    fi
    
    # Check Redis connectivity
    if docker-compose -f "$COMPOSE_FILE" exec -T redis redis-cli ping > /dev/null 2>&1; then
        success "Redis connectivity check passed"
    else
        warning "Redis connectivity check failed"
    fi
    
    success "System health check completed"
}

# Monitor system resources
monitor_resources() {
    log "Monitoring system resources..."
    
    echo "=== System Resources ==="
    
    # CPU usage
    cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
    echo "CPU Usage: ${cpu_usage}%"
    
    # Memory usage
    memory_info=$(free -m | awk 'NR==2{printf "Memory Usage: %s/%sMB (%.2f%%)", $3,$2,$3*100/$2 }')
    echo "$memory_info"
    
    # Disk usage
    echo "Disk Usage:"
    df -h | grep -E '^/dev/' | awk '{print "  " $1 ": " $3 "/" $2 " (" $5 ")"}'
    
    # Docker container stats
    echo
    echo "=== Container Resources ==="
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"
    
    echo
}

# Monitor application metrics
monitor_app_metrics() {
    log "Monitoring application metrics..."
    
    cd "$PROJECT_DIR"
    
    # Get application metrics
    docker-compose -f "$COMPOSE_FILE" exec -T backend python -c "
from app.core.monitoring import get_system_status
import asyncio
import json

async def get_metrics():
    try:
        status = await get_system_status()
        print(json.dumps(status, indent=2, default=str))
    except Exception as e:
        print(f'Failed to get metrics: {e}')

asyncio.run(get_metrics())
" 2>/dev/null || echo "Failed to retrieve application metrics"
}

# Monitor logs for errors
monitor_logs() {
    local service="${1:-all}"
    local lines="${2:-100}"
    
    log "Monitoring logs for service: $service (last $lines lines)"
    
    cd "$PROJECT_DIR"
    
    if [[ "$service" == "all" ]]; then
        docker-compose -f "$COMPOSE_FILE" logs --tail="$lines" -f
    else
        docker-compose -f "$COMPOSE_FILE" logs --tail="$lines" -f "$service"
    fi
}

# Check for errors in logs
check_log_errors() {
    local hours="${1:-1}"
    
    log "Checking for errors in the last $hours hour(s)..."
    
    cd "$PROJECT_DIR"
    
    # Get logs from the last N hours and check for errors
    since_time=$(date -d "$hours hours ago" '+%Y-%m-%dT%H:%M:%S')
    
    echo "=== Backend Errors ==="
    docker-compose -f "$COMPOSE_FILE" logs --since="$since_time" backend | grep -i error | tail -10 || echo "No backend errors found"
    
    echo
    echo "=== Database Errors ==="
    docker-compose -f "$COMPOSE_FILE" logs --since="$since_time" postgres | grep -i error | tail -10 || echo "No database errors found"
    
    echo
    echo "=== Redis Errors ==="
    docker-compose -f "$COMPOSE_FILE" logs --since="$since_time" redis | grep -i error | tail -10 || echo "No Redis errors found"
}

# Performance monitoring
monitor_performance() {
    log "Monitoring performance metrics..."
    
    cd "$PROJECT_DIR"
    
    echo "=== Response Times ==="
    
    # Test API response times
    api_time=$(curl -o /dev/null -s -w '%{time_total}' http://localhost:8000/health)
    echo "API Health Endpoint: ${api_time}s"
    
    frontend_time=$(curl -o /dev/null -s -w '%{time_total}' http://localhost/)
    echo "Frontend: ${frontend_time}s"
    
    echo
    echo "=== Database Performance ==="
    docker-compose -f "$COMPOSE_FILE" exec -T postgres psql -U wedding_user -d wedding_platform -c "
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements 
WHERE calls > 10
ORDER BY total_time DESC 
LIMIT 5;
" 2>/dev/null || echo "pg_stat_statements not available"
    
    echo
    echo "=== Active Connections ==="
    docker-compose -f "$COMPOSE_FILE" exec -T postgres psql -U wedding_user -d wedding_platform -c "
SELECT 
    count(*) as total_connections,
    count(*) FILTER (WHERE state = 'active') as active_connections,
    count(*) FILTER (WHERE state = 'idle') as idle_connections
FROM pg_stat_activity;
" 2>/dev/null || echo "Failed to get connection stats"
}

# Alert system
send_alert() {
    local message="$1"
    local severity="${2:-warning}"
    
    log "ALERT [$severity]: $message"
    
    # Log to file
    echo "[$(date)] ALERT [$severity]: $message" >> /var/log/wedding-platform/alerts.log
    
    # Send to Slack (if webhook configured)
    if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚨 Wedding Platform Alert [$severity]: $message\"}" \
            "$SLACK_WEBHOOK_URL" > /dev/null 2>&1 || true
    fi
    
    # Send email (if configured)
    if [[ -n "$ALERT_EMAIL" ]]; then
        echo "$message" | mail -s "Wedding Platform Alert [$severity]" "$ALERT_EMAIL" > /dev/null 2>&1 || true
    fi
}

# Continuous monitoring
continuous_monitor() {
    local interval="${1:-60}"
    
    log "Starting continuous monitoring (interval: ${interval}s)"
    log "Press Ctrl+C to stop"
    
    while true; do
        clear
        echo "=== Wedding Platform Monitor ==="
        echo "$(date)"
        echo "Monitoring interval: ${interval}s"
        echo
        
        # Health check
        if check_health > /dev/null 2>&1; then
            echo -e "${GREEN}✓ System Health: OK${NC}"
        else
            echo -e "${RED}✗ System Health: FAILED${NC}"
            send_alert "System health check failed" "critical"
        fi
        
        # Resource monitoring
        monitor_resources
        
        # Check for high resource usage
        cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1 | cut -d'.' -f1)
        if [[ $cpu_usage -gt 80 ]]; then
            send_alert "High CPU usage: ${cpu_usage}%" "warning"
        fi
        
        memory_usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
        if [[ $memory_usage -gt 80 ]]; then
            send_alert "High memory usage: ${memory_usage}%" "warning"
        fi
        
        # Check disk space
        disk_usage=$(df / | awk 'NR==2{print $5}' | cut -d'%' -f1)
        if [[ $disk_usage -gt 80 ]]; then
            send_alert "High disk usage: ${disk_usage}%" "warning"
        fi
        
        echo
        echo "Next check in ${interval} seconds..."
        sleep "$interval"
    done
}

# Generate monitoring report
generate_report() {
    local output_file="${1:-/tmp/wedding-platform-report-$(date +%Y%m%d-%H%M%S).txt}"
    
    log "Generating monitoring report: $output_file"
    
    {
        echo "=== Wedding Platform Monitoring Report ==="
        echo "Generated: $(date)"
        echo
        
        echo "=== System Health ==="
        check_health 2>&1
        echo
        
        echo "=== System Resources ==="
        monitor_resources 2>&1
        echo
        
        echo "=== Application Metrics ==="
        monitor_app_metrics 2>&1
        echo
        
        echo "=== Performance Metrics ==="
        monitor_performance 2>&1
        echo
        
        echo "=== Recent Errors ==="
        check_log_errors 24 2>&1
        echo
        
        echo "=== Service Status ==="
        cd "$PROJECT_DIR"
        docker-compose -f "$COMPOSE_FILE" ps
        echo
        
        echo "=== Docker System Info ==="
        docker system df
        echo
        
    } > "$output_file"
    
    success "Report generated: $output_file"
}

# Setup monitoring alerts
setup_alerts() {
    log "Setting up monitoring alerts..."
    
    # Create systemd service for continuous monitoring
    sudo tee /etc/systemd/system/wedding-platform-monitor.service > /dev/null <<EOF
[Unit]
Description=Wedding Platform Monitor
After=docker.service
Requires=docker.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$PROJECT_DIR
ExecStart=$SCRIPT_DIR/monitor.sh continuous 300
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
    
    # Enable and start the service
    sudo systemctl daemon-reload
    sudo systemctl enable wedding-platform-monitor.service
    sudo systemctl start wedding-platform-monitor.service
    
    success "Monitoring service installed and started"
    log "Check status with: sudo systemctl status wedding-platform-monitor"
}

# Remove monitoring alerts
remove_alerts() {
    log "Removing monitoring alerts..."
    
    sudo systemctl stop wedding-platform-monitor.service || true
    sudo systemctl disable wedding-platform-monitor.service || true
    sudo rm -f /etc/systemd/system/wedding-platform-monitor.service
    sudo systemctl daemon-reload
    
    success "Monitoring service removed"
}

# Main function
main() {
    case "${1:-help}" in
        "health")
            check_health
            ;;
        "resources")
            monitor_resources
            ;;
        "metrics")
            monitor_app_metrics
            ;;
        "logs")
            monitor_logs "$2" "$3"
            ;;
        "errors")
            check_log_errors "$2"
            ;;
        "performance")
            monitor_performance
            ;;
        "continuous")
            continuous_monitor "$2"
            ;;
        "report")
            generate_report "$2"
            ;;
        "setup-alerts")
            setup_alerts
            ;;
        "remove-alerts")
            remove_alerts
            ;;
        "alert")
            send_alert "$2" "$3"
            ;;
        "help"|*)
            echo "Usage: $0 {health|resources|metrics|logs|errors|performance|continuous|report|setup-alerts|remove-alerts|alert}"
            echo
            echo "Commands:"
            echo "  health                     - Check system health"
            echo "  resources                  - Monitor system resources"
            echo "  metrics                    - Show application metrics"
            echo "  logs [service] [lines]     - Monitor logs"
            echo "  errors [hours]             - Check for errors in logs"
            echo "  performance                - Monitor performance metrics"
            echo "  continuous [interval]      - Start continuous monitoring"
            echo "  report [output_file]       - Generate monitoring report"
            echo "  setup-alerts               - Setup automated monitoring"
            echo "  remove-alerts              - Remove automated monitoring"
            echo "  alert <message> [severity] - Send test alert"
            echo "  help                       - Show this help message"
            echo
            echo "Examples:"
            echo "  $0 health"
            echo "  $0 logs backend 50"
            echo "  $0 continuous 120"
            echo "  $0 errors 6"
            echo "  $0 alert 'Test alert' warning"
            exit 1
            ;;
    esac
}

main "$@"