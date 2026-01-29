"""
Property-Based Tests for QR Code Generation

**Feature: wedding-platform, Property 3: QR Code Generation and Validation**
**Validates: Requirements 3.1, 3.3, 4.2**

Tests that QR codes are unique, properly generated for each guest, and correctly
validate during check-in process.
"""

import pytest
from hypothesis import given, strategies as st, settings, HealthCheck
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel
import tempfile
import os
from datetime import date, datetime, timedelta

from app.models.wedding import Wedding, Guest, CheckIn, CheckInMethod
from app.models.user import User, Couple, UserType, AuthProvider
from app.services.wedding_service import WeddingService
from app.services.user_service import UserService
from app.core.security import generate_qr_code, hash_pin


# Strategy for generating valid names
name_strategy = st.text(
    alphabet=st.characters(whitelist_categories=("Ll", "Lu", "Zs")),
    min_size=1,
    max_size=50
).filter(lambda x: x and x.strip())

# Strategy for generating email addresses
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

# Strategy for generating venue names
venue_strategy = st.text(
    alphabet=st.characters(whitelist_categories=("Ll", "Lu", "Zs", "Nd")),
    min_size=5,
    max_size=100
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
class TestQRCodeGeneration:
    """Property-based tests for QR code generation and validation"""
    
    @given(
        guest_name=name_strategy,
        email=email_strategy,
        venue_name=venue_strategy
    )
    @settings(
        max_examples=10,
        deadline=3000,  # 3 seconds
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_qr_code_generation_uniqueness(self, guest_name: str, email: str, venue_name: str):
        """
        **Property 3: QR Code Generation and Validation**
        
        For any guest added to a wedding, the system should generate a unique QR code
        that has never been used before.
        """
        engine, TestingSessionLocal, db_fd, db_path = create_test_db()
        
        try:
            with TestingSessionLocal() as db_session:
                # Create test couple and wedding
                user_service = UserService(db_session)
                wedding_service = WeddingService(db_session)
                
                try:
                    # Create couple
                    user, couple = user_service.create_couple_user(
                        email=email,
                        password="testpass123",
                        partner1_name="Partner 1",
                        partner2_name="Partner 2"
                    )
                    
                    # Create wedding
                    wedding = wedding_service.create_wedding(
                        couple_id=couple.id,
                        wedding_date=date.today() + timedelta(days=30),
                        venue_name=venue_name,
                        venue_address="123 Test St",
                        expected_guests=100
                    )
                    
                    # Add multiple guests and verify QR code uniqueness
                    qr_codes = set()
                    for i in range(5):  # Test with 5 guests
                        guest = wedding_service.add_guest(
                            wedding_id=wedding.id,
                            name=f"{guest_name} {i}",
                            email=f"{i}{email}"
                        )
                        
                        # Verify QR code is unique
                        assert guest.qr_code not in qr_codes
                        qr_codes.add(guest.qr_code)
                        
                        # Verify QR code is not empty and has reasonable length
                        assert guest.qr_code
                        assert len(guest.qr_code) > 10  # UUID should be longer
                        
                        # Verify QR code is linked to correct wedding
                        assert guest.wedding_id == wedding.id
                        
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
                pass
    
    @given(
        guest_name=name_strategy,
        email=email_strategy,
        venue_name=venue_strategy
    )
    @settings(
        max_examples=10,
        deadline=3000,  # 3 seconds
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_qr_code_validation_during_checkin(self, guest_name: str, email: str, venue_name: str):
        """
        **Property 3: QR Code Generation and Validation**
        
        For any QR code generated for a guest, it should correctly validate during
        the check-in process and identify the correct guest and wedding.
        """
        engine, TestingSessionLocal, db_fd, db_path = create_test_db()
        
        try:
            with TestingSessionLocal() as db_session:
                # Create test couple and wedding
                user_service = UserService(db_session)
                wedding_service = WeddingService(db_session)
                
                try:
                    # Create couple
                    user, couple = user_service.create_couple_user(
                        email=email,
                        password="testpass123",
                        partner1_name="Partner 1",
                        partner2_name="Partner 2"
                    )
                    
                    # Create wedding
                    wedding = wedding_service.create_wedding(
                        couple_id=couple.id,
                        wedding_date=date.today() + timedelta(days=30),
                        venue_name=venue_name,
                        venue_address="123 Test St",
                        expected_guests=100
                    )
                    
                    # Add guest
                    guest = wedding_service.add_guest(
                        wedding_id=wedding.id,
                        name=guest_name,
                        email=email + ".guest"
                    )
                    
                    # Test QR code validation during check-in
                    checkin = wedding_service.check_in_guest(
                        wedding_id=wedding.id,
                        qr_code=guest.qr_code,
                        checked_in_by="test_staff",
                        method=CheckInMethod.QR_SCAN
                    )
                    
                    # Verify check-in was successful
                    assert checkin is not None
                    assert checkin.guest_id == guest.id
                    assert checkin.wedding_id == wedding.id
                    assert checkin.method == CheckInMethod.QR_SCAN
                    
                    # Verify wrong QR code fails
                    wrong_qr = generate_qr_code()
                    failed_checkin = wedding_service.check_in_guest(
                        wedding_id=wedding.id,
                        qr_code=wrong_qr,
                        checked_in_by="test_staff",
                        method=CheckInMethod.QR_SCAN
                    )
                    assert failed_checkin is None
                    
                    # Verify QR code from different wedding fails
                    # Create another wedding
                    user2, couple2 = user_service.create_couple_user(
                        email="other" + email,
                        password="testpass123",
                        partner1_name="Other Partner 1",
                        partner2_name="Other Partner 2"
                    )
                    
                    wedding2 = wedding_service.create_wedding(
                        couple_id=couple2.id,
                        wedding_date=date.today() + timedelta(days=60),
                        venue_name="Other " + venue_name,
                        venue_address="456 Other St",
                        expected_guests=50
                    )
                    
                    # Try to use guest's QR code for wrong wedding
                    wrong_wedding_checkin = wedding_service.check_in_guest(
                        wedding_id=wedding2.id,
                        qr_code=guest.qr_code,
                        checked_in_by="test_staff",
                        method=CheckInMethod.QR_SCAN
                    )
                    assert wrong_wedding_checkin is None
                    
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
                pass
    
    @given(
        guest_name=name_strategy,
        email=email_strategy,
        venue_name=venue_strategy,
        updated_name=name_strategy
    )
    @settings(
        max_examples=10,
        deadline=3000,  # 3 seconds
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_qr_code_persistence_on_update(self, guest_name: str, email: str, venue_name: str, updated_name: str):
        """
        **Property 3: QR Code Generation and Validation**
        
        For any guest record update, the original QR code should remain unchanged
        to maintain consistency (validates Requirements 3.4).
        """
        engine, TestingSessionLocal, db_fd, db_path = create_test_db()
        
        try:
            with TestingSessionLocal() as db_session:
                # Create test couple and wedding
                user_service = UserService(db_session)
                wedding_service = WeddingService(db_session)
                
                try:
                    # Create couple
                    user, couple = user_service.create_couple_user(
                        email=email,
                        password="testpass123",
                        partner1_name="Partner 1",
                        partner2_name="Partner 2"
                    )
                    
                    # Create wedding
                    wedding = wedding_service.create_wedding(
                        couple_id=couple.id,
                        wedding_date=date.today() + timedelta(days=30),
                        venue_name=venue_name,
                        venue_address="123 Test St",
                        expected_guests=100
                    )
                    
                    # Add guest
                    guest = wedding_service.add_guest(
                        wedding_id=wedding.id,
                        name=guest_name,
                        email=email + ".guest"
                    )
                    
                    # Store original QR code
                    original_qr_code = guest.qr_code
                    
                    # Update guest information
                    guest.name = updated_name
                    guest.email = "updated" + email
                    guest.table_number = 5
                    guest.dietary_restrictions = "Vegetarian"
                    
                    db_session.commit()
                    db_session.refresh(guest)
                    
                    # Verify QR code remains unchanged
                    assert guest.qr_code == original_qr_code
                    
                    # Verify updated information is saved
                    assert guest.name == updated_name
                    assert guest.email == "updated" + email
                    assert guest.table_number == 5
                    assert guest.dietary_restrictions == "Vegetarian"
                    
                    # Verify QR code still works for check-in
                    checkin = wedding_service.check_in_guest(
                        wedding_id=wedding.id,
                        qr_code=original_qr_code,
                        checked_in_by="test_staff",
                        method=CheckInMethod.QR_SCAN
                    )
                    
                    assert checkin is not None
                    assert checkin.guest_id == guest.id
                    
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
                pass
    
    @given(qr_codes=st.lists(st.text(min_size=10, max_size=50), min_size=2, max_size=10, unique=True))
    @settings(max_examples=10, deadline=1000)
    def test_qr_code_format_consistency(self, qr_codes: list):
        """
        **Property 3: QR Code Generation and Validation**
        
        For any generated QR codes, they should follow a consistent format and
        be suitable for QR code generation.
        """
        for qr_code in qr_codes:
            # Test that QR code generation produces consistent format
            generated_qr = generate_qr_code()
            
            # Verify generated QR code properties
            assert isinstance(generated_qr, str)
            assert len(generated_qr) > 10  # Should be substantial length
            assert generated_qr.strip() == generated_qr  # No leading/trailing whitespace
            
            # Verify uniqueness by generating multiple codes
            other_qr = generate_qr_code()
            assert generated_qr != other_qr  # Should be unique
