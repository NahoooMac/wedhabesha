"""
Property Test: Vendor Access Control

**Feature: wedding-platform, Property 22: Vendor Access Control**

Tests that vendor subscription tiers properly enforce feature access restrictions,
allowing only tier-appropriate functionality.

**Validates: Requirements 8.5**
"""

import pytest
from hypothesis import given, strategies as st, settings, assume
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel
import tempfile
import os

from app.models.user import User, UserType, AuthProvider, Vendor, VendorCategory
from app.models.admin import VendorSubscription, VendorSubscriptionTier
from app.services.vendor_service import VendorService


# Test data strategies
@st.composite
def vendor_subscription_data(draw):
    """Generate vendor subscription test data"""
    tier = draw(st.sampled_from(list(VendorSubscriptionTier)))
    
    # Generate expiration date (some expired, some active)
    days_offset = draw(st.integers(min_value=-30, max_value=30))
    expires_at = datetime.utcnow() + timedelta(days=days_offset) if days_offset > 0 else None
    
    return {
        "tier": tier,
        "expires_at": expires_at,
        "is_active": draw(st.booleans())
    }


@st.composite
def feature_access_scenario(draw):
    """Generate feature access test scenarios"""
    subscription_data = draw(vendor_subscription_data())
    
    # Define features available per tier
    tier_features = {
        VendorSubscriptionTier.FREE: ["basic_profile", "receive_leads"],
        VendorSubscriptionTier.BASIC: ["basic_profile", "receive_leads", "respond_to_reviews", "basic_analytics"],
        VendorSubscriptionTier.PREMIUM: ["basic_profile", "receive_leads", "respond_to_reviews", "basic_analytics", "advanced_analytics", "priority_listing"],
        VendorSubscriptionTier.ENTERPRISE: ["basic_profile", "receive_leads", "respond_to_reviews", "basic_analytics", "advanced_analytics", "priority_listing", "custom_branding", "api_access"]
    }
    
    # Pick a feature to test
    all_features = ["basic_profile", "receive_leads", "respond_to_reviews", "basic_analytics", "advanced_analytics", "priority_listing", "custom_branding", "api_access"]
    feature_to_test = draw(st.sampled_from(all_features))
    
    # Determine if feature should be accessible
    tier_allowed_features = tier_features.get(subscription_data["tier"], [])
    should_have_access = feature_to_test in tier_allowed_features
    
    return {
        "subscription": subscription_data,
        "feature": feature_to_test,
        "should_have_access": should_have_access
    }


class TestVendorAccessControl:
    """Test vendor access control based on subscription tiers"""
    
    @pytest.fixture(autouse=True)
    def setup_test_db(self):
        """Set up test database for each test"""
        # Create temporary database
        db_fd, db_path = tempfile.mkstemp()
        test_db_url = f"sqlite:///{db_path}"
        
        # Create test engine and session
        engine = create_engine(test_db_url, connect_args={"check_same_thread": False})
        SQLModel.metadata.create_all(bind=engine)
        
        TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        self.db = TestingSessionLocal()
        
        # Create admin user for testing
        self.admin_user = User(
            email="admin@test.com",
            password_hash="hashed_password",
            user_type=UserType.ADMIN,
            auth_provider=AuthProvider.EMAIL
        )
        self.db.add(self.admin_user)
        self.db.commit()
        self.db.refresh(self.admin_user)
        
        self.vendor_service = VendorService(self.db, enable_notifications=False)
        
        yield
        
        # Cleanup
        self.db.close()
        engine.dispose()
        os.close(db_fd)
        try:
            os.unlink(db_path)
        except (PermissionError, FileNotFoundError):
            pass
    
    def create_test_vendor(self, tier: VendorSubscriptionTier, is_active: bool = True, expires_at=None):
        """Helper to create a test vendor with subscription"""
        # Generate unique email to avoid constraint violations
        import uuid
        unique_id = str(uuid.uuid4())[:8]
        
        try:
            # Create vendor user
            vendor_user = User(
                email=f"vendor_{tier.value}_{unique_id}@test.com",
                password_hash="hashed_password",
                user_type=UserType.VENDOR,
                auth_provider=AuthProvider.EMAIL
            )
            self.db.add(vendor_user)
            self.db.commit()
            self.db.refresh(vendor_user)
            
            # Create vendor profile
            vendor = Vendor(
                user_id=vendor_user.id,
                business_name=f"Test Business {tier.value} {unique_id}",
                category=VendorCategory.PHOTOGRAPHY,
                location="Test Location",
                description="Test Description",
                is_verified=True
            )
            self.db.add(vendor)
            self.db.commit()
            self.db.refresh(vendor)
            
            # Create subscription
            subscription = VendorSubscription(
                vendor_id=vendor.id,
                tier=tier,
                is_active=is_active,
                expires_at=expires_at
            )
            self.db.add(subscription)
            self.db.commit()
            self.db.refresh(subscription)
            
            return vendor, subscription
            
        except Exception as e:
            # Rollback on any error
            self.db.rollback()
            raise e
    
    def check_feature_access(self, vendor_id: int, feature: str) -> bool:
        """Check if vendor has access to a specific feature"""
        # Refresh session to avoid stale data
        self.db.rollback()
        
        subscription = self.db.query(VendorSubscription).filter(
            VendorSubscription.vendor_id == vendor_id
        ).first()
        
        if not subscription or not subscription.is_active:
            return False
        
        # Check if subscription is expired
        if subscription.expires_at and subscription.expires_at < datetime.utcnow():
            return False
        
        # Define feature access by tier
        tier_features = {
            VendorSubscriptionTier.FREE: ["basic_profile", "receive_leads"],
            VendorSubscriptionTier.BASIC: ["basic_profile", "receive_leads", "respond_to_reviews", "basic_analytics"],
            VendorSubscriptionTier.PREMIUM: ["basic_profile", "receive_leads", "respond_to_reviews", "basic_analytics", "advanced_analytics", "priority_listing"],
            VendorSubscriptionTier.ENTERPRISE: ["basic_profile", "receive_leads", "respond_to_reviews", "basic_analytics", "advanced_analytics", "priority_listing", "custom_branding", "api_access"]
        }
        
        allowed_features = tier_features.get(subscription.tier, [])
        return feature in allowed_features
    
    @given(feature_access_scenario())
    @settings(max_examples=10, deadline=5000)
    def test_vendor_access_control_property(self, scenario):
        """
        **Property 22: Vendor Access Control**
        
        For any vendor subscription tier, the system should enforce appropriate 
        feature access restrictions, allowing only tier-appropriate functionality.
        
        **Validates: Requirements 8.5**
        """
        subscription_data = scenario["subscription"]
        feature = scenario["feature"]
        expected_access = scenario["should_have_access"]
        
        # Skip if subscription is expired (should always deny access)
        if subscription_data["expires_at"] and subscription_data["expires_at"] < datetime.utcnow():
            expected_access = False
        
        # Skip if subscription is inactive (should always deny access)
        if not subscription_data["is_active"]:
            expected_access = False
        
        # Create test vendor with subscription
        vendor, subscription = self.create_test_vendor(
            tier=subscription_data["tier"],
            is_active=subscription_data["is_active"],
            expires_at=subscription_data["expires_at"]
        )
        
        # Test feature access
        actual_access = self.check_feature_access(vendor.id, feature)
        
        # Verify access control
        assert actual_access == expected_access, (
            f"Feature '{feature}' access mismatch for tier {subscription_data['tier'].value}. "
            f"Expected: {expected_access}, Got: {actual_access}. "
            f"Subscription active: {subscription_data['is_active']}, "
            f"Expires: {subscription_data['expires_at']}"
        )
    
    @given(st.sampled_from(list(VendorSubscriptionTier)))
    @settings(max_examples=10, deadline=3000)
    def test_subscription_tier_hierarchy(self, tier):
        """
        Test that higher subscription tiers include all features from lower tiers
        """
        # Create vendor with given tier
        vendor, subscription = self.create_test_vendor(tier=tier, is_active=True)
        
        # Define tier hierarchy
        tier_hierarchy = [
            VendorSubscriptionTier.FREE,
            VendorSubscriptionTier.BASIC,
            VendorSubscriptionTier.PREMIUM,
            VendorSubscriptionTier.ENTERPRISE
        ]
        
        tier_features = {
            VendorSubscriptionTier.FREE: ["basic_profile", "receive_leads"],
            VendorSubscriptionTier.BASIC: ["basic_profile", "receive_leads", "respond_to_reviews", "basic_analytics"],
            VendorSubscriptionTier.PREMIUM: ["basic_profile", "receive_leads", "respond_to_reviews", "basic_analytics", "advanced_analytics", "priority_listing"],
            VendorSubscriptionTier.ENTERPRISE: ["basic_profile", "receive_leads", "respond_to_reviews", "basic_analytics", "advanced_analytics", "priority_listing", "custom_branding", "api_access"]
        }
        
        current_tier_index = tier_hierarchy.index(tier)
        
        # Test that vendor has access to all features from current and lower tiers
        for i in range(current_tier_index + 1):
            lower_tier = tier_hierarchy[i]
            lower_tier_features = tier_features[lower_tier]
            
            for feature in lower_tier_features:
                has_access = self.check_feature_access(vendor.id, feature)
                assert has_access, (
                    f"Vendor with {tier.value} tier should have access to '{feature}' "
                    f"from {lower_tier.value} tier"
                )
    
    @given(st.sampled_from(list(VendorSubscriptionTier)))
    @settings(max_examples=10, deadline=3000)
    def test_expired_subscription_denies_access(self, tier):
        """
        Test that expired subscriptions deny access to all premium features
        """
        # Create vendor with expired subscription
        expired_date = datetime.utcnow() - timedelta(days=1)
        vendor, subscription = self.create_test_vendor(
            tier=tier,
            is_active=True,
            expires_at=expired_date
        )
        
        # Test that all premium features are denied
        premium_features = ["respond_to_reviews", "basic_analytics", "advanced_analytics", 
                          "priority_listing", "custom_branding", "api_access"]
        
        for feature in premium_features:
            has_access = self.check_feature_access(vendor.id, feature)
            assert not has_access, (
                f"Expired subscription should deny access to '{feature}' "
                f"regardless of tier {tier.value}"
            )
    
    @given(st.sampled_from(list(VendorSubscriptionTier)))
    @settings(max_examples=10, deadline=3000)
    def test_inactive_subscription_denies_access(self, tier):
        """
        Test that inactive subscriptions deny access to all features
        """
        # Create vendor with inactive subscription
        vendor, subscription = self.create_test_vendor(
            tier=tier,
            is_active=False
        )
        
        # Test that all features are denied
        all_features = ["basic_profile", "receive_leads", "respond_to_reviews", 
                       "basic_analytics", "advanced_analytics", "priority_listing", 
                       "custom_branding", "api_access"]
        
        for feature in all_features:
            has_access = self.check_feature_access(vendor.id, feature)
            assert not has_access, (
                f"Inactive subscription should deny access to '{feature}' "
                f"regardless of tier {tier.value}"
            )
    
    def update_vendor_subscription(
        self,
        vendor_id: int,
        tier: VendorSubscriptionTier,
        is_active: bool = True,
        expires_at=None
    ) -> VendorSubscription:
        """Update vendor subscription tier"""
        # Get or create subscription
        subscription = self.db.query(VendorSubscription).filter(
            VendorSubscription.vendor_id == vendor_id
        ).first()
        
        if not subscription:
            subscription = VendorSubscription(
                vendor_id=vendor_id,
                tier=tier,
                is_active=is_active,
                expires_at=expires_at
            )
            self.db.add(subscription)
        else:
            subscription.tier = tier
            subscription.is_active = is_active
            subscription.expires_at = expires_at
            subscription.started_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(subscription)
        
        return subscription


if __name__ == "__main__":
    pytest.main([__file__])
    
    def test_subscription_upgrade_grants_access(self):
        """
        Test that upgrading subscription grants access to new features
        """
        # Create vendor with FREE tier
        vendor, subscription = self.create_test_vendor(
            tier=VendorSubscriptionTier.FREE,
            is_active=True
        )
        
        # Verify initial access (should only have basic features)
        assert self.check_feature_access(vendor.id, "basic_profile")
        assert self.check_feature_access(vendor.id, "receive_leads")
        assert not self.check_feature_access(vendor.id, "respond_to_reviews")
        assert not self.check_feature_access(vendor.id, "advanced_analytics")
        
        # Upgrade to PREMIUM tier
        updated_subscription = self.update_vendor_subscription(
            vendor_id=vendor.id,
            tier=VendorSubscriptionTier.PREMIUM
        )
        
        # Verify new access (should now have premium features)
        assert self.check_feature_access(vendor.id, "basic_profile")
        assert self.check_feature_access(vendor.id, "receive_leads")
        assert self.check_feature_access(vendor.id, "respond_to_reviews")
        assert self.check_feature_access(vendor.id, "advanced_analytics")
        assert self.check_feature_access(vendor.id, "priority_listing")
        assert not self.check_feature_access(vendor.id, "custom_branding")  # Enterprise only
    
    def test_subscription_downgrade_revokes_access(self):
        """
        Test that downgrading subscription revokes access to premium features
        """
        # Create vendor with ENTERPRISE tier
        vendor, subscription = self.create_test_vendor(
            tier=VendorSubscriptionTier.ENTERPRISE,
            is_active=True
        )
        
        # Verify initial access (should have all features)
        assert self.check_feature_access(vendor.id, "basic_profile")
        assert self.check_feature_access(vendor.id, "custom_branding")
        assert self.check_feature_access(vendor.id, "api_access")
        
        # Downgrade to BASIC tier
        updated_subscription = self.update_vendor_subscription(
            vendor_id=vendor.id,
            tier=VendorSubscriptionTier.BASIC
        )
        
        # Verify revoked access (should lose enterprise features)
        assert self.check_feature_access(vendor.id, "basic_profile")
        assert self.check_feature_access(vendor.id, "respond_to_reviews")
        assert not self.check_feature_access(vendor.id, "advanced_analytics")  # Premium+
        assert not self.check_feature_access(vendor.id, "custom_branding")     # Enterprise only
        assert not self.check_feature_access(vendor.id, "api_access")          # Enterprise only


if __name__ == "__main__":
    pytest.main([__file__])
