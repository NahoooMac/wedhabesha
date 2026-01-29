"""
Application Configuration

Centralized configuration management using Pydantic Settings.
"""

from typing import List, Optional
from pydantic import validator
from pydantic_settings import BaseSettings
from decouple import config
import logging


class Settings(BaseSettings):
    """Application settings"""
    
    # Project Information
    PROJECT_NAME: str = "Wedding Platform API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Security
    SECRET_KEY: str = config("SECRET_KEY", default="your-secret-key-change-in-production")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days
    ALGORITHM: str = "HS256"
    
    # HTTPS and Cookie Security
    SECURE_COOKIES: bool = config("SECURE_COOKIES", default=False, cast=bool)
    COOKIE_SAMESITE: str = config("COOKIE_SAMESITE", default="lax")  # lax, strict, none
    COOKIE_HTTPONLY: bool = config("COOKIE_HTTPONLY", default=True, cast=bool)
    COOKIE_SECURE: bool = config("COOKIE_SECURE", default=False, cast=bool)  # Set to True in production with HTTPS
    
    # Session Security
    SESSION_TIMEOUT_MINUTES: int = config("SESSION_TIMEOUT_MINUTES", default=60, cast=int)
    MAX_LOGIN_ATTEMPTS: int = config("MAX_LOGIN_ATTEMPTS", default=5, cast=int)
    LOCKOUT_DURATION_MINUTES: int = config("LOCKOUT_DURATION_MINUTES", default=15, cast=int)
    
    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://wedhabesha.com",
        "https://www.wedhabesha.com"
    ]
    ALLOWED_HOSTS: List[str] = ["*"]
    
    # Database
    DATABASE_URL: str = config(
        "DATABASE_URL", 
        default="postgresql://wedding_user:wedding_pass@localhost:5432/wedding_platform"
    )
    DATABASE_POOL_SIZE: int = config("DATABASE_POOL_SIZE", default=10, cast=int)
    DATABASE_MAX_OVERFLOW: int = config("DATABASE_MAX_OVERFLOW", default=20, cast=int)
    DATABASE_POOL_TIMEOUT: int = config("DATABASE_POOL_TIMEOUT", default=30, cast=int)
    DATABASE_POOL_RECYCLE: int = config("DATABASE_POOL_RECYCLE", default=3600, cast=int)
    
    @property
    def database_pool_config(self) -> dict:
        """Get database pool configuration for production"""
        if self.ENVIRONMENT == "production":
            return {
                "pool_size": self.DATABASE_POOL_SIZE,
                "max_overflow": self.DATABASE_MAX_OVERFLOW,
                "pool_timeout": self.DATABASE_POOL_TIMEOUT,
                "pool_recycle": self.DATABASE_POOL_RECYCLE,
                "pool_pre_ping": True,
                "echo": False
            }
        else:
            return {
                "pool_size": 5,
                "max_overflow": 10,
                "pool_timeout": 30,
                "pool_recycle": 3600,
                "pool_pre_ping": True,
                "echo": self.DEBUG
            }
    
    # Redis
    REDIS_URL: str = config("REDIS_URL", default="redis://localhost:6379/0")
    REDIS_POOL_SIZE: int = config("REDIS_POOL_SIZE", default=10, cast=int)
    REDIS_SOCKET_TIMEOUT: int = config("REDIS_SOCKET_TIMEOUT", default=5, cast=int)
    REDIS_SOCKET_CONNECT_TIMEOUT: int = config("REDIS_SOCKET_CONNECT_TIMEOUT", default=5, cast=int)
    
    # Firebase Configuration
    FIREBASE_PROJECT_ID: str = config("FIREBASE_PROJECT_ID", default="wedhabesha")
    FIREBASE_PRIVATE_KEY_ID: Optional[str] = config("FIREBASE_PRIVATE_KEY_ID", default=None)
    FIREBASE_PRIVATE_KEY: Optional[str] = config("FIREBASE_PRIVATE_KEY", default=None)
    FIREBASE_CLIENT_EMAIL: Optional[str] = config("FIREBASE_CLIENT_EMAIL", default=None)
    FIREBASE_CLIENT_ID: Optional[str] = config("FIREBASE_CLIENT_ID", default=None)
    FIREBASE_AUTH_URI: str = config("FIREBASE_AUTH_URI", default="https://accounts.google.com/o/oauth2/auth")
    FIREBASE_TOKEN_URI: str = config("FIREBASE_TOKEN_URI", default="https://oauth2.googleapis.com/token")
    
    # External Services
    WHATSAPP_API_URL: Optional[str] = config("WHATSAPP_API_URL", default=None)
    WHATSAPP_API_TOKEN: Optional[str] = config("WHATSAPP_API_TOKEN", default=None)
    TWILIO_ACCOUNT_SID: Optional[str] = config("TWILIO_ACCOUNT_SID", default=None)
    TWILIO_AUTH_TOKEN: Optional[str] = config("TWILIO_AUTH_TOKEN", default=None)
    TWILIO_PHONE_NUMBER: Optional[str] = config("TWILIO_PHONE_NUMBER", default=None)
    
    # Email Configuration
    SMTP_HOST: Optional[str] = config("SMTP_HOST", default=None)
    SMTP_PORT: int = config("SMTP_PORT", default=587, cast=int)
    SMTP_USER: Optional[str] = config("SMTP_USER", default=None)
    SMTP_PASSWORD: Optional[str] = config("SMTP_PASSWORD", default=None)
    
    # Application Settings
    ENVIRONMENT: str = config("ENVIRONMENT", default="development")
    DEBUG: bool = config("DEBUG", default=True, cast=bool)
    
    # Logging Configuration
    LOG_LEVEL: str = config("LOG_LEVEL", default="INFO")
    LOG_FORMAT: str = config("LOG_FORMAT", default="text")  # text or json
    LOG_FILE: Optional[str] = config("LOG_FILE", default=None)
    LOG_MAX_SIZE: str = config("LOG_MAX_SIZE", default="100MB")
    LOG_BACKUP_COUNT: int = config("LOG_BACKUP_COUNT", default=10, cast=int)
    
    # Monitoring and Health
    HEALTH_CHECK_INTERVAL: int = config("HEALTH_CHECK_INTERVAL", default=30, cast=int)
    METRICS_ENABLED: bool = config("METRICS_ENABLED", default=False, cast=bool)
    SENTRY_DSN: Optional[str] = config("SENTRY_DSN", default=None)
    
    # Performance
    WORKER_PROCESSES: int = config("WORKER_PROCESSES", default=1, cast=int)
    WORKER_CONNECTIONS: int = config("WORKER_CONNECTIONS", default=1000, cast=int)
    KEEPALIVE_TIMEOUT: int = config("KEEPALIVE_TIMEOUT", default=65, cast=int)
    MAX_REQUEST_SIZE: str = config("MAX_REQUEST_SIZE", default="10MB")
    REQUEST_TIMEOUT: int = config("REQUEST_TIMEOUT", default=30, cast=int)
    
    # Rate Limiting
    RATE_LIMIT_ENABLED: bool = config("RATE_LIMIT_ENABLED", default=True, cast=bool)
    RATE_LIMIT_REQUESTS_PER_MINUTE: int = config("RATE_LIMIT_REQUESTS_PER_MINUTE", default=60, cast=int)
    RATE_LIMIT_BURST: int = config("RATE_LIMIT_BURST", default=10, cast=int)
    
    # Backup Configuration
    BACKUP_ENABLED: bool = config("BACKUP_ENABLED", default=False, cast=bool)
    BACKUP_SCHEDULE: str = config("BACKUP_SCHEDULE", default="0 2 * * *")
    BACKUP_RETENTION_DAYS: int = config("BACKUP_RETENTION_DAYS", default=30, cast=int)
    BACKUP_S3_BUCKET: Optional[str] = config("BACKUP_S3_BUCKET", default=None)
    BACKUP_S3_ACCESS_KEY: Optional[str] = config("BACKUP_S3_ACCESS_KEY", default=None)
    BACKUP_S3_SECRET_KEY: Optional[str] = config("BACKUP_S3_SECRET_KEY", default=None)
    
    @validator("ALLOWED_ORIGINS", pre=True)
    def assemble_cors_origins(cls, v):
        if isinstance(v, str):
            return [i.strip() for i in v.split(",")]
        return v
    
    class Config:
        case_sensitive = True
        env_file = ".env"


# Global settings instance
settings = Settings()