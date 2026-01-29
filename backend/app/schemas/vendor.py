"""
Vendor Schemas

Pydantic models for vendor API requests and responses.
"""

from datetime import datetime, date
from typing import Optional, List, Dict
from pydantic import BaseModel, Field

from app.models.user import VendorCategory
from app.models.vendor import LeadStatus


class VendorProfileCreate(BaseModel):
    """Schema for creating vendor profile"""
    business_name: str = Field(..., min_length=1, max_length=200)
    category: VendorCategory
    location: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=10, max_length=2000)


class VendorProfileUpdate(BaseModel):
    """Schema for updating vendor profile"""
    business_name: Optional[str] = Field(None, min_length=1, max_length=200)
    category: Optional[VendorCategory] = None
    location: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, min_length=10, max_length=2000)


class VendorResponse(BaseModel):
    """Schema for vendor profile response"""
    id: int
    business_name: str
    category: VendorCategory
    location: str
    description: str
    is_verified: bool
    rating: Optional[float]
    created_at: datetime
    
    class Config:
        from_attributes = True


class VendorSearchParams(BaseModel):
    """Schema for vendor search parameters"""
    category: Optional[VendorCategory] = None
    location: Optional[str] = None
    min_rating: Optional[float] = Field(None, ge=1.0, le=5.0)
    verified_only: bool = False
    skip: int = Field(0, ge=0)
    limit: int = Field(20, ge=1, le=100)


class VendorSearchResponse(BaseModel):
    """Schema for vendor search response with pagination"""
    vendors: List[VendorResponse]
    total: int
    skip: int
    limit: int
    has_more: bool


class VendorCategoryResponse(BaseModel):
    """Schema for vendor category response"""
    value: str
    label: str


class LeadCreate(BaseModel):
    """Schema for creating vendor lead"""
    message: str = Field(..., min_length=10, max_length=1000)
    budget_range: Optional[str] = Field(None, max_length=100)
    event_date: Optional[date] = None


class LeadResponse(BaseModel):
    """Schema for lead response"""
    id: int
    vendor_id: int
    couple_id: int
    message: str
    budget_range: Optional[str]
    event_date: Optional[date]
    status: LeadStatus
    created_at: datetime
    
    class Config:
        from_attributes = True


class LeadStatusUpdate(BaseModel):
    """Schema for updating lead status"""
    status: LeadStatus


class VendorLeadsParams(BaseModel):
    """Schema for vendor leads query parameters"""
    status: Optional[LeadStatus] = None
    skip: int = Field(0, ge=0)
    limit: int = Field(20, ge=1, le=100)


class ReviewCreate(BaseModel):
    """Schema for creating vendor review"""
    rating: int = Field(..., ge=1, le=5, description="Rating from 1 to 5 stars")
    comment: str = Field(..., min_length=10, max_length=1000, description="Review comment")


class ReviewResponse(BaseModel):
    """Schema for review response"""
    id: int
    vendor_id: int
    couple_id: int
    rating: int
    comment: str
    is_verified: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class ReviewModerationUpdate(BaseModel):
    """Schema for review moderation actions"""
    is_verified: bool
    reason: Optional[str] = Field(None, max_length=500, description="Reason for moderation action")


class ReviewsResponse(BaseModel):
    """Schema for paginated reviews response"""
    reviews: List[ReviewResponse]
    total: int
    skip: int
    limit: int
    has_more: bool
    average_rating: Optional[float]


class RecentReviewResponse(BaseModel):
    """Schema for recent review in rating breakdown"""
    id: int
    rating: int
    comment: str
    created_at: datetime
    
    class Config:
        from_attributes = True


class RatingBreakdownResponse(BaseModel):
    """Schema for detailed rating breakdown"""
    total_reviews: int
    average_rating: Optional[float]
    rating_distribution: Dict[int, int]
    recent_reviews: List[RecentReviewResponse]