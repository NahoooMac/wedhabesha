"""
Authentication Middleware

Middleware for handling authentication and authorization across the application.
"""

from typing import Callable, Optional
from fastapi import Request, Response, HTTPException, status, Depends, Header
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import logging

from app.core.firebase import firebase_service
from app.core.redis import redis_service


logger = logging.getLogger(__name__)


async def get_staff_session(authorization: Optional[str] = Header(None)) -> dict:
    """
    Dependency to validate staff session token
    
    Args:
        authorization: Authorization header
        
    Returns:
        Staff session data
        
    Raises:
        HTTPException: If session is invalid
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header"
        )
    
    token = authorization.split(" ")[1]
    
    try:
        session_data = await redis_service.get_session(token)
        
        if not session_data or session_data.get("session_type") != "staff":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid staff session"
            )
        
        return session_data
        
    except Exception as e:
        logger.error(f"Staff session validation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session validation failed"
        )


class AuthenticationMiddleware(BaseHTTPMiddleware):
    """
    Middleware for handling authentication and session management
    """
    
    def __init__(self, app, exclude_paths: Optional[list] = None):
        super().__init__(app)
        self.exclude_paths = exclude_paths or [
            "/docs",
            "/redoc",
            "/openapi.json",
            "/health",
            "/api/v1/auth/register",
            "/api/v1/auth/login",
            "/api/v1/auth/google-signin",
            "/api/v1/auth/staff/verify"
        ]
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Process request through authentication middleware
        
        Args:
            request: Incoming HTTP request
            call_next: Next middleware/handler in chain
            
        Returns:
            HTTP response
        """
        # Skip authentication for excluded paths
        if any(request.url.path.startswith(path) for path in self.exclude_paths):
            return await call_next(request)
        
        # Skip authentication for OPTIONS requests (CORS preflight)
        if request.method == "OPTIONS":
            return await call_next(request)
        
        try:
            # Check for Authorization header
            auth_header = request.headers.get("Authorization")
            
            if auth_header and auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]
                
                # Try to validate as Firebase token first (for Google Sign-In)
                if await self._is_firebase_token(token):
                    firebase_user = await self._validate_firebase_token(token)
                    if firebase_user:
                        # Add Firebase user info to request state
                        request.state.firebase_user = firebase_user
                        request.state.auth_type = "firebase"
                
                # Check if it's a staff session token
                elif await self._is_staff_session(token):
                    session_data = await redis_service.get_session(token)
                    if session_data and session_data.get("session_type") == "staff":
                        request.state.staff_session = session_data
                        request.state.auth_type = "staff"
                
                # Otherwise, treat as JWT token (handled by endpoint dependencies)
                else:
                    request.state.auth_type = "jwt"
            
            # Continue to next middleware/handler
            response = await call_next(request)
            return response
            
        except Exception as e:
            logger.error(f"Authentication middleware error: {str(e)}")
            # Don't block request on middleware errors, let endpoint handle auth
            return await call_next(request)
    
    async def _is_firebase_token(self, token: str) -> bool:
        """
        Check if token appears to be a Firebase ID token
        
        Args:
            token: Token to check
            
        Returns:
            True if token appears to be Firebase token
        """
        try:
            # Firebase tokens are typically longer and have specific structure
            # This is a heuristic check - actual validation happens later
            parts = token.split('.')
            return len(parts) == 3 and len(token) > 100
        except Exception:
            return False
    
    async def _validate_firebase_token(self, token: str) -> Optional[dict]:
        """
        Validate Firebase ID token
        
        Args:
            token: Firebase ID token
            
        Returns:
            Firebase user info if valid, None otherwise
        """
        try:
            if firebase_service.is_available():
                return await firebase_service.verify_id_token(token)
        except Exception as e:
            logger.warning(f"Firebase token validation failed: {str(e)}")
        
        return None
    
    async def _is_staff_session(self, token: str) -> bool:
        """
        Check if token is a staff session token
        
        Args:
            token: Token to check
            
        Returns:
            True if token appears to be staff session token
        """
        try:
            # Staff session tokens are UUIDs stored in Redis
            session_data = await redis_service.get_session(token)
            return session_data is not None and session_data.get("session_type") == "staff"
        except Exception:
            return False


class CORSMiddleware(BaseHTTPMiddleware):
    """
    Custom CORS middleware with authentication-aware headers
    """
    
    def __init__(self, app, allow_origins: list = None, allow_methods: list = None, allow_headers: list = None):
        super().__init__(app)
        self.allow_origins = allow_origins or ["*"]
        self.allow_methods = allow_methods or ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"]
        self.allow_headers = allow_headers or [
            "Authorization",
            "Content-Type",
            "X-Requested-With",
            "Accept",
            "Origin",
            "User-Agent",
            "DNT",
            "Cache-Control",
            "X-Mx-ReqToken",
            "Keep-Alive",
            "X-Requested-With",
            "If-Modified-Since"
        ]
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Process request through CORS middleware
        
        Args:
            request: Incoming HTTP request
            call_next: Next middleware/handler in chain
            
        Returns:
            HTTP response with CORS headers
        """
        origin = request.headers.get("Origin")
        
        # Handle preflight requests
        if request.method == "OPTIONS":
            response = Response()
            response.headers["Access-Control-Allow-Methods"] = ", ".join(self.allow_methods)
            response.headers["Access-Control-Allow-Headers"] = ", ".join(self.allow_headers)
            response.headers["Access-Control-Max-Age"] = "86400"  # 24 hours
        else:
            response = await call_next(request)
        
        # Add CORS headers
        if origin and (self.allow_origins == ["*"] or origin in self.allow_origins):
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
        elif self.allow_origins == ["*"]:
            response.headers["Access-Control-Allow-Origin"] = "*"
        
        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware to add security headers to responses
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Add security headers to response
        
        Args:
            request: Incoming HTTP request
            call_next: Next middleware/handler in chain
            
        Returns:
            HTTP response with security headers
        """
        response = await call_next(request)
        
        # Add security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self' data:; "
            "connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com"
        )
        
        return response