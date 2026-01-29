"""
Authorization Middleware and Dependencies

Role-based access control, token validation, and permission decorators.
"""

from typing import Optional, List, Callable, Any
from functools import wraps
from fastapi import Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.redis import redis_service
from app.services.auth_service import AuthService
from app.models.user import User, UserType
from app.models.wedding import Wedding


# Security scheme for Swagger UI
security = HTTPBearer()


class AuthorizationError(HTTPException):
    """Custom authorization error"""
    def __init__(self, detail: str = "Not authorized"):
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Get current authenticated user from JWT token
    
    Args:
        credentials: HTTP Bearer token credentials
        db: Database session
        
    Returns:
        Current user object
        
    Raises:
        HTTPException: If token is invalid or user not found
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header required"
        )
    
    auth_service = AuthService(db)
    user = auth_service.get_current_user_from_token(credentials.credentials)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    
    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Get current active user
    
    Args:
        current_user: Current user from token
        
    Returns:
        Active user object
        
    Raises:
        HTTPException: If user is inactive
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    
    return current_user


async def get_current_couple(
    current_user: User = Depends(get_current_active_user)
) -> User:
    """
    Get current couple user
    
    Args:
        current_user: Current active user
        
    Returns:
        Couple user object
        
    Raises:
        HTTPException: If user is not a couple
    """
    if current_user.user_type != UserType.COUPLE:
        raise AuthorizationError("Access restricted to couples only")
    
    return current_user


async def get_current_vendor(
    current_user: User = Depends(get_current_active_user)
) -> User:
    """
    Get current vendor user
    
    Args:
        current_user: Current active user
        
    Returns:
        Vendor user object
        
    Raises:
        HTTPException: If user is not a vendor
    """
    if current_user.user_type != UserType.VENDOR:
        raise AuthorizationError("Access restricted to vendors only")
    
    return current_user


async def get_current_admin(
    current_user: User = Depends(get_current_active_user)
) -> User:
    """
    Get current admin user
    
    Args:
        current_user: Current active user
        
    Returns:
        Admin user object
        
    Raises:
        HTTPException: If user is not an admin
    """
    if current_user.user_type != UserType.ADMIN:
        raise AuthorizationError("Access restricted to administrators only")
    
    return current_user


async def get_staff_session(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> dict:
    """
    Get current staff session from session token
    
    Args:
        authorization: Authorization header with session token
        db: Database session
        
    Returns:
        Staff session data
        
    Raises:
        HTTPException: If session is invalid or expired
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Staff session token required"
        )
    
    session_token = authorization.split(" ")[1]
    session_data = await redis_service.get_session(session_token)
    
    if not session_data or session_data.get("session_type") != "staff":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired staff session"
        )
    
    # Verify wedding still exists
    wedding_id = session_data.get("wedding_id")
    if wedding_id:
        wedding = db.query(Wedding).filter(Wedding.id == wedding_id).first()
        if not wedding:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Wedding not found"
            )
    
    return session_data


def require_permissions(*allowed_user_types: UserType):
    """
    Decorator to require specific user types for endpoint access
    
    Args:
        allowed_user_types: User types allowed to access the endpoint
        
    Returns:
        Decorator function
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract current_user from kwargs (injected by FastAPI)
            current_user = kwargs.get('current_user')
            
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required"
                )
            
            if current_user.user_type not in allowed_user_types:
                user_type_names = [ut.value for ut in allowed_user_types]
                raise AuthorizationError(
                    f"Access restricted to: {', '.join(user_type_names)}"
                )
            
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator


def require_couple_access(func: Callable) -> Callable:
    """
    Decorator to require couple access
    
    Args:
        func: Function to decorate
        
    Returns:
        Decorated function
    """
    return require_permissions(UserType.COUPLE)(func)


def require_vendor_access(func: Callable) -> Callable:
    """
    Decorator to require vendor access
    
    Args:
        func: Function to decorate
        
    Returns:
        Decorated function
    """
    return require_permissions(UserType.VENDOR)(func)


def require_admin_access(func: Callable) -> Callable:
    """
    Decorator to require admin access
    
    Args:
        func: Function to decorate
        
    Returns:
        Decorated function
    """
    return require_permissions(UserType.ADMIN)(func)


def require_couple_or_admin_access(func: Callable) -> Callable:
    """
    Decorator to require couple or admin access
    
    Args:
        func: Function to decorate
        
    Returns:
        Decorated function
    """
    return require_permissions(UserType.COUPLE, UserType.ADMIN)(func)


def require_vendor_or_admin_access(func: Callable) -> Callable:
    """
    Decorator to require vendor or admin access
    
    Args:
        func: Function to decorate
        
    Returns:
        Decorated function
    """
    return require_permissions(UserType.VENDOR, UserType.ADMIN)(func)


async def verify_firebase_token(
    authorization: Optional[str] = Header(None)
) -> dict:
    """
    Verify Firebase ID token from Authorization header
    
    Args:
        authorization: Authorization header with Firebase ID token
        
    Returns:
        Firebase user info
        
    Raises:
        HTTPException: If token is invalid
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Firebase ID token required"
        )
    
    from app.core.firebase import firebase_service
    
    if not firebase_service.is_available():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Firebase service not available"
        )
    
    id_token = authorization.split(" ")[1]
    firebase_user = await firebase_service.verify_id_token(id_token)
    
    return firebase_user


class PermissionChecker:
    """
    Class-based permission checker for complex authorization logic
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    def can_access_wedding(self, user: User, wedding_id: int) -> bool:
        """
        Check if user can access a specific wedding
        
        Args:
            user: User to check permissions for
            wedding_id: Wedding ID to check access to
            
        Returns:
            True if user can access wedding, False otherwise
        """
        if user.user_type == UserType.ADMIN:
            return True
        
        if user.user_type == UserType.COUPLE:
            # Check if user owns this wedding
            wedding = self.db.query(Wedding).filter(Wedding.id == wedding_id).first()
            if wedding and wedding.couple_id == user.id:
                return True
        
        return False
    
    def can_manage_vendor(self, user: User, vendor_id: int) -> bool:
        """
        Check if user can manage a specific vendor
        
        Args:
            user: User to check permissions for
            vendor_id: Vendor ID to check access to
            
        Returns:
            True if user can manage vendor, False otherwise
        """
        if user.user_type == UserType.ADMIN:
            return True
        
        if user.user_type == UserType.VENDOR:
            # Check if user owns this vendor profile
            from app.models.user import Vendor
            vendor = self.db.query(Vendor).filter(Vendor.id == vendor_id).first()
            if vendor and vendor.user_id == user.id:
                return True
        
        return False
    
    def can_moderate_content(self, user: User) -> bool:
        """
        Check if user can moderate content
        
        Args:
            user: User to check permissions for
            
        Returns:
            True if user can moderate content, False otherwise
        """
        return user.user_type == UserType.ADMIN
    
    def can_approve_vendors(self, user: User) -> bool:
        """
        Check if user can approve vendors
        
        Args:
            user: User to check permissions for
            
        Returns:
            True if user can approve vendors, False otherwise
        """
        return user.user_type == UserType.ADMIN