"""
Custom exceptions for the application
"""

from fastapi import HTTPException
from typing import Any, Dict, Optional


class WeddingPlatformException(Exception):
    """Base exception for wedding platform"""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        self.message = message
        self.details = details or {}
        super().__init__(self.message)


class NotFound(WeddingPlatformException):
    """Exception raised when a resource is not found"""
    pass


class PermissionDenied(WeddingPlatformException):
    """Exception raised when user lacks required permissions"""
    pass


class ValidationError(WeddingPlatformException):
    """Exception raised when validation fails"""
    pass


class BusinessLogicError(WeddingPlatformException):
    """Exception raised when business logic constraints are violated"""
    pass


class AuthenticationError(WeddingPlatformException):
    """Exception raised when authentication fails"""
    pass


class ExternalServiceError(WeddingPlatformException):
    """Exception raised when external service calls fail"""
    pass


# HTTP Exception helpers
def not_found_exception(message: str = "Resource not found") -> HTTPException:
    """Create a 404 HTTP exception"""
    return HTTPException(status_code=404, detail=message)


def permission_denied_exception(message: str = "Permission denied") -> HTTPException:
    """Create a 403 HTTP exception"""
    return HTTPException(status_code=403, detail=message)


def validation_error_exception(message: str = "Validation error") -> HTTPException:
    """Create a 422 HTTP exception"""
    return HTTPException(status_code=422, detail=message)


def authentication_error_exception(message: str = "Authentication failed") -> HTTPException:
    """Create a 401 HTTP exception"""
    return HTTPException(status_code=401, detail=message)


def business_logic_error_exception(message: str = "Business logic error") -> HTTPException:
    """Create a 400 HTTP exception"""
    return HTTPException(status_code=400, detail=message)


def external_service_error_exception(message: str = "External service error") -> HTTPException:
    """Create a 503 HTTP exception"""
    return HTTPException(status_code=503, detail=message)