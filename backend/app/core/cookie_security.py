"""
Cookie Security Utilities

Secure cookie handling with proper security attributes.
"""

from typing import Optional, Dict, Any
from fastapi import Response, Request
from datetime import datetime, timedelta
import logging

from app.core.config import settings


logger = logging.getLogger(__name__)


class SecureCookieManager:
    """
    Secure cookie management with proper security attributes
    """
    
    def __init__(self):
        self.cookie_config = {
            "httponly": settings.COOKIE_HTTPONLY,
            "secure": settings.COOKIE_SECURE or settings.ENVIRONMENT == "production",
            "samesite": settings.COOKIE_SAMESITE,
            "max_age": settings.SESSION_TIMEOUT_MINUTES * 60
        }
    
    def set_secure_cookie(
        self,
        response: Response,
        key: str,
        value: str,
        max_age: Optional[int] = None,
        expires: Optional[datetime] = None,
        path: str = "/",
        domain: Optional[str] = None,
        httponly: Optional[bool] = None,
        secure: Optional[bool] = None,
        samesite: Optional[str] = None
    ):
        """
        Set a secure cookie with proper security attributes
        
        Args:
            response: FastAPI response object
            key: Cookie name
            value: Cookie value
            max_age: Cookie max age in seconds
            expires: Cookie expiration datetime
            path: Cookie path
            domain: Cookie domain
            httponly: HttpOnly flag
            secure: Secure flag
            samesite: SameSite attribute
        """
        cookie_params = {
            "key": key,
            "value": value,
            "path": path,
            "httponly": httponly if httponly is not None else self.cookie_config["httponly"],
            "secure": secure if secure is not None else self.cookie_config["secure"],
            "samesite": samesite if samesite is not None else self.cookie_config["samesite"]
        }
        
        if max_age is not None:
            cookie_params["max_age"] = max_age
        elif expires is not None:
            cookie_params["expires"] = expires
        else:
            cookie_params["max_age"] = self.cookie_config["max_age"]
        
        if domain:
            cookie_params["domain"] = domain
        
        try:
            response.set_cookie(**cookie_params)
            logger.debug(f"Set secure cookie: {key}")
            
        except Exception as e:
            logger.error(f"Failed to set secure cookie {key}: {str(e)}")
    
    def set_session_cookie(
        self,
        response: Response,
        session_token: str,
        remember_me: bool = False
    ):
        """
        Set session cookie with appropriate security settings
        
        Args:
            response: FastAPI response object
            session_token: Session token value
            remember_me: Whether to set long-term cookie
        """
        max_age = None
        
        if remember_me:
            # Long-term session (30 days)
            max_age = 30 * 24 * 60 * 60
        else:
            # Session cookie (expires when browser closes)
            max_age = settings.SESSION_TIMEOUT_MINUTES * 60
        
        self.set_secure_cookie(
            response=response,
            key="session_token",
            value=session_token,
            max_age=max_age,
            httponly=True,  # Always HttpOnly for session cookies
            secure=self.cookie_config["secure"],
            samesite=self.cookie_config["samesite"]
        )
    
    def set_csrf_cookie(self, response: Response, csrf_token: str):
        """
        Set CSRF token cookie
        
        Args:
            response: FastAPI response object
            csrf_token: CSRF token value
        """
        self.set_secure_cookie(
            response=response,
            key="csrf_token",
            value=csrf_token,
            httponly=False,  # CSRF token needs to be accessible to JavaScript
            secure=self.cookie_config["secure"],
            samesite=self.cookie_config["samesite"]
        )
    
    def clear_cookie(
        self,
        response: Response,
        key: str,
        path: str = "/",
        domain: Optional[str] = None
    ):
        """
        Clear a cookie securely
        
        Args:
            response: FastAPI response object
            key: Cookie name to clear
            path: Cookie path
            domain: Cookie domain
        """
        cookie_params = {
            "key": key,
            "path": path,
            "httponly": self.cookie_config["httponly"],
            "secure": self.cookie_config["secure"],
            "samesite": self.cookie_config["samesite"],
            "expires": datetime.utcnow() - timedelta(days=1)  # Set to past date
        }
        
        if domain:
            cookie_params["domain"] = domain
        
        try:
            response.set_cookie(**cookie_params)
            logger.debug(f"Cleared cookie: {key}")
            
        except Exception as e:
            logger.error(f"Failed to clear cookie {key}: {str(e)}")
    
    def clear_session_cookies(self, response: Response):
        """
        Clear all session-related cookies
        
        Args:
            response: FastAPI response object
        """
        session_cookies = ["session_token", "csrf_token", "remember_token"]
        
        for cookie_name in session_cookies:
            self.clear_cookie(response, cookie_name)
    
    def get_cookie_value(self, request: Request, key: str) -> Optional[str]:
        """
        Get cookie value from request
        
        Args:
            request: FastAPI request object
            key: Cookie name
            
        Returns:
            Cookie value if exists, None otherwise
        """
        try:
            return request.cookies.get(key)
        except Exception as e:
            logger.error(f"Failed to get cookie {key}: {str(e)}")
            return None
    
    def validate_cookie_security(self, request: Request) -> Dict[str, Any]:
        """
        Validate cookie security attributes
        
        Args:
            request: FastAPI request object
            
        Returns:
            Cookie security validation results
        """
        results = {
            "secure_connection": request.url.scheme == "https",
            "cookies_present": len(request.cookies) > 0,
            "session_cookie_secure": False,
            "recommendations": []
        }
        
        # Check if running over HTTPS in production
        if settings.ENVIRONMENT == "production" and not results["secure_connection"]:
            results["recommendations"].append("Use HTTPS in production")
        
        # Check session cookie security
        session_token = request.cookies.get("session_token")
        if session_token:
            results["session_cookie_secure"] = True
        
        # Add general recommendations
        if not self.cookie_config["secure"] and settings.ENVIRONMENT == "production":
            results["recommendations"].append("Enable secure cookies in production")
        
        if self.cookie_config["samesite"] == "none":
            results["recommendations"].append("Consider using 'lax' or 'strict' SameSite policy")
        
        return results


# Global cookie manager instance
cookie_manager = SecureCookieManager()