"""
Vendor Marketplace Endpoints

Vendor profiles, search, leads, and reviews.
"""

from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User, UserType, VendorCategory
from app.services.vendor_service import VendorService
from app.schemas.vendor import (
    VendorProfileCreate,
    VendorProfileUpdate,
    VendorResponse,
    VendorSearchParams,
    VendorSearchResponse,
    VendorCategoryResponse,
    LeadCreate,
    LeadResponse,
    LeadStatusUpdate,
    VendorLeadsParams,
    ReviewCreate,
    ReviewResponse,
    ReviewModerationUpdate,
    ReviewsResponse,
    RatingBreakdownResponse
)

router = APIRouter()


@router.post("/profile", response_model=VendorResponse)
async def create_vendor_profile(
    profile_data: VendorProfileCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create vendor profile"""
    if current_user.user_type != UserType.VENDOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only vendor users can create vendor profiles"
        )
    
    vendor_service = VendorService(db)
    vendor = vendor_service.create_vendor_profile(
        user_id=current_user.id,
        business_name=profile_data.business_name,
        category=profile_data.category,
        location=profile_data.location,
        description=profile_data.description
    )
    
    return vendor


@router.get("/profile", response_model=VendorResponse)
async def get_my_vendor_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's vendor profile"""
    if current_user.user_type != UserType.VENDOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only vendor users can access vendor profiles"
        )
    
    vendor_service = VendorService(db)
    vendor = vendor_service.get_vendor_by_user_id(current_user.id)
    
    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor profile not found"
        )
    
    return vendor


@router.put("/profile", response_model=VendorResponse)
async def update_vendor_profile(
    profile_data: VendorProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update vendor profile"""
    if current_user.user_type != UserType.VENDOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only vendor users can update vendor profiles"
        )
    
    vendor_service = VendorService(db)
    vendor = vendor_service.get_vendor_by_user_id(current_user.id)
    
    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor profile not found"
        )
    
    updated_vendor = vendor_service.update_vendor_profile(
        vendor_id=vendor.id,
        user_id=current_user.id,
        business_name=profile_data.business_name,
        category=profile_data.category,
        location=profile_data.location,
        description=profile_data.description
    )
    
    return updated_vendor


@router.get("/", response_model=VendorSearchResponse)
async def search_vendors(
    category: VendorCategory = Query(None),
    location: str = Query(None),
    search: str = Query(None, description="Search in business name and description"),
    min_rating: float = Query(None, ge=1.0, le=5.0),
    verified_only: bool = Query(False),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Search vendors with filtering and pagination"""
    vendor_service = VendorService(db)
    result = vendor_service.search_vendors(
        category=category,
        location=location,
        search_text=search,
        min_rating=min_rating,
        verified_only=verified_only,
        skip=skip,
        limit=limit
    )
    
    return result


@router.get("/categories", response_model=List[VendorCategoryResponse])
async def get_vendor_categories(db: Session = Depends(get_db)):
    """Get all vendor categories"""
    vendor_service = VendorService(db)
    return vendor_service.get_vendor_categories()


@router.get("/{vendor_id}", response_model=VendorResponse)
async def get_vendor(vendor_id: int, db: Session = Depends(get_db)):
    """Get vendor profile by ID"""
    vendor_service = VendorService(db)
    vendor = vendor_service.get_vendor_by_id(vendor_id)
    
    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor not found"
        )
    
    return vendor


@router.post("/{vendor_id}/contact", response_model=LeadResponse)
async def contact_vendor(
    vendor_id: int,
    lead_data: LeadCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Contact vendor and create lead"""
    if current_user.user_type != UserType.COUPLE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only couples can contact vendors"
        )
    
    # Get couple ID
    from app.models.user import Couple
    couple = db.query(Couple).filter(Couple.user_id == current_user.id).first()
    if not couple:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Couple profile not found"
        )
    
    vendor_service = VendorService(db)
    lead = vendor_service.create_lead(
        vendor_id=vendor_id,
        couple_id=couple.id,
        message=lead_data.message,
        budget_range=lead_data.budget_range,
        event_date=lead_data.event_date
    )
    
    return lead


@router.get("/profile/leads")
async def get_vendor_leads(
    status: str = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get leads for current vendor"""
    if current_user.user_type != UserType.VENDOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only vendors can access leads"
        )
    
    vendor_service = VendorService(db)
    vendor = vendor_service.get_vendor_by_user_id(current_user.id)
    
    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor profile not found"
        )
    
    # Parse status if provided
    lead_status = None
    if status:
        try:
            from app.models.vendor import LeadStatus
            lead_status = LeadStatus(status)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid lead status"
            )
    
    leads = vendor_service.get_vendor_leads(
        vendor_id=vendor.id,
        user_id=current_user.id,
        status=lead_status,
        skip=skip,
        limit=limit
    )
    
    return leads


@router.put("/profile/leads/{lead_id}", response_model=LeadResponse)
async def update_lead_status(
    lead_id: int,
    status_data: LeadStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update lead status"""
    if current_user.user_type != UserType.VENDOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only vendors can update lead status"
        )
    
    vendor_service = VendorService(db)
    vendor = vendor_service.get_vendor_by_user_id(current_user.id)
    
    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor profile not found"
        )
    
    lead = vendor_service.update_lead_status(
        lead_id=lead_id,
        vendor_id=vendor.id,
        user_id=current_user.id,
        new_status=status_data.status
    )
    
    return lead


@router.get("/profile/leads/stats", response_model=Dict[str, Any])
async def get_vendor_lead_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get lead statistics for current vendor"""
    if current_user.user_type != UserType.VENDOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only vendors can access lead statistics"
        )
    
    vendor_service = VendorService(db)
    vendor = vendor_service.get_vendor_by_user_id(current_user.id)
    
    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor profile not found"
        )
    
    # Get lead statistics
    from app.models.vendor import LeadStatus
    from sqlalchemy import func
    
    stats = db.query(
        VendorLead.status,
        func.count(VendorLead.id).label('count')
    ).filter(
        VendorLead.vendor_id == vendor.id
    ).group_by(VendorLead.status).all()
    
    # Convert to dictionary
    stats_dict = {status.value: 0 for status in LeadStatus}
    for stat in stats:
        stats_dict[stat.status.value] = stat.count
    
    # Calculate total and conversion rate
    total_leads = sum(stats_dict.values())
    converted_leads = stats_dict.get(LeadStatus.CONVERTED.value, 0)
    conversion_rate = (converted_leads / total_leads * 100) if total_leads > 0 else 0
    
    return {
        "total_leads": total_leads,
        "conversion_rate": round(conversion_rate, 2),
        "by_status": stats_dict,
        "recent_leads": len([s for s in stats if s.status in [LeadStatus.NEW, LeadStatus.CONTACTED]])
    }


@router.post("/{vendor_id}/reviews", response_model=ReviewResponse)
async def create_review(
    vendor_id: int,
    review_data: ReviewCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create vendor review"""
    if current_user.user_type != UserType.COUPLE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only couples can create reviews"
        )
    
    # Get couple ID
    from app.models.user import Couple
    couple = db.query(Couple).filter(Couple.user_id == current_user.id).first()
    if not couple:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Couple profile not found"
        )
    
    vendor_service = VendorService(db)
    review = vendor_service.create_review(
        vendor_id=vendor_id,
        couple_id=couple.id,
        rating=review_data.rating,
        comment=review_data.comment
    )
    
    return review


@router.get("/{vendor_id}/reviews", response_model=ReviewsResponse)
async def get_vendor_reviews(
    vendor_id: int,
    verified_only: bool = Query(True, description="Only show verified reviews"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Get vendor reviews"""
    vendor_service = VendorService(db)
    result = vendor_service.get_vendor_reviews(
        vendor_id=vendor_id,
        verified_only=verified_only,
        skip=skip,
        limit=limit
    )
    
    return result


@router.get("/{vendor_id}/review-eligibility")
async def check_review_eligibility(
    vendor_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check if current couple can review vendor"""
    if current_user.user_type != UserType.COUPLE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only couples can check review eligibility"
        )
    
    # Get couple ID
    from app.models.user import Couple
    couple = db.query(Couple).filter(Couple.user_id == current_user.id).first()
    if not couple:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Couple profile not found"
        )
    
    vendor_service = VendorService(db)
    eligibility = vendor_service.get_couple_review_eligibility(
        vendor_id=vendor_id,
        couple_id=couple.id
    )
    
    return eligibility


@router.put("/reviews/{review_id}/moderate", response_model=ReviewResponse)
async def moderate_review(
    review_id: int,
    moderation_data: ReviewModerationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Moderate review (admin only)"""
    if current_user.user_type != UserType.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can moderate reviews"
        )
    
    vendor_service = VendorService(db)
    review = vendor_service.moderate_review(
        review_id=review_id,
        admin_user_id=current_user.id,
        is_verified=moderation_data.is_verified,
        reason=moderation_data.reason
    )
    
    return review


@router.get("/{vendor_id}/rating-breakdown", response_model=RatingBreakdownResponse)
async def get_vendor_rating_breakdown(
    vendor_id: int,
    db: Session = Depends(get_db)
):
    """Get detailed rating breakdown for vendor"""
    vendor_service = VendorService(db)
    
    # Verify vendor exists
    vendor = vendor_service.get_vendor_by_id(vendor_id)
    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor not found"
        )
    
    breakdown = vendor_service.get_vendor_rating_breakdown(vendor_id)
    return breakdown


@router.get("/admin/reviews", response_model=ReviewsResponse)
async def get_all_reviews_for_moderation(
    verified_only: bool = Query(False, description="Filter by verification status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all reviews for admin moderation"""
    if current_user.user_type != UserType.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can access all reviews"
        )
    
    # Get all reviews across all vendors
    query = db.query(Review)
    
    if verified_only is not None:
        query = query.filter(Review.is_verified == verified_only)
    
    # Get total count
    total_count = query.count()
    
    # Apply pagination and ordering (newest first)
    reviews = query.order_by(Review.created_at.desc()).offset(skip).limit(limit).all()
    
    # Calculate overall average rating from verified reviews
    from sqlalchemy import func
    avg_rating_result = db.query(func.avg(Review.rating)).filter(Review.is_verified == True).scalar()
    avg_rating = float(avg_rating_result) if avg_rating_result else None
    
    return {
        "reviews": reviews,
        "total": total_count,
        "skip": skip,
        "limit": limit,
        "has_more": skip + len(reviews) < total_count,
        "average_rating": avg_rating
    }


