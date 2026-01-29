"""
Property-Based Tests for Review Verification

Feature: wedding-platform
Property 14: Review Verification
Validates: Requirements 9.1, 9.2, 9.3

Tests that only couples who have completed actual bookings with vendors
can submit reviews, and only verified reviews are displayed publicly.
"""

import pytest
from hypothesis import given, strategies as st, assume, settings, HealthCheck
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy import create_engine
from sqlmodel import SQLModel
from fastapi import HTTPException
import tempfile
import os

from app.models.user import User, Couple, Vendor, UserType, AuthProvider, VendorCategory
from app.models.vendor import VendorLead, Review, LeadStatus
from app.services.vendor_service import VendorService


class TestReviewVerification:
    """Property-based tests for review verification system"""
    
    def get_test_db_session(self):
        """Create a test database session"""
        # Create temporary database
        db_fd, db_path = tempfile.mkstemp()
        test_db_url = f"sqlite:///{db_path}"
        
        # Create test engine
        engine = create_engine(test_db_url, connect_args={"check_same_thread": False})
        SQLModel.metadata.create_all(bind=engine)
        
        # Create session
        TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        session = TestingSessionLocal()
        
        return session, db_fd, db_path
    
    def cleanup_test_db(self, session, db_fd, db_path):
        """Clean up test database"""
        session.close()
        os.close(db_fd)
        try:
            os.unlink(db_path)
        except (PermissionError, FileNotFoundError):
            pass
    
    def create_test_couple(self, db: Session, email_suffix: str = "") -> tuple[User, Couple]:
        """Create a test couple"""
        user = User(
            email=f"couple{email_suffix}@test.com",
            password_hash="hashed_password",
            user_type=UserType.COUPLE,
            auth_provider=AuthProvider.EMAIL,
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        couple = Couple(
            user_id=user.id,
            partner1_name="Partner One",
            partner2_name="Partner Two",
            phone="+1234567890"
        )
        db.add(couple)
        db.commit()
        db.refresh(couple)
        
        return user, couple
    
    def create_test_vendor(self, db: Session, email_suffix: str = "") -> tuple[User, Vendor]:
        """Create a test vendor"""
        user = User(
            email=f"vendor{email_suffix}@test.com",
            password_hash="hashed_password",
            user_type=UserType.VENDOR,
            auth_provider=AuthProvider.EMAIL,
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        vendor = Vendor(
            user_id=user.id,
            business_name="Test Vendor Business",
            category=VendorCategory.PHOTOGRAPHY,
            location="Test City",
            description="Test vendor description",
            is_verified=True
        )
        db.add(vendor)
        db.commit()
        db.refresh(vendor)
        
        return user, vendor
    
    def create_vendor_lead(self, db: Session, vendor_id: int, couple_id: int, status: LeadStatus) -> VendorLead:
        """Create a vendor lead with specified status"""
        lead = VendorLead(
            vendor_id=vendor_id,
            couple_id=couple_id,
            message="Test inquiry message",
            budget_range="$1000-2000",
            status=status
        )
        db.add(lead)
        db.commit()
        db.refresh(lead)
        return lead
    
    @pytest.mark.property
    @given(
        rating=st.integers(min_value=1, max_value=5),
        comment=st.text(min_size=10, max_size=500).filter(lambda x: len(x.strip()) >= 10),
        has_booking=st.booleans(),
        lead_status=st.sampled_from([LeadStatus.NEW, LeadStatus.CONTACTED, LeadStatus.CONVERTED, LeadStatus.CLOSED])
    )
    @settings(
        max_examples=10, 
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_review_submission_requires_booking_verification(
        self, 
        rating: int, 
        comment: str, 
        has_booking: bool,
        lead_status: LeadStatus
    ):
        """
        **Property 14: Review Verification**
        **Validates: Requirements 9.1, 9.2, 9.3**
        
        For any review submission attempt, the system should only accept reviews 
        from couples who have completed actual bookings (CONVERTED leads) with that vendor.
        """
        # Create test database session
        db_session, db_fd, db_path = self.get_test_db_session()
        
        try:
            # Create test data
            couple_user, couple = self.create_test_couple(db_session, f"_{rating}_{hash(comment) % 1000}")
            vendor_user, vendor = self.create_test_vendor(db_session, f"_{rating}_{hash(comment) % 1000}")
            
            vendor_service = VendorService(db_session, enable_notifications=False)
            
            # Create lead if has_booking is True
            if has_booking:
                # Only CONVERTED leads should allow reviews
                actual_status = LeadStatus.CONVERTED if lead_status == LeadStatus.CONVERTED else lead_status
                self.create_vendor_lead(db_session, vendor.id, couple.id, actual_status)
            
            # Attempt to create review
            if has_booking and lead_status == LeadStatus.CONVERTED:
                # Should succeed - couple has completed booking
                review = vendor_service.create_review(
                    vendor_id=vendor.id,
                    couple_id=couple.id,
                    rating=rating,
                    comment=comment
                )
                
                # Verify review was created
                assert review is not None
                assert review.vendor_id == vendor.id
                assert review.couple_id == couple.id
                assert review.rating == rating
                assert review.comment == comment
                
                # Verify review verification status (should be auto-verified if no inappropriate content)
                if vendor_service._contains_inappropriate_content(comment):
                    assert review.is_verified == False
                else:
                    assert review.is_verified == True
                    
            else:
                # Should fail - couple has no booking or booking not completed
                with pytest.raises(HTTPException) as exc_info:
                    vendor_service.create_review(
                        vendor_id=vendor.id,
                        couple_id=couple.id,
                        rating=rating,
                        comment=comment
                    )
                
                assert exc_info.value.status_code == 403
                assert "can only review vendors you have booked services with" in exc_info.value.detail.lower()
        
        finally:
            self.cleanup_test_db(db_session, db_fd, db_path)
    
    @pytest.mark.property
    @given(
        rating=st.integers(min_value=1, max_value=5),
        comment=st.text(min_size=10, max_size=500).filter(lambda x: len(x.strip()) >= 10)
    )
    @settings(
        max_examples=10, 
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_duplicate_review_prevention(self, rating: int, comment: str):
        """
        **Property 14: Review Verification**
        **Validates: Requirements 9.1, 9.2, 9.3**
        
        For any couple-vendor pair, only one review should be allowed per couple.
        """
        # Create test database session
        db_session, db_fd, db_path = self.get_test_db_session()
        
        try:
            # Create test data
            couple_user, couple = self.create_test_couple(db_session, f"_dup_{hash(comment) % 1000}")
            vendor_user, vendor = self.create_test_vendor(db_session, f"_dup_{hash(comment) % 1000}")
            
            # Create converted lead (booking completed)
            self.create_vendor_lead(db_session, vendor.id, couple.id, LeadStatus.CONVERTED)
            
            vendor_service = VendorService(db_session, enable_notifications=False)
            
            # First review should succeed
            first_review = vendor_service.create_review(
                vendor_id=vendor.id,
                couple_id=couple.id,
                rating=rating,
                comment=comment
            )
            assert first_review is not None
            
            # Second review should fail
            with pytest.raises(HTTPException) as exc_info:
                vendor_service.create_review(
                    vendor_id=vendor.id,
                    couple_id=couple.id,
                    rating=rating,
                    comment="Different comment for second review"
                )
            
            assert exc_info.value.status_code == 400
            assert "already reviewed this vendor" in exc_info.value.detail.lower()
        
        finally:
            self.cleanup_test_db(db_session, db_fd, db_path)
    
    @pytest.mark.property
    @given(
        verified_only=st.booleans(),
        num_verified=st.integers(min_value=0, max_value=5),
        num_unverified=st.integers(min_value=0, max_value=5)
    )
    @settings(max_examples=10, deadline=None)
    def test_verified_reviews_display_filtering(
        self, 
        db_session: Session, 
        verified_only: bool, 
        num_verified: int, 
        num_unverified: int
    ):
        """
        **Property 14: Review Verification**
        **Validates: Requirements 9.1, 9.2, 9.3**
        
        For any vendor review query, when verified_only=True, only verified reviews 
        should be returned. When verified_only=False, all reviews should be returned.
        """
        assume(num_verified > 0 or num_unverified > 0)  # At least one review
        
        # Create test vendor
        vendor_user, vendor = self.create_test_vendor(db_session, f"_filter_{num_verified}_{num_unverified}")
        
        vendor_service = VendorService(db_session, enable_notifications=False)
        
        # Create verified reviews
        for i in range(num_verified):
            couple_user, couple = self.create_test_couple(db_session, f"_verified_{i}_{num_verified}_{num_unverified}")
            self.create_vendor_lead(db_session, vendor.id, couple.id, LeadStatus.CONVERTED)
            
            review = Review(
                vendor_id=vendor.id,
                couple_id=couple.id,
                rating=5,
                comment=f"Great service verified review {i}",
                is_verified=True
            )
            db_session.add(review)
        
        # Create unverified reviews
        for i in range(num_unverified):
            couple_user, couple = self.create_test_couple(db_session, f"_unverified_{i}_{num_verified}_{num_unverified}")
            self.create_vendor_lead(db_session, vendor.id, couple.id, LeadStatus.CONVERTED)
            
            review = Review(
                vendor_id=vendor.id,
                couple_id=couple.id,
                rating=3,
                comment=f"Spam content unverified review {i}",
                is_verified=False
            )
            db_session.add(review)
        
        db_session.commit()
        
        # Test review filtering
        result = vendor_service.get_vendor_reviews(
            vendor_id=vendor.id,
            verified_only=verified_only,
            skip=0,
            limit=20
        )
        
        if verified_only:
            # Should only return verified reviews
            assert len(result["reviews"]) == num_verified
            assert result["total"] == num_verified
            for review in result["reviews"]:
                assert review.is_verified == True
        else:
            # Should return all reviews
            assert len(result["reviews"]) == num_verified + num_unverified
            assert result["total"] == num_verified + num_unverified
    
    @pytest.mark.property
    @given(
        inappropriate_words=st.lists(
            st.sampled_from(['spam', 'fake', 'scam', 'fraud', 'terrible', 'worst']),
            min_size=0,
            max_size=3
        ),
        clean_words=st.lists(
            st.sampled_from(['excellent', 'professional', 'amazing', 'wonderful', 'great']),
            min_size=1,
            max_size=3
        )
    )
    @settings(max_examples=10, deadline=None)
    def test_content_moderation_auto_verification(
        self, 
        db_session: Session, 
        inappropriate_words: list[str], 
        clean_words: list[str]
    ):
        """
        **Property 14: Review Verification**
        **Validates: Requirements 9.1, 9.2, 9.3**
        
        For any review comment, reviews containing inappropriate content should be 
        automatically flagged as unverified, while clean content should be auto-verified.
        """
        # Create test data
        couple_user, couple = self.create_test_couple(db_session, f"_mod_{len(inappropriate_words)}")
        vendor_user, vendor = self.create_test_vendor(db_session, f"_mod_{len(inappropriate_words)}")
        self.create_vendor_lead(db_session, vendor.id, couple.id, LeadStatus.CONVERTED)
        
        vendor_service = VendorService(db_session, enable_notifications=False)
        
        # Create comment with inappropriate and clean words
        all_words = inappropriate_words + clean_words
        comment = f"This service was {' and '.join(all_words)} for our wedding event."
        
        # Ensure comment meets minimum length requirement
        if len(comment) < 10:
            comment = comment + " Additional text to meet minimum length requirement."
        
        review = vendor_service.create_review(
            vendor_id=vendor.id,
            couple_id=couple.id,
            rating=3,
            comment=comment
        )
        
        # Check verification status based on content
        has_inappropriate = len(inappropriate_words) > 0
        if has_inappropriate:
            assert review.is_verified == False, f"Review with inappropriate words should be unverified: {comment}"
        else:
            assert review.is_verified == True, f"Review with clean content should be verified: {comment}"
    
    @pytest.mark.property
    @given(
        admin_verification=st.booleans(),
        reason=st.text(min_size=0, max_size=100)
    )
    @settings(max_examples=10, deadline=None)
    def test_admin_review_moderation(
        self, 
        db_session: Session, 
        admin_verification: bool, 
        reason: str
    ):
        """
        **Property 14: Review Verification**
        **Validates: Requirements 9.1, 9.2, 9.3**
        
        For any review moderation action by admin, the verification status should 
        be updated correctly and vendor rating should be recalculated.
        """
        # Create test data
        couple_user, couple = self.create_test_couple(db_session, f"_admin_{hash(reason) % 1000}")
        vendor_user, vendor = self.create_test_vendor(db_session, f"_admin_{hash(reason) % 1000}")
        self.create_vendor_lead(db_session, vendor.id, couple.id, LeadStatus.CONVERTED)
        
        # Create admin user
        admin_user = User(
            email=f"admin_{hash(reason) % 1000}@test.com",
            password_hash="hashed_password",
            user_type=UserType.ADMIN,
            auth_provider=AuthProvider.EMAIL,
            is_active=True
        )
        db_session.add(admin_user)
        db_session.commit()
        db_session.refresh(admin_user)
        
        vendor_service = VendorService(db_session, enable_notifications=False)
        
        # Create initial review (auto-verified)
        review = vendor_service.create_review(
            vendor_id=vendor.id,
            couple_id=couple.id,
            rating=4,
            comment="This is a clean review that should be auto-verified initially."
        )
        
        initial_verification = review.is_verified
        
        # Admin moderates the review
        moderated_review = vendor_service.moderate_review(
            review_id=review.id,
            admin_user_id=admin_user.id,
            is_verified=admin_verification,
            reason=reason if reason else None
        )
        
        # Verify moderation results
        assert moderated_review.is_verified == admin_verification
        assert moderated_review.id == review.id
        
        # If verification status changed, vendor rating should be updated
        if initial_verification != admin_verification:
            db_session.refresh(vendor)
            if admin_verification:
                # Review is now verified, should contribute to rating
                assert vendor.rating is not None
            # Note: If review becomes unverified and it was the only review,
            # rating might become None, but that's handled by the service
