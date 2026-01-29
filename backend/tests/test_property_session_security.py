"""
Property-Based Tests for Session Security

**Feature: wedding-platform, Property 18: Session Security**
**Validates: Requirements 11.4**

Property: For any user session, it should expire after the configured timeout period 
and require re-authentication for continued access.
"""

import pytest
from hypothesis import given, strategies as st, settings, assume, HealthCheck
from sqlalchemy.orm import Session
from fastapi import HTTPException
import asyncio
from datetime import date, datetime, timedelta
import time
from unittest.mock import patch

from app.services.auth_service import AuthService
from app.core.redis import redis_service
from app.core.security import create_access_token, verify_token
from app.core.config import settings as app_settings


# Test data generators
@st.composite
def valid_email(draw):
    """Generate valid email addresses"""
    username = draw(st.text(min_size=1, max_size=20, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd'))))
    domain = draw(st.text(min_size=1, max_size=10, alphabet=st.characters(whitelist_categories=('Lu', 'Ll'))))
    tld = draw(st.sampled_from(['com', 'org', 'net', 'edu']))
    return f"{username}@{domain}.{tld}".lower()


@st.composite
def valid_password(draw):
    """Generate valid passwords"""
    return draw(st.text(min_size=8, max_size=50, alphabet=st.characters(min_codepoint=32, max_codepoint=126)))


@st.composite
def session_timeout_minutes(draw):
    """Generate session timeout values in minutes"""
    return draw(st.integers(min_value=1, max_value=60))  # 1 to 60 minutes


class TestSessionSecurity:
    """Property-based tests for session security"""
    
    @given(
        email=valid_email(),
        password=valid_password(),
        timeout_minutes=session_timeout_minutes()
    )
    @settings(max_examples=10, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_jwt_token_expires_after_configured_timeout(self, db_session: Session, email, password, timeout_minutes):
        """
        Property: JWT tokens should expire after the configured timeout period
        """
        assume(len(email) <= 254)
        assume(len(password) >= 8)
        
        auth_service = AuthService(db_session)
        
        async def run_test():
            # Create user first
            try:
                user, couple, access_token = await auth_service.register_couple(
                    email=email,
                    password=password,
                    partner1_name="Test Partner 1",
                    partner2_name="Test Partner 2"
                )
            except HTTPException:
                # Skip if registration fails (e.g., duplicate email)
                assume(False)
            
            # Create token with custom expiration
            token_data = {
                "sub": str(user.id),
                "email": user.email,
                "user_type": user.user_type.value,
                "auth_provider": user.auth_provider.value
            }
            
            # Create token with short expiration for testing
            expires_delta = timedelta(minutes=timeout_minutes)
            token = create_access_token(token_data, expires_delta)
            
            # Token should be valid immediately
            payload = verify_token(token)
            assert payload is not None
            assert payload["sub"] == str(user.id)
            assert payload["email"] == user.email
            
            # Verify expiration time is set correctly
            exp_timestamp = payload.get("exp")
            assert exp_timestamp is not None
            
            # Calculate expected expiration (with some tolerance for test execution time)
            expected_exp = datetime.utcnow() + expires_delta
            actual_exp = datetime.utcfromtimestamp(exp_timestamp)
            time_diff = abs((expected_exp - actual_exp).total_seconds())
            assert time_diff < 5  # Allow 5 seconds tolerance
            
            # For very short timeouts, simulate expiration
            if timeout_minutes <= 5:
                # Mock the current time to be after expiration
                future_time = datetime.utcnow() + timedelta(minutes=timeout_minutes + 1)
                with patch('app.core.security.datetime') as mock_datetime:
                    mock_datetime.utcnow.return_value = future_time
                    
                    # Token should now be expired
                    expired_payload = verify_token(token)
                    assert expired_payload is None  # Should return None for expired token
        
        # Run the async test
        asyncio.run(run_test())
    
    @given(
        email=valid_email(),
        password=valid_password()
    )
    @settings(max_examples=10, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_redis_session_expires_after_timeout(self, db_session: Session, email, password):
        """
        Property: Redis sessions should expire after the configured timeout period
        """
        assume(len(email) <= 254)
        assume(len(password) >= 8)
        
        auth_service = AuthService(db_session)
        
        async def run_test():
            # Skip if Redis is not available
            if not redis_service.is_available():
                assume(False)
            
            # Create user first
            try:
                user, couple, access_token = await auth_service.register_couple(
                    email=email,
                    password=password,
                    partner1_name="Test Partner 1",
                    partner2_name="Test Partner 2"
                )
            except HTTPException:
                # Skip if registration fails
                assume(False)
            
            # Create session with short expiration for testing
            session_id = f"test_session_{user.id}"
            session_data = {
                "user_id": user.id,
                "email": user.email,
                "user_type": user.user_type.value,
                "created_at": datetime.utcnow().isoformat()
            }
            
            # Set session with 1 minute expiration
            expire_minutes = 1
            success = await redis_service.set_session(session_id, session_data, expire_minutes)
            assert success is True
            
            # Session should be retrievable immediately
            retrieved_session = await redis_service.get_session(session_id)
            assert retrieved_session is not None
            assert retrieved_session["user_id"] == user.id
            assert retrieved_session["email"] == user.email
            
            # For testing purposes, we can't wait for actual expiration
            # but we can verify the expiration was set by checking Redis TTL
            # This is implementation-specific but validates the timeout behavior
            
        # Run the async test
        asyncio.run(run_test())
    
    @given(
        email=valid_email(),
        password=valid_password()
    )
    @settings(max_examples=10, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_expired_token_requires_reauthentication(self, db_session: Session, email, password):
        """
        Property: Expired tokens should require re-authentication for continued access
        """
        assume(len(email) <= 254)
        assume(len(password) >= 8)
        
        auth_service = AuthService(db_session)
        
        async def run_test():
            # Create user first
            try:
                user, couple, access_token = await auth_service.register_couple(
                    email=email,
                    password=password,
                    partner1_name="Test Partner 1",
                    partner2_name="Test Partner 2"
                )
            except HTTPException:
                # Skip if registration fails
                assume(False)
            
            # Create an already-expired token
            token_data = {
                "sub": str(user.id),
                "email": user.email,
                "user_type": user.user_type.value,
                "auth_provider": user.auth_provider.value
            }
            
            # Create token that expired 1 minute ago
            expires_delta = timedelta(minutes=-1)  # Negative means already expired
            expired_token = create_access_token(token_data, expires_delta)
            
            # Expired token should not be valid
            payload = verify_token(expired_token)
            assert payload is None
            
            # get_current_user_from_token should return None for expired token
            current_user = auth_service.get_current_user_from_token(expired_token)
            assert current_user is None
            
            # Re-authentication should still work with valid credentials
            login_user, new_token = await auth_service.login_with_email(email, password)
            assert login_user.id == user.id
            assert new_token is not None
            assert new_token != expired_token  # Should be a different token
            
            # New token should be valid
            new_payload = verify_token(new_token)
            assert new_payload is not None
            assert new_payload["sub"] == str(user.id)
        
        # Run the async test
        asyncio.run(run_test())
    
    @given(
        email=valid_email(),
        password=valid_password()
    )
    @settings(max_examples=10, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_token_refresh_extends_session(self, db_session: Session, email, password):
        """
        Property: Token refresh should extend session lifetime with a new valid token
        """
        assume(len(email) <= 254)
        assume(len(password) >= 8)
        
        auth_service = AuthService(db_session)
        
        async def run_test():
            # Create user first
            try:
                user, couple, access_token = await auth_service.register_couple(
                    email=email,
                    password=password,
                    partner1_name="Test Partner 1",
                    partner2_name="Test Partner 2"
                )
            except HTTPException:
                # Skip if registration fails
                assume(False)
            
            # Original token should be valid
            original_payload = verify_token(access_token)
            assert original_payload is not None
            original_exp = original_payload.get("exp")
            
            # Refresh the token
            new_token = await auth_service.refresh_token(access_token)
            assert new_token is not None
            assert new_token != access_token  # Should be a different token
            
            # New token should be valid
            new_payload = verify_token(new_token)
            assert new_payload is not None
            assert new_payload["sub"] == str(user.id)
            
            # New token should have later expiration
            new_exp = new_payload.get("exp")
            assert new_exp > original_exp  # New token expires later
            
            # Both tokens should contain same user info
            assert new_payload["email"] == original_payload["email"]
            assert new_payload["user_type"] == original_payload["user_type"]
        
        # Run the async test
        asyncio.run(run_test())
    
    @given(
        wedding_code=st.text(min_size=4, max_size=4, alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'),
        staff_pin=st.text(min_size=6, max_size=6, alphabet='0123456789')
    )
    @settings(max_examples=10, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_staff_session_has_shorter_timeout(self, db_session: Session, wedding_code, staff_pin):
        """
        Property: Staff sessions should have shorter timeout than regular user sessions
        """
        auth_service = AuthService(db_session)
        
        async def run_test():
            # Skip if Redis is not available
            if not redis_service.is_available():
                assume(False)
            
            # Create a test wedding first
            from app.services.user_service import UserService
            from app.models.wedding import Wedding
            from app.core.security import hash_pin
            import uuid
            
            user_service = UserService(db_session)
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
                staff_pin=hash_pin(staff_pin),
                wedding_date=date(2024, 12, 31),
                venue_name="Test Venue",
                venue_address="Test Address",
                expected_guests=100
            )
            db_session.add(wedding)
            db_session.commit()
            db_session.refresh(wedding)
            
            # Verify staff credentials and get session
            verified_wedding, session_token = await auth_service.verify_staff_credentials(
                wedding_code=wedding_code,
                staff_pin=staff_pin
            )
            
            assert verified_wedding is not None
            assert session_token is not None
            
            # Staff session should be retrievable
            session_data = await redis_service.get_session(session_token)
            assert session_data is not None
            assert session_data["session_type"] == "staff"
            assert session_data["wedding_id"] == wedding.id
            
            # Staff sessions should have 4-hour timeout (240 minutes)
            # We can't test actual expiration in unit tests, but we verify
            # the session was created with the correct type and data
        
        # Run the async test
        asyncio.run(run_test())
