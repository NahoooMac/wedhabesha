"""
API Response Caching Middleware

Middleware for caching API responses with intelligent cache control.
"""

import json
import hashlib
from typing import Dict, List, Optional, Callable
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from app.core.cache import cache_manager, CacheConfig, CacheStrategy


class CachingMiddleware(BaseHTTPMiddleware):
    """Middleware for caching API responses"""
    
    def __init__(
        self,
        app: ASGIApp,
        cache_config: Dict[str, CacheConfig] = None,
        exclude_paths: List[str] = None,
        cache_headers: bool = True
    ):
        super().__init__(app)
        self.cache_config = cache_config or {}
        self.exclude_paths = exclude_paths or [
            "/docs",
            "/redoc",
            "/openapi.json",
            "/health"
        ]
        self.cache_headers = cache_headers
        
        # Default cache configurations for different endpoints
        self.default_configs = {
            "/api/v1/vendors/categories": CacheConfig(
                ttl_minutes=1440,  # 24 hours
                strategy=CacheStrategy.TTL
            ),
            "/api/v1/communication/message-templates": CacheConfig(
                ttl_minutes=720,  # 12 hours
                strategy=CacheStrategy.TTL
            ),
            "/api/v1/vendors": CacheConfig(
                ttl_minutes=30,
                strategy=CacheStrategy.REFRESH_AHEAD,
                refresh_threshold=0.8
            ),
            "/api/v1/admin/analytics": CacheConfig(
                ttl_minutes=15,
                strategy=CacheStrategy.TTL
            )
        }
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request with caching logic"""
        
        # Skip caching for excluded paths
        if any(request.url.path.startswith(path) for path in self.exclude_paths):
            return await call_next(request)
        
        # Only cache GET requests
        if request.method != "GET":
            response = await call_next(request)
            
            # Invalidate cache for write operations
            if request.method in ["POST", "PUT", "DELETE"]:
                await self._invalidate_related_cache(request.url.path)
            
            return response
        
        # Generate cache key
        cache_key = self._generate_cache_key(request)
        
        # Get cache configuration
        config = self._get_cache_config(request.url.path)
        
        if not config:
            return await call_next(request)
        
        # Try to get cached response
        cached_response = await cache_manager.get(cache_key, config)
        if cached_response:
            response_data = cached_response["body"]
            headers = cached_response.get("headers", {})
            
            # Add cache headers
            if self.cache_headers:
                headers.update({
                    "X-Cache": "HIT",
                    "X-Cache-Key": cache_key[:16] + "...",
                    "Cache-Control": f"public, max-age={config.ttl_minutes * 60}"
                })
            
            return JSONResponse(
                content=response_data,
                headers=headers,
                status_code=cached_response.get("status_code", 200)
            )
        
        # Execute request
        response = await call_next(request)
        
        # Cache successful responses
        if response.status_code == 200 and hasattr(response, 'body'):
            try:
                # Read response body
                response_body = b""
                async for chunk in response.body_iterator:
                    response_body += chunk
                
                # Parse JSON response
                response_data = json.loads(response_body.decode())
                
                # Prepare cache data
                cache_data = {
                    "body": response_data,
                    "status_code": response.status_code,
                    "headers": dict(response.headers)
                }
                
                # Cache the response
                await cache_manager.set(cache_key, cache_data, config)
                
                # Add cache headers
                if self.cache_headers:
                    response.headers["X-Cache"] = "MISS"
                    response.headers["X-Cache-Key"] = cache_key[:16] + "..."
                    response.headers["Cache-Control"] = f"public, max-age={config.ttl_minutes * 60}"
                
                # Return new response with cached body
                return JSONResponse(
                    content=response_data,
                    headers=dict(response.headers),
                    status_code=response.status_code
                )
                
            except Exception as e:
                print(f"Caching error: {e}")
        
        return response
    
    def _generate_cache_key(self, request: Request) -> str:
        """Generate cache key from request"""
        # Include path, query parameters, and relevant headers
        key_components = [
            request.url.path,
            str(sorted(request.query_params.items())),
        ]
        
        # Include user context for personalized responses
        if "authorization" in request.headers:
            # Use hash of auth header to avoid storing sensitive data
            auth_hash = hashlib.md5(
                request.headers["authorization"].encode()
            ).hexdigest()[:8]
            key_components.append(auth_hash)
        
        key_string = ":".join(key_components)
        return hashlib.md5(key_string.encode()).hexdigest()
    
    def _get_cache_config(self, path: str) -> Optional[CacheConfig]:
        """Get cache configuration for path"""
        # Check exact match first
        if path in self.cache_config:
            return self.cache_config[path]
        
        # Check default configurations
        if path in self.default_configs:
            return self.default_configs[path]
        
        # Check pattern matches
        for pattern, config in self.cache_config.items():
            if self._path_matches_pattern(path, pattern):
                return config
        
        # Check default pattern matches
        for pattern, config in self.default_configs.items():
            if self._path_matches_pattern(path, pattern):
                return config
        
        return None
    
    def _path_matches_pattern(self, path: str, pattern: str) -> bool:
        """Check if path matches pattern"""
        # Simple wildcard matching
        if "*" in pattern:
            pattern_parts = pattern.split("*")
            if len(pattern_parts) == 2:
                prefix, suffix = pattern_parts
                return path.startswith(prefix) and path.endswith(suffix)
        
        return path.startswith(pattern)
    
    async def _invalidate_related_cache(self, path: str):
        """Invalidate cache entries related to the modified resource"""
        # Define invalidation patterns
        invalidation_patterns = {
            "/api/v1/weddings": ["wedding_*", "guests_*", "budget_*"],
            "/api/v1/guests": ["guests_*", "wedding_*"],
            "/api/v1/vendors": ["vendor_*", "vendors_*"],
            "/api/v1/budget": ["budget_*", "wedding_*"],
            "/api/v1/admin": ["admin_*", "analytics_*"]
        }
        
        # Find matching patterns
        for base_path, patterns in invalidation_patterns.items():
            if path.startswith(base_path):
                for pattern in patterns:
                    await cache_manager.invalidate_pattern(pattern)
                break


class ConditionalCachingMiddleware(BaseHTTPMiddleware):
    """Middleware for conditional caching with ETags and Last-Modified"""
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request with conditional caching"""
        
        # Only handle GET requests
        if request.method != "GET":
            return await call_next(request)
        
        # Generate ETag for request
        etag = self._generate_etag(request)
        
        # Check If-None-Match header
        if_none_match = request.headers.get("if-none-match")
        if if_none_match and if_none_match == etag:
            return Response(status_code=304)  # Not Modified
        
        # Execute request
        response = await call_next(request)
        
        # Add ETag to response
        if response.status_code == 200:
            response.headers["ETag"] = etag
            response.headers["Cache-Control"] = "private, must-revalidate"
        
        return response
    
    def _generate_etag(self, request: Request) -> str:
        """Generate ETag for request"""
        # Simple ETag based on URL and query parameters
        etag_data = f"{request.url.path}:{request.query_params}"
        return f'"{hashlib.md5(etag_data.encode()).hexdigest()}"'


# Cache warming service
class CacheWarmingService:
    """Service for warming up cache with frequently accessed data"""
    
    def __init__(self):
        self.warm_endpoints = [
            "/api/v1/vendors/categories",
            "/api/v1/communication/message-templates"
        ]
    
    async def warm_cache(self, base_url: str = "http://localhost:8000"):
        """Warm cache by making requests to key endpoints"""
        import aiohttp
        
        async with aiohttp.ClientSession() as session:
            for endpoint in self.warm_endpoints:
                try:
                    url = f"{base_url}{endpoint}"
                    async with session.get(url) as response:
                        if response.status == 200:
                            print(f"Warmed cache for {endpoint}")
                        else:
                            print(f"Failed to warm cache for {endpoint}: {response.status}")
                except Exception as e:
                    print(f"Cache warming error for {endpoint}: {e}")


# Cache statistics endpoint data
class CacheStatsCollector:
    """Collect and provide cache statistics"""
    
    @staticmethod
    async def get_cache_stats() -> Dict[str, any]:
        """Get comprehensive cache statistics"""
        cache_stats = cache_manager.get_stats()
        
        return {
            "cache_manager": cache_stats,
            "redis_available": cache_manager.redis.is_available(),
            "local_cache_size": len(cache_manager.local_cache),
            "active_refresh_tasks": len(cache_manager.refresh_tasks)
        }


# Export instances
cache_warming_service = CacheWarmingService()
cache_stats_collector = CacheStatsCollector()