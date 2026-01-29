"""
Security Middleware

Comprehensive security middleware including rate limiting, input validation,
and security headers.
"""

from typing import Callable, Optional, Dict, Any
from fastapi import Request, Response, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import bleach
import json
import logging
import re
from urllib.parse import unquote

from app.core.redis import redis_service
from app.core.config import settings


logger = logging.getLogger(__name__)


# Rate limiter instance
limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=settings.REDIS_URL,
    default_limits=["1000/hour"]
)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Rate limiting middleware for authentication and sensitive endpoints
    """
    
    def __init__(self, app):
        super().__init__(app)
        self.rate_limits = {
            # Authentication endpoints - stricter limits
            "/api/v1/auth/login": "5/minute",
            "/api/v1/auth/register": "3/minute", 
            "/api/v1/auth/google-signin": "10/minute",
            "/api/v1/auth/staff/verify": "10/minute",
            "/api/v1/auth/refresh": "20/minute",
            
            # Password reset endpoints
            "/api/v1/auth/forgot-password": "3/minute",
            "/api/v1/auth/reset-password": "5/minute",
            
            # Check-in endpoints - moderate limits
            "/api/v1/checkin": "100/minute",
            
            # Communication endpoints - prevent spam
            "/api/v1/communication/send-invitation": "50/hour",
            "/api/v1/communication/bulk-message": "10/hour",
            
            # Admin endpoints - moderate limits
            "/api/v1/admin": "200/hour",
        }
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Apply rate limiting based on endpoint
        
        Args:
            request: Incoming HTTP request
            call_next: Next middleware/handler in chain
            
        Returns:
            HTTP response
        """
        try:
            # Check if endpoint needs rate limiting
            endpoint_limit = self._get_rate_limit(request.url.path)
            
            if endpoint_limit:
                # Apply rate limiting
                client_ip = get_remote_address(request)
                key = f"rate_limit:{client_ip}:{request.url.path}"
                
                # Check current rate limit
                current_count = await self._get_rate_limit_count(key)
                limit_count, time_window = self._parse_rate_limit(endpoint_limit)
                
                if current_count >= limit_count:
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail={
                            "error": "Rate limit exceeded",
                            "limit": endpoint_limit,
                            "retry_after": time_window
                        }
                    )
                
                # Increment counter
                await self._increment_rate_limit(key, time_window)
            
            return await call_next(request)
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Rate limiting error: {str(e)}")
            # Don't block request on rate limiting errors
            return await call_next(request)
    
    def _get_rate_limit(self, path: str) -> Optional[str]:
        """
        Get rate limit for specific path
        
        Args:
            path: Request path
            
        Returns:
            Rate limit string or None
        """
        for endpoint, limit in self.rate_limits.items():
            if path.startswith(endpoint):
                return limit
        return None
    
    def _parse_rate_limit(self, rate_limit: str) -> tuple:
        """
        Parse rate limit string into count and time window
        
        Args:
            rate_limit: Rate limit string (e.g., "5/minute")
            
        Returns:
            Tuple of (count, time_window_seconds)
        """
        count, period = rate_limit.split("/")
        count = int(count)
        
        time_windows = {
            "second": 1,
            "minute": 60,
            "hour": 3600,
            "day": 86400
        }
        
        time_window = time_windows.get(period, 60)
        return count, time_window
    
    async def _get_rate_limit_count(self, key: str) -> int:
        """
        Get current rate limit count for key
        
        Args:
            key: Rate limit key
            
        Returns:
            Current count
        """
        try:
            if redis_service.is_available():
                count = await redis_service.redis.get(key)
                return int(count) if count else 0
        except Exception:
            pass
        return 0
    
    async def _increment_rate_limit(self, key: str, time_window: int):
        """
        Increment rate limit counter
        
        Args:
            key: Rate limit key
            time_window: Time window in seconds
        """
        try:
            if redis_service.is_available():
                pipe = redis_service.redis.pipeline()
                pipe.incr(key)
                pipe.expire(key, time_window)
                await pipe.execute()
        except Exception as e:
            logger.error(f"Rate limit increment error: {str(e)}")


class InputValidationMiddleware(BaseHTTPMiddleware):
    """
    Input validation and sanitization middleware
    """
    
    def __init__(self, app):
        super().__init__(app)
        self.dangerous_patterns = [
            # SQL injection patterns
            r"(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)",
            r"(--|#|/\*|\*/)",
            r"(\b(OR|AND)\s+\d+\s*=\s*\d+)",
            
            # XSS patterns
            r"<script[^>]*>.*?</script>",
            r"javascript:",
            r"on\w+\s*=",
            r"<iframe[^>]*>.*?</iframe>",
            
            # Command injection patterns
            r"(\||&|;|\$\(|\`)",
            r"(rm\s|del\s|format\s)",
            
            # Path traversal patterns
            r"(\.\./|\.\.\\)",
            r"(/etc/passwd|/etc/shadow)",
        ]
        
        self.compiled_patterns = [re.compile(pattern, re.IGNORECASE) for pattern in self.dangerous_patterns]
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Validate and sanitize request input
        
        Args:
            request: Incoming HTTP request
            call_next: Next middleware/handler in chain
            
        Returns:
            HTTP response
        """
        try:
            # Skip validation for certain endpoints
            if self._should_skip_validation(request.url.path):
                return await call_next(request)
            
            # Validate URL parameters
            await self._validate_query_params(request)
            
            # Validate request body for POST/PUT requests
            if request.method in ["POST", "PUT", "PATCH"]:
                await self._validate_request_body(request)
            
            return await call_next(request)
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Input validation error: {str(e)}")
            # Don't block request on validation errors, let endpoint handle
            return await call_next(request)
    
    def _should_skip_validation(self, path: str) -> bool:
        """
        Check if path should skip validation
        
        Args:
            path: Request path
            
        Returns:
            True if should skip validation
        """
        skip_paths = [
            "/docs",
            "/redoc", 
            "/openapi.json",
            "/health",
            "/performance"
        ]
        
        return any(path.startswith(skip_path) for skip_path in skip_paths)
    
    async def _validate_query_params(self, request: Request):
        """
        Validate URL query parameters
        
        Args:
            request: HTTP request
            
        Raises:
            HTTPException: If dangerous patterns detected
        """
        for key, value in request.query_params.items():
            decoded_value = unquote(str(value))
            
            if self._contains_dangerous_patterns(decoded_value):
                logger.warning(f"Dangerous pattern detected in query param {key}: {decoded_value}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid input detected in query parameters"
                )
    
    async def _validate_request_body(self, request: Request):
        """
        Validate request body content
        
        Args:
            request: HTTP request
            
        Raises:
            HTTPException: If dangerous patterns detected
        """
        try:
            # Get request body
            body = await request.body()
            
            if not body:
                return
            
            # Try to parse as JSON
            try:
                body_str = body.decode('utf-8')
                
                # Check for dangerous patterns in raw body
                if self._contains_dangerous_patterns(body_str):
                    logger.warning(f"Dangerous pattern detected in request body")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Invalid input detected in request body"
                    )
                
                # Parse JSON and validate recursively
                if request.headers.get("content-type", "").startswith("application/json"):
                    try:
                        json_data = json.loads(body_str)
                        self._validate_json_data(json_data)
                    except json.JSONDecodeError:
                        # Not valid JSON, but that's okay - let endpoint handle
                        pass
                        
            except UnicodeDecodeError:
                # Binary data, skip validation
                pass
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Request body validation error: {str(e)}")
    
    def _validate_json_data(self, data: Any):
        """
        Recursively validate JSON data
        
        Args:
            data: JSON data to validate
            
        Raises:
            HTTPException: If dangerous patterns detected
        """
        if isinstance(data, dict):
            for key, value in data.items():
                if isinstance(value, str) and self._contains_dangerous_patterns(value):
                    logger.warning(f"Dangerous pattern detected in JSON field {key}: {value}")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Invalid input detected in field: {key}"
                    )
                elif isinstance(value, (dict, list)):
                    self._validate_json_data(value)
        elif isinstance(data, list):
            for item in data:
                self._validate_json_data(item)
    
    def _contains_dangerous_patterns(self, text: str) -> bool:
        """
        Check if text contains dangerous patterns
        
        Args:
            text: Text to check
            
        Returns:
            True if dangerous patterns found
        """
        for pattern in self.compiled_patterns:
            if pattern.search(text):
                return True
        return False


class EnhancedSecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Enhanced security headers middleware with HTTPS enforcement
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Add comprehensive security headers to response
        
        Args:
            request: Incoming HTTP request
            call_next: Next middleware/handler in chain
            
        Returns:
            HTTP response with security headers
        """
        response = await call_next(request)
        
        # Basic security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # Content Security Policy
        csp_directives = [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://www.gstatic.com",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "img-src 'self' data: https: blob:",
            "font-src 'self' data: https://fonts.gstatic.com",
            "connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com wss:",
            "media-src 'self'",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'none'",
            "upgrade-insecure-requests"
        ]
        
        response.headers["Content-Security-Policy"] = "; ".join(csp_directives)
        
        # HTTPS enforcement in production
        if settings.ENVIRONMENT == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
        
        # Permissions Policy (formerly Feature Policy)
        permissions_policy = [
            "camera=(self)",
            "microphone=()",
            "geolocation=()",
            "payment=()",
            "usb=()",
            "magnetometer=()",
            "accelerometer=()",
            "gyroscope=()",
            "fullscreen=(self)"
        ]
        
        response.headers["Permissions-Policy"] = ", ".join(permissions_policy)
        
        # Additional security headers
        response.headers["X-Permitted-Cross-Domain-Policies"] = "none"
        response.headers["Cross-Origin-Embedder-Policy"] = "require-corp"
        response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
        response.headers["Cross-Origin-Resource-Policy"] = "same-origin"
        
        # Cache control for sensitive endpoints
        if self._is_sensitive_endpoint(request.url.path):
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, private"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"
        
        return response
    
    def _is_sensitive_endpoint(self, path: str) -> bool:
        """
        Check if endpoint contains sensitive data
        
        Args:
            path: Request path
            
        Returns:
            True if endpoint is sensitive
        """
        sensitive_paths = [
            "/api/v1/auth/",
            "/api/v1/admin/",
            "/api/v1/weddings/",
            "/api/v1/guests/",
            "/api/v1/checkin/"
        ]
        
        return any(path.startswith(sensitive_path) for sensitive_path in sensitive_paths)


def sanitize_html_input(text: str) -> str:
    """
    Sanitize HTML input to prevent XSS attacks
    
    Args:
        text: Input text to sanitize
        
    Returns:
        Sanitized text
    """
    if not text:
        return text
    
    # Allow basic formatting tags but strip dangerous ones
    allowed_tags = ['b', 'i', 'u', 'em', 'strong', 'p', 'br']
    allowed_attributes = {}
    
    return bleach.clean(
        text,
        tags=allowed_tags,
        attributes=allowed_attributes,
        strip=True  # Strip disallowed tags completely
    )


def validate_email_format(email: str) -> bool:
    """
    Validate email format
    
    Args:
        email: Email address to validate
        
    Returns:
        True if valid email format
    """
    if not email or len(email) > 254:  # RFC 5321 limit
        return False
    
    # More strict email pattern that allows common valid characters
    email_pattern = re.compile(
        r'^[a-zA-Z0-9]([a-zA-Z0-9._+-]*[a-zA-Z0-9])?@[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,}$'
    )
    
    # Additional checks
    if '..' in email:  # No consecutive dots
        return False
    
    if email.startswith('.') or email.endswith('.'):  # No leading/trailing dots
        return False
    
    if '@.' in email or '.@' in email:  # No dots adjacent to @
        return False
    
    # Check for single character local part (before @)
    local_part = email.split('@')[0]
    if len(local_part) == 0:
        return False
    
    return bool(email_pattern.match(email))


def validate_phone_format(phone: str) -> bool:
    """
    Validate phone number format (Ethiopian format)
    
    Args:
        phone: Phone number to validate
        
    Returns:
        True if valid phone format
    """
    # Ethiopian phone number patterns
    phone_patterns = [
        r'^\+251[0-9]{9}$',  # +251XXXXXXXXX
        r'^0[0-9]{9}$',      # 0XXXXXXXXX
        r'^[0-9]{9}$'        # XXXXXXXXX
    ]
    
    for pattern in phone_patterns:
        if re.match(pattern, phone):
            return True
    
    return False


def validate_wedding_code_format(code: str) -> bool:
    """
    Validate wedding code format
    
    Args:
        code: Wedding code to validate
        
    Returns:
        True if valid wedding code format
    """
    # Wedding code: 2 uppercase letters + 2 digits
    pattern = r'^[A-Z]{2}[0-9]{2}$'
    return bool(re.match(pattern, code))


def validate_staff_pin_format(pin: str) -> bool:
    """
    Validate staff PIN format
    
    Args:
        pin: Staff PIN to validate
        
    Returns:
        True if valid PIN format
    """
    # Staff PIN: 6 digits
    pattern = r'^[0-9]{6}$'
    return bool(re.match(pattern, pin))