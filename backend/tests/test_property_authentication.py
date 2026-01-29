"""
Property-Based Tests for Authentication Behavior

**Feature: wedding-platform, Property 2: Authentication Behavior**
**Validates: Requirements 1.3, 1.4, 4.1**

Property: For any valid credential pair (email/password, Google Sign-In, or wedding_code/staff_pin), 
the system should grant appropriate access, and for any invalid credential pair, the system should 
deny access with appropriate error messages.
"""

import pytest
from hypothesis import given, strategies as st, settings, assume, HealthCheck
from sqlalchemy.orm import Session
from fastapi import HTTPException
from datetime import date
import asyncio
import uuid
import uuid
import asyncio

from app.services.auth_service import AuthService
from app.services.user_service import UserService
from app.models.user import UserType, AuthProvider, VendorCategory
from app.core.security import generate_wedding_code, generate_staff_pin, hash_pin
from app.models.wedding import Wedding
from app.models.user import User, Couple


# Test data generators
@st.composite
def valid_email(draw):
    """Generate valid email addresses"""
    username = draw(st.text(min_size=1, max_size=8, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd'))))
    domain = draw(st.text(min_size=1, max_size=5, alphabet=st.characters(whitelist_categories=('Lu', 'Ll'))))
    tld = draw(st.sampled_from(['com', 'org', 'net']))
    # Add UUID to ensure uniqueness across test runs
    unique_id = str(uuid.uuid4())[:4]
    return f"{username}{unique_id}@{domain}.{tld}".lower()


@st.composite
def valid_password(draw):
    """Generate valid passwords"""
    return draw(st.text(min_size=8, max_size=50, alphabet=st.characters(min_codepoint=32, max_codepoint=126)))


@st.composite
def valid_names(draw):
    """Generate valid partner names"""
    return draw(st.text(min_size=1, max_size=50, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Zs'))))


class TestAuthenticationBehavior:
    """Property-based tests for authentication behavior"""
    
    @given(
        email=valid_email(),
        password=valid_password(),
        partner1_name=valid_names(),
        partner2_name=valid_names()
    )
    @settings(max_examples=10, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture, HealthCheck.data_too_large])
    def test_valid_email_password_registration_grants_access(self, db_session: Session, email, password, partner1_name, partner2_name):
        """
        Property: Valid email/password registration should always grant access
        """
        assume(len(email) <= 254)  # Email length limit
        assume(len(password) >= 8)  # Minimum password length
        assume(len(partner1_name.strip()) > 0)  # Non-empty names
        assume(len(partner2_name.strip()) > 0)
        
        auth_service = AuthService(db_session)
        
        async def run_test():
            try:
                # Registration should succeed
                user, couple, access_token = await auth_service.register_couple(
                    email=email,
                    password=password,
                    partner1_name=partner1_name,
                    partner2_name=partner2_name
                )
                
                # Verify access granted
                assert user is not None
                assert user.email == email
                assert user.user_type == UserType.COUPLE
                assert user.auth_provider == AuthProvider.EMAIL
                assert user.is_active is True
                assert access_token is not None
                assert len(access_token) > 0
                
                # Verify couple profile created
                assert couple is not None
                assert couple.partner1_name == partner1_name
                assert couple.partner2_name == partner2_name
                
                # Login should also succeed with same credentials
                login_user, login_token = await auth_service.login_with_email(email, password)
                assert login_user.id == user.id
                assert login_token is not None
                
            except HTTPException as e:
                # Should not raise HTTPException for valid credentials
                pytest.fail(f"Valid credentials should not raise HTTPException: {e.detail}")
        
        # Run the async test
        asyncio.run(run_test())
    
    @given(email=valid_email())
    @settings(max_examples=10, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_nonexistent_user_login_denies_access(self, db_session: Session, email):
        """
        Property: Login attempts for non-existent users should always deny access
        """
        assume(len(email) <= 254)
        
        auth_service = AuthService(db_session)
        
        async def run_test():
            with pytest.raises(HTTPException) as exc_info:
                await auth_service.login_with_email(email, "anypassword123")
            
            # Verify appropriate error response
            assert exc_info.value.status_code == 401
            assert "Invalid email or password" in exc_info.value.detail
        
        # Run the async test
        asyncio.run(run_test())
    
    @given(
        email=valid_email(),
        password=valid_password(),
        wrong_password=valid_password()
    )
    @settings(max_examples=10, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_wrong_password_denies_access(self, db_session: Session, email, password, wrong_password):
        """
        Property: Wrong password should always deny access even for existing users
        """
        assume(len(email) <= 254)
        assume(len(password) >= 8)
        assume(password != wrong_password)  # Ensure passwords are different
        
        auth_service = AuthService(db_session)
        
        async def run_test():
            # Create user first
            try:
                await auth_service.register_couple(
                    email=email,
                    password=password,
                    partner1_name="Test Partner 1",
                    partner2_name="Test Partner 2"
                )
            except HTTPException:
                # Skip if registration fails (e.g., duplicate email)
                assume(False)
            
            # Login with wrong password should fail
            with pytest.raises(HTTPException) as exc_info:
                await auth_service.login_with_email(email, wrong_password)
            
            # Verify appropriate error response
            assert exc_info.value.status_code == 401
            assert "Invalid email or password" in exc_info.value.detail
        
        # Run the async test
        asyncio.run(run_test())
    
    @given(
        wedding_code=st.text(min_size=4, max_size=4, alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'),
        staff_pin=st.text(min_size=6, max_size=6, alphabet='0123456789')
    )
    @settings(max_examples=10, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_valid_wedding_credentials_grant_access(self, db_session: Session, wedding_code, staff_pin):
        """
        Property: Valid wedding code/PIN combinations should grant staff access
        """
        auth_service = AuthService(db_session)
        user_service = UserService(db_session)
        
        async def run_test():
            # Create a test couple and wedding first
            test_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
            user, couple = user_service.create_couple_user(
                email=test_email,
                password="testpassword123",
                partner1_name="Test Partner 1",
                partner2_name="Test Partner 2"
            )
            
            # Create wedding with the generated credentials
            wedding = Wedding(
                couple_id=couple.id,
                wedding_code=wedding_code,
                staff_pin=hash_pin(staff_pin),  # Hash the PIN
                wedding_date=date(2024, 12, 31),
                venue_name="Test Venue",
                venue_address="Test Address",
                expected_guests=100
            )
            db_session.add(wedding)
            db_session.commit()
            db_session.refresh(wedding)
            
            try:
                # Staff verification should succeed
                verified_wedding, session_token = await auth_service.verify_staff_credentials(
                    wedding_code=wedding_code,
                    staff_pin=staff_pin
                )
                
                # Verify access granted
                assert verified_wedding is not None
                assert verified_wedding.id == wedding.id
                assert verified_wedding.wedding_code == wedding_code
                assert session_token is not None
                assert len(session_token) > 0
                
            except HTTPException as e:
                pytest.fail(f"Valid wedding credentials should not raise HTTPException: {e.detail}")
        
        # Run the async test
        asyncio.run(run_test())
    
    @given(
        firebase_uid=st.text(min_size=10, max_size=50, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd')))
    )
    @settings(max_examples=10, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_nonexistent_firebase_user_denies_access(self, db_session: Session, firebase_uid):
        """
        Property: Google Sign-In attempts for non-existent Firebase users should deny access
        """
        auth_service = AuthService(db_session)
        
        # Mock Firebase token (this would normally be verified by Firebase service)
        # Since we're testing the auth service logic, we'll test the user lookup part
        user = auth_service.user_service.authenticate_firebase_user(firebase_uid)
        
        # Should return None for non-existent user
        assert user is None
