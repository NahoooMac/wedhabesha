"""
Property-Based Tests for Rating Calculation Accuracy

Feature: wedding-platform
Property 15: Rating Calculation Accuracy
Validates: Requirements 9.5

Tests that vendor average ratings are calculated correctly from verified reviews only,
excluding any unverified or flagged content.
"""

import pytest
from hypothesis import given, strategies as st, assume, settings, HealthCheck
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy import create_engine
from sqlmodel import SQLModel
from fastapi import HTTPException
import tempfile
import os
from decimal import Decimal

from app.models.user import User, Couple, Vendor, UserType, AuthProvider, VendorCategory
from app.models.vendor import VendorLead, Review, LeadStatus
from app.services.vendor_service import VendorService


class TestRatingCalculationAccuracy:
    """Property-based tests for rating calculation accuracy"""
    
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
            is_verified=True,
            rating=None  # Will be calculated
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
        verified_ratings=st.lists(
            st.integers(min_value=1, max_value=5),
            min_size=1,
            max_size=10
        ),
        unverified_ratings=st.lists(
            st.integers(min_value=1, max_value=5),
            min_size=0,
            max_size=5
        )
    )
    @settings(
        max_examples=10, 
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_average_rating_calculation_from_verified_reviews_only(
        self, 
        verified_ratings: list[int], 
        unverified_ratings: list[int]
    ):
        """
        **Property 15: Rating Calculation Accuracy**
        **Validates: Requirements 9.5**
        
        For any vendor with verified and unverified reviews, the displayed average rating 
        should be calculated correctly from verified reviews only, excluding any 
        unverified or flagged content.
        """
        # Create test database session
        db_session, db_fd, db_path = self.get_test_db_session()
        
        try:
            # Create test vendor
            vendor_user, vendor = self.create_test_vendor(db_session, f"_{len(verified_ratings)}_{len(unverified_ratings)}")
            
            vendor_service = VendorService(db_session, enable_notifications=False)
            
            # Create verified reviews
            for i, rating in enumerate(verified_ratings):
                couple_user, couple = self.create_test_couple(db_session, f"_verified_{i}_{rating}")
                self.create_vendor_lead(db_session, vendor.id, couple.id, LeadStatus.CONVERTED)
                
                review = Review(
                    vendor_id=vendor.id,
                    couple_id=couple.id,
                    rating=rating,
                    comment=f"Great service verified review {i}",
                    is_verified=True
                )
                db_session.add(review)
            
            # Create unverified reviews
            for i, rating in enumerate(unverified_ratings):
                couple_user, couple = self.create_test_couple(db_session, f"_unverified_{i}_{rating}")
                self.create_vendor_lead(db_session, vendor.id, couple.id, LeadStatus.CONVERTED)
                
                review = Review(
                    vendor_id=vendor.id,
                    couple_id=couple.id,
                    rating=rating,
                    comment=f"Spam content unverified review {i}",
                    is_verified=False
                )
                db_session.add(review)
            
            db_session.commit()
            
            # Calculate expected average from verified reviews only
            expected_average = sum(verified_ratings) / len(verified_ratings)
            
            # Test the rating calculation service method
            calculated_rating = vendor_service.calculate_vendor_rating(vendor.id)
            
            # Verify the calculation is correct
            assert calculated_rating is not None
            assert abs(calculated_rating - expected_average) < 0.001, (
                f"Expected average {expected_average}, got {calculated_rating}. "
                f"Verified ratings: {verified_ratings}, Unverified ratings: {unverified_ratings}"
            )
            
            # Test that vendor rating is updated correctly
            vendor_service.update_vendor_rating(vendor.id)
            db_session.refresh(vendor)
            
            assert vendor.rating is not None
            assert abs(vendor.rating - expected_average) < 0.001, (
                f"Vendor cached rating {vendor.rating} doesn't match expected {expected_average}"
            )
            
            # Test the rating breakdown endpoint data
            breakdown = vendor_service.get_vendor_rating_breakdown(vendor.id)
            
            assert breakdown["total_reviews"] == len(verified_ratings)
            assert breakdown["average_rating"] is not None
            assert abs(breakdown["average_rating"] - expected_average) < 0.01  # Rounded to 2 decimal places
            
            # Verify rating distribution
            rating_distribution = breakdown["rating_distribution"]
            for rating in range(1, 6):
                expected_count = verified_ratings.count(rating)
                assert rating_distribution[rating] == expected_count, (
                    f"Rating {rating} count mismatch: expected {expected_count}, got {rating_distribution[rating]}"
                )
        
        finally:
            self.cleanup_test_db(db_session, db_fd, db_path)
    
    @pytest.mark.property
    @given(
        initial_ratings=st.lists(
            st.integers(min_value=1, max_value=5),
            min_size=2,
            max_size=5
        ),
        moderation_actions=st.lists(
            st.booleans(),  # True = verify, False = unverify
            min_size=1,
            max_size=3
        )
    )
    @settings(
        max_examples=10, 
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_rating_recalculation_after_moderation(
        self, 
        initial_ratings: list[int], 
        moderation_actions: list[bool]
    ):
        """
        **Property 15: Rating Calculation Accuracy**
        **Validates: Requirements 9.5**
        
        For any vendor rating after admin moderation actions, the average rating 
        should be recalculated correctly based on the new verification status of reviews.
        """
        assume(len(moderation_actions) <= len(initial_ratings))
        
        # Create test database session
        db_session, db_fd, db_path = self.get_test_db_session()
        
        try:
            # Create test vendor and admin
            vendor_user, vendor = self.create_test_vendor(db_session, f"_mod_{len(initial_ratings)}")
            
            admin_user = User(
                email=f"admin_mod_{len(initial_ratings)}@test.com",
                password_hash="hashed_password",
                user_type=UserType.ADMIN,
                auth_provider=AuthProvider.EMAIL,
                is_active=True
            )
            db_session.add(admin_user)
            db_session.commit()
            db_session.refresh(admin_user)
            
            vendor_service = VendorService(db_session, enable_notifications=False)
            
            # Create initial reviews (all verified)
            reviews = []
            for i, rating in enumerate(initial_ratings):
                couple_user, couple = self.create_test_couple(db_session, f"_mod_{i}_{rating}")
                self.create_vendor_lead(db_session, vendor.id, couple.id, LeadStatus.CONVERTED)
                
                review = Review(
                    vendor_id=vendor.id,
                    couple_id=couple.id,
                    rating=rating,
                    comment=f"Initial review {i}",
                    is_verified=True
                )
                db_session.add(review)
                reviews.append(review)
            
            db_session.commit()
            
            # Calculate initial average
            initial_average = sum(initial_ratings) / len(initial_ratings)
            calculated_initial = vendor_service.calculate_vendor_rating(vendor.id)
            assert abs(calculated_initial - initial_average) < 0.001
            
            # Apply moderation actions
            final_verified_ratings = []
            for i, should_verify in enumerate(moderation_actions):
                if i < len(reviews):
                    # Moderate the review
                    vendor_service.moderate_review(
                        review_id=reviews[i].id,
                        admin_user_id=admin_user.id,
                        is_verified=should_verify,
                        reason=f"Moderation action {i}"
                    )
                    
                    # Track which ratings should be included in final calculation
                    if should_verify:
                        final_verified_ratings.append(initial_ratings[i])
            
            # Add remaining unmoderated reviews (still verified)
            for i in range(len(moderation_actions), len(initial_ratings)):
                final_verified_ratings.append(initial_ratings[i])
            
            # Calculate expected final average
            if final_verified_ratings:
                expected_final_average = sum(final_verified_ratings) / len(final_verified_ratings)
            else:
                expected_final_average = None
            
            # Test final rating calculation
            calculated_final = vendor_service.calculate_vendor_rating(vendor.id)
            
            if expected_final_average is None:
                assert calculated_final is None
            else:
                assert calculated_final is not None
                assert abs(calculated_final - expected_final_average) < 0.001, (
                    f"Expected final average {expected_final_average}, got {calculated_final}. "
                    f"Final verified ratings: {final_verified_ratings}"
                )
            
            # Verify vendor cached rating is updated
            db_session.refresh(vendor)
            if expected_final_average is None:
                assert vendor.rating is None
            else:
                assert vendor.rating is not None
                assert abs(vendor.rating - expected_final_average) < 0.001
        
        finally:
            self.cleanup_test_db(db_session, db_fd, db_path)
    
    @pytest.mark.property
    @given(
        ratings=st.lists(
            st.integers(min_value=1, max_value=5),
            min_size=0,
            max_size=10
        )
    )
    @settings(
        max_examples=10, 
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_rating_calculation_with_no_verified_reviews(self, ratings: list[int]):
        """
        **Property 15: Rating Calculation Accuracy**
        **Validates: Requirements 9.5**
        
        For any vendor with no verified reviews (only unverified or no reviews), 
        the average rating should be None/null.
        """
        # Create test database session
        db_session, db_fd, db_path = self.get_test_db_session()
        
        try:
            # Create test vendor
            vendor_user, vendor = self.create_test_vendor(db_session, f"_none_{len(ratings)}")
            
            vendor_service = VendorService(db_session, enable_notifications=False)
            
            # Create unverified reviews only
            for i, rating in enumerate(ratings):
                couple_user, couple = self.create_test_couple(db_session, f"_none_{i}_{rating}")
                self.create_vendor_lead(db_session, vendor.id, couple.id, LeadStatus.CONVERTED)
                
                review = Review(
                    vendor_id=vendor.id,
                    couple_id=couple.id,
                    rating=rating,
                    comment=f"Unverified review {i}",
                    is_verified=False
                )
                db_session.add(review)
            
            db_session.commit()
            
            # Test rating calculation
            calculated_rating = vendor_service.calculate_vendor_rating(vendor.id)
            assert calculated_rating is None, (
                f"Expected None rating for vendor with no verified reviews, got {calculated_rating}"
            )
            
            # Test vendor rating update
            vendor_service.update_vendor_rating(vendor.id)
            db_session.refresh(vendor)
            assert vendor.rating is None
            
            # Test rating breakdown
            breakdown = vendor_service.get_vendor_rating_breakdown(vendor.id)
            assert breakdown["total_reviews"] == 0  # Only verified reviews counted
            assert breakdown["average_rating"] is None
            
            # All rating distribution should be zero
            for rating in range(1, 6):
                assert breakdown["rating_distribution"][rating] == 0
        
        finally:
            self.cleanup_test_db(db_session, db_fd, db_path)
    
    @pytest.mark.property
    @given(
        ratings=st.lists(
            st.integers(min_value=1, max_value=5),
            min_size=1,
            max_size=20
        )
    )
    @settings(
        max_examples=10, 
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_rating_precision_and_rounding(self, ratings: list[int]):
        """
        **Property 15: Rating Calculation Accuracy**
        **Validates: Requirements 9.5**
        
        For any set of verified ratings, the calculated average should maintain 
        proper precision and be rounded correctly for display purposes.
        """
        # Create test database session
        db_session, db_fd, db_path = self.get_test_db_session()
        
        try:
            # Create test vendor
            vendor_user, vendor = self.create_test_vendor(db_session, f"_precision_{len(ratings)}")
            
            vendor_service = VendorService(db_session, enable_notifications=False)
            
            # Create verified reviews
            for i, rating in enumerate(ratings):
                couple_user, couple = self.create_test_couple(db_session, f"_precision_{i}_{rating}")
                self.create_vendor_lead(db_session, vendor.id, couple.id, LeadStatus.CONVERTED)
                
                review = Review(
                    vendor_id=vendor.id,
                    couple_id=couple.id,
                    rating=rating,
                    comment=f"Precision test review {i}",
                    is_verified=True
                )
                db_session.add(review)
            
            db_session.commit()
            
            # Calculate expected values
            expected_average = sum(ratings) / len(ratings)
            expected_rounded = round(expected_average, 2)
            
            # Test service method precision
            calculated_rating = vendor_service.calculate_vendor_rating(vendor.id)
            assert calculated_rating is not None
            assert abs(calculated_rating - expected_average) < 0.001
            
            # Test breakdown display rounding
            breakdown = vendor_service.get_vendor_rating_breakdown(vendor.id)
            assert breakdown["average_rating"] == expected_rounded
            
            # Test that the rating is a valid float between 1.0 and 5.0
            assert 1.0 <= breakdown["average_rating"] <= 5.0
            
            # Test that the rating has at most 2 decimal places
            rating_str = str(breakdown["average_rating"])
            if '.' in rating_str:
                decimal_places = len(rating_str.split('.')[1])
                assert decimal_places <= 2, f"Rating {breakdown['average_rating']} has more than 2 decimal places"
        
        finally:
            self.cleanup_test_db(db_session, db_fd, db_path)
    
    @pytest.mark.property
    @given(
        vendor_count=st.integers(min_value=2, max_value=5),
        ratings_per_vendor=st.lists(
            st.lists(st.integers(min_value=1, max_value=5), min_size=1, max_size=5),
            min_size=2,
            max_size=5
        )
    )
    @settings(
        max_examples=10, 
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_rating_isolation_between_vendors(
        self, 
        vendor_count: int, 
        ratings_per_vendor: list[list[int]]
    ):
        """
        **Property 15: Rating Calculation Accuracy**
        **Validates: Requirements 9.5**
        
        For any multiple vendors with their own reviews, each vendor's rating 
        calculation should be isolated and not affected by other vendors' reviews.
        """
        assume(len(ratings_per_vendor) >= vendor_count)
        
        # Create test database session
        db_session, db_fd, db_path = self.get_test_db_session()
        
        try:
            vendor_service = VendorService(db_session, enable_notifications=False)
            vendors = []
            expected_ratings = []
            
            # Create vendors and their reviews
            for v in range(vendor_count):
                vendor_user, vendor = self.create_test_vendor(db_session, f"_isolation_{v}")
                vendors.append(vendor)
                
                vendor_ratings = ratings_per_vendor[v]
                expected_average = sum(vendor_ratings) / len(vendor_ratings)
                expected_ratings.append(expected_average)
                
                # Create reviews for this vendor
                for i, rating in enumerate(vendor_ratings):
                    couple_user, couple = self.create_test_couple(db_session, f"_isolation_{v}_{i}_{rating}")
                    self.create_vendor_lead(db_session, vendor.id, couple.id, LeadStatus.CONVERTED)
                    
                    review = Review(
                        vendor_id=vendor.id,
                        couple_id=couple.id,
                        rating=rating,
                        comment=f"Review for vendor {v}, rating {rating}",
                        is_verified=True
                    )
                    db_session.add(review)
            
            db_session.commit()
            
            # Test that each vendor's rating is calculated independently
            for v in range(vendor_count):
                calculated_rating = vendor_service.calculate_vendor_rating(vendors[v].id)
                expected_rating = expected_ratings[v]
                
                assert calculated_rating is not None
                assert abs(calculated_rating - expected_rating) < 0.001, (
                    f"Vendor {v} rating mismatch: expected {expected_rating}, got {calculated_rating}"
                )
                
                # Test breakdown isolation
                breakdown = vendor_service.get_vendor_rating_breakdown(vendors[v].id)
                assert breakdown["total_reviews"] == len(ratings_per_vendor[v])
                assert abs(breakdown["average_rating"] - expected_rating) < 0.01
                
                # Verify rating distribution is correct for this vendor only
                vendor_ratings = ratings_per_vendor[v]
                for rating in range(1, 6):
                    expected_count = vendor_ratings.count(rating)
                    assert breakdown["rating_distribution"][rating] == expected_count
        
        finally:
            self.cleanup_test_db(db_session, db_fd, db_path)
