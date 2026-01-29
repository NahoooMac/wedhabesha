"""
Administrative API Endpoints

API endpoints for administrative operations including vendor approval,
content moderation, and platform analytics.
"""

from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.models.admin import (
    VendorApplication, VendorApplicationStatus, VendorSubscription,
    VendorSubscriptionTier, AuditLog, AdminActionType
)
from app.services.admin_service import AdminService

router = APIRouter()


# Request/Response Models

class VendorApplicationResponse(BaseModel):
    """Response model for vendor application"""
    id: int
    vendor_id: int
    status: VendorApplicationStatus
    submitted_at: str
    reviewed_at: Optional[str] = None
    reviewed_by: Optional[int] = None
    rejection_reason: Optional[str] = None
    notes: Optional[str] = None
    
    # Vendor details
    business_name: str
    category: str
    location: str
    description: str
    vendor_email: str

    class Config:
        from_attributes = True


class VendorApplicationsResponse(BaseModel):
    """Response model for paginated vendor applications"""
    applications: List[VendorApplicationResponse]
    total: int
    skip: int
    limit: int
    has_more: bool


class VendorApplicationReviewRequest(BaseModel):
    """Request model for vendor application review"""
    notes: Optional[str] = None


class VendorApplicationRejectionRequest(BaseModel):
    """Request model for vendor application rejection"""
    rejection_reason: str
    notes: Optional[str] = None


class VendorSubscriptionResponse(BaseModel):
    """Response model for vendor subscription"""
    id: int
    vendor_id: int
    tier: VendorSubscriptionTier
    started_at: str
    expires_at: Optional[str] = None
    is_active: bool
    
    # Vendor details
    business_name: str
    vendor_email: str

    class Config:
        from_attributes = True


class VendorSubscriptionsResponse(BaseModel):
    """Response model for paginated vendor subscriptions"""
    subscriptions: List[VendorSubscriptionResponse]
    total: int
    skip: int
    limit: int
    has_more: bool


class VendorSubscriptionUpdateRequest(BaseModel):
    """Request model for updating vendor subscription"""
    tier: VendorSubscriptionTier
    expires_at: Optional[str] = None


class ReviewModerationRequest(BaseModel):
    """Request model for review moderation"""
    action: str  # "approve", "reject", "hide"
    reason: Optional[str] = None


class AuditLogResponse(BaseModel):
    """Response model for audit log entry"""
    id: int
    admin_user_id: int
    action_type: AdminActionType
    target_type: str
    target_id: int
    description: str
    action_metadata: Optional[str] = None
    created_at: str
    
    # Admin user details
    admin_email: str

    class Config:
        from_attributes = True


class AuditLogsResponse(BaseModel):
    """Response model for paginated audit logs"""
    logs: List[AuditLogResponse]
    total: int
    skip: int
    limit: int
    has_more: bool


class PlatformAnalyticsResponse(BaseModel):
    """Response model for platform analytics"""
    overview: dict
    pending_actions: dict
    subscription_distribution: dict


# Vendor Application Management Endpoints

@router.get("/vendor-applications", response_model=VendorApplicationsResponse)
async def get_pending_vendor_applications(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get pending vendor applications for review"""
    admin_service = AdminService(db)
    result = admin_service.get_pending_vendor_applications(current_user, skip, limit)
    
    # Transform applications to include vendor details
    applications_data = []
    for app in result["applications"]:
        app_data = {
            "id": app.id,
            "vendor_id": app.vendor_id,
            "status": app.status,
            "submitted_at": app.submitted_at.isoformat(),
            "reviewed_at": app.reviewed_at.isoformat() if app.reviewed_at else None,
            "reviewed_by": app.reviewed_by,
            "rejection_reason": app.rejection_reason,
            "notes": app.notes,
            "business_name": app.vendor.business_name,
            "category": app.vendor.category,
            "location": app.vendor.location,
            "description": app.vendor.description,
            "vendor_email": app.vendor.user.email
        }
        applications_data.append(app_data)
    
    return VendorApplicationsResponse(
        applications=applications_data,
        total=result["total"],
        skip=result["skip"],
        limit=result["limit"],
        has_more=result["has_more"]
    )


@router.get("/vendor-applications/{application_id}", response_model=VendorApplicationResponse)
async def get_vendor_application(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get vendor application details"""
    admin_service = AdminService(db)
    application = admin_service.get_vendor_application(application_id, current_user)
    
    return VendorApplicationResponse(
        id=application.id,
        vendor_id=application.vendor_id,
        status=application.status,
        submitted_at=application.submitted_at.isoformat(),
        reviewed_at=application.reviewed_at.isoformat() if application.reviewed_at else None,
        reviewed_by=application.reviewed_by,
        rejection_reason=application.rejection_reason,
        notes=application.notes,
        business_name=application.vendor.business_name,
        category=application.vendor.category,
        location=application.vendor.location,
        description=application.vendor.description,
        vendor_email=application.vendor.user.email
    )


@router.post("/vendor-applications/{application_id}/approve", response_model=VendorApplicationResponse)
async def approve_vendor_application(
    application_id: int,
    request: VendorApplicationReviewRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Approve vendor application"""
    admin_service = AdminService(db)
    application = admin_service.approve_vendor_application(
        application_id, current_user, request.notes
    )
    
    return VendorApplicationResponse(
        id=application.id,
        vendor_id=application.vendor_id,
        status=application.status,
        submitted_at=application.submitted_at.isoformat(),
        reviewed_at=application.reviewed_at.isoformat() if application.reviewed_at else None,
        reviewed_by=application.reviewed_by,
        rejection_reason=application.rejection_reason,
        notes=application.notes,
        business_name=application.vendor.business_name,
        category=application.vendor.category,
        location=application.vendor.location,
        description=application.vendor.description,
        vendor_email=application.vendor.user.email
    )


@router.post("/vendor-applications/{application_id}/reject", response_model=VendorApplicationResponse)
async def reject_vendor_application(
    application_id: int,
    request: VendorApplicationRejectionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reject vendor application"""
    admin_service = AdminService(db)
    application = admin_service.reject_vendor_application(
        application_id, current_user, request.rejection_reason, request.notes
    )
    
    return VendorApplicationResponse(
        id=application.id,
        vendor_id=application.vendor_id,
        status=application.status,
        submitted_at=application.submitted_at.isoformat(),
        reviewed_at=application.reviewed_at.isoformat() if application.reviewed_at else None,
        reviewed_by=application.reviewed_by,
        rejection_reason=application.rejection_reason,
        notes=application.notes,
        business_name=application.vendor.business_name,
        category=application.vendor.category,
        location=application.vendor.location,
        description=application.vendor.description,
        vendor_email=application.vendor.user.email
    )


# Vendor Subscription Management Endpoints

@router.get("/vendor-subscriptions", response_model=VendorSubscriptionsResponse)
async def get_vendor_subscriptions(
    tier: Optional[VendorSubscriptionTier] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get vendor subscriptions with optional filtering"""
    admin_service = AdminService(db)
    result = admin_service.get_vendor_subscriptions(current_user, tier, skip, limit)
    
    # Transform subscriptions to include vendor details
    subscriptions_data = []
    for sub in result["subscriptions"]:
        sub_data = {
            "id": sub.id,
            "vendor_id": sub.vendor_id,
            "tier": sub.tier,
            "started_at": sub.started_at.isoformat(),
            "expires_at": sub.expires_at.isoformat() if sub.expires_at else None,
            "is_active": sub.is_active,
            "business_name": sub.vendor.business_name,
            "vendor_email": sub.vendor.user.email
        }
        subscriptions_data.append(sub_data)
    
    return VendorSubscriptionsResponse(
        subscriptions=subscriptions_data,
        total=result["total"],
        skip=result["skip"],
        limit=result["limit"],
        has_more=result["has_more"]
    )


@router.get("/vendors/{vendor_id}/subscription", response_model=VendorSubscriptionResponse)
async def get_vendor_subscription(
    vendor_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get vendor subscription details"""
    admin_service = AdminService(db)
    subscription = admin_service.get_vendor_subscription(vendor_id, current_user)
    
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor subscription not found"
        )
    
    return VendorSubscriptionResponse(
        id=subscription.id,
        vendor_id=subscription.vendor_id,
        tier=subscription.tier,
        started_at=subscription.started_at.isoformat(),
        expires_at=subscription.expires_at.isoformat() if subscription.expires_at else None,
        is_active=subscription.is_active,
        business_name=subscription.vendor.business_name,
        vendor_email=subscription.vendor.user.email
    )


@router.put("/vendors/{vendor_id}/subscription", response_model=VendorSubscriptionResponse)
async def update_vendor_subscription(
    vendor_id: int,
    request: VendorSubscriptionUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update vendor subscription tier"""
    from datetime import datetime
    
    admin_service = AdminService(db)
    expires_at = None
    if request.expires_at:
        expires_at = datetime.fromisoformat(request.expires_at)
    
    subscription = admin_service.update_vendor_subscription(
        vendor_id, current_user, request.tier, expires_at
    )
    
    return VendorSubscriptionResponse(
        id=subscription.id,
        vendor_id=subscription.vendor_id,
        tier=subscription.tier,
        started_at=subscription.started_at.isoformat(),
        expires_at=subscription.expires_at.isoformat() if subscription.expires_at else None,
        is_active=subscription.is_active,
        business_name=subscription.vendor.business_name,
        vendor_email=subscription.vendor.user.email
    )


# Content Moderation Endpoints

@router.get("/reviews/flagged")
async def get_flagged_reviews(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get flagged reviews for moderation"""
    admin_service = AdminService(db)
    result = admin_service.get_flagged_reviews(current_user, skip, limit)
    
    return result


@router.post("/reviews/{review_id}/moderate")
async def moderate_review(
    review_id: int,
    request: ReviewModerationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Moderate a flagged review"""
    admin_service = AdminService(db)
    review = admin_service.moderate_review(
        review_id, current_user, request.action, request.reason
    )
    
    return {
        "id": review.id,
        "status": "moderated",
        "action": request.action,
        "is_hidden": review.is_hidden,
        "is_flagged": review.is_flagged
    }


# Platform Analytics Endpoints

@router.get("/analytics", response_model=PlatformAnalyticsResponse)
async def get_platform_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get platform-wide analytics"""
    admin_service = AdminService(db)
    analytics = admin_service.get_platform_analytics(current_user)
    
    return PlatformAnalyticsResponse(**analytics)


@router.get("/audit-logs", response_model=AuditLogsResponse)
async def get_audit_logs(
    action_type: Optional[AdminActionType] = Query(None),
    target_type: Optional[str] = Query(None),
    admin_user_id: Optional[int] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get audit logs with optional filtering"""
    admin_service = AdminService(db)
    result = admin_service.get_audit_logs(
        current_user, action_type, target_type, admin_user_id, skip, limit
    )
    
    # Transform logs to include admin user details
    logs_data = []
    for log in result["logs"]:
        log_data = {
            "id": log.id,
            "admin_user_id": log.admin_user_id,
            "action_type": log.action_type,
            "target_type": log.target_type,
            "target_id": log.target_id,
            "description": log.description,
            "action_metadata": log.action_metadata,
            "created_at": log.created_at.isoformat(),
            "admin_email": log.admin_user.email
        }
        logs_data.append(log_data)
    
    return AuditLogsResponse(
        logs=logs_data,
        total=result["total"],
        skip=result["skip"],
        limit=result["limit"],
        has_more=result["has_more"]
    )


@router.post("/metrics/record")
async def record_platform_metrics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Record current platform metrics (typically called by scheduled job)"""
    admin_service = AdminService(db)
    metrics = admin_service.record_platform_metrics()
    
    return {
        "id": metrics.id,
        "date": metrics.date.isoformat(),
        "total_users": metrics.total_users,
        "total_couples": metrics.total_couples,
        "total_vendors": metrics.total_vendors,
        "total_weddings": metrics.total_weddings,
        "total_checkins": metrics.total_checkins,
        "total_reviews": metrics.total_reviews,
        "total_leads": metrics.total_leads,
        "active_users_30d": metrics.active_users_30d,
        "created_at": metrics.created_at.isoformat()
    }