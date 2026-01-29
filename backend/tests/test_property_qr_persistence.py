"""
Property-Based Tests for QR Code Persistence

**Feature: wedding-platform, Property 4: QR Code Persistence**
**Validates: Requirements 3.4**

Tests that QR codes remain unchanged when guest information is updated,
ensuring consistency for distributed QR codes.
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

# Strategy for generating phone numbers
phone_strategy = st.text(
    alphabet=st.characters(whitelist_categories=("Nd", "Zs")),
    min_size=10,
    max_size=15
).filter(lambda x: x and x.strip())

# Strategy for generating table numbers
table_strategy = st.integers(min_value=1, max_value=50)

# Strategy for generating dietary restrictions
dietary_strategy = st.sampled_from([
    "None", "Vegetarian", "Vegan", "Gluten-free", "Dairy-free", 
    "Nut allergy", "Shellfish allergy", "Kosher", "Halal"
])


def create_test_db():
    """Create a temporary test database"""
    db_fd, db_path = tempfile.mkstemp()
    test_db_url = f"sqlite:///{db_path}"
    engine = create_engine(test_db_url, connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return engine, TestingSessionLocal, db_fd, db_path


@pytest.mark.property
class TestQRCodePersistence:
    """Property-based tests for QR code persistence during guest updates"""
    
    @given(
        guest_name=name_strategy,
        email=email_strategy,
        venue_name=venue_strategy,
        updated_name=name_strategy,
        updated_email=email_strategy,
        phone=phone_strategy,
        table_number=table_strategy,
        dietary_restrictions=dietary_strategy
    )
    @settings(
        max_examples=10,
        deadline=3000,  # 3 seconds
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_qr_code_persistence_on_guest_update(
        self, 
        guest_name: str, 
        email: str, 
        venue_name: str,
        updated_name: str,
        updated_email: str,
        phone: str,
        table_number: int,
        dietary_restrictions: str
    ):
        """
        **Property 4: QR Code Persistence**
        
        For any guest record update, the original QR code should remain unchanged
        to maintain consistency. This ensures that QR codes distributed to guests
        remain valid even after guest information is updated.
        """
        engine, TestingSessionLocal, db_fd, db_path = create_test_db()
        
        try:
            with TestingSessionLocal() as db_session:
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
                    
                    # Add guest with initial information
                    guest = wedding_service.add_guest(
                        wedding_id=wedding.id,
                        name=guest_name,
                        email=email + ".guest",
                        phone=phone,
                        table_number=1,
                        dietary_restrictions="None"
                    )
                    
                    # Store original QR code
                    original_qr_code = guest.qr_code
                    
                    # Verify QR code is not empty and has reasonable properties
                    assert original_qr_code
                    assert len(original_qr_code) > 10
                    assert isinstance(original_qr_code, str)
                    
                    # Update guest information with all possible fields
                    updated_guest = wedding_service.update_guest(
                        guest_id=guest.id,
                        wedding_id=wedding.id,
                        name=updated_name,
                        email=updated_email + ".updated",
                        phone=phone + "999",
                        table_number=table_number,
                        dietary_restrictions=dietary_restrictions
                    )
                    
                    # Verify QR code remains unchanged
                    assert updated_guest.qr_code == original_qr_code, \
                        "QR code must remain unchanged after guest update"
                    
                    # Verify all other fields were updated correctly
                    assert updated_guest.name == updated_name
                    assert updated_guest.email == updated_email + ".updated"
                    assert updated_guest.phone == phone + "999"
                    assert updated_guest.table_number == table_number
                    assert updated_guest.dietary_restrictions == dietary_restrictions
                    
                    # Verify QR code still works for check-in after update
                    checkin = wedding_service.check_in_guest(
                        wedding_id=wedding.id,
                        qr_code=original_qr_code,
                        checked_in_by="test_staff",
                        method=CheckInMethod.QR_SCAN
                    )
                    
                    assert checkin is not None, \
                        "QR code should still be valid for check-in after guest update"
                    assert checkin.guest_id == guest.id
                    assert checkin.wedding_id == wedding.id
                    
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
        deadline=2500,  # 2.5 seconds
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_qr_code_persistence_across_multiple_updates(
        self, 
        guest_name: str, 
        email: str, 
        venue_name: str
    ):
        """
        **Property 4: QR Code Persistence**
        
        For any sequence of guest record updates, the original QR code should
        remain unchanged throughout all modifications.
        """
        engine, TestingSessionLocal, db_fd, db_path = create_test_db()
        
        try:
            with TestingSessionLocal() as db_session:
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
                    
                    # Perform multiple updates
                    update_sequences = [
                        {"name": "Updated Name 1"},
                        {"email": "updated1@example.com"},
                        {"table_number": 5},
                        {"dietary_restrictions": "Vegetarian"},
                        {"name": "Updated Name 2", "table_number": 10},
                        {"phone": "+1234567890", "dietary_restrictions": "Vegan"},
                        {"name": "Final Name", "email": "final@example.com", "table_number": 15}
                    ]
                    
                    for i, update_data in enumerate(update_sequences):
                        updated_guest = wedding_service.update_guest(
                            guest_id=guest.id,
                            wedding_id=wedding.id,
                            **update_data
                        )
                        
                        # Verify QR code remains unchanged after each update
                        assert updated_guest.qr_code == original_qr_code, \
                            f"QR code must remain unchanged after update {i+1}: {update_data}"
                        
                        # Verify the specific fields were updated
                        for field, value in update_data.items():
                            assert getattr(updated_guest, field) == value, \
                                f"Field {field} should be updated to {value}"
                    
                    # Final verification that QR code still works
                    checkin = wedding_service.check_in_guest(
                        wedding_id=wedding.id,
                        qr_code=original_qr_code,
                        checked_in_by="test_staff",
                        method=CheckInMethod.QR_SCAN
                    )
                    
                    assert checkin is not None, \
                        "QR code should still be valid after multiple updates"
                    
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
        deadline=2000,  # 2 seconds
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_qr_code_immutability_direct_assignment(
        self, 
        guest_name: str, 
        email: str, 
        venue_name: str
    ):
        """
        **Property 4: QR Code Persistence**
        
        For any attempt to directly modify the QR code field during update,
        the system should preserve the original QR code.
        """
        engine, TestingSessionLocal, db_fd, db_path = create_test_db()
        
        try:
            with TestingSessionLocal() as db_session:
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
                    
                    # Attempt to update QR code directly (should be ignored)
                    updated_guest = wedding_service.update_guest(
                        guest_id=guest.id,
                        wedding_id=wedding.id,
                        name="Updated Name",
                        qr_code="MALICIOUS_QR_CODE_ATTEMPT"  # This should be ignored
                    )
                    
                    # Verify QR code was NOT changed
                    assert updated_guest.qr_code == original_qr_code, \
                        "QR code should not be modifiable through update_guest method"
                    
                    # Verify other fields were updated
                    assert updated_guest.name == "Updated Name"
                    
                    # Verify original QR code still works
                    checkin = wedding_service.check_in_guest(
                        wedding_id=wedding.id,
                        qr_code=original_qr_code,
                        checked_in_by="test_staff",
                        method=CheckInMethod.QR_SCAN
                    )
                    
                    assert checkin is not None, \
                        "Original QR code should still be valid"
                    
                    # Verify malicious QR code does NOT work
                    malicious_checkin = wedding_service.check_in_guest(
                        wedding_id=wedding.id,
                        qr_code="MALICIOUS_QR_CODE_ATTEMPT",
                        checked_in_by="test_staff",
                        method=CheckInMethod.QR_SCAN
                    )
                    
                    assert malicious_checkin is None, \
                        "Malicious QR code should not work for check-in"
                    
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
        deadline=2000,  # 2 seconds
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_qr_code_persistence_with_empty_updates(
        self, 
        guest_name: str, 
        email: str, 
        venue_name: str
    ):
        """
        **Property 4: QR Code Persistence**
        
        For any guest update with empty or no update data, the QR code
        should remain unchanged.
        """
        engine, TestingSessionLocal, db_fd, db_path = create_test_db()
        
        try:
            with TestingSessionLocal() as db_session:
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
                    
                    # Store original QR code and guest data
                    original_qr_code = guest.qr_code
                    original_name = guest.name
                    original_email = guest.email
                    
                    # Update with empty data
                    updated_guest = wedding_service.update_guest(
                        guest_id=guest.id,
                        wedding_id=wedding.id
                        # No update fields provided
                    )
                    
                    # Verify QR code and all data remains unchanged
                    assert updated_guest.qr_code == original_qr_code, \
                        "QR code should remain unchanged with empty update"
                    assert updated_guest.name == original_name, \
                        "Name should remain unchanged with empty update"
                    assert updated_guest.email == original_email, \
                        "Email should remain unchanged with empty update"
                    
                    # Verify QR code still works
                    checkin = wedding_service.check_in_guest(
                        wedding_id=wedding.id,
                        qr_code=original_qr_code,
                        checked_in_by="test_staff",
                        method=CheckInMethod.QR_SCAN
                    )
                    
                    assert checkin is not None, \
                        "QR code should still be valid after empty update"
                    
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
