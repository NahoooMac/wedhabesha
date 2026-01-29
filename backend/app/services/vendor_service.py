"""
Vendor Service

Business logic for vendor profile management, search, and lead generation.
"""

from datetime import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from fastapi import HTTPException, status

from app.models.user import User, Vendor, VendorCategory, Couple
from app.models.vendor import VendorLead, Review, LeadStatus
from app.services.notification_service import NotificationService


class VendorService:
    """Service for vendor operations"""
    
    def __init__(self, db: Session, enable_notifications: bool = True):
        self.db = db
        self.enable_notifications = enable_notifications
        if enable_notifications:
            self.notification_service = NotificationService()
        else:
            self.notification_service = None
    
    def create_vendor_profile(
        self,
        user_id: int,
        business_name: str,
        category: VendorCategory,
        location: str,
        description: str
    ) -> Vendor:
        """Create a new vendor profile"""
        # Check if user already has a vendor profile
        existing_vendor = self.db.query(Vendor).filter(Vendor.user_id == user_id).first()
        if existing_vendor:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User already has a vendor profile"
            )
        
        # Create vendor profile
        vendor = Vendor(
            user_id=user_id,
            business_name=business_name,
            category=category,
            location=location,
            description=description,
            is_verified=False,  # Requires admin verification
            rating=None
        )
        
        self.db.add(vendor)
        self.db.commit()
        self.db.refresh(vendor)
        
        # Create vendor application for admin approval
        from app.services.admin_service import AdminService
        admin_service = AdminService(self.db, enable_notifications=False)
        admin_service.create_vendor_application(vendor.id)
        
        return vendor
    
    def get_vendor_by_id(self, vendor_id: int) -> Optional[Vendor]:
        """Get vendor by ID"""
        return self.db.query(Vendor).filter(Vendor.id == vendor_id).first()
    
    def get_vendor_by_user_id(self, user_id: int) -> Optional[Vendor]:
        """Get vendor by user ID"""
        return self.db.query(Vendor).filter(Vendor.user_id == user_id).first()
    
    def update_vendor_profile(
        self,
        vendor_id: int,
        user_id: int,
        business_name: Optional[str] = None,
        category: Optional[VendorCategory] = None,
        location: Optional[str] = None,
        description: Optional[str] = None
    ) -> Vendor:
        """Update vendor profile"""
        vendor = self.db.query(Vendor).filter(
            and_(Vendor.id == vendor_id, Vendor.user_id == user_id)
        ).first()
        
        if not vendor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vendor profile not found"
            )
        
        # Update fields if provided
        if business_name is not None:
            vendor.business_name = business_name
        if category is not None:
            vendor.category = category
        if location is not None:
            vendor.location = location
        if description is not None:
            vendor.description = description
        
        self.db.commit()
        self.db.refresh(vendor)
        
        return vendor
    
    def search_vendors(
        self,
        category: Optional[VendorCategory] = None,
        location: Optional[str] = None,
        search_text: Optional[str] = None,
        min_rating: Optional[float] = None,
        verified_only: bool = False,
        skip: int = 0,
        limit: int = 20
    ) -> Dict[str, Any]:
        """Search vendors with filters and return paginated results"""
        query = self.db.query(Vendor)
        
        # Apply filters
        if category:
            query = query.filter(Vendor.category == category)
        
        if location:
            # Case-insensitive location search
            query = query.filter(Vendor.location.ilike(f"%{location}%"))
        
        if search_text:
            # Search in business name and description
            search_pattern = f"%{search_text}%"
            query = query.filter(
                or_(
                    Vendor.business_name.ilike(search_pattern),
                    Vendor.description.ilike(search_pattern)
                )
            )
        
        if min_rating is not None:
            query = query.filter(Vendor.rating >= min_rating)
        
        if verified_only:
            query = query.filter(Vendor.is_verified == True)
        
        # Get total count before pagination
        total_count = query.count()
        
        # Apply ranking: verified vendors first, then by rating, then by creation date
        query = query.order_by(
            Vendor.is_verified.desc(),
            Vendor.rating.desc().nullslast(),
            Vendor.created_at.desc()
        )
        
        # Apply pagination
        vendors = query.offset(skip).limit(limit).all()
        
        return {
            "vendors": vendors,
            "total": total_count,
            "skip": skip,
            "limit": limit,
            "has_more": skip + len(vendors) < total_count
        }
    
    def get_vendor_categories(self) -> List[Dict[str, str]]:
        """Get all vendor categories"""
        return [
            {"value": category.value, "label": category.value.replace("_", " ").title()}
            for category in VendorCategory
        ]
    
    def create_lead(
        self,
        vendor_id: int,
        couple_id: int,
        message: str,
        budget_range: Optional[str] = None,
        event_date: Optional[datetime] = None
    ) -> VendorLead:
        """Create a new lead for vendor"""
        # Verify vendor exists and get vendor details
        vendor = self.db.query(Vendor).join(User).filter(Vendor.id == vendor_id).first()
        if not vendor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vendor not found"
            )
        
        # Get couple details
        couple = self.db.query(Couple).join(User).filter(Couple.id == couple_id).first()
        if not couple:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Couple not found"
            )
        
        # Check for existing lead from same couple
        existing_lead = self.db.query(VendorLead).filter(
            and_(
                VendorLead.vendor_id == vendor_id,
                VendorLead.couple_id == couple_id,
                VendorLead.status.in_([LeadStatus.NEW, LeadStatus.CONTACTED])
            )
        ).first()
        
        if existing_lead:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You already have an active inquiry with this vendor"
            )
        
        # Create lead
        lead = VendorLead(
            vendor_id=vendor_id,
            couple_id=couple_id,
            message=message,
            budget_range=budget_range,
            event_date=event_date.date() if event_date else None,
            status=LeadStatus.NEW
        )
        
        self.db.add(lead)
        self.db.commit()
        self.db.refresh(lead)
        
        # Send notification to vendor
        if self.notification_service:
            couple_name = f"{couple.partner1_name} & {couple.partner2_name}"
            self.notification_service.send_lead_notification(
                vendor_email=vendor.user.email,
                vendor_name=vendor.business_name,
                couple_name=couple_name,
                message=message,
                budget_range=budget_range,
                event_date=event_date
            )
        
        return lead
    
    def get_vendor_leads(
        self,
        vendor_id: int,
        user_id: int,
        status: Optional[LeadStatus] = None,
        skip: int = 0,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """Get leads for vendor with couple information"""
        # Verify vendor ownership
        vendor = self.db.query(Vendor).filter(
            and_(Vendor.id == vendor_id, Vendor.user_id == user_id)
        ).first()
        
        if not vendor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vendor not found"
            )
        
        query = self.db.query(VendorLead).join(Couple).join(User).filter(
            VendorLead.vendor_id == vendor_id
        )
        
        if status:
            query = query.filter(VendorLead.status == status)
        
        query = query.order_by(VendorLead.created_at.desc())
        leads = query.offset(skip).limit(limit).all()
        
        # Enrich leads with couple information
        enriched_leads = []
        for lead in leads:
            couple = self.db.query(Couple).join(User).filter(Couple.id == lead.couple_id).first()
            lead_dict = {
                "id": lead.id,
                "vendor_id": lead.vendor_id,
                "couple_id": lead.couple_id,
                "message": lead.message,
                "budget_range": lead.budget_range,
                "event_date": lead.event_date,
                "status": lead.status,
                "created_at": lead.created_at,
                "couple_name": f"{couple.partner1_name} & {couple.partner2_name}" if couple else None,
                "couple_email": couple.user.email if couple and couple.user else None
            }
            enriched_leads.append(lead_dict)
        
        return enriched_leads
    
    def update_lead_status(
        self,
        lead_id: int,
        vendor_id: int,
        user_id: int,
        new_status: LeadStatus
    ) -> VendorLead:
        """Update lead status"""
        # Verify vendor ownership and lead exists
        lead = self.db.query(VendorLead).join(Vendor).join(User).filter(
            and_(
                VendorLead.id == lead_id,
                VendorLead.vendor_id == vendor_id,
                Vendor.user_id == user_id
            )
        ).first()
        
        if not lead:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lead not found"
            )
        
        # Get vendor and couple details for notification
        vendor = self.db.query(Vendor).join(User).filter(Vendor.id == vendor_id).first()
        couple = self.db.query(Couple).join(User).filter(Couple.id == lead.couple_id).first()
        
        old_status = lead.status
        lead.status = new_status
        self.db.commit()
        self.db.refresh(lead)
        
        # Send status update notification to couple if status changed
        if old_status != new_status and couple and vendor and self.notification_service:
            couple_name = f"{couple.partner1_name} & {couple.partner2_name}"
            self.notification_service.send_lead_status_update(
                couple_email=couple.user.email,
                couple_name=couple_name,
                vendor_name=vendor.business_name,
                status=new_status.value
            )
        
        return lead
    
    def verify_vendor(self, vendor_id: int, admin_user_id: int) -> Vendor:
        """Verify vendor (admin only)"""
        # This would typically check if admin_user_id is actually an admin
        # For now, we'll implement basic verification
        vendor = self.get_vendor_by_id(vendor_id)
        if not vendor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vendor not found"
            )
        
        vendor.is_verified = True
        self.db.commit()
        self.db.refresh(vendor)
        
        return vendor
    
    def calculate_vendor_rating(self, vendor_id: int) -> Optional[float]:
        """Calculate average rating from verified reviews"""
        result = self.db.query(func.avg(Review.rating)).filter(
            and_(
                Review.vendor_id == vendor_id,
                Review.is_verified == True,
                Review.is_hidden == False  # Exclude hidden reviews
            )
        ).scalar()
        
        return float(result) if result else None
    
    def update_vendor_rating(self, vendor_id: int) -> None:
        """Update vendor's cached rating"""
        vendor = self.get_vendor_by_id(vendor_id)
        if vendor:
            vendor.rating = self.calculate_vendor_rating(vendor_id)
            self.db.commit()
    
    def create_review(
        self,
        vendor_id: int,
        couple_id: int,
        rating: int,
        comment: str
    ) -> Review:
        """Create a new review for vendor"""
        # Verify vendor exists
        vendor = self.get_vendor_by_id(vendor_id)
        if not vendor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vendor not found"
            )
        
        # Verify couple exists
        couple = self.db.query(Couple).filter(Couple.id == couple_id).first()
        if not couple:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Couple not found"
            )
        
        # Check if couple has already reviewed this vendor
        existing_review = self.db.query(Review).filter(
            and_(
                Review.vendor_id == vendor_id,
                Review.couple_id == couple_id
            )
        ).first()
        
        if existing_review:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You have already reviewed this vendor"
            )
        
        # Verify couple has interacted with vendor (has a converted lead)
        has_booking = self.db.query(VendorLead).filter(
            and_(
                VendorLead.vendor_id == vendor_id,
                VendorLead.couple_id == couple_id,
                VendorLead.status == LeadStatus.CONVERTED
            )
        ).first()
        
        if not has_booking:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only review vendors you have booked services with"
            )
        
        # Check for inappropriate content (basic implementation)
        is_flagged = self._contains_inappropriate_content(comment)
        is_verified = not is_flagged  # Auto-verify if no inappropriate content detected
        
        # Create review
        review = Review(
            vendor_id=vendor_id,
            couple_id=couple_id,
            rating=rating,
            comment=comment,
            is_verified=is_verified,
            is_flagged=is_flagged,
            is_hidden=False
        )
        
        self.db.add(review)
        self.db.commit()
        self.db.refresh(review)
        
        # Update vendor's cached rating
        self.update_vendor_rating(vendor_id)
        
        return review
    
    def get_vendor_reviews(
        self,
        vendor_id: int,
        verified_only: bool = True,
        skip: int = 0,
        limit: int = 20
    ) -> Dict[str, Any]:
        """Get reviews for vendor with pagination"""
        query = self.db.query(Review).filter(
            and_(
                Review.vendor_id == vendor_id,
                Review.is_hidden == False  # Exclude hidden reviews
            )
        )
        
        if verified_only:
            query = query.filter(Review.is_verified == True)
        
        # Get total count
        total_count = query.count()
        
        # Apply pagination and ordering
        reviews = query.order_by(Review.created_at.desc()).offset(skip).limit(limit).all()
        
        # Calculate average rating from verified reviews
        avg_rating = self.calculate_vendor_rating(vendor_id)
        
        return {
            "reviews": reviews,
            "total": total_count,
            "skip": skip,
            "limit": limit,
            "has_more": skip + len(reviews) < total_count,
            "average_rating": avg_rating
        }
    
    def moderate_review(
        self,
        review_id: int,
        admin_user_id: int,
        is_verified: bool,
        reason: Optional[str] = None
    ) -> Review:
        """Moderate review (admin only)"""
        # Get review
        review = self.db.query(Review).filter(Review.id == review_id).first()
        if not review:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Review not found"
            )
        
        # Update verification status
        old_status = review.is_verified
        review.is_verified = is_verified
        self.db.commit()
        self.db.refresh(review)
        
        # Update vendor rating if verification status changed
        if old_status != is_verified:
            self.update_vendor_rating(review.vendor_id)
        
        # Log moderation action (in a real system, you'd store this in an audit table)
        # For now, we'll just return the updated review
        
        return review
    
    def _contains_inappropriate_content(self, text: str) -> bool:
        """Basic inappropriate content detection"""
        # This is a simple implementation - in production you'd use more sophisticated
        # content moderation services or ML models
        inappropriate_words = [
            'spam', 'fake', 'scam', 'fraud', 'terrible', 'worst', 'hate',
            'awful', 'horrible', 'disgusting', 'pathetic', 'useless'
        ]
        
        text_lower = text.lower()
        return any(word in text_lower for word in inappropriate_words)
    
    def get_couple_review_eligibility(self, vendor_id: int, couple_id: int) -> Dict[str, Any]:
        """Check if couple is eligible to review vendor"""
        # Check if couple has a converted lead with vendor
        has_booking = self.db.query(VendorLead).filter(
            and_(
                VendorLead.vendor_id == vendor_id,
                VendorLead.couple_id == couple_id,
                VendorLead.status == LeadStatus.CONVERTED
            )
        ).first()
        
        # Check if couple has already reviewed
        existing_review = self.db.query(Review).filter(
            and_(
                Review.vendor_id == vendor_id,
                Review.couple_id == couple_id
            )
        ).first()
        
        return {
            "can_review": bool(has_booking and not existing_review),
            "has_booking": bool(has_booking),
            "already_reviewed": bool(existing_review),
            "reason": (
                "You can submit a review" if has_booking and not existing_review
                else "You have already reviewed this vendor" if existing_review
                else "You can only review vendors you have booked services with"
            )
        }
    
    def get_vendor_rating_breakdown(self, vendor_id: int) -> Dict[str, Any]:
        """Get detailed rating breakdown for vendor"""
        # Get all verified reviews for this vendor
        reviews = self.db.query(Review).filter(
            and_(
                Review.vendor_id == vendor_id,
                Review.is_verified == True
            )
        ).all()
        
        if not reviews:
            return {
                "total_reviews": 0,
                "average_rating": None,
                "rating_distribution": {1: 0, 2: 0, 3: 0, 4: 0, 5: 0},
                "recent_reviews": []
            }
        
        # Calculate rating distribution
        rating_counts = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
        total_rating = 0
        
        for review in reviews:
            rating_counts[review.rating] += 1
            total_rating += review.rating
        
        average_rating = total_rating / len(reviews)
        
        # Get recent reviews (last 5)
        recent_reviews = sorted(reviews, key=lambda r: r.created_at, reverse=True)[:5]
        
        return {
            "total_reviews": len(reviews),
            "average_rating": round(average_rating, 2),
            "rating_distribution": rating_counts,
            "recent_reviews": [
                {
                    "id": review.id,
                    "rating": review.rating,
                    "comment": review.comment[:100] + "..." if len(review.comment) > 100 else review.comment,
                    "created_at": review.created_at
                }
                for review in recent_reviews
            ]
        }