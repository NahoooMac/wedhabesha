"""
Authentication Models

Pydantic models for authentication requests and responses.
"""

from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from enum import Enum

from app.models.user import UserType, VendorCategory


class AuthProvider(str, Enum):
    """Authentication provider types"""
    EMAIL = "email"
    GOOGLE = "google"


class CoupleRegistrationRequest(BaseModel):
    """Request model for couple registration"""
    email: EmailStr
    password: Optional[str] = None
    firebase_id_token: Optional[str] = None
    partner1_name: str = Field(..., min_length=1, max_length=100)
    partner2_name: str = Field(..., min_length=1, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)


class VendorRegistrationRequest(BaseModel):
    """Request model for vendor registration"""
    email: EmailStr
    password: Optional[str] = None
    firebase_id_token: Optional[str] = None
    business_name: str = Field(..., min_length=1, max_length=200)
    category: VendorCategory
    location: str = Field(..., min_length=1, max_length=200)
    description: str = Field("", max_length=1000)


class LoginRequest(BaseModel):
    """Request model for email/password login"""
    email: EmailStr
    password: str = Field(..., min_length=1)
    remember_me: bool = False


class GoogleSignInRequest(BaseModel):
    """Request model for Google Sign-In"""
    firebase_id_token: str = Field(..., min_length=1)


class StaffVerificationRequest(BaseModel):
    """Request model for staff verification"""
    wedding_code: str = Field(..., min_length=4, max_length=4)
    staff_pin: str = Field(..., min_length=6, max_length=6)


class TokenResponse(BaseModel):
    """Response model for authentication tokens"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user_id: int
    user_type: UserType
    email: str


class UserResponse(BaseModel):
    """Response model for user information"""
    id: int
    email: str
    user_type: UserType
    auth_provider: AuthProvider
    is_active: bool
    created_at: str
    
    # Couple-specific fields
    partner1_name: Optional[str] = None
    partner2_name: Optional[str] = None
    phone: Optional[str] = None
    
    # Vendor-specific fields
    business_name: Optional[str] = None
    category: Optional[VendorCategory] = None
    location: Optional[str] = None
    description: Optional[str] = None
    is_verified: Optional[bool] = None
    rating: Optional[float] = None


class StaffSessionResponse(BaseModel):
    """Response model for staff session"""
    session_token: str
    wedding_id: int
    expires_in: int


class RefreshTokenRequest(BaseModel):
    """Request model for token refresh"""
    refresh_token: str = Field(..., min_length=1)


class MessageResponse(BaseModel):
    """Generic message response"""
    message: str