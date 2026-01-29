"""
Property-Based Tests for User Model Security

**Feature: wedding-platform, Property 17: Password Security**
**Validates: Requirements 11.3**

Tests that passwords and PINs are properly hashed and never stored in plain text,
and that Firebase UID is properly handled for Google Sign-In users.
"""

import pytest
from hypothesis import given, strategies as st, settings, HealthCheck
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel, Session
import tempfile
import os
import re

from app.models.user import User, Couple, Vendor, UserType, AuthProvider, VendorCategory
from app.services.user_service import UserService
from app.core.security import hash_password, verify_password, hash_pin, verify_pin


# Strategy for generating valid email addresses
email_strategy = st.builds(
    lambda local, domain: f"{local}@{domain}.com",
    local=st.text(
        alphabet=st.characters(whitelist_categories=("Ll", "Lu", "Nd")),
        min_size=1,
        max_size=20
    ).filter(lambda x: x and not x.startswith('.') and not x.endswith('.')),
    domain=st.text(
        alphabet=st.characters(whitelist_categories=("Ll", "Lu", "Nd")),
        min_size=1,
        max_size=10
    ).filter(lambda x: x and x.isalnum())
)

# Strategy for generating passwords
password_strategy = st.text(min_size=8, max_size=50).filter(
    lambda x: x and len(x.strip()) >= 8
)

# Strategy for generating Firebase UIDs (simulate Firebase format)
firebase_uid_strategy = st.text(
    alphabet=st.characters(whitelist_categories=("Ll", "Lu", "Nd")),
    min_size=20,
    max_size=30
)

# Strategy for generating names
name_strategy = st.text(
    alphabet=st.characters(whitelist_categories=("Ll", "Lu", "Zs")),
    min_size=1,
    max_size=50
).filter(lambda x: x and x.strip())


def create_test_db():
    """Create a temporary test database"""
    db_fd, db_path = tempfile.mkstemp()
    test_db_url = f"sqlite:///{db_path}"
    engine = create_engine(test_db_url, connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return engine, TestingSessionLocal, db_fd, db_path


@pytest.mark.property
class TestUserModelSecurity:
    """Property-based tests for user model security"""
    
    @given(
        email=email_strategy,
        password=password_strategy
    )
    @settings(
        max_examples=10,
        deadline=3000,  # 3 seconds
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_password_security_email_auth(self, email: str, password: str):
        """
        **Property 17: Password Security**
        
        For any email authentication user, passwords should be hashed using bcrypt
        and never stored in plain text. Firebase UID should be None.
        """
        engine, TestingSessionLocal, db_fd, db_path = create_test_db()
        
        try:
            with TestingSessionLocal() as db_session:
                user_service = UserService(db_session)
                
                try:
                    # Create email-authenticated user
                    user, couple = user_service.create_couple_user(
                        email=email,
                        password=password,
                        partner1_name="Test Partner 1",
                        partner2_name="Test Partner 2"
                    )
                    
                    # Verify password is hashed, not plain text
                    assert user.password_hash is not None
                    assert user.password_hash != password
                    assert len(user.password_hash) > 50  # bcrypt hashes are typically 60 chars
                    assert user.password_hash.startswith('$2b$')  # bcrypt format
                    
                    # Verify Firebase UID is None for email auth
                    assert user.firebase_uid is None
                    
                    # Verify auth provider is correct
                    assert user.auth_provider == AuthProvider.EMAIL
                    
                    # Verify password can be verified
                    assert verify_password(password, user.password_hash)
                    
                    # Verify wrong password fails
                    assert not verify_password(password + "wrong", user.password_hash)
                    
                except ValueError as e:
                    # Skip if email already exists (expected in property testing)
                    if "already exists" in str(e):
                        return
                    raise
        finally:
            # Cleanup
            engine.dispose()
            os.close(db_fd)
            try:
                os.unlink(db_path)
            except (PermissionError, FileNotFoundError):
                pass  # Ignore cleanup errors
    
    @given(
        email=email_strategy,
        firebase_uid=firebase_uid_strategy
    )
    @settings(
        max_examples=10,
        deadline=3000,  # 3 seconds
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_password_security_google_auth(self, email: str, firebase_uid: str):
        """
        **Property 17: Password Security**
        
        For any Google Sign-In user, password_hash should be None and firebase_uid
        should be properly stored.
        """
        engine, TestingSessionLocal, db_fd, db_path = create_test_db()
        
        try:
            with TestingSessionLocal() as db_session:
                user_service = UserService(db_session)
                
                try:
                    # Create Google-authenticated user
                    user, couple = user_service.create_couple_user(
                        email=email,
                        firebase_uid=firebase_uid,
                        partner1_name="Test Partner 1",
                        partner2_name="Test Partner 2"
                    )
                    
                    # Verify password_hash is None for Google auth
                    assert user.password_hash is None
                    
                    # Verify Firebase UID is stored
                    assert user.firebase_uid == firebase_uid
                    assert user.firebase_uid is not None
                    
                    # Verify auth provider is correct
                    assert user.auth_provider == AuthProvider.GOOGLE
                    
                except ValueError as e:
                    # Skip if email or Firebase UID already exists (expected in property testing)
                    if "already exists" in str(e):
                        return
                    raise
        finally:
            # Cleanup
            engine.dispose()
            os.close(db_fd)
            try:
                os.unlink(db_path)
            except (PermissionError, FileNotFoundError):
                pass  # Ignore cleanup errors
    
    @given(pin=st.text(alphabet="0123456789", min_size=4, max_size=8))
    @settings(
        max_examples=10,
        deadline=1500  # 1.5 seconds per example
    )
    def test_pin_security(self, pin: str):
        """
        **Property 17: Password Security**
        
        For any PIN, it should be hashed using bcrypt and never stored in plain text.
        """
        # Hash the PIN
        hashed_pin = hash_pin(pin)
        
        # Verify PIN is hashed, not plain text
        assert hashed_pin != pin
        assert len(hashed_pin) > 50  # bcrypt hashes are typically 60 chars
        assert hashed_pin.startswith('$2b$')  # bcrypt format
        
        # Verify PIN can be verified
        assert verify_pin(pin, hashed_pin)
        
        # Verify wrong PIN fails
        wrong_pin = pin + "0" if pin != pin + "0" else pin[:-1] + "1"
        assert not verify_pin(wrong_pin, hashed_pin)
    
    @given(
        email=email_strategy,
        password=password_strategy
    )
    @settings(
        max_examples=10,
        deadline=3000,  # 3 seconds
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_authentication_security(self, email: str, password: str):
        """
        **Property 17: Password Security**
        
        For any user authentication, only correct credentials should succeed,
        and password verification should be secure.
        """
        engine, TestingSessionLocal, db_fd, db_path = create_test_db()
        
        try:
            with TestingSessionLocal() as db_session:
                user_service = UserService(db_session)
                
                try:
                    # Create user
                    user, couple = user_service.create_couple_user(
                        email=email,
                        password=password,
                        partner1_name="Test Partner 1",
                        partner2_name="Test Partner 2"
                    )
                    
                    # Verify correct authentication succeeds
                    authenticated_user = user_service.authenticate_user(email, password)
                    assert authenticated_user is not None
                    assert authenticated_user.id == user.id
                    
                    # Verify wrong password fails
                    wrong_password = password + "wrong"
                    failed_auth = user_service.authenticate_user(email, wrong_password)
                    assert failed_auth is None
                    
                    # Verify wrong email fails
                    wrong_email = "wrong" + email
                    failed_auth = user_service.authenticate_user(wrong_email, password)
                    assert failed_auth is None
                    
                except ValueError as e:
                    # Skip if email already exists (expected in property testing)
                    if "already exists" in str(e):
                        return
                    raise
        finally:
            # Cleanup
            engine.dispose()
            os.close(db_fd)
            try:
                os.unlink(db_path)
            except (PermissionError, FileNotFoundError):
                pass  # Ignore cleanup errors
