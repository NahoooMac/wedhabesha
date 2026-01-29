"""
Redis Service

Session management and caching using Redis.
"""

import json
import redis
from typing import Optional, Any
from datetime import timedelta

from app.core.config import settings


class RedisService:
    """Redis service for session management and caching"""
    
    def __init__(self):
        self._client = None
        self._initialize_redis()
    
    def _initialize_redis(self):
        """Initialize Redis connection"""
        try:
            self._client = redis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5
            )
            # Test connection
            self._client.ping()
        except Exception as e:
            print(f"Redis connection warning: {e}")
            # Continue without Redis for development
            self._client = None
    
    def is_available(self) -> bool:
        """Check if Redis service is available"""
        return self._client is not None
    
    async def set_session(self, session_id: str, data: dict, expire_minutes: int = None) -> bool:
        """
        Store session data in Redis
        
        Args:
            session_id: Unique session identifier
            data: Session data to store
            expire_minutes: Session expiration in minutes
            
        Returns:
            True if successful, False otherwise
        """
        if not self._client:
            return False
        
        try:
            key = f"session:{session_id}"
            value = json.dumps(data)
            
            if expire_minutes:
                expire_seconds = expire_minutes * 60
                self._client.setex(key, expire_seconds, value)
            else:
                # Default expiration from settings
                expire_seconds = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
                self._client.setex(key, expire_seconds, value)
            
            return True
        except Exception as e:
            print(f"Redis set session error: {e}")
            return False
    
    async def get_session(self, session_id: str) -> Optional[dict]:
        """
        Retrieve session data from Redis
        
        Args:
            session_id: Session identifier
            
        Returns:
            Session data if found, None otherwise
        """
        if not self._client:
            return None
        
        try:
            key = f"session:{session_id}"
            value = self._client.get(key)
            
            if value:
                return json.loads(value)
            return None
        except Exception as e:
            print(f"Redis get session error: {e}")
            return None
    
    async def delete_session(self, session_id: str) -> bool:
        """
        Delete session from Redis
        
        Args:
            session_id: Session identifier
            
        Returns:
            True if successful, False otherwise
        """
        if not self._client:
            return False
        
        try:
            key = f"session:{session_id}"
            self._client.delete(key)
            return True
        except Exception as e:
            print(f"Redis delete session error: {e}")
            return False
    
    async def extend_session(self, session_id: str, expire_minutes: int = None) -> bool:
        """
        Extend session expiration time
        
        Args:
            session_id: Session identifier
            expire_minutes: New expiration in minutes
            
        Returns:
            True if successful, False otherwise
        """
        if not self._client:
            return False
        
        try:
            key = f"session:{session_id}"
            
            if expire_minutes:
                expire_seconds = expire_minutes * 60
            else:
                expire_seconds = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
            
            self._client.expire(key, expire_seconds)
            return True
        except Exception as e:
            print(f"Redis extend session error: {e}")
            return False
    
    async def set_cache(self, key: str, value: Any, expire_minutes: int = 60) -> bool:
        """
        Store data in Redis cache
        
        Args:
            key: Cache key
            value: Data to cache
            expire_minutes: Cache expiration in minutes
            
        Returns:
            True if successful, False otherwise
        """
        if not self._client:
            return False
        
        try:
            cache_key = f"cache:{key}"
            cache_value = json.dumps(value) if not isinstance(value, str) else value
            expire_seconds = expire_minutes * 60
            
            self._client.setex(cache_key, expire_seconds, cache_value)
            return True
        except Exception as e:
            print(f"Redis set cache error: {e}")
            return False
    
    async def get_cache(self, key: str) -> Optional[Any]:
        """
        Retrieve data from Redis cache
        
        Args:
            key: Cache key
            
        Returns:
            Cached data if found, None otherwise
        """
        if not self._client:
            return None
        
        try:
            cache_key = f"cache:{key}"
            value = self._client.get(cache_key)
            
            if value:
                try:
                    return json.loads(value)
                except json.JSONDecodeError:
                    return value
            return None
        except Exception as e:
            print(f"Redis get cache error: {e}")
            return None
    
    async def set_json(self, key: str, data: dict, expire_minutes: int = 60) -> bool:
        """
        Store JSON data in Redis
        
        Args:
            key: Redis key
            data: Dictionary data to store
            expire_minutes: Expiration in minutes
            
        Returns:
            True if successful, False otherwise
        """
        if not self._client:
            return False
        
        try:
            value = json.dumps(data)
            expire_seconds = expire_minutes * 60
            self._client.setex(key, expire_seconds, value)
            return True
        except Exception as e:
            print(f"Redis set JSON error: {e}")
            return False
    
    async def get_json(self, key: str) -> Optional[dict]:
        """
        Retrieve JSON data from Redis
        
        Args:
            key: Redis key
            
        Returns:
            Dictionary data if found, None otherwise
        """
        if not self._client:
            return None
        
        try:
            value = self._client.get(key)
            if value:
                return json.loads(value)
            return None
        except Exception as e:
            print(f"Redis get JSON error: {e}")
            return None
    
    async def publish(self, channel: str, message: dict) -> bool:
        """
        Publish message to Redis channel
        
        Args:
            channel: Redis channel name
            message: Message data to publish
            
        Returns:
            True if successful, False otherwise
        """
        if not self._client:
            return False
        
        try:
            message_json = json.dumps(message)
            self._client.publish(channel, message_json)
            return True
        except Exception as e:
            print(f"Redis publish error: {e}")
            return False
            
    async def get(self, key: str) -> Optional[str]:
        """Get raw value from Redis"""
        if not self._client:
            return None
        try:
            return self._client.get(key)
        except Exception as e:
            print(f"Redis get error: {e}")
            return None

    async def setex(self, key: str, seconds: int, value: str) -> bool:
        """Set value with expiration"""
        if not self._client:
            return False
        try:
            self._client.setex(key, seconds, value)
            return True
        except Exception as e:
            print(f"Redis setex error: {e}")
            return False

    async def delete(self, key: str) -> bool:
        """Delete key from Redis"""
        if not self._client:
            return False
        try:
            self._client.delete(key)
            return True
        except Exception as e:
            print(f"Redis delete error: {e}")
            return False
            
    async def keys(self, pattern: str) -> list:
        """Get keys matching pattern"""
        if not self._client:
            return []
        try:
            return self._client.keys(pattern)
        except Exception as e:
            print(f"Redis keys error: {e}")
            return []


# Global Redis service instance
redis_service = RedisService()