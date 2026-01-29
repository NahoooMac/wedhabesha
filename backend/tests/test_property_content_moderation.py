"""
Property-Based Tests for Content Moderation

Feature: wedding-platform
Property 16: Content Moderation
Validates: Requirements 9.4

Tests that reviews or profile content containing inappropriate material
are flagged for administrative review and excluded from public display.
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


class TestContentModeration:
    """Property-based tests for content moderation system"""
    
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
        inappropriate_words=st.lists(
            st.sampled_from([
                'spam', 'fake', 'scam', 'fraud', 'terrible', 'worst', 'hate',
                'awful', 'horrible', 'disgusting', 'pathetic', 'useless'
            ]),
            min_size=1,
            max_size=3
        ),
        clean_words=st.lists(
            st.sampled_from([
                'excellent', 'professional', 'amazing', 'wonderful', 'great',
                'outstanding', 'fantastic', 'superb', 'brilliant', 'perfect'
            ]),
            min_size=0,
            max_size=3
        ),
        rating=st.integers(min_value=1, max_value=5)
    )
    @settings(
        max_examples=10, 
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_inappropriate_content_automatic_flagging(
        self, 
        inappropriate_words: list[str], 
        clean_words: list[str],
        rating: int
    ):
        """
        **Property 16: Content Moderation**
        **Validates: Requirements 9.4**
        
        For any review or profile content containing inappropriate material,
        the system should automatically flag it as unverified and exclude it 
        from public display until administrative review.
        """
        # Create test database session
        db_session, db_fd, db_path = self.get_test_db_session()
        
        try:
            # Create test data
            couple_user, couple = self.create_test_couple(db_session, f"_{hash(str(inappropriate_words)) % 1000}")
            vendor_user, vendor = self.create_test_vendor(db_session, f"_{hash(str(inappropriate_words)) % 1000}")
            self.create_vendor_lead(db_session, vendor.id, couple.id, LeadStatus.CONVERTED)
            
            vendor_service = VendorService(db_session, enable_notifications=False)
            
            # Create comment with inappropriate and clean words
            all_words = inappropriate_words + clean_words
            comment = f"This service was {' and '.join(all_words)} for our wedding event."
            
            # Ensure comment meets minimum length requirement
            if len(comment) < 10:
                comment = comment + " Additional text to meet minimum length requirement for testing purposes."
            
            # Create review
            review = vendor_service.create_review(
                vendor_id=vendor.id,
                couple_id=couple.id,
                rating=rating,
                comment=comment
            )
            
            # Verify automatic flagging
            assert review.is_verified == False, (
                f"Review with inappropriate words should be automatically flagged as unverified: {comment}"
            )
            
            # Verify the review is excluded from public display (verified_only=True)
            public_reviews = vendor_service.get_vendor_reviews(
                vendor_id=vendor.id,
                verified_only=True,
                skip=0,
                limit=20
            )
            
            assert len(public_reviews["reviews"]) == 0, (
                "Flagged review should not appear in public verified reviews"
            )
            assert public_reviews["total"] == 0
            
            # Verify the review appears in admin view (verified_only=False)
            admin_reviews = vendor_service.get_vendor_reviews(
                vendor_id=vendor.id,
                verified_only=False,
                skip=0,
                limit=20
            )
            
            assert len(admin_reviews["reviews"]) == 1, (
                "Flagged review should appear in admin view"
            )
            assert admin_reviews["reviews"][0].is_verified == False
            
            # Verify vendor rating is not affected by flagged review
            vendor_rating = vendor_service.calculate_vendor_rating(vendor.id)
            assert vendor_rating is None, (
                "Vendor rating should not be affected by unverified reviews"
            )
        
        finally:
            self.cleanup_test_db(db_session, db_fd, db_path)
    
    @pytest.mark.property
    @given(
        clean_words=st.lists(
            st.sampled_from([
                'excellent', 'professional', 'amazing', 'wonderful', 'great',
                'outstanding', 'fantastic', 'superb', 'brilliant', 'perfect',
                'helpful', 'courteous', 'timely', 'creative', 'skilled'
            ]),
            min_size=1,
            max_size=5
        ),
        rating=st.integers(min_value=1, max_value=5)
    )
    @settings(
        max_examples=10, 
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_clean_content_automatic_approval(
        self, 
        clean_words: list[str],
        rating: int
    ):
        """
        **Property 16: Content Moderation**
        **Validates: Requirements 9.4**
        
        For any review or profile content containing only appropriate material,
        the system should automatically approve it for public display.
        """
        # Create test database session
        db_session, db_fd, db_path = self.get_test_db_session()
        
        try:
            # Create test data
            couple_user, couple = self.create_test_couple(db_session, f"_clean_{hash(str(clean_words)) % 1000}")
            vendor_user, vendor = self.create_test_vendor(db_session, f"_clean_{hash(str(clean_words)) % 1000}")
            self.create_vendor_lead(db_session, vendor.id, couple.id, LeadStatus.CONVERTED)
            
            vendor_service = VendorService(db_session, enable_notifications=False)
            
            # Create comment with only clean words
            comment = f"This service was {' and '.join(clean_words)} for our wedding event. Highly recommended!"
            
            # Ensure comment meets minimum length requirement
            if len(comment) < 10:
                comment = comment + " Additional positive feedback about the excellent service provided."
            
            # Create review
            review = vendor_service.create_review(
                vendor_id=vendor.id,
                couple_id=couple.id,
                rating=rating,
                comment=comment
            )
            
            # Verify automatic approval
            assert review.is_verified == True, (
                f"Review with clean content should be automatically approved: {comment}"
            )
            
            # Verify the review appears in public display
            public_reviews = vendor_service.get_vendor_reviews(
                vendor_id=vendor.id,
                verified_only=True,
                skip=0,
                limit=20
            )
            
            assert len(public_reviews["reviews"]) == 1, (
                "Approved review should appear in public verified reviews"
            )
            assert public_reviews["reviews"][0].is_verified == True
            assert public_reviews["total"] == 1
            
            # Verify vendor rating is affected by approved review
            vendor_rating = vendor_service.calculate_vendor_rating(vendor.id)
            assert vendor_rating is not None, (
                "Vendor rating should be calculated from verified reviews"
            )
            assert vendor_rating == rating, (
                f"Vendor rating should equal the single review rating: expected {rating}, got {vendor_rating}"
            )
        
        finally:
            self.cleanup_test_db(db_session, db_fd, db_path)
    
    @pytest.mark.property
    @given(
        initial_verification=st.booleans(),
        admin_decision=st.booleans(),
        moderation_reason=st.text(min_size=0, max_size=200)
    )
    @settings(
        max_examples=10, 
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_admin_moderation_override(
        self, 
        initial_verification: bool,
        admin_decision: bool,
        moderation_reason: str
    ):
        """
        **Property 16: Content Moderation**
        **Validates: Requirements 9.4**
        
        For any review flagged by automatic moderation, administrators should be able 
        to override the decision and manually approve or reject content.
        """
        # Create test database session
        db_session, db_fd, db_path = self.get_test_db_session()
        
        try:
            # Create test data
            couple_user, couple = self.create_test_couple(db_session, f"_admin_{hash(moderation_reason) % 1000}")
            vendor_user, vendor = self.create_test_vendor(db_session, f"_admin_{hash(moderation_reason) % 1000}")
            self.create_vendor_lead(db_session, vendor.id, couple.id, LeadStatus.CONVERTED)
            
            # Create admin user
            admin_user = User(
                email=f"admin_{hash(moderation_reason) % 1000}@test.com",
                password_hash="hashed_password",
                user_type=UserType.ADMIN,
                auth_provider=AuthProvider.EMAIL,
                is_active=True
            )
            db_session.add(admin_user)
            db_session.commit()
            db_session.refresh(admin_user)
            
            vendor_service = VendorService(db_session, enable_notifications=False)
            
            # Create review with predetermined verification status
            comment = "This is a test review for admin moderation testing purposes."
            if not initial_verification:
                # Add inappropriate word to trigger auto-flagging
                comment = "This service was spam and not good for our wedding event."
            
            review = Review(
                vendor_id=vendor.id,
                couple_id=couple.id,
                rating=3,
                comment=comment,
                is_verified=initial_verification
            )
            db_session.add(review)
            db_session.commit()
            db_session.refresh(review)
            
            # Admin moderates the review
            moderated_review = vendor_service.moderate_review(
                review_id=review.id,
                admin_user_id=admin_user.id,
                is_verified=admin_decision,
                reason=moderation_reason if moderation_reason else None
            )
            
            # Verify admin override worked
            assert moderated_review.is_verified == admin_decision, (
                f"Admin moderation should override automatic decision: expected {admin_decision}, got {moderated_review.is_verified}"
            )
            
            # Verify public display reflects admin decision
            public_reviews = vendor_service.get_vendor_reviews(
                vendor_id=vendor.id,
                verified_only=True,
                skip=0,
                limit=20
            )
            
            if admin_decision:
                assert len(public_reviews["reviews"]) == 1, (
                    "Admin-approved review should appear in public display"
                )
                assert public_reviews["reviews"][0].is_verified == True
            else:
                assert len(public_reviews["reviews"]) == 0, (
                    "Admin-rejected review should not appear in public display"
                )
            
            # Verify vendor rating reflects admin decision
            vendor_rating = vendor_service.calculate_vendor_rating(vendor.id)
            if admin_decision:
                assert vendor_rating is not None, (
                    "Vendor rating should include admin-approved review"
                )
                assert vendor_rating == 3.0  # The rating we set
            else:
                assert vendor_rating is None, (
                    "Vendor rating should not include admin-rejected review"
                )
        
        finally:
            self.cleanup_test_db(db_session, db_fd, db_path)
    
    @pytest.mark.property
    @given(
        num_clean_reviews=st.integers(min_value=1, max_value=5),
        num_flagged_reviews=st.integers(min_value=1, max_value=5),
        admin_approvals=st.lists(st.booleans(), min_size=1, max_size=5)
    )
    @settings(
        max_examples=10, 
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_mixed_content_moderation_impact(
        self, 
        num_clean_reviews: int,
        num_flagged_reviews: int,
        admin_approvals: list[bool]
    ):
        """
        **Property 16: Content Moderation**
        **Validates: Requirements 9.4**
        
        For any vendor with a mix of clean, flagged, and admin-moderated reviews,
        only verified reviews should contribute to public rating and display.
        """
        assume(len(admin_approvals) >= num_flagged_reviews)
        
        # Create test database session
        db_session, db_fd, db_path = self.get_test_db_session()
        
        try:
            # Create test vendor
            vendor_user, vendor = self.create_test_vendor(db_session, f"_mixed_{num_clean_reviews}_{num_flagged_reviews}")
            
            # Create admin user
            admin_user = User(
                email=f"admin_mixed_{num_clean_reviews}_{num_flagged_reviews}@test.com",
                password_hash="hashed_password",
                user_type=UserType.ADMIN,
                auth_provider=AuthProvider.EMAIL,
                is_active=True
            )
            db_session.add(admin_user)
            db_session.commit()
            db_session.refresh(admin_user)
            
            vendor_service = VendorService(db_session, enable_notifications=False)
            
            expected_verified_count = 0
            expected_rating_sum = 0
            
            # Create clean reviews (auto-approved)
            for i in range(num_clean_reviews):
                couple_user, couple = self.create_test_couple(db_session, f"_clean_{i}_{num_clean_reviews}")
                self.create_vendor_lead(db_session, vendor.id, couple.id, LeadStatus.CONVERTED)
                
                rating = 4 + (i % 2)  # Alternate between 4 and 5
                review = Review(
                    vendor_id=vendor.id,
                    couple_id=couple.id,
                    rating=rating,
                    comment=f"Excellent service for clean review {i}",
                    is_verified=True
                )
                db_session.add(review)
                expected_verified_count += 1
                expected_rating_sum += rating
            
            # Create flagged reviews and apply admin decisions
            flagged_reviews = []
            for i in range(num_flagged_reviews):
                couple_user, couple = self.create_test_couple(db_session, f"_flagged_{i}_{num_flagged_reviews}")
                self.create_vendor_lead(db_session, vendor.id, couple.id, LeadStatus.CONVERTED)
                
                rating = 2 + (i % 2)  # Alternate between 2 and 3
                review = Review(
                    vendor_id=vendor.id,
                    couple_id=couple.id,
                    rating=rating,
                    comment=f"This service was spam and terrible for flagged review {i}",
                    is_verified=False  # Auto-flagged
                )
                db_session.add(review)
                flagged_reviews.append((review, rating))
            
            db_session.commit()
            
            # Apply admin moderation decisions
            for i, (review, rating) in enumerate(flagged_reviews):
                admin_decision = admin_approvals[i]
                vendor_service.moderate_review(
                    review_id=review.id,
                    admin_user_id=admin_user.id,
                    is_verified=admin_decision,
                    reason=f"Admin decision {i}"
                )
                
                if admin_decision:
                    expected_verified_count += 1
                    expected_rating_sum += rating
            
            # Calculate expected average
            expected_average = expected_rating_sum / expected_verified_count if expected_verified_count > 0 else None
            
            # Test public review display
            public_reviews = vendor_service.get_vendor_reviews(
                vendor_id=vendor.id,
                verified_only=True,
                skip=0,
                limit=50
            )
            
            assert len(public_reviews["reviews"]) == expected_verified_count, (
                f"Expected {expected_verified_count} verified reviews, got {len(public_reviews['reviews'])}"
            )
            assert public_reviews["total"] == expected_verified_count
            
            # Verify all returned reviews are verified
            for review in public_reviews["reviews"]:
                assert review.is_verified == True, "All public reviews should be verified"
            
            # Test rating calculation
            calculated_rating = vendor_service.calculate_vendor_rating(vendor.id)
            if expected_average is None:
                assert calculated_rating is None
            else:
                assert calculated_rating is not None
                assert abs(calculated_rating - expected_average) < 0.001, (
                    f"Expected rating {expected_average}, got {calculated_rating}"
                )
            
            # Test admin view includes all reviews
            admin_reviews = vendor_service.get_vendor_reviews(
                vendor_id=vendor.id,
                verified_only=False,
                skip=0,
                limit=50
            )
            
            total_reviews = num_clean_reviews + num_flagged_reviews
            assert len(admin_reviews["reviews"]) == total_reviews, (
                f"Admin view should show all {total_reviews} reviews"
            )
            assert admin_reviews["total"] == total_reviews
        
        finally:
            self.cleanup_test_db(db_session, db_fd, db_path)
    
    @pytest.mark.property
    @given(
        content_variations=st.lists(
            st.tuples(
                st.text(min_size=10, max_size=100),
                st.booleans()  # True = contains inappropriate content
            ),
            min_size=1,
            max_size=10
        )
    )
    @settings(
        max_examples=10, 
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_content_detection_consistency(self, content_variations: list[tuple[str, bool]]):
        """
        **Property 16: Content Moderation**
        **Validates: Requirements 9.4**
        
        For any content, the inappropriate content detection should be consistent
        and deterministic across multiple evaluations.
        """
        # Create test database session
        db_session, db_fd, db_path = self.get_test_db_session()
        
        try:
            vendor_service = VendorService(db_session, enable_notifications=False)
            
            for i, (base_content, should_be_inappropriate) in enumerate(content_variations):
                # Modify content based on expectation
                if should_be_inappropriate:
                    content = f"{base_content} This service was spam and fake."
                else:
                    content = f"{base_content} This service was excellent and professional."
                
                # Test detection multiple times for consistency
                results = []
                for _ in range(3):  # Test 3 times
                    is_inappropriate = vendor_service._contains_inappropriate_content(content)
                    results.append(is_inappropriate)
                
                # All results should be the same (consistent)
                assert all(r == results[0] for r in results), (
                    f"Content detection should be consistent for: {content[:50]}..."
                )
                
                # Result should match expectation
                expected_result = should_be_inappropriate
                assert results[0] == expected_result, (
                    f"Content detection mismatch for: {content[:50]}... "
                    f"Expected {expected_result}, got {results[0]}"
                )
        
        finally:
            self.cleanup_test_db(db_session, db_fd, db_path)
    
    @pytest.mark.property
    @given(
        review_count=st.integers(min_value=1, max_value=10),
        inappropriate_ratio=st.floats(min_value=0.0, max_value=1.0)
    )
    @settings(
        max_examples=10, 
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_moderation_impact_on_vendor_metrics(
        self, 
        review_count: int,
        inappropriate_ratio: float
    ):
        """
        **Property 16: Content Moderation**
        **Validates: Requirements 9.4**
        
        For any vendor with reviews containing varying levels of inappropriate content,
        the vendor's public metrics should only reflect verified (appropriate) reviews.
        """
        # Create test database session
        db_session, db_fd, db_path = self.get_test_db_session()
        
        try:
            # Create test vendor
            vendor_user, vendor = self.create_test_vendor(db_session, f"_metrics_{review_count}_{int(inappropriate_ratio * 100)}")
            
            vendor_service = VendorService(db_session, enable_notifications=False)
            
            inappropriate_count = int(review_count * inappropriate_ratio)
            appropriate_count = review_count - inappropriate_count
            
            appropriate_ratings = []
            
            # Create appropriate reviews
            for i in range(appropriate_count):
                couple_user, couple = self.create_test_couple(db_session, f"_appropriate_{i}")
                self.create_vendor_lead(db_session, vendor.id, couple.id, LeadStatus.CONVERTED)
                
                rating = 4 + (i % 2)  # 4 or 5
                review = Review(
                    vendor_id=vendor.id,
                    couple_id=couple.id,
                    rating=rating,
                    comment=f"Excellent and professional service {i}",
                    is_verified=True
                )
                db_session.add(review)
                appropriate_ratings.append(rating)
            
            # Create inappropriate reviews
            for i in range(inappropriate_count):
                couple_user, couple = self.create_test_couple(db_session, f"_inappropriate_{i}")
                self.create_vendor_lead(db_session, vendor.id, couple.id, LeadStatus.CONVERTED)
                
                rating = 1 + (i % 2)  # 1 or 2
                review = Review(
                    vendor_id=vendor.id,
                    couple_id=couple.id,
                    rating=rating,
                    comment=f"This service was spam and fake {i}",
                    is_verified=False  # Auto-flagged
                )
                db_session.add(review)
            
            db_session.commit()
            
            # Test public metrics
            public_reviews = vendor_service.get_vendor_reviews(
                vendor_id=vendor.id,
                verified_only=True,
                skip=0,
                limit=50
            )
            
            # Should only show appropriate reviews
            assert len(public_reviews["reviews"]) == appropriate_count
            assert public_reviews["total"] == appropriate_count
            
            # Test rating calculation
            if appropriate_count > 0:
                expected_average = sum(appropriate_ratings) / len(appropriate_ratings)
                assert public_reviews["average_rating"] is not None
                assert abs(public_reviews["average_rating"] - expected_average) < 0.01
                
                # Test vendor cached rating
                vendor_rating = vendor_service.calculate_vendor_rating(vendor.id)
                assert vendor_rating is not None
                assert abs(vendor_rating - expected_average) < 0.001
            else:
                assert public_reviews["average_rating"] is None
                
                vendor_rating = vendor_service.calculate_vendor_rating(vendor.id)
                assert vendor_rating is None
            
            # Test rating breakdown
            breakdown = vendor_service.get_vendor_rating_breakdown(vendor.id)
            assert breakdown["total_reviews"] == appropriate_count
            
            if appropriate_count > 0:
                expected_average = sum(appropriate_ratings) / len(appropriate_ratings)
                assert abs(breakdown["average_rating"] - expected_average) < 0.01
                
                # Verify rating distribution only includes appropriate reviews
                for rating in range(1, 6):
                    expected_count = appropriate_ratings.count(rating)
                    assert breakdown["rating_distribution"][rating] == expected_count
            else:
                assert breakdown["average_rating"] is None
                for rating in range(1, 6):
                    assert breakdown["rating_distribution"][rating] == 0
            
            # Test admin view shows all reviews
            admin_reviews = vendor_service.get_vendor_reviews(
                vendor_id=vendor.id,
                verified_only=False,
                skip=0,
                limit=50
            )
            
            assert len(admin_reviews["reviews"]) == review_count
            assert admin_reviews["total"] == review_count
        
        finally:
            self.cleanup_test_db(db_session, db_fd, db_path)
