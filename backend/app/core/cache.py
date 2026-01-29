"""
Advanced Caching Service

Enhanced caching with multiple strategies, cache warming, and performance optimization.
"""

import json
import hashlib
import asyncio
from typing import Any, Optional, Dict, List, Callable, Union
from datetime import datetime, timedelta
from functools import wraps
from dataclasses import dataclass
from enum import Enum

from app.core.redis import redis_service
from app.core.config import settings


class CacheStrategy(Enum):
    """Cache invalidation strategies"""
    TTL = "ttl"  # Time-to-live
    LRU = "lru"  # Least Recently Used
    WRITE_THROUGH = "write_through"  # Write to cache and database
    WRITE_BEHIND = "write_behind"  # Write to cache first, database later
    REFRESH_AHEAD = "refresh_ahead"  # Refresh before expiration


@dataclass
class CacheConfig:
    """Cache configuration"""
    ttl_minutes: int = 60
    strategy: CacheStrategy = CacheStrategy.TTL
    max_size: int = 1000
    refresh_threshold: float = 0.8  # Refresh when 80% of TTL has passed
    enable_compression: bool = False
    enable_encryption: bool = False


class CacheManager:
    """Advanced cache manager with multiple strategies"""
    
    def __init__(self):
        self.redis = redis_service
        self.local_cache: Dict[str, Any] = {}
        self.cache_stats: Dict[str, int] = {
            "hits": 0,
            "misses": 0,
            "sets": 0,
            "deletes": 0,
            "errors": 0
        }
        self.refresh_tasks: Dict[str, asyncio.Task] = {}
    
    def _generate_cache_key(self, prefix: str, *args, **kwargs) -> str:
        """Generate consistent cache key"""
        key_data = f"{prefix}:{args}:{sorted(kwargs.items())}"
        return hashlib.md5(key_data.encode()).hexdigest()
    
    def _compress_data(self, data: Any) -> bytes:
        """Compress data for storage"""
        import gzip
        json_data = json.dumps(data).encode('utf-8')
        return gzip.compress(json_data)
    
    def _decompress_data(self, compressed_data: bytes) -> Any:
        """Decompress data from storage"""
        import gzip
        json_data = gzip.decompress(compressed_data).decode('utf-8')
        return json.loads(json_data)
    
    async def get(self, key: str, config: CacheConfig = None) -> Optional[Any]:
        """Get value from cache with fallback strategies"""
        config = config or CacheConfig()
        
        try:
            # Try Redis first
            if self.redis.is_available():
                cache_key = f"cache:{key}"
                cached_data = await self.redis.get_cache(key)
                
                if cached_data is not None:
                    self.cache_stats["hits"] += 1
                    
                    # Check if refresh is needed for refresh-ahead strategy
                    if config.strategy == CacheStrategy.REFRESH_AHEAD:
                        await self._check_refresh_ahead(key, config)
                    
                    return cached_data
            
            # Try local cache as fallback
            if key in self.local_cache:
                self.cache_stats["hits"] += 1
                return self.local_cache[key]
            
            self.cache_stats["misses"] += 1
            return None
            
        except Exception as e:
            self.cache_stats["errors"] += 1
            print(f"Cache get error for key {key}: {e}")
            return None
    
    async def set(self, key: str, value: Any, config: CacheConfig = None) -> bool:
        """Set value in cache with configuration"""
        config = config or CacheConfig()
        
        try:
            # Store in Redis
            if self.redis.is_available():
                success = await self.redis.set_cache(key, value, config.ttl_minutes)
                if success:
                    self.cache_stats["sets"] += 1
                    
                    # Set refresh task for refresh-ahead strategy
                    if config.strategy == CacheStrategy.REFRESH_AHEAD:
                        await self._schedule_refresh_ahead(key, config)
                    
                    return True
            
            # Fallback to local cache
            self.local_cache[key] = value
            self.cache_stats["sets"] += 1
            
            # Implement LRU eviction for local cache
            if len(self.local_cache) > config.max_size:
                # Remove oldest entry (simple FIFO for now)
                oldest_key = next(iter(self.local_cache))
                del self.local_cache[oldest_key]
            
            return True
            
        except Exception as e:
            self.cache_stats["errors"] += 1
            print(f"Cache set error for key {key}: {e}")
            return False
    
    async def delete(self, key: str) -> bool:
        """Delete value from cache"""
        try:
            success = True
            
            # Delete from Redis
            if self.redis.is_available():
                cache_key = f"cache:{key}"
                await self.redis._client.delete(cache_key)
            
            # Delete from local cache
            if key in self.local_cache:
                del self.local_cache[key]
            
            # Cancel refresh task if exists
            if key in self.refresh_tasks:
                self.refresh_tasks[key].cancel()
                del self.refresh_tasks[key]
            
            self.cache_stats["deletes"] += 1
            return success
            
        except Exception as e:
            self.cache_stats["errors"] += 1
            print(f"Cache delete error for key {key}: {e}")
            return False
    
    async def invalidate_pattern(self, pattern: str) -> int:
        """Invalidate all keys matching pattern"""
        try:
            if not self.redis.is_available():
                return 0
            
            # Get all keys matching pattern
            keys = self.redis._client.keys(f"cache:{pattern}")
            if keys:
                deleted = self.redis._client.delete(*keys)
                self.cache_stats["deletes"] += deleted
                return deleted
            
            return 0
            
        except Exception as e:
            self.cache_stats["errors"] += 1
            print(f"Cache pattern invalidation error for {pattern}: {e}")
            return 0
    
    async def _check_refresh_ahead(self, key: str, config: CacheConfig):
        """Check if cache needs refresh-ahead"""
        try:
            if not self.redis.is_available():
                return
            
            cache_key = f"cache:{key}"
            ttl = self.redis._client.ttl(cache_key)
            
            if ttl > 0:
                refresh_time = config.ttl_minutes * 60 * config.refresh_threshold
                if ttl < refresh_time:
                    # Schedule refresh if not already scheduled
                    if key not in self.refresh_tasks:
                        await self._schedule_refresh_ahead(key, config)
        
        except Exception as e:
            print(f"Refresh-ahead check error for key {key}: {e}")
    
    async def _schedule_refresh_ahead(self, key: str, config: CacheConfig):
        """Schedule refresh-ahead task"""
        try:
            refresh_time = config.ttl_minutes * 60 * (1 - config.refresh_threshold)
            
            async def refresh_task():
                await asyncio.sleep(refresh_time)
                # This would trigger the original function to refresh the cache
                # Implementation depends on the specific use case
                if key in self.refresh_tasks:
                    del self.refresh_tasks[key]
            
            task = asyncio.create_task(refresh_task())
            self.refresh_tasks[key] = task
            
        except Exception as e:
            print(f"Refresh-ahead scheduling error for key {key}: {e}")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        total_requests = self.cache_stats["hits"] + self.cache_stats["misses"]
        hit_rate = (self.cache_stats["hits"] / total_requests * 100) if total_requests > 0 else 0
        
        return {
            **self.cache_stats,
            "hit_rate": round(hit_rate, 2),
            "total_requests": total_requests,
            "local_cache_size": len(self.local_cache),
            "active_refresh_tasks": len(self.refresh_tasks)
        }
    
    def disconnect(self):
        """Disconnect and cleanup cache resources"""
        try:
            # Cancel all refresh tasks
            for task in self.refresh_tasks.values():
                if not task.done():
                    task.cancel()
            self.refresh_tasks.clear()
            
            # Clear local cache
            self.local_cache.clear()
            
            # Reset stats
            self.cache_stats = {
                "hits": 0,
                "misses": 0,
                "sets": 0,
                "deletes": 0,
                "errors": 0
            }
            
        except Exception as e:
            print(f"Cache disconnect error: {e}")
    
    async def warm_cache(self, warm_functions: List[Callable]) -> Dict[str, bool]:
        """Warm cache with predefined data"""
        results = {}
        
        for func in warm_functions:
            try:
                await func()
                results[func.__name__] = True
            except Exception as e:
                print(f"Cache warming error for {func.__name__}: {e}")
                results[func.__name__] = False
        
        return results


# Global cache manager instance
cache_manager = CacheManager()


def cached(
    key_prefix: str,
    config: CacheConfig = None,
    key_builder: Callable = None
):
    """
    Decorator for caching function results
    
    Args:
        key_prefix: Prefix for cache key
        config: Cache configuration
        key_builder: Custom function to build cache key
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Build cache key
            if key_builder:
                cache_key = key_builder(*args, **kwargs)
            else:
                cache_key = cache_manager._generate_cache_key(key_prefix, *args, **kwargs)
            
            # Try to get from cache
            cached_result = await cache_manager.get(cache_key, config)
            if cached_result is not None:
                return cached_result
            
            # Execute function and cache result
            result = await func(*args, **kwargs)
            await cache_manager.set(cache_key, result, config)
            
            return result
        
        return wrapper
    return decorator


# Specific cache configurations for different data types
CACHE_CONFIGS = {
    "wedding_data": CacheConfig(
        ttl_minutes=30,
        strategy=CacheStrategy.WRITE_THROUGH,
        max_size=500
    ),
    "guest_list": CacheConfig(
        ttl_minutes=15,
        strategy=CacheStrategy.WRITE_THROUGH,
        max_size=1000
    ),
    "vendor_data": CacheConfig(
        ttl_minutes=60,
        strategy=CacheStrategy.REFRESH_AHEAD,
        max_size=200,
        refresh_threshold=0.7
    ),
    "analytics": CacheConfig(
        ttl_minutes=5,
        strategy=CacheStrategy.TTL,
        max_size=100
    ),
    "static_data": CacheConfig(
        ttl_minutes=1440,  # 24 hours
        strategy=CacheStrategy.TTL,
        max_size=50
    )
}


# Cache warming functions
async def warm_vendor_categories():
    """Warm cache with vendor categories"""
    from app.services.vendor_service import VendorService
    vendor_service = VendorService()
    categories = await vendor_service.get_categories()
    await cache_manager.set("vendor_categories", categories, CACHE_CONFIGS["static_data"])


async def warm_message_templates():
    """Warm cache with message templates"""
    templates = {
        "qr_invitation": {
            "description": "QR code invitation message",
            "variables": ["guest_name", "wedding_date", "venue_name", "qr_code_url"]
        },
        "event_update": {
            "description": "Event update message",
            "variables": ["guest_name", "update_message", "wedding_date"]
        }
    }
    await cache_manager.set("message_templates", templates, CACHE_CONFIGS["static_data"])


# Cache warming on startup
CACHE_WARM_FUNCTIONS = [
    warm_vendor_categories,
    warm_message_templates,
]


# Cache invalidation helpers
class CacheInvalidator:
    """Helper class for cache invalidation"""
    
    @staticmethod
    async def invalidate_wedding_cache(wedding_id: int):
        """Invalidate all wedding-related cache"""
        patterns = [
            f"wedding_{wedding_id}_*",
            f"guests_{wedding_id}_*",
            f"budget_{wedding_id}_*",
            f"analytics_{wedding_id}_*"
        ]
        
        for pattern in patterns:
            await cache_manager.invalidate_pattern(pattern)
    
    @staticmethod
    async def invalidate_vendor_cache(vendor_id: int):
        """Invalidate vendor-related cache"""
        patterns = [
            f"vendor_{vendor_id}_*",
            f"vendor_reviews_{vendor_id}_*",
            f"vendor_leads_{vendor_id}_*"
        ]
        
        for pattern in patterns:
            await cache_manager.invalidate_pattern(pattern)
    
    @staticmethod
    async def invalidate_user_cache(user_id: int):
        """Invalidate user-related cache"""
        patterns = [
            f"user_{user_id}_*",
            f"couple_{user_id}_*"
        ]
        
        for pattern in patterns:
            await cache_manager.invalidate_pattern(pattern)


# Export cache invalidator
cache_invalidator = CacheInvalidator()