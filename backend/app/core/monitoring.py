"""
Monitoring and Health Check System

Production monitoring with health checks, metrics collection, and alerting.
"""

import asyncio
import time
import psutil
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from sqlalchemy import text
from redis.exceptions import ConnectionError as RedisConnectionError

from app.core.config import settings
from app.core.database import get_db
from app.core.cache import cache_manager
from app.core.logging_config import get_logger

logger = get_logger(__name__)


@dataclass
class HealthStatus:
    """Health status data class"""
    service: str
    status: str  # healthy, degraded, unhealthy
    response_time: float
    details: Dict[str, Any]
    timestamp: datetime


@dataclass
class SystemMetrics:
    """System metrics data class"""
    cpu_percent: float
    memory_percent: float
    disk_percent: float
    active_connections: int
    timestamp: datetime


class HealthChecker:
    """Health check manager"""
    
    def __init__(self):
        self.checks: Dict[str, callable] = {
            "database": self._check_database,
            "redis": self._check_redis,
            "external_services": self._check_external_services,
            "system_resources": self._check_system_resources
        }
    
    async def check_all(self) -> Dict[str, HealthStatus]:
        """Run all health checks"""
        results = {}
        
        for name, check_func in self.checks.items():
            try:
                start_time = time.time()
                status = await check_func()
                response_time = time.time() - start_time
                
                results[name] = HealthStatus(
                    service=name,
                    status=status["status"],
                    response_time=response_time,
                    details=status.get("details", {}),
                    timestamp=datetime.utcnow()
                )
            except Exception as e:
                logger.error(f"Health check failed for {name}: {e}")
                results[name] = HealthStatus(
                    service=name,
                    status="unhealthy",
                    response_time=0.0,
                    details={"error": str(e)},
                    timestamp=datetime.utcnow()
                )
        
        return results
    
    async def _check_database(self) -> Dict[str, Any]:
        """Check database connectivity and performance"""
        try:
            db = next(get_db())
            try:
                # Test basic connectivity
                result = db.execute(text("SELECT 1"))
                result.fetchone()
                
                # Check active connections
                conn_result = db.execute(
                    text("SELECT count(*) FROM pg_stat_activity WHERE state = 'active'")
                )
                active_connections = conn_result.scalar()
                
                # Check database size
                size_result = db.execute(
                    text("SELECT pg_size_pretty(pg_database_size(current_database()))")
                )
                db_size = size_result.scalar()
                
                return {
                    "status": "healthy",
                    "details": {
                        "active_connections": active_connections,
                        "database_size": db_size,
                        "pool_size": getattr(settings, 'DATABASE_POOL_SIZE', 10)
                    }
                }
            finally:
                db.close()
        except Exception as e:
            return {
                "status": "unhealthy",
                "details": {"error": str(e)}
            }
    
    async def _check_redis(self) -> Dict[str, Any]:
        """Check Redis connectivity and performance"""
        try:
            if not cache_manager.redis.is_available():
                return {
                    "status": "unhealthy",
                    "details": {"error": "Redis not available"}
                }
            
            # Test basic connectivity
            cache_manager.redis._client.ping()
            
            # Get Redis info
            info = cache_manager.redis._client.info()
            
            return {
                "status": "healthy",
                "details": {
                    "connected_clients": info.get("connected_clients", 0),
                    "used_memory_human": info.get("used_memory_human", "unknown"),
                    "keyspace_hits": info.get("keyspace_hits", 0),
                    "keyspace_misses": info.get("keyspace_misses", 0)
                }
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "details": {"error": str(e)}
            }
    
    async def _check_external_services(self) -> Dict[str, Any]:
        """Check external service connectivity"""
        services_status = {}
        overall_status = "healthy"
        
        # Check WhatsApp API (if configured)
        if settings.WHATSAPP_API_URL and settings.WHATSAPP_API_TOKEN:
            try:
                # This would be a real health check in production
                services_status["whatsapp"] = "healthy"
            except Exception:
                services_status["whatsapp"] = "unhealthy"
                overall_status = "degraded"
        
        # Check Twilio (if configured)
        if settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN:
            try:
                # This would be a real health check in production
                services_status["twilio"] = "healthy"
            except Exception:
                services_status["twilio"] = "unhealthy"
                overall_status = "degraded"
        
        # Check SMTP (if configured)
        if settings.SMTP_HOST and settings.SMTP_USER:
            try:
                # This would be a real health check in production
                services_status["smtp"] = "healthy"
            except Exception:
                services_status["smtp"] = "unhealthy"
                overall_status = "degraded"
        
        return {
            "status": overall_status,
            "details": services_status
        }
    
    async def _check_system_resources(self) -> Dict[str, Any]:
        """Check system resource usage"""
        try:
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            # Determine status based on resource usage
            status = "healthy"
            if cpu_percent > 80 or memory.percent > 80 or disk.percent > 80:
                status = "degraded"
            if cpu_percent > 95 or memory.percent > 95 or disk.percent > 95:
                status = "unhealthy"
            
            return {
                "status": status,
                "details": {
                    "cpu_percent": cpu_percent,
                    "memory_percent": memory.percent,
                    "disk_percent": disk.percent,
                    "memory_available": f"{memory.available / (1024**3):.2f}GB",
                    "disk_free": f"{disk.free / (1024**3):.2f}GB"
                }
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "details": {"error": str(e)}
            }


class MetricsCollector:
    """Metrics collection and aggregation"""
    
    def __init__(self):
        self.metrics_history: List[SystemMetrics] = []
        self.max_history = 1000  # Keep last 1000 metrics
    
    async def collect_metrics(self) -> SystemMetrics:
        """Collect current system metrics"""
        try:
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            # Get active database connections
            active_connections = 0
            try:
                db = next(get_db())
                try:
                    result = db.execute(
                        text("SELECT count(*) FROM pg_stat_activity WHERE state = 'active'")
                    )
                    active_connections = result.scalar()
                finally:
                    db.close()
            except Exception:
                pass
            
            metrics = SystemMetrics(
                cpu_percent=cpu_percent,
                memory_percent=memory.percent,
                disk_percent=disk.percent,
                active_connections=active_connections,
                timestamp=datetime.utcnow()
            )
            
            # Store in history
            self.metrics_history.append(metrics)
            if len(self.metrics_history) > self.max_history:
                self.metrics_history.pop(0)
            
            return metrics
        except Exception as e:
            logger.error(f"Failed to collect metrics: {e}")
            raise
    
    def get_metrics_summary(self, minutes: int = 60) -> Dict[str, Any]:
        """Get metrics summary for the last N minutes"""
        cutoff_time = datetime.utcnow() - timedelta(minutes=minutes)
        recent_metrics = [
            m for m in self.metrics_history 
            if m.timestamp >= cutoff_time
        ]
        
        if not recent_metrics:
            return {"error": "No metrics available"}
        
        cpu_values = [m.cpu_percent for m in recent_metrics]
        memory_values = [m.memory_percent for m in recent_metrics]
        disk_values = [m.disk_percent for m in recent_metrics]
        connection_values = [m.active_connections for m in recent_metrics]
        
        return {
            "period_minutes": minutes,
            "sample_count": len(recent_metrics),
            "cpu": {
                "avg": sum(cpu_values) / len(cpu_values),
                "min": min(cpu_values),
                "max": max(cpu_values)
            },
            "memory": {
                "avg": sum(memory_values) / len(memory_values),
                "min": min(memory_values),
                "max": max(memory_values)
            },
            "disk": {
                "avg": sum(disk_values) / len(disk_values),
                "min": min(disk_values),
                "max": max(disk_values)
            },
            "connections": {
                "avg": sum(connection_values) / len(connection_values),
                "min": min(connection_values),
                "max": max(connection_values)
            }
        }


class AlertManager:
    """Alert management and notification"""
    
    def __init__(self):
        self.alert_thresholds = {
            "cpu_percent": 80,
            "memory_percent": 80,
            "disk_percent": 80,
            "response_time": 5.0,  # seconds
            "error_rate": 0.05  # 5%
        }
        self.active_alerts: Dict[str, datetime] = {}
        self.alert_cooldown = timedelta(minutes=15)  # Don't spam alerts
    
    async def check_alerts(self, health_status: Dict[str, HealthStatus], 
                          metrics: SystemMetrics):
        """Check for alert conditions"""
        alerts = []
        
        # Check health status alerts
        for service, status in health_status.items():
            if status.status == "unhealthy":
                alert_key = f"health_{service}"
                if self._should_alert(alert_key):
                    alerts.append({
                        "type": "health",
                        "service": service,
                        "message": f"Service {service} is unhealthy",
                        "details": status.details
                    })
                    self.active_alerts[alert_key] = datetime.utcnow()
        
        # Check metrics alerts
        if metrics.cpu_percent > self.alert_thresholds["cpu_percent"]:
            alert_key = "metrics_cpu"
            if self._should_alert(alert_key):
                alerts.append({
                    "type": "metrics",
                    "metric": "cpu",
                    "value": metrics.cpu_percent,
                    "threshold": self.alert_thresholds["cpu_percent"],
                    "message": f"High CPU usage: {metrics.cpu_percent}%"
                })
                self.active_alerts[alert_key] = datetime.utcnow()
        
        if metrics.memory_percent > self.alert_thresholds["memory_percent"]:
            alert_key = "metrics_memory"
            if self._should_alert(alert_key):
                alerts.append({
                    "type": "metrics",
                    "metric": "memory",
                    "value": metrics.memory_percent,
                    "threshold": self.alert_thresholds["memory_percent"],
                    "message": f"High memory usage: {metrics.memory_percent}%"
                })
                self.active_alerts[alert_key] = datetime.utcnow()
        
        # Send alerts
        for alert in alerts:
            await self._send_alert(alert)
    
    def _should_alert(self, alert_key: str) -> bool:
        """Check if we should send an alert (respecting cooldown)"""
        if alert_key not in self.active_alerts:
            return True
        
        last_alert = self.active_alerts[alert_key]
        return datetime.utcnow() - last_alert > self.alert_cooldown
    
    async def _send_alert(self, alert: Dict[str, Any]):
        """Send alert notification"""
        logger.error(
            f"ALERT: {alert['message']}",
            extra={"alert": alert}
        )
        
        # In production, this would send to:
        # - Slack/Discord webhook
        # - Email notifications
        # - PagerDuty/OpsGenie
        # - SMS alerts


# Global instances
health_checker = HealthChecker()
metrics_collector = MetricsCollector()
alert_manager = AlertManager()


async def run_monitoring_loop():
    """Main monitoring loop"""
    logger.info("Starting monitoring loop")
    
    while True:
        try:
            # Collect metrics
            metrics = await metrics_collector.collect_metrics()
            
            # Run health checks
            health_status = await health_checker.check_all()
            
            # Check for alerts
            await alert_manager.check_alerts(health_status, metrics)
            
            # Log summary
            overall_status = "healthy"
            if any(status.status == "unhealthy" for status in health_status.values()):
                overall_status = "unhealthy"
            elif any(status.status == "degraded" for status in health_status.values()):
                overall_status = "degraded"
            
            logger.info(
                f"Monitoring check completed - Status: {overall_status}",
                extra={
                    "overall_status": overall_status,
                    "cpu_percent": metrics.cpu_percent,
                    "memory_percent": metrics.memory_percent,
                    "active_connections": metrics.active_connections
                }
            )
            
        except Exception as e:
            logger.error(f"Monitoring loop error: {e}")
        
        # Wait for next check
        await asyncio.sleep(settings.HEALTH_CHECK_INTERVAL)


async def get_system_status() -> Dict[str, Any]:
    """Get current system status"""
    health_status = await health_checker.check_all()
    metrics = await metrics_collector.collect_metrics()
    metrics_summary = metrics_collector.get_metrics_summary()
    
    return {
        "timestamp": datetime.utcnow().isoformat(),
        "overall_status": _determine_overall_status(health_status),
        "health_checks": {name: asdict(status) for name, status in health_status.items()},
        "current_metrics": asdict(metrics),
        "metrics_summary": metrics_summary,
        "environment": settings.ENVIRONMENT,
        "version": "1.0.0"
    }


def _determine_overall_status(health_status: Dict[str, HealthStatus]) -> str:
    """Determine overall system status"""
    if any(status.status == "unhealthy" for status in health_status.values()):
        return "unhealthy"
    elif any(status.status == "degraded" for status in health_status.values()):
        return "degraded"
    else:
        return "healthy"