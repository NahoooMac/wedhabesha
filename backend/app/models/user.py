"""
User Management Models

Core user models for authentication and profile management.
"""

from datetime import datetime
from typing import Optional
from enum import Enum
from sqlmodel import SQLModel, Field, Relationship
from pydantic import validator


class UserType(str, Enum):
    """User type enumeration"""
    COUPLE = "couple"
    VENDOR = "vendor"
    ADMIN = "admin"


class AuthProvider(str, Enum):
    """Authentication provider enumeration"""
    GOOGLE = "google"
    EMAIL = "email"


class User(SQLModel, table=True):
    """Base user model for all user types"""
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    password_hash: Optional[str] = None  # None for Google Sign-In users
    firebase_uid: Optional[str] = Field(default=None, unique=True, index=True)  # Firebase UID
    user_type: UserType
    auth_provider: AuthProvider
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = None  # Track last login for analytics
    is_active: bool = True
    
    # Relationships
    couple: Optional["Couple"] = Relationship(back_populates="user")
    vendor: Optional["Vendor"] = Relationship(back_populates="user")
    
    @validator('password_hash', 'firebase_uid')
    def validate_auth_fields(cls, v, values):
        """Validate that auth fields are consistent with auth provider"""
        auth_provider = values.get('auth_provider')
        field_name = cls.__fields__[v].name if hasattr(cls, '__fields__') else 'unknown'
        
        if auth_provider == AuthProvider.GOOGLE:
            if field_name == 'password_hash' and v is not None:
                raise ValueError('Google Sign-In users should not have password_hash')
            if field_name == 'firebase_uid' and v is None:
                raise ValueError('Google Sign-In users must have firebase_uid')
        elif auth_provider == AuthProvider.EMAIL:
            if field_name == 'password_hash' and v is None:
                raise ValueError('Email users must have password_hash')
        
        return v


class Couple(SQLModel, table=True):
    """Couple profile model"""
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", unique=True)
    partner1_name: str
    partner2_name: str
    phone: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    user: User = Relationship(back_populates="couple")
    weddings: list["Wedding"] = Relationship(back_populates="couple")


class VendorCategory(str, Enum):
    """Vendor category enumeration"""
    VENUE = "venue"
    CATERING = "catering"
    PHOTOGRAPHY = "photography"
    VIDEOGRAPHY = "videography"
    MUSIC = "music"
    FLOWERS = "flowers"
    DECORATION = "decoration"
    TRANSPORTATION = "transportation"
    MAKEUP = "makeup"
    DRESS = "dress"
    JEWELRY = "jewelry"
    INVITATIONS = "invitations"
    OTHER = "other"


class Vendor(SQLModel, table=True):
    """Vendor profile model"""
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", unique=True)
    business_name: str
    category: VendorCategory
    location: str
    description: str
    is_verified: bool = False
    rating: Optional[float] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    user: User = Relationship(back_populates="vendor")
    leads: list["VendorLead"] = Relationship(back_populates="vendor")
    reviews: list["Review"] = Relationship(back_populates="vendor")