"""
Vendor Marketplace Models

Models for vendor leads, reviews, and marketplace functionality.
"""

from datetime import datetime, date
from typing import Optional
from enum import Enum
from sqlmodel import SQLModel, Field, Relationship


class LeadStatus(str, Enum):
    """Lead status enumeration"""
    NEW = "new"
    CONTACTED = "contacted"
    CONVERTED = "converted"
    CLOSED = "closed"


class VendorLead(SQLModel, table=True):
    """Vendor lead model"""
    id: Optional[int] = Field(default=None, primary_key=True)
    vendor_id: int = Field(foreign_key="vendor.id")
    couple_id: int = Field(foreign_key="couple.id")
    message: str
    budget_range: Optional[str] = None
    event_date: Optional[date] = None
    status: LeadStatus = LeadStatus.NEW
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    vendor: "Vendor" = Relationship(back_populates="leads")
    couple: "Couple" = Relationship()


class Review(SQLModel, table=True):
    """Vendor review model"""
    id: Optional[int] = Field(default=None, primary_key=True)
    vendor_id: int = Field(foreign_key="vendor.id")
    couple_id: int = Field(foreign_key="couple.id")
    rating: int = Field(ge=1, le=5)
    comment: str
    is_verified: bool = False
    is_flagged: bool = False  # For content moderation
    is_hidden: bool = False   # For hiding inappropriate content
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    vendor: "Vendor" = Relationship(back_populates="reviews")
    couple: "Couple" = Relationship()