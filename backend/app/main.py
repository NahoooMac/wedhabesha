"""
Wedding Platform FastAPI Application

Main application entry point with CORS, middleware, and route configuration.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from contextlib import asynccontextmanager
import asyncio

from app.core.config import settings
from app.core.database import init_db
from app.core.cache import cache_manager, CACHE_WARM_FUNCTIONS
from app.core.logging_config import setup_logging
from app.core.monitoring import run_monitoring_loop, get_system_status
from app.core.backup import scheduled_backup
from app.api.v1.api import api_router
from app.middleware import (
    AuthenticationMiddleware, 
    SecurityHeadersMiddleware,
    RateLimitMiddleware,
    InputValidationMiddleware,
    EnhancedSecurityHeadersMiddleware
)
from app.middleware.caching_middleware import CachingMiddleware, ConditionalCachingMiddleware

# Setup logging first
setup_logging()

# Background tasks
background_tasks = set()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    await init_db()
    
    # Warm cache
    if cache_manager.redis.is_available():
        print("Warming cache...")
        results = await cache_manager.warm_cache(CACHE_WARM_FUNCTIONS)
        print(f"Cache warming results: {results}")
    
    # Start monitoring loop in production
    if settings.ENVIRONMENT == "production":
        monitoring_task = asyncio.create_task(run_monitoring_loop())
        background_tasks.add(monitoring_task)
        monitoring_task.add_done_callback(background_tasks.discard)
    
    # Schedule backups in production
    if settings.ENVIRONMENT == "production" and settings.BACKUP_ENABLED:
        # Run backup every 24 hours
        async def backup_scheduler():
            while True:
                await asyncio.sleep(24 * 60 * 60)  # 24 hours
                await scheduled_backup()
        
        backup_task = asyncio.create_task(backup_scheduler())
        background_tasks.add(backup_task)
        backup_task.add_done_callback(background_tasks.discard)
    
    yield
    
    # Shutdown
    cache_manager.disconnect()
    
    # Cancel background tasks
    for task in background_tasks:
        task.cancel()
    
    # Wait for tasks to complete
    if background_tasks:
        await asyncio.gather(*background_tasks, return_exceptions=True)


# Create FastAPI application
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Comprehensive wedding platform webapp with couple planning tools, vendor marketplace, and real-time guest check-in system",
    version="1.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)

# Enhanced security headers middleware
app.add_middleware(EnhancedSecurityHeadersMiddleware)

# Input validation middleware
app.add_middleware(InputValidationMiddleware)

# Rate limiting middleware
app.add_middleware(RateLimitMiddleware)

# Caching middleware (before authentication to cache public endpoints)
app.add_middleware(
    CachingMiddleware,
    exclude_paths=[
        "/",
        "/health",
        "/docs",
        "/redoc",
        "/openapi.json",
        f"{settings.API_V1_STR}/auth/",
        f"{settings.API_V1_STR}/checkin/",
        f"{settings.API_V1_STR}/communication/",
        f"{settings.API_V1_STR}/admin/"
    ]
)

# Conditional caching middleware for ETags
app.add_middleware(ConditionalCachingMiddleware)

# Authentication middleware
app.add_middleware(
    AuthenticationMiddleware,
    exclude_paths=[
        "/",
        "/health",
        "/docs",
        "/redoc",
        "/openapi.json",
        f"{settings.API_V1_STR}/auth/register",
        f"{settings.API_V1_STR}/auth/login",
        f"{settings.API_V1_STR}/auth/google-signin",
        f"{settings.API_V1_STR}/auth/staff/verify"
    ]
)

# Security middleware
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=settings.ALLOWED_HOSTS,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Wedding Platform API",
        "version": "1.0.0",
        "docs": "/docs",
        "status": "healthy"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    if settings.ENVIRONMENT == "production":
        # Use comprehensive monitoring in production
        return await get_system_status()
    else:
        # Simple health check for development
        from app.core.database_optimization import check_database_health
        from app.middleware.caching_middleware import cache_stats_collector
        
        # Get database health
        db_health = await check_database_health()
        
        # Get cache stats
        cache_stats = await cache_stats_collector.get_cache_stats()
        
        return {
            "status": "healthy", 
            "service": "wedding-platform-api",
            "database": db_health,
            "cache": cache_stats
        }


@app.get("/performance")
async def performance_stats():
    """Performance statistics endpoint"""
    from app.core.database_optimization import query_monitor
    from app.core.websocket_optimization import websocket_manager
    
    return {
        "database": query_monitor.get_stats(),
        "websocket": websocket_manager.get_stats(),
        "cache": cache_manager.get_stats()
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )