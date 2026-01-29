"""
Logging Configuration

Production-ready logging setup with structured logging, file rotation, and monitoring integration.
"""

import logging
import logging.handlers
import sys
import json
from datetime import datetime
from typing import Dict, Any
from pathlib import Path

from app.core.config import settings


class JSONFormatter(logging.Formatter):
    """JSON formatter for structured logging"""
    
    def format(self, record: logging.LogRecord) -> str:
        """Format log record as JSON"""
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }
        
        # Add exception info if present
        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)
        
        # Add extra fields
        if hasattr(record, "user_id"):
            log_entry["user_id"] = record.user_id
        if hasattr(record, "wedding_id"):
            log_entry["wedding_id"] = record.wedding_id
        if hasattr(record, "request_id"):
            log_entry["request_id"] = record.request_id
        if hasattr(record, "ip_address"):
            log_entry["ip_address"] = record.ip_address
        
        return json.dumps(log_entry)


class TextFormatter(logging.Formatter):
    """Human-readable text formatter"""
    
    def __init__(self):
        super().__init__(
            fmt="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S"
        )


def setup_logging():
    """Configure application logging"""
    
    # Set log level
    log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)
    
    # Create root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    
    # Clear existing handlers
    root_logger.handlers.clear()
    
    # Choose formatter
    if settings.LOG_FORMAT.lower() == "json":
        formatter = JSONFormatter()
    else:
        formatter = TextFormatter()
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    console_handler.setLevel(log_level)
    root_logger.addHandler(console_handler)
    
    # File handler (if configured)
    if settings.LOG_FILE:
        log_file_path = Path(settings.LOG_FILE)
        log_file_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Parse max size
        max_bytes = _parse_size(settings.LOG_MAX_SIZE)
        
        file_handler = logging.handlers.RotatingFileHandler(
            filename=settings.LOG_FILE,
            maxBytes=max_bytes,
            backupCount=settings.LOG_BACKUP_COUNT,
            encoding="utf-8"
        )
        file_handler.setFormatter(formatter)
        file_handler.setLevel(log_level)
        root_logger.addHandler(file_handler)
    
    # Configure specific loggers
    _configure_loggers()
    
    # Log startup message
    logger = logging.getLogger(__name__)
    logger.info(
        "Logging configured",
        extra={
            "log_level": settings.LOG_LEVEL,
            "log_format": settings.LOG_FORMAT,
            "log_file": settings.LOG_FILE,
            "environment": settings.ENVIRONMENT
        }
    )


def _parse_size(size_str: str) -> int:
    """Parse size string like '100MB' to bytes"""
    size_str = size_str.upper().strip()
    
    if size_str.endswith("KB"):
        return int(size_str[:-2]) * 1024
    elif size_str.endswith("MB"):
        return int(size_str[:-2]) * 1024 * 1024
    elif size_str.endswith("GB"):
        return int(size_str[:-2]) * 1024 * 1024 * 1024
    else:
        return int(size_str)


def _configure_loggers():
    """Configure specific logger levels"""
    
    # Reduce noise from third-party libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("redis").setLevel(logging.WARNING)
    
    # Set application loggers
    logging.getLogger("app").setLevel(logging.INFO)
    
    if settings.DEBUG:
        logging.getLogger("app.core.database").setLevel(logging.DEBUG)
        logging.getLogger("app.api").setLevel(logging.DEBUG)


def get_logger(name: str) -> logging.Logger:
    """Get a logger with the given name"""
    return logging.getLogger(name)


def log_request(logger: logging.Logger, method: str, path: str, status_code: int, 
                duration: float, user_id: str = None, ip_address: str = None):
    """Log HTTP request"""
    logger.info(
        f"{method} {path} - {status_code} - {duration:.3f}s",
        extra={
            "method": method,
            "path": path,
            "status_code": status_code,
            "duration": duration,
            "user_id": user_id,
            "ip_address": ip_address
        }
    )


def log_database_query(logger: logging.Logger, query: str, duration: float, 
                      rows_affected: int = None):
    """Log database query"""
    logger.debug(
        f"Database query executed in {duration:.3f}s",
        extra={
            "query": query[:200] + "..." if len(query) > 200 else query,
            "duration": duration,
            "rows_affected": rows_affected
        }
    )


def log_security_event(logger: logging.Logger, event_type: str, user_id: str = None, 
                      ip_address: str = None, details: Dict[str, Any] = None):
    """Log security-related events"""
    logger.warning(
        f"Security event: {event_type}",
        extra={
            "event_type": event_type,
            "user_id": user_id,
            "ip_address": ip_address,
            "details": details or {}
        }
    )


def log_business_event(logger: logging.Logger, event_type: str, wedding_id: str = None,
                      user_id: str = None, details: Dict[str, Any] = None):
    """Log business-related events"""
    logger.info(
        f"Business event: {event_type}",
        extra={
            "event_type": event_type,
            "wedding_id": wedding_id,
            "user_id": user_id,
            "details": details or {}
        }
    )