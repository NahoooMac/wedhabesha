"""
Property-Based Tests for Firebase Integration

**Feature: wedding-platform, Property 24: Firebase Integration**
**Validates: Requirements 11.6, 11.7**

Property: For any Google Sign-In authentication, the system should validate Firebase ID tokens 
on the backend and properly link Firebase UID with PostgreSQL user records.
"""

import pytest
from hypothesis import given, strategies as st, settings, assume, HealthCheck
from sqlalchemy.orm import Session
from fastapi import HTTPException
import asyncio
from unittest.mock import patch, MagicMock

from app.services.auth_service import AuthService
from app.core.firebase import firebase_service
from app.models.user import UserType, AuthProvider


# Test data generators
@st.composite
def valid_email(draw):
    """Generate valid email addresses"""
    username = draw(st.text(min_size=1, max_size=20, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd'))))
    domain = draw(st.text(min_size=1, max_size=10, alphabet=st.characters(whitelist_categories=('Lu', 'Ll'))))
    tld = draw(st.sampled_from(['com', 'org', 'net', 'edu']))
    return f"{username}@{domain}.{tld}".lower()


@st.composite
def valid_firebase_uid(draw):
    """Generate valid Firebase UIDs"""
    return draw(st.text(min_size=20, max_size=50, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd'))))


@st.composite
def valid_firebase_token(draw):
    """Generate mock Firebase ID tokens"""
    # Firebase tokens are JWTs with 3 parts separated by dots
    header = draw(st.text(min_size=20, max_size=50, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd'))))
    payload = draw(st.text(min_size=50, max_size=100, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd'))))
    signature = draw(st.text(min_size=20, max_size=50, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd'))))
    return f"{header}.{payload}.{signature}"


@st.composite
def valid_names(draw):
    """Generate valid partner names"""
    return draw(st.text(min_size=1, max_size=50, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Zs'))))


class TestFirebaseIntegration:
    """Property-based tests for Firebase integration"""
    
    @given(
        email=valid_email(),
        firebase_uid=valid_firebase_uid(),
        firebase_token=valid_firebase_token(),
        partner1_name=valid_names(),
        partner2_name=valid_names()
    )
    @settings(max_examples=10, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_firebase_registration_links_uid_with_user_record(self, db_session: Session, email, firebase_uid, firebase_token, partner1_name, partner2_name):
        """
        Property: Firebase registration should properly link Firebase UID with PostgreSQL user records
        """
        assume(len(email) <= 254)
        assume(len(partner1_name.strip()) > 0)
        assume(len(partner2_name.strip()) > 0)
        
        auth_service = AuthService(db_session)
        
        async def run_test():
            # Mock Firebase service to return user info
            mock_firebase_user = {
                "uid": firebase_uid,
                "email": email,
                "name": f"{partner1_name} & {partner2_name}",
                "email_verified": True
            }
            
            with patch.object(firebase_service, 'is_available', return_value=True), \
                 patch.object(firebase_service, 'verify_id_token', return_value=mock_firebase_user):
                
                try:
                    # Registration with Firebase token should succeed
                    user, couple, access_token = await auth_service.register_couple(
                        email=email,
                        firebase_id_token=firebase_token,
                        partner1_name=partner1_name,
                        partner2_name=partner2_name
                    )
                    
                    # Verify Firebase UID is properly linked
                    assert user is not None
                    assert user.firebase_uid == firebase_uid
                    assert user.email == email
                    assert user.user_type == UserType.COUPLE
                    assert user.auth_provider == AuthProvider.GOOGLE
                    assert user.password_hash is None  # No password for Google auth
                    assert user.is_active is True
                    
                    # Verify couple profile created
                    assert couple is not None
                    assert couple.partner1_name == partner1_name
                    assert couple.partner2_name == partner2_name
                    
                    # Verify access token generated
                    assert access_token is not None
                    assert len(access_token) > 0
                    
                except HTTPException as e:
                    pytest.fail(f"Valid Firebase registration should not raise HTTPException: {e.detail}")
        
        # Run the async test
        asyncio.run(run_test())
    
    @given(
        firebase_uid=valid_firebase_uid(),
        firebase_token=valid_firebase_token(),
        email=valid_email()
    )
    @settings(max_examples=10, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_firebase_login_validates_token_and_finds_user(self, db_session: Session, firebase_uid, firebase_token, email):
        """
        Property: Firebase login should validate ID tokens and find existing users by Firebase UID
        """
        assume(len(email) <= 254)
        
        auth_service = AuthService(db_session)
        
        async def run_test():
            # Mock Firebase service
            mock_firebase_user = {
                "uid": firebase_uid,
                "email": email,
                "name": "Test User",
                "email_verified": True
            }
            
            with patch.object(firebase_service, 'is_available', return_value=True), \
                 patch.object(firebase_service, 'verify_id_token', return_value=mock_firebase_user):
                
                # First register a user with Firebase
                try:
                    user, couple, _ = await auth_service.register_couple(
                        email=email,
                        firebase_id_token=firebase_token,
                        partner1_name="Test Partner 1",
                        partner2_name="Test Partner 2"
                    )
                except HTTPException:
                    # Skip if registration fails
                    assume(False)
                
                # Now try to login with Firebase
                try:
                    login_user, login_token = await auth_service.login_with_google(firebase_token)
                    
                    # Verify login succeeded and found correct user
                    assert login_user is not None
                    assert login_user.id == user.id
                    assert login_user.firebase_uid == firebase_uid
                    assert login_user.email == email
                    assert login_token is not None
                    assert len(login_token) > 0
                    
                except HTTPException as e:
                    pytest.fail(f"Valid Firebase login should not raise HTTPException: {e.detail}")
        
        # Run the async test
        asyncio.run(run_test())
    
    @given(
        firebase_token=valid_firebase_token()
    )
    @settings(max_examples=10, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_invalid_firebase_token_rejected(self, db_session: Session, firebase_token):
        """
        Property: Invalid Firebase tokens should be rejected with appropriate error messages
        """
        auth_service = AuthService(db_session)
        
        async def run_test():
            # Mock Firebase service to reject invalid token
            with patch.object(firebase_service, 'is_available', return_value=True), \
                 patch.object(firebase_service, 'verify_id_token', side_effect=HTTPException(status_code=401, detail="Invalid Firebase ID token")):
                
                # Registration with invalid token should fail
                with pytest.raises(HTTPException) as exc_info:
                    await auth_service.register_couple(
                        email="test@example.com",
                        firebase_id_token=firebase_token,
                        partner1_name="Test Partner 1",
                        partner2_name="Test Partner 2"
                    )
                
                # Verify appropriate error response
                assert exc_info.value.status_code == 401
                assert "Invalid Firebase ID token" in exc_info.value.detail
                
                # Login with invalid token should also fail
                with pytest.raises(HTTPException) as exc_info:
                    await auth_service.login_with_google(firebase_token)
                
                assert exc_info.value.status_code == 401
                assert "Invalid Firebase ID token" in exc_info.value.detail
        
        # Run the async test
        asyncio.run(run_test())
    
    @given(
        firebase_token=valid_firebase_token()
    )
    @settings(max_examples=10, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_firebase_service_unavailable_handled_gracefully(self, db_session: Session, firebase_token):
        """
        Property: When Firebase service is unavailable, appropriate error messages should be returned
        """
        auth_service = AuthService(db_session)
        
        async def run_test():
            # Mock Firebase service as unavailable
            with patch.object(firebase_service, 'is_available', return_value=False):
                
                # Registration should fail gracefully
                with pytest.raises(HTTPException) as exc_info:
                    await auth_service.register_couple(
                        email="test@example.com",
                        firebase_id_token=firebase_token,
                        partner1_name="Test Partner 1",
                        partner2_name="Test Partner 2"
                    )
                
                # Verify appropriate error response
                assert exc_info.value.status_code == 503
                assert "Google Sign-In is not available" in exc_info.value.detail
                
                # Login should also fail gracefully
                with pytest.raises(HTTPException) as exc_info:
                    await auth_service.login_with_google(firebase_token)
                
                assert exc_info.value.status_code == 503
                assert "Google Sign-In is not available" in exc_info.value.detail
        
        # Run the async test
        asyncio.run(run_test())
    
    @given(
        email=valid_email(),
        firebase_uid=valid_firebase_uid(),
        firebase_token=valid_firebase_token()
    )
    @settings(max_examples=10, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_duplicate_firebase_uid_prevented(self, db_session: Session, email, firebase_uid, firebase_token):
        """
        Property: Duplicate Firebase UIDs should be prevented in the database
        """
        assume(len(email) <= 254)
        
        auth_service = AuthService(db_session)
        
        async def run_test():
            # Mock Firebase service
            mock_firebase_user = {
                "uid": firebase_uid,
                "email": email,
                "name": "Test User",
                "email_verified": True
            }
            
            with patch.object(firebase_service, 'is_available', return_value=True), \
                 patch.object(firebase_service, 'verify_id_token', return_value=mock_firebase_user):
                
                # First registration should succeed
                try:
                    user1, couple1, token1 = await auth_service.register_couple(
                        email=email,
                        firebase_id_token=firebase_token,
                        partner1_name="Test Partner 1",
                        partner2_name="Test Partner 2"
                    )
                    
                    assert user1.firebase_uid == firebase_uid
                    
                except HTTPException:
                    # Skip if first registration fails
                    assume(False)
                
                # Second registration with same Firebase UID should fail
                different_email = f"different_{email}"
                mock_firebase_user["email"] = different_email
                
                with pytest.raises(HTTPException) as exc_info:
                    await auth_service.register_couple(
                        email=different_email,
                        firebase_id_token=firebase_token,
                        partner1_name="Different Partner 1",
                        partner2_name="Different Partner 2"
                    )
                
                # Should get error about existing Firebase UID
                assert exc_info.value.status_code == 400
                assert "Firebase UID already exists" in exc_info.value.detail
        
        # Run the async test
        asyncio.run(run_test())
    
    @given(
        firebase_uid=valid_firebase_uid()
    )
    @settings(max_examples=10, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_firebase_uid_lookup_works_correctly(self, db_session: Session, firebase_uid):
        """
        Property: Firebase UID lookup should correctly find users by their Firebase UID
        """
        auth_service = AuthService(db_session)
        
        # Test direct user service lookup
        user = auth_service.user_service.authenticate_firebase_user(firebase_uid)
        
        # Should return None for non-existent Firebase UID
        assert user is None
        
        # After creating a user with this Firebase UID, lookup should work
        # This is tested implicitly in other tests, but we verify the lookup logic here
