"""
Session Security Management

Secure session handling with timeout, lockout, and security features.
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import uuid
import logging
import json
from fastapi import HTTPException, status

from app.core.redis import redis_service
from app.core.config import settings


logger = logging.getLogger(__name__)


class SessionManager:
    """
    Secure session management with timeout and security features
    """
    
    def __init__(self):
        self.session_prefix = "session:"
        self.login_attempts_prefix = "login_attempts:"
        self.lockout_prefix = "lockout:"
    
    async def create_session(
        self, 
        user_id: int, 
        user_type: str, 
        additional_data: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Create a new secure session
        
        Args:
            user_id: User ID
            user_type: Type of user (couple, vendor, admin)
            additional_data: Additional session data
            
        Returns:
            Session token
        """
        session_token = str(uuid.uuid4())
        
        session_data = {
            "user_id": user_id,
            "user_type": user_type,
            "created_at": datetime.utcnow().isoformat(),
            "last_activity": datetime.utcnow().isoformat(),
            "ip_address": None,  # Will be set by middleware
            "user_agent": None,  # Will be set by middleware
        }
        
        if additional_data:
            session_data.update(additional_data)
        
        # Store session with timeout
        session_key = f"{self.session_prefix}{session_token}"
        timeout_seconds = settings.SESSION_TIMEOUT_MINUTES * 60
        
        try:
            if redis_service.is_available():
                await redis_service.set_session(
                    session_token,
                    session_data,
                    expire_minutes=settings.SESSION_TIMEOUT_MINUTES
                )
            
            logger.info(f"Created session for user {user_id} ({user_type})")
            return session_token
            
        except Exception as e:
            logger.error(f"Failed to create session: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create session"
            )
    
    async def get_session(self, session_token: str) -> Optional[Dict[str, Any]]:
        """
        Get session data and update last activity
        
        Args:
            session_token: Session token
            
        Returns:
            Session data if valid, None otherwise
        """
        session_key = f"{self.session_prefix}{session_token}"
        
        try:
            if not redis_service.is_available():
                return None
            
            session_data = await redis_service.get_session(session_token)
            
            if session_data:
                # Update last activity
                session_data["last_activity"] = datetime.utcnow().isoformat()
                
                # Extend session timeout
                await redis_service.extend_session(session_token, settings.SESSION_TIMEOUT_MINUTES)
            
            return session_data
            
        except Exception as e:
            logger.error(f"Failed to get session: {str(e)}")
            return None
    
    async def invalidate_session(self, session_token: str) -> bool:
        """
        Invalidate a session
        
        Args:
            session_token: Session token to invalidate
            
        Returns:
            True if session was invalidated
        """
        session_key = f"{self.session_prefix}{session_token}"
        
        try:
            if redis_service.is_available():
                result = await redis_service.delete_session(session_token)
                logger.info(f"Invalidated session: {session_token}")
                return bool(result)
            
            return False
            
        except Exception as e:
            logger.error(f"Failed to invalidate session: {str(e)}")
            return False
    
    async def invalidate_user_sessions(self, user_id: int) -> int:
        """
        Invalidate all sessions for a user
        
        Args:
            user_id: User ID
            
        Returns:
            Number of sessions invalidated
        """
        try:
            if not redis_service.is_available():
                return 0
            
            # Find all sessions for user
            pattern = f"{self.session_prefix}*"
            keys = await redis_service.keys(pattern)
            
            invalidated_count = 0
            
            for key in keys:
                session_data = await redis_service.get(key)
                if session_data:
                    data = json.loads(session_data)
                    if data.get("user_id") == user_id:
                        await redis_service.delete(key)
                        invalidated_count += 1
            
            logger.info(f"Invalidated {invalidated_count} sessions for user {user_id}")
            return invalidated_count
            
        except Exception as e:
            logger.error(f"Failed to invalidate user sessions: {str(e)}")
            return 0
    
    async def record_login_attempt(self, identifier: str, success: bool) -> bool:
        """
        Record login attempt and check for lockout
        
        Args:
            identifier: User identifier (email, IP, etc.)
            success: Whether login was successful
            
        Returns:
            True if user is not locked out
        """
        attempts_key = f"{self.login_attempts_prefix}{identifier}"
        lockout_key = f"{self.lockout_prefix}{identifier}"
        
        try:
            if not redis_service.is_available():
                return True
            
            # Check if user is currently locked out
            lockout_data = await redis_service.get(lockout_key)
            if lockout_data:
                lockout_info = json.loads(lockout_data)
                lockout_until = datetime.fromisoformat(lockout_info["lockout_until"])
                
                if datetime.utcnow() < lockout_until:
                    logger.warning(f"User {identifier} is locked out until {lockout_until}")
                    return False
                else:
                    # Lockout expired, remove it
                    await redis_service.delete(lockout_key)
            
            if success:
                # Clear failed attempts on successful login
                await redis_service.delete(attempts_key)
                return True
            
            # Record failed attempt
            current_attempts = await redis_service.get(attempts_key)
            attempts_count = int(current_attempts) if current_attempts else 0
            attempts_count += 1
            
            # Set attempts with 1 hour expiry
            await redis_service.setex(attempts_key, 3600, str(attempts_count))
            
            # Check if lockout threshold reached
            if attempts_count >= settings.MAX_LOGIN_ATTEMPTS:
                # Lock out user
                lockout_until = datetime.utcnow() + timedelta(minutes=settings.LOCKOUT_DURATION_MINUTES)
                lockout_data = {
                    "attempts": attempts_count,
                    "lockout_until": lockout_until.isoformat(),
                    "locked_at": datetime.utcnow().isoformat()
                }
                
                lockout_seconds = settings.LOCKOUT_DURATION_MINUTES * 60
                await redis_service.setex(
                    lockout_key,
                    lockout_seconds,
                    json.dumps(lockout_data)
                )
                
                # Clear attempts counter
                await redis_service.delete(attempts_key)
                
                logger.warning(f"User {identifier} locked out after {attempts_count} failed attempts")
                return False
            
            logger.info(f"Recorded failed login attempt for {identifier} ({attempts_count}/{settings.MAX_LOGIN_ATTEMPTS})")
            return True
            
        except Exception as e:
            logger.error(f"Failed to record login attempt: {str(e)}")
            return True  # Don't block on errors
    
    async def is_locked_out(self, identifier: str) -> bool:
        """
        Check if user is currently locked out
        
        Args:
            identifier: User identifier
            
        Returns:
            True if user is locked out
        """
        lockout_key = f"{self.lockout_prefix}{identifier}"
        
        try:
            if not redis_service.is_available():
                return False
            
            lockout_data = await redis_service.get(lockout_key)
            if not lockout_data:
                return False
            
            lockout_info = json.loads(lockout_data)
            lockout_until = datetime.fromisoformat(lockout_info["lockout_until"])
            
            if datetime.utcnow() < lockout_until:
                return True
            else:
                # Lockout expired, remove it
                await redis_service.delete(lockout_key)
                return False
                
        except Exception as e:
            logger.error(f"Failed to check lockout status: {str(e)}")
            return False
    
    async def get_session_stats(self) -> Dict[str, Any]:
        """
        Get session statistics
        
        Returns:
            Session statistics
        """
        try:
            if not redis_service.is_available():
                return {"active_sessions": 0, "error": "Redis not available"}
            
            # Count active sessions
            pattern = f"{self.session_prefix}*"
            keys = await redis_service.keys(pattern)
            
            session_types = {}
            total_sessions = 0
            
            for key in keys:
                session_data = await redis_service.get(key)
                if session_data:
                    data = json.loads(session_data)
                    user_type = data.get("user_type", "unknown")
                    session_types[user_type] = session_types.get(user_type, 0) + 1
                    total_sessions += 1
            
            return {
                "active_sessions": total_sessions,
                "session_types": session_types,
                "session_timeout_minutes": settings.SESSION_TIMEOUT_MINUTES
            }
            
        except Exception as e:
            logger.error(f"Failed to get session stats: {str(e)}")
            return {"error": str(e)}


# Global session manager instance
session_manager = SessionManager()