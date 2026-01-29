"""
Administrative Models

Models for administrative functionality including audit logs and vendor management.
"""

from datetime import datetime
from typing import Optional
from enum import Enum
from sqlmodel import SQLModel, Field, Relationship


class VendorSubscriptionTier(str, Enum):
    """Vendor subscription tier enumeration"""
    FREE = "free"
    BASIC = "basic"
    PREMIUM = "premium"
    ENTERPRISE = "enterprise"


class VendorApplicationStatus(str, Enum):
    """Vendor application status enumeration"""
    PENDING = "pending"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    REJECTED = "rejected"


class AdminActionType(str, Enum):
    """Administrative action type enumeration"""
    VENDOR_APPROVAL = "vendor_approval"
    VENDOR_REJECTION = "vendor_rejection"
    REVIEW_MODERATION = "review_moderation"
    USER_SUSPENSION = "user_suspension"
    USER_ACTIVATION = "user_activation"
    SUBSCRIPTION_CHANGE = "subscription_change"
    CONTENT_MODERATION = "content_moderation"


class VendorApplication(SQLModel, table=True):
    """Vendor application model for approval workflow"""
    id: Optional[int] = Field(default=None, primary_key=True)
    vendor_id: int = Field(foreign_key="vendor.id", unique=True)
    status: VendorApplicationStatus = VendorApplicationStatus.PENDING
    submitted_at: datetime = Field(default_factory=datetime.utcnow)
    reviewed_at: Optional[datetime] = None
    reviewed_by: Optional[int] = Field(default=None, foreign_key="user.id")
    rejection_reason: Optional[str] = None
    notes: Optional[str] = None
    
    # Relationships
    vendor: "Vendor" = Relationship()
    reviewer: Optional["User"] = Relationship()


class VendorSubscription(SQLModel, table=True):
    """Vendor subscription model"""
    id: Optional[int] = Field(default=None, primary_key=True)
    vendor_id: int = Field(foreign_key="vendor.id", unique=True)
    tier: VendorSubscriptionTier = VendorSubscriptionTier.FREE
    started_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = None
    is_active: bool = True
    
    # Relationships
    vendor: "Vendor" = Relationship()


class AuditLog(SQLModel, table=True):
    """Audit log model for tracking administrative actions"""
    id: Optional[int] = Field(default=None, primary_key=True)
    admin_user_id: int = Field(foreign_key="user.id")
    action_type: AdminActionType
    target_type: str  # e.g., "vendor", "review", "user"
    target_id: int
    description: str
    action_metadata: Optional[str] = None  # JSON string for additional data
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    admin_user: "User" = Relationship()


class PlatformMetrics(SQLModel, table=True):
    """Platform metrics model for analytics"""
    id: Optional[int] = Field(default=None, primary_key=True)
    date: datetime = Field(default_factory=datetime.utcnow)
    total_users: int = 0
    total_couples: int = 0
    total_vendors: int = 0
    total_weddings: int = 0
    total_checkins: int = 0
    total_reviews: int = 0
    total_leads: int = 0
    active_users_30d: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)