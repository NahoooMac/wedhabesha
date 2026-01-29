"""
Unit Tests for Guest Management Endpoints

Tests for guest CRUD operations, bulk import, and QR code functionality.
"""

import pytest
from datetime import date
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel

from app.main import app
from app.core.database import get_db
from app.services.user_service import UserService
from app.services.wedding_service import WeddingService


# Test database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_guests.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="module")
def setup_database():
    """Set up test database"""
    # Import all models to ensure they are registered
    from app.models import user, wedding, vendor, budget
    SQLModel.metadata.create_all(bind=engine)
    yield
    SQLModel.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    """Create test client"""
    return TestClient(app)


@pytest.fixture
def test_couple_and_wedding():
    """Create test couple and wedding"""
    db = TestingSessionLocal()
    try:
        user_service = UserService(db)
        wedding_service = WeddingService(db)
        
        # Create couple
        user, couple = user_service.create_couple_user(
            email="testcouple@example.com",
            password="testpassword123",
            partner1_name="John Doe",
            partner2_name="Jane Doe"
        )
        
        # Create wedding
        wedding = wedding_service.create_wedding(
            couple_id=couple.id,
            wedding_date=date(2024, 6, 15),
            venue_name="Test Venue",
            venue_address="123 Test Street",
            expected_guests=100
        )
        
        return {
            "user": user,
            "couple": couple,
            "wedding": wedding,
            "staff_pin": getattr(wedding, '_plain_staff_pin', None)
        }
    finally:
        db.close()


class TestGuestManagement:
    """Test guest management functionality"""
    
    def test_guest_creation_generates_unique_qr_code(self, setup_database):
        """Test that guest creation generates unique QR codes"""
        db = TestingSessionLocal()
        try:
            user_service = UserService(db)
            wedding_service = WeddingService(db)
            
            # Create couple and wedding
            user, couple = user_service.create_couple_user(
                email="qrtest@example.com",
                password="testpassword123",
                partner1_name="Test Partner 1",
                partner2_name="Test Partner 2"
            )
            
            wedding = wedding_service.create_wedding(
                couple_id=couple.id,
                wedding_date=date(2024, 6, 15),
                venue_name="Test Venue",
                venue_address="123 Test Street",
                expected_guests=100
            )
            
            # Add multiple guests
            guests = []
            for i in range(5):
                guest = wedding_service.add_guest(
                    wedding_id=wedding.id,
                    name=f"Guest {i+1}",
                    email=f"guest{i+1}@example.com"
                )
                guests.append(guest)
            
            # Verify all QR codes are unique
            qr_codes = [guest.qr_code for guest in guests]
            unique_qr_codes = set(qr_codes)
            
            assert len(qr_codes) == len(unique_qr_codes), "All QR codes should be unique"
            assert all(qr_code for qr_code in qr_codes), "All QR codes should be non-empty"
            
        finally:
            db.close()
    
    def test_guest_update_preserves_qr_code(self, setup_database):
        """Test that updating guest information preserves the original QR code"""
        db = TestingSessionLocal()
        try:
            user_service = UserService(db)
            wedding_service = WeddingService(db)
            
            # Create couple and wedding
            user, couple = user_service.create_couple_user(
                email="updatetest@example.com",
                password="testpassword123",
                partner1_name="Test Partner 1",
                partner2_name="Test Partner 2"
            )
            
            wedding = wedding_service.create_wedding(
                couple_id=couple.id,
                wedding_date=date(2024, 6, 15),
                venue_name="Test Venue",
                venue_address="123 Test Street",
                expected_guests=100
            )
            
            # Add guest
            guest = wedding_service.add_guest(
                wedding_id=wedding.id,
                name="Original Name",
                email="original@example.com",
                table_number=1
            )
            
            original_qr_code = guest.qr_code
            
            # Update guest
            updated_guest = wedding_service.update_guest(
                guest_id=guest.id,
                wedding_id=wedding.id,
                name="Updated Name",
                email="updated@example.com",
                table_number=2
            )
            
            # Verify QR code is preserved
            assert updated_guest.qr_code == original_qr_code, "QR code should be preserved during update"
            assert updated_guest.name == "Updated Name", "Name should be updated"
            assert updated_guest.email == "updated@example.com", "Email should be updated"
            assert updated_guest.table_number == 2, "Table number should be updated"
            
        finally:
            db.close()
    
    def test_check_in_idempotence(self, setup_database):
        """Test that duplicate check-ins are handled correctly (idempotent)"""
        db = TestingSessionLocal()
        try:
            user_service = UserService(db)
            wedding_service = WeddingService(db)
            
            # Create couple and wedding
            user, couple = user_service.create_couple_user(
                email="checkintest@example.com",
                password="testpassword123",
                partner1_name="Test Partner 1",
                partner2_name="Test Partner 2"
            )
            
            wedding = wedding_service.create_wedding(
                couple_id=couple.id,
                wedding_date=date(2024, 6, 15),
                venue_name="Test Venue",
                venue_address="123 Test Street",
                expected_guests=100
            )
            
            # Add guest
            guest = wedding_service.add_guest(
                wedding_id=wedding.id,
                name="Test Guest",
                email="testguest@example.com"
            )
            
            # First check-in
            from app.models.wedding import CheckInMethod
            checkin1 = wedding_service.check_in_guest(
                wedding_id=wedding.id,
                qr_code=guest.qr_code,
                checked_in_by="Staff 1",
                method=CheckInMethod.QR_SCAN
            )
            
            assert checkin1 is not None, "First check-in should succeed"
            
            # Duplicate check-in
            checkin2 = wedding_service.check_in_guest(
                wedding_id=wedding.id,
                qr_code=guest.qr_code,
                checked_in_by="Staff 2",
                method=CheckInMethod.QR_SCAN
            )
            
            # Should return the same check-in record
            assert checkin2.id == checkin1.id, "Duplicate check-in should return same record"
            assert checkin2.checked_in_at == checkin1.checked_in_at, "Timestamp should be preserved"
            
        finally:
            db.close()
    
    def test_staff_authentication(self, setup_database):
        """Test staff authentication with wedding code and PIN"""
        db = TestingSessionLocal()
        try:
            user_service = UserService(db)
            wedding_service = WeddingService(db)
            
            # Create couple and wedding
            user, couple = user_service.create_couple_user(
                email="stafftest@example.com",
                password="testpassword123",
                partner1_name="Test Partner 1",
                partner2_name="Test Partner 2"
            )
            
            wedding = wedding_service.create_wedding(
                couple_id=couple.id,
                wedding_date=date(2024, 6, 15),
                venue_name="Test Venue",
                venue_address="123 Test Street",
                expected_guests=100
            )
            
            staff_pin = getattr(wedding, '_plain_staff_pin', None)
            assert staff_pin is not None, "Staff PIN should be generated"
            
            # Test valid authentication
            authenticated_wedding = wedding_service.authenticate_staff(
                wedding_code=wedding.wedding_code,
                staff_pin=staff_pin
            )
            
            assert authenticated_wedding is not None, "Valid credentials should authenticate"
            assert authenticated_wedding.id == wedding.id, "Should return correct wedding"
            
            # Test invalid PIN
            invalid_auth = wedding_service.authenticate_staff(
                wedding_code=wedding.wedding_code,
                staff_pin="000000"
            )
            
            assert invalid_auth is None, "Invalid PIN should fail authentication"
            
            # Test invalid wedding code
            invalid_auth2 = wedding_service.authenticate_staff(
                wedding_code="XXXX",
                staff_pin=staff_pin
            )
            
            assert invalid_auth2 is None, "Invalid wedding code should fail authentication"
            
        finally:
            db.close()


if __name__ == "__main__":
    pytest.main([__file__])