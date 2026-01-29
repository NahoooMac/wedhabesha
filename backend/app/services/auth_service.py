"""
Authentication Service

Business logic for authentication, session management, and token handling.
"""

import uuid
from typing import Optional, Tuple, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.user import User, Couple, Vendor, UserType, AuthProvider
from app.models.wedding import Wedding
from app.core.security import (
    create_access_token, verify_token, verify_password, verify_pin
)
from app.core.firebase import firebase_service
from app.core.redis import redis_service
from app.services.user_service import UserService


class AuthService:
    """Service class for authentication operations"""
    
    def __init__(self, db: Session):
        self.db = db
        self.user_service = UserService(db)
    
    async def register_couple(
        self,
        email: str,
        password: Optional[str] = None,
        firebase_id_token: Optional[str] = None,
        partner1_name: str = "",
        partner2_name: str = "",
        phone: Optional[str] = None
    ) -> Tuple[User, Couple, str]:
        """
        Register a new couple account
        
        Args:
            email: User email
            password: Plain text password (for email auth)
            firebase_id_token: Firebase ID token (for Google auth)
            partner1_name: First partner's name
            partner2_name: Second partner's name
            phone: Phone number
            
        Returns:
            Tuple of (User, Couple, access_token)
            
        Raises:
            HTTPException: If registration fails
        """
        firebase_uid = None
        
        # Handle Firebase authentication
        if firebase_id_token:
            if not firebase_service.is_available():
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Google Sign-In is not available"
                )
            
            firebase_user = await firebase_service.verify_id_token(firebase_id_token)
            firebase_uid = firebase_user["uid"]
            
            # Use email from Firebase if not provided
            if not email:
                email = firebase_user["email"]
        
        # Validate input
        if not firebase_id_token and not password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Either password or Firebase ID token must be provided"
            )
        
        try:
            # Create user and couple
            user, couple = self.user_service.create_couple_user(
                email=email,
                password=password,
                firebase_uid=firebase_uid,
                partner1_name=partner1_name,
                partner2_name=partner2_name,
                phone=phone
            )
            
            # Create access token
            token_data = {
                "sub": str(user.id),
                "email": user.email,
                "user_type": user.user_type.value,
                "auth_provider": user.auth_provider.value
            }
            access_token = create_access_token(token_data)
            
            # Store session in Redis
            session_id = str(uuid.uuid4())
            session_data = {
                "user_id": user.id,
                "email": user.email,
                "user_type": user.user_type.value,
                "auth_provider": user.auth_provider.value,
                "created_at": datetime.utcnow().isoformat()
            }
            await redis_service.set_session(session_id, session_data)
            
            return user, couple, access_token
            
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Registration failed: {str(e)}"
            )
    
    async def register_vendor(
        self,
        email: str,
        password: Optional[str] = None,
        firebase_id_token: Optional[str] = None,
        business_name: str = "",
        category = None,
        location: str = "",
        description: str = ""
    ) -> Tuple[User, Vendor, str]:
        """
        Register a new vendor account
        
        Args:
            email: User email
            password: Plain text password (for email auth)
            firebase_id_token: Firebase ID token (for Google auth)
            business_name: Business name
            category: Vendor category
            location: Business location
            description: Business description
            
        Returns:
            Tuple of (User, Vendor, access_token)
            
        Raises:
            HTTPException: If registration fails
        """
        firebase_uid = None
        
        # Handle Firebase authentication
        if firebase_id_token:
            if not firebase_service.is_available():
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Google Sign-In is not available"
                )
            
            firebase_user = await firebase_service.verify_id_token(firebase_id_token)
            firebase_uid = firebase_user["uid"]
            
            # Use email from Firebase if not provided
            if not email:
                email = firebase_user["email"]
        
        # Validate input
        if not firebase_id_token and not password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Either password or Firebase ID token must be provided"
            )
        
        try:
            # Create user and vendor
            user, vendor = self.user_service.create_vendor_user(
                email=email,
                password=password,
                firebase_uid=firebase_uid,
                business_name=business_name,
                category=category,
                location=location,
                description=description
            )
            
            # Create access token
            token_data = {
                "sub": str(user.id),
                "email": user.email,
                "user_type": user.user_type.value,
                "auth_provider": user.auth_provider.value
            }
            access_token = create_access_token(token_data)
            
            # Store session in Redis
            session_id = str(uuid.uuid4())
            session_data = {
                "user_id": user.id,
                "email": user.email,
                "user_type": user.user_type.value,
                "auth_provider": user.auth_provider.value,
                "created_at": datetime.utcnow().isoformat()
            }
            await redis_service.set_session(session_id, session_data)
            
            return user, vendor, access_token
            
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Registration failed: {str(e)}"
            )
    
    async def login_with_email(self, email: str, password: str) -> Tuple[User, str]:
        """
        Authenticate user with email and password
        
        Args:
            email: User email
            password: Plain text password
            
        Returns:
            Tuple of (User, access_token)
            
        Raises:
            HTTPException: If authentication fails
        """
        user = self.user_service.authenticate_user(email, password)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Create access token
        token_data = {
            "sub": str(user.id),
            "email": user.email,
            "user_type": user.user_type.value,
            "auth_provider": user.auth_provider.value
        }
        access_token = create_access_token(token_data)
        
        # Store session in Redis
        session_id = str(uuid.uuid4())
        session_data = {
            "user_id": user.id,
            "email": user.email,
            "user_type": user.user_type.value,
            "auth_provider": user.auth_provider.value,
            "created_at": datetime.utcnow().isoformat()
        }
        await redis_service.set_session(session_id, session_data)
        
        return user, access_token
    
    async def login_with_google(self, firebase_id_token: str) -> Tuple[User, str]:
        """
        Authenticate user with Google Sign-In
        
        Args:
            firebase_id_token: Firebase ID token
            
        Returns:
            Tuple of (User, access_token)
            
        Raises:
            HTTPException: If authentication fails
        """
        if not firebase_service.is_available():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Google Sign-In is not available"
            )
        
        # Verify Firebase token
        firebase_user = await firebase_service.verify_id_token(firebase_id_token)
        firebase_uid = firebase_user["uid"]
        
        # Find user by Firebase UID
        user = self.user_service.authenticate_firebase_user(firebase_uid)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found. Please register first."
            )
        
        # Create access token
        token_data = {
            "sub": str(user.id),
            "email": user.email,
            "user_type": user.user_type.value,
            "auth_provider": user.auth_provider.value
        }
        access_token = create_access_token(token_data)
        
        # Store session in Redis
        session_id = str(uuid.uuid4())
        session_data = {
            "user_id": user.id,
            "email": user.email,
            "user_type": user.user_type.value,
            "auth_provider": user.auth_provider.value,
            "created_at": datetime.utcnow().isoformat()
        }
        await redis_service.set_session(session_id, session_data)
        
        return user, access_token
    
    async def verify_staff_credentials(self, wedding_code: str, staff_pin: str) -> Tuple[Wedding, str]:
        """
        Verify staff credentials for check-in access
        
        Args:
            wedding_code: Wedding code
            staff_pin: Staff PIN
            
        Returns:
            Tuple of (Wedding, session_token)
            
        Raises:
            HTTPException: If verification fails
        """
        # Find wedding by code
        wedding = self.db.query(Wedding).filter(Wedding.wedding_code == wedding_code).first()
        
        if not wedding:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid wedding code"
            )
        
        # Verify staff PIN
        if not verify_pin(staff_pin, wedding.staff_pin):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid staff PIN"
            )
        
        # Create staff session token
        session_token = str(uuid.uuid4())
        session_data = {
            "wedding_id": wedding.id,
            "wedding_code": wedding_code,
            "session_type": "staff",
            "created_at": datetime.utcnow().isoformat()
        }
        
        # Store session with shorter expiration (4 hours for staff)
        await redis_service.set_session(session_token, session_data, expire_minutes=240)
        
        return wedding, session_token
    
    async def logout(self, token: str) -> bool:
        """
        Logout user by invalidating session
        
        Args:
            token: JWT access token
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Decode token to get session info
            payload = verify_token(token)
            if not payload:
                return False
            
            # For now, we don't store session IDs in JWT tokens
            # In a production system, you might want to maintain a blacklist
            # or store session IDs in tokens for better session management
            
            return True
        except Exception:
            return False
    
    async def refresh_token(self, current_token: str) -> Optional[str]:
        """
        Refresh access token
        
        Args:
            current_token: Current JWT token
            
        Returns:
            New access token if successful, None otherwise
        """
        try:
            # Verify current token
            payload = verify_token(current_token)
            if not payload:
                return None
            
            # Get user
            user_id = int(payload.get("sub"))
            user = self.user_service.get_user_by_id(user_id)
            
            if not user or not user.is_active:
                return None
            
            # Create new token
            token_data = {
                "sub": str(user.id),
                "email": user.email,
                "user_type": user.user_type.value,
                "auth_provider": user.auth_provider.value
            }
            new_token = create_access_token(token_data)
            
            return new_token
            
        except Exception:
            return None
    
    def get_current_user_from_token(self, token: str) -> Optional[User]:
        """
        Get current user from JWT token
        
        Args:
            token: JWT access token
            
        Returns:
            User object if token is valid, None otherwise
        """
        try:
            payload = verify_token(token)
            if not payload:
                return None
            
            user_id = int(payload.get("sub"))
            user = self.user_service.get_user_by_id(user_id)
            
            if not user or not user.is_active:
                return None
            
            return user
            
        except Exception:
            return None