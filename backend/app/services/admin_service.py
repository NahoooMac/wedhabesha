"""
Administrative Service

Service layer for administrative operations including vendor approval,
content moderation, and platform analytics.
"""

from typing import Optional, Dict, Any, List
from datetime import datetime, date, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_

from app.models.user import User, UserType, Vendor
from app.models.wedding import Wedding, Guest, CheckIn
from app.models.vendor import Review
from app.models.admin import (
    VendorApplication, VendorApplicationStatus, VendorSubscription,
    VendorSubscriptionTier, AuditLog, AdminActionType, PlatformMetrics
)
from app.core.exceptions import PermissionDenied, NotFound


class AdminService:
    """Service for administrative operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def _verify_admin_access(self, user: User):
        """Verify user has admin access"""
        if user.user_type != UserType.ADMIN:
            raise PermissionDenied("Admin access required")
    
    def _log_admin_action(
        self,
        admin_user: User,
        action_type: AdminActionType,
        target_type: str,
        target_id: int,
        description: str,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Log administrative action"""
        audit_log = AuditLog(
            admin_user_id=admin_user.id,
            action_type=action_type,
            target_type=target_type,
            target_id=target_id,
            description=description,
            action_metadata=str(metadata) if metadata else None
        )
        self.db.add(audit_log)
        self.db.commit()
    
    # Vendor Application Management
    
    def get_pending_vendor_applications(
        self,
        admin_user: User,
        skip: int = 0,
        limit: int = 20
    ) -> Dict[str, Any]:
        """Get pending vendor applications"""
        self._verify_admin_access(admin_user)
        
        query = (
            self.db.query(VendorApplication)
            .join(Vendor)
            .join(User)
            .filter(VendorApplication.status == VendorApplicationStatus.PENDING)
            .order_by(VendorApplication.submitted_at.desc())
        )
        
        total = query.count()
        applications = query.offset(skip).limit(limit).all()
        
        return {
            "applications": applications,
            "total": total,
            "skip": skip,
            "limit": limit,
            "has_more": skip + len(applications) < total
        }
    
    def get_vendor_application(
        self,
        application_id: int,
        admin_user: User
    ) -> VendorApplication:
        """Get vendor application by ID"""
        self._verify_admin_access(admin_user)
        
        application = (
            self.db.query(VendorApplication)
            .join(Vendor)
            .join(User)
            .filter(VendorApplication.id == application_id)
            .first()
        )
        
        if not application:
            raise NotFound("Vendor application not found")
        
        return application
    
    def approve_vendor_application(
        self,
        application_id: int,
        admin_user: User,
        notes: Optional[str] = None
    ) -> VendorApplication:
        """Approve vendor application"""
        self._verify_admin_access(admin_user)
        
        application = self.get_vendor_application(application_id, admin_user)
        
        if application.status != VendorApplicationStatus.PENDING:
            raise ValueError("Application is not pending")
        
        # Update application
        application.status = VendorApplicationStatus.APPROVED
        application.reviewed_at = datetime.utcnow()
        application.reviewed_by = admin_user.id
        application.notes = notes
        
        # Update vendor verification status
        application.vendor.is_verified = True
        
        # Create basic subscription
        subscription = VendorSubscription(
            vendor_id=application.vendor_id,
            tier=VendorSubscriptionTier.BASIC,
            started_at=datetime.utcnow(),
            is_active=True
        )
        self.db.add(subscription)
        
        self.db.commit()
        
        # Log action
        self._log_admin_action(
            admin_user,
            AdminActionType.VENDOR_APPROVED,
            "vendor_application",
            application_id,
            f"Approved vendor application for {application.vendor.business_name}",
            {"notes": notes}
        )
        
        return application
    
    def reject_vendor_application(
        self,
        application_id: int,
        admin_user: User,
        rejection_reason: str,
        notes: Optional[str] = None
    ) -> VendorApplication:
        """Reject vendor application"""
        self._verify_admin_access(admin_user)
        
        application = self.get_vendor_application(application_id, admin_user)
        
        if application.status != VendorApplicationStatus.PENDING:
            raise ValueError("Application is not pending")
        
        # Update application
        application.status = VendorApplicationStatus.REJECTED
        application.reviewed_at = datetime.utcnow()
        application.reviewed_by = admin_user.id
        application.rejection_reason = rejection_reason
        application.notes = notes
        
        self.db.commit()
        
        # Log action
        self._log_admin_action(
            admin_user,
            AdminActionType.VENDOR_REJECTED,
            "vendor_application",
            application_id,
            f"Rejected vendor application for {application.vendor.business_name}",
            {"rejection_reason": rejection_reason, "notes": notes}
        )
        
        return application
    
    # Vendor Subscription Management
    
    def get_vendor_subscriptions(
        self,
        admin_user: User,
        tier: Optional[VendorSubscriptionTier] = None,
        skip: int = 0,
        limit: int = 20
    ) -> Dict[str, Any]:
        """Get vendor subscriptions"""
        self._verify_admin_access(admin_user)
        
        query = (
            self.db.query(VendorSubscription)
            .join(Vendor)
            .join(User)
            .order_by(VendorSubscription.started_at.desc())
        )
        
        if tier:
            query = query.filter(VendorSubscription.tier == tier)
        
        total = query.count()
        subscriptions = query.offset(skip).limit(limit).all()
        
        return {
            "subscriptions": subscriptions,
            "total": total,
            "skip": skip,
            "limit": limit,
            "has_more": skip + len(subscriptions) < total
        }
    
    def get_vendor_subscription(
        self,
        vendor_id: int,
        admin_user: User
    ) -> Optional[VendorSubscription]:
        """Get vendor subscription"""
        self._verify_admin_access(admin_user)
        
        return (
            self.db.query(VendorSubscription)
            .join(Vendor)
            .join(User)
            .filter(VendorSubscription.vendor_id == vendor_id)
            .filter(VendorSubscription.is_active == True)
            .first()
        )
    
    def update_vendor_subscription(
        self,
        vendor_id: int,
        admin_user: User,
        tier: VendorSubscriptionTier,
        expires_at: Optional[datetime] = None
    ) -> VendorSubscription:
        """Update vendor subscription"""
        self._verify_admin_access(admin_user)
        
        subscription = self.get_vendor_subscription(vendor_id, admin_user)
        
        if not subscription:
            # Create new subscription
            subscription = VendorSubscription(
                vendor_id=vendor_id,
                tier=tier,
                started_at=datetime.utcnow(),
                expires_at=expires_at,
                is_active=True
            )
            self.db.add(subscription)
        else:
            # Update existing subscription
            subscription.tier = tier
            subscription.expires_at = expires_at
        
        self.db.commit()
        
        # Log action
        vendor = self.db.query(Vendor).filter(Vendor.id == vendor_id).first()
        self._log_admin_action(
            admin_user,
            AdminActionType.SUBSCRIPTION_UPDATED,
            "vendor_subscription",
            subscription.id,
            f"Updated subscription for {vendor.business_name} to {tier.value}",
            {"tier": tier.value, "expires_at": expires_at.isoformat() if expires_at else None}
        )
        
        return subscription
    
    # Content Moderation
    
    def get_flagged_reviews(
        self,
        admin_user: User,
        skip: int = 0,
        limit: int = 20
    ) -> Dict[str, Any]:
        """Get flagged reviews for moderation"""
        self._verify_admin_access(admin_user)
        
        query = (
            self.db.query(Review)
            .join(Vendor)
            .join(User, Review.couple_id == User.id)
            .filter(Review.is_flagged == True)
            .filter(Review.is_hidden == False)
            .order_by(Review.created_at.desc())
        )
        
        total = query.count()
        reviews = query.offset(skip).limit(limit).all()
        
        # Transform reviews for response
        reviews_data = []
        for review in reviews:
            reviews_data.append({
                "id": review.id,
                "vendor_id": review.vendor_id,
                "vendor_name": review.vendor.business_name,
                "couple_id": review.couple_id,
                "rating": review.rating,
                "comment": review.comment,
                "flag_reason": review.flag_reason,
                "created_at": review.created_at.isoformat(),
                "is_verified": review.is_verified
            })
        
        return {
            "reviews": reviews_data,
            "total": total,
            "skip": skip,
            "limit": limit,
            "has_more": skip + len(reviews) < total
        }
    
    def moderate_review(
        self,
        review_id: int,
        admin_user: User,
        action: str,
        reason: Optional[str] = None
    ) -> Review:
        """Moderate a flagged review"""
        self._verify_admin_access(admin_user)
        
        review = self.db.query(Review).filter(Review.id == review_id).first()
        if not review:
            raise NotFound("Review not found")
        
        if action == "approve":
            review.is_flagged = False
        elif action == "reject" or action == "hide":
            review.is_hidden = True
            review.is_flagged = False
        else:
            raise ValueError("Invalid moderation action")
        
        self.db.commit()
        
        # Log action
        self._log_admin_action(
            admin_user,
            AdminActionType.CONTENT_MODERATED,
            "review",
            review_id,
            f"Moderated review (action: {action})",
            {"action": action, "reason": reason}
        )
        
        return review
    
    # Platform Analytics
    
    def get_platform_analytics(self, admin_user: User) -> Dict[str, Any]:
        """Get platform-wide analytics"""
        self._verify_admin_access(admin_user)
        
        # Overview metrics
        total_users = self.db.query(User).count()
        total_couples = self.db.query(User).filter(User.user_type == UserType.COUPLE).count()
        total_vendors = self.db.query(User).filter(User.user_type == UserType.VENDOR).count()
        total_weddings = self.db.query(Wedding).count()
        total_checkins = self.db.query(CheckIn).count()
        total_reviews = self.db.query(Review).count()
        
        # Active users (last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        active_users_30d = (
            self.db.query(User)
            .filter(User.last_login >= thirty_days_ago)
            .count()
        )
        
        # Pending actions
        pending_applications = (
            self.db.query(VendorApplication)
            .filter(VendorApplication.status == VendorApplicationStatus.PENDING)
            .count()
        )
        
        flagged_reviews = (
            self.db.query(Review)
            .filter(Review.is_flagged == True)
            .filter(Review.is_hidden == False)
            .count()
        )
        
        # Subscription distribution
        subscription_stats = (
            self.db.query(
                VendorSubscription.tier,
                func.count(VendorSubscription.id).label('count')
            )
            .filter(VendorSubscription.is_active == True)
            .group_by(VendorSubscription.tier)
            .all()
        )
        
        subscription_distribution = {
            tier.value: count for tier, count in subscription_stats
        }
        
        return {
            "overview": {
                "total_users": total_users,
                "total_couples": total_couples,
                "total_vendors": total_vendors,
                "total_weddings": total_weddings,
                "total_checkins": total_checkins,
                "total_reviews": total_reviews,
                "active_users_30d": active_users_30d
            },
            "pending_actions": {
                "vendor_applications": pending_applications,
                "flagged_reviews": flagged_reviews
            },
            "subscription_distribution": subscription_distribution
        }
    
    def get_audit_logs(
        self,
        admin_user: User,
        action_type: Optional[AdminActionType] = None,
        target_type: Optional[str] = None,
        admin_user_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 50
    ) -> Dict[str, Any]:
        """Get audit logs with filtering"""
        self._verify_admin_access(admin_user)
        
        query = (
            self.db.query(AuditLog)
            .join(User, AuditLog.admin_user_id == User.id)
            .order_by(AuditLog.created_at.desc())
        )
        
        if action_type:
            query = query.filter(AuditLog.action_type == action_type)
        
        if target_type:
            query = query.filter(AuditLog.target_type == target_type)
        
        if admin_user_id:
            query = query.filter(AuditLog.admin_user_id == admin_user_id)
        
        total = query.count()
        logs = query.offset(skip).limit(limit).all()
        
        return {
            "logs": logs,
            "total": total,
            "skip": skip,
            "limit": limit,
            "has_more": skip + len(logs) < total
        }
    
    def record_platform_metrics(self) -> PlatformMetrics:
        """Record current platform metrics"""
        today = date.today()
        
        # Check if metrics already recorded for today
        existing = (
            self.db.query(PlatformMetrics)
            .filter(PlatformMetrics.date == today)
            .first()
        )
        
        if existing:
            return existing
        
        # Calculate metrics
        total_users = self.db.query(User).count()
        total_couples = self.db.query(User).filter(User.user_type == UserType.COUPLE).count()
        total_vendors = self.db.query(User).filter(User.user_type == UserType.VENDOR).count()
        total_weddings = self.db.query(Wedding).count()
        total_checkins = self.db.query(CheckIn).count()
        total_reviews = self.db.query(Review).count()
        
        # Active users (last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        active_users_30d = (
            self.db.query(User)
            .filter(User.last_login >= thirty_days_ago)
            .count()
        )
        
        # Create metrics record
        metrics = PlatformMetrics(
            date=today,
            total_users=total_users,
            total_couples=total_couples,
            total_vendors=total_vendors,
            total_weddings=total_weddings,
            total_checkins=total_checkins,
            total_reviews=total_reviews,
            active_users_30d=active_users_30d
        )
        
        self.db.add(metrics)
        self.db.commit()
        
        return metrics