"""
Property Test: Check-in Idempotence

**Feature: wedding-platform, Property 6: Check-in Idempotence**
**Validates: Requirements 4.3**

Property: For any guest, attempting to check in multiple times should result in 
only one check-in record with the original timestamp preserved.
"""

import pytest
from hypothesis import given, strategies as st, settings, HealthCheck
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
import asyncio

from app.models.user import User, Couple, UserType, AuthProvider
from app.models.wedding import Wedding, Guest, CheckIn, CheckInMethod
from app.services.checkin_service import CheckInService
from app.core.security import generate_wedding_code, generate_staff_pin, hash_pin, generate_qr_code


@pytest.fixture
def checkin_service(db_session: Session):
    """Create CheckInService instance"""
    return CheckInService(db_session)


@pytest.fixture
def sample_wedding_with_guests(db_session: Session):
    """Create a wedding with guests for testing"""
    # Create user and couple
    user = User(
        email="test@example.com",
        password_hash="hashed_password",
        user_type=UserType.COUPLE,
        auth_provider=AuthProvider.EMAIL
    )
    db_session.add(user)
    db_session.flush()
    
    couple = Couple(
        user_id=user.id,
        partner1_name="Partner 1",
        partner2_name="Partner 2"
    )
    db_session.add(couple)
    db_session.flush()
    
    # Create wedding
    wedding_code = generate_wedding_code()
    staff_pin = generate_staff_pin()
    
    wedding = Wedding(
        couple_id=couple.id,
        wedding_code=wedding_code,
        staff_pin=hash_pin(staff_pin),
        wedding_date=datetime.now().date(),
        venue_name="Test Venue",
        venue_address="Test Address",
        expected_guests=10
    )
    db_session.add(wedding)
    db_session.flush()
    
    # Create guests
    guests = []
    for i in range(5):
        guest = Guest(
            wedding_id=wedding.id,
            name=f"Guest {i+1}",
            email=f"guest{i+1}@example.com",
            qr_code=generate_qr_code()
        )
        db_session.add(guest)
        guests.append(guest)
    
    db_session.commit()
    
    return {
        "wedding": wedding,
        "guests": guests,
        "staff_pin": staff_pin
    }


class TestCheckInIdempotence:
    """Test class for check-in idempotence property"""
    
    @given(
        attempt_count=st.integers(min_value=2, max_value=10),
        time_delay_seconds=st.integers(min_value=0, max_value=300)
    )
    @settings(max_examples=10, deadline=10000, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_checkin_idempotence_qr_scan(
        self,
        checkin_service: CheckInService,
        sample_wedding_with_guests: dict,
        db_session: Session,
        attempt_count: int,
        time_delay_seconds: int
    ):
        """
        **Property 6: Check-in Idempotence**
        **Validates: Requirements 4.3**
        
        Test that multiple QR scan attempts for the same guest result in only one check-in record
        with the original timestamp preserved.
        """
        wedding = sample_wedding_with_guests["wedding"]
        guest = sample_wedding_with_guests["guests"][0]  # Use first guest
        staff_identifier = "test_staff"
        
        async def run_test():
            # Clear any existing check-ins for this guest to ensure clean state
            db_session.query(CheckIn).filter(
                CheckIn.guest_id == guest.id,
                CheckIn.wedding_id == wedding.id
            ).delete()
            db_session.commit()
            
            # Record the time before first check-in
            start_time = datetime.utcnow()
            
            # First check-in should succeed
            first_checkin = None
            try:
                first_checkin = await checkin_service.scan_qr_checkin(
                    qr_code=guest.qr_code,
                    wedding_id=wedding.id,
                    staff_identifier=staff_identifier
                )
                assert first_checkin is not None
                assert first_checkin.guest_id == guest.id
                assert first_checkin.wedding_id == wedding.id
                assert first_checkin.method == CheckInMethod.QR_SCAN
                
                # Verify timestamp is reasonable
                assert first_checkin.checked_in_at >= start_time
                assert first_checkin.checked_in_at <= datetime.utcnow()
                
            except Exception as e:
                pytest.fail(f"First check-in should succeed: {e}")
            
            original_timestamp = first_checkin.checked_in_at
            
            # Attempt multiple additional check-ins
            for attempt in range(1, attempt_count):
                try:
                    # This should raise ValueError for duplicate check-in
                    await checkin_service.scan_qr_checkin(
                        qr_code=guest.qr_code,
                        wedding_id=wedding.id,
                        staff_identifier=f"{staff_identifier}_{attempt}"
                    )
                    pytest.fail(f"Attempt {attempt + 1} should have failed with duplicate check-in error")
                    
                except ValueError as e:
                    # Expected behavior - should indicate guest already checked in
                    assert "already checked in" in str(e).lower()
            
            # Verify only one check-in record exists
            all_checkins = db_session.query(CheckIn).filter(
                CheckIn.guest_id == guest.id,
                CheckIn.wedding_id == wedding.id
            ).all()
            
            assert len(all_checkins) == 1, f"Expected exactly 1 check-in record, found {len(all_checkins)}"
            
            # Verify the check-in record is unchanged
            final_checkin = all_checkins[0]
            assert final_checkin.id == first_checkin.id
            assert final_checkin.checked_in_at == original_timestamp
            assert final_checkin.checked_in_by == staff_identifier  # Original staff identifier
            assert final_checkin.method == CheckInMethod.QR_SCAN
        
        # Run the async test
        asyncio.run(run_test())
    
    @given(
        attempt_count=st.integers(min_value=2, max_value=10),
        different_staff=st.booleans()
    )
    @settings(max_examples=10, deadline=10000, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_checkin_idempotence_manual(
        self,
        checkin_service: CheckInService,
        sample_wedding_with_guests: dict,
        db_session: Session,
        attempt_count: int,
        different_staff: bool
    ):
        """
        **Property 6: Check-in Idempotence**
        **Validates: Requirements 4.3**
        
        Test that multiple manual check-in attempts for the same guest result in only one 
        check-in record with the original timestamp preserved.
        """
        wedding = sample_wedding_with_guests["wedding"]
        guest = sample_wedding_with_guests["guests"][1]  # Use second guest
        base_staff_identifier = "manual_staff"
        
        async def run_test():
            # Clear any existing check-ins for this guest to ensure clean state
            db_session.query(CheckIn).filter(
                CheckIn.guest_id == guest.id,
                CheckIn.wedding_id == wedding.id
            ).delete()
            db_session.commit()
            
            # Record the time before first check-in
            start_time = datetime.utcnow()
            
            # First check-in should succeed
            first_checkin = None
            try:
                first_checkin = await checkin_service.manual_checkin(
                    guest_id=guest.id,
                    wedding_id=wedding.id,
                    staff_identifier=base_staff_identifier
                )
                assert first_checkin is not None
                assert first_checkin.guest_id == guest.id
                assert first_checkin.wedding_id == wedding.id
                assert first_checkin.method == CheckInMethod.MANUAL
                
                # Verify timestamp is reasonable
                assert first_checkin.checked_in_at >= start_time
                assert first_checkin.checked_in_at <= datetime.utcnow()
                
            except Exception as e:
                pytest.fail(f"First manual check-in should succeed: {e}")
            
            original_timestamp = first_checkin.checked_in_at
            
            # Attempt multiple additional check-ins
            for attempt in range(1, attempt_count):
                staff_identifier = f"{base_staff_identifier}_{attempt}" if different_staff else base_staff_identifier
                
                try:
                    # This should raise ValueError for duplicate check-in
                    await checkin_service.manual_checkin(
                        guest_id=guest.id,
                        wedding_id=wedding.id,
                        staff_identifier=staff_identifier
                    )
                    pytest.fail(f"Manual attempt {attempt + 1} should have failed with duplicate check-in error")
                    
                except ValueError as e:
                    # Expected behavior - should indicate guest already checked in
                    assert "already checked in" in str(e).lower()
            
            # Verify only one check-in record exists
            all_checkins = db_session.query(CheckIn).filter(
                CheckIn.guest_id == guest.id,
                CheckIn.wedding_id == wedding.id
            ).all()
            
            assert len(all_checkins) == 1, f"Expected exactly 1 check-in record, found {len(all_checkins)}"
            
            # Verify the check-in record is unchanged
            final_checkin = all_checkins[0]
            assert final_checkin.id == first_checkin.id
            assert final_checkin.checked_in_at == original_timestamp
            assert final_checkin.checked_in_by == base_staff_identifier  # Original staff identifier
            assert final_checkin.method == CheckInMethod.MANUAL
        
        # Run the async test
        asyncio.run(run_test())
    
    @given(
        guest_index=st.integers(min_value=0, max_value=4),
        mixed_attempts=st.integers(min_value=2, max_value=6)
    )
    @settings(max_examples=10, deadline=10000, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_checkin_idempotence_mixed_methods(
        self,
        checkin_service: CheckInService,
        sample_wedding_with_guests: dict,
        db_session: Session,
        guest_index: int,
        mixed_attempts: int
    ):
        """
        **Property 6: Check-in Idempotence**
        **Validates: Requirements 4.3**
        
        Test that mixing QR scan and manual check-in attempts for the same guest 
        results in only one check-in record.
        """
        wedding = sample_wedding_with_guests["wedding"]
        guest = sample_wedding_with_guests["guests"][guest_index]
        staff_identifier = "mixed_staff"
        
        async def run_test():
            # Clear any existing check-ins for this guest to ensure clean state
            db_session.query(CheckIn).filter(
                CheckIn.guest_id == guest.id,
                CheckIn.wedding_id == wedding.id
            ).delete()
            db_session.commit()
            
            # Record the time before first check-in
            start_time = datetime.utcnow()
            
            # First check-in using QR scan
            first_checkin = None
            try:
                first_checkin = await checkin_service.scan_qr_checkin(
                    qr_code=guest.qr_code,
                    wedding_id=wedding.id,
                    staff_identifier=staff_identifier
                )
                assert first_checkin is not None
                assert first_checkin.method == CheckInMethod.QR_SCAN
                
            except Exception as e:
                pytest.fail(f"First QR check-in should succeed: {e}")
            
            original_timestamp = first_checkin.checked_in_at
            
            # Attempt mixed method check-ins
            for attempt in range(1, mixed_attempts):
                if attempt % 2 == 0:
                    # Try QR scan
                    try:
                        await checkin_service.scan_qr_checkin(
                            qr_code=guest.qr_code,
                            wedding_id=wedding.id,
                            staff_identifier=f"{staff_identifier}_qr_{attempt}"
                        )
                        pytest.fail(f"QR attempt {attempt} should have failed")
                    except ValueError as e:
                        assert "already checked in" in str(e).lower()
                else:
                    # Try manual check-in
                    try:
                        await checkin_service.manual_checkin(
                            guest_id=guest.id,
                            wedding_id=wedding.id,
                            staff_identifier=f"{staff_identifier}_manual_{attempt}"
                        )
                        pytest.fail(f"Manual attempt {attempt} should have failed")
                    except ValueError as e:
                        assert "already checked in" in str(e).lower()
            
            # Verify only one check-in record exists
            all_checkins = db_session.query(CheckIn).filter(
                CheckIn.guest_id == guest.id,
                CheckIn.wedding_id == wedding.id
            ).all()
            
            assert len(all_checkins) == 1, f"Expected exactly 1 check-in record, found {len(all_checkins)}"
            
            # Verify the original check-in record is preserved
            final_checkin = all_checkins[0]
            assert final_checkin.id == first_checkin.id
            assert final_checkin.checked_in_at == original_timestamp
            assert final_checkin.checked_in_by == staff_identifier  # Original staff identifier
            assert final_checkin.method == CheckInMethod.QR_SCAN  # Original method
        
        # Run the async test
        asyncio.run(run_test())
    
    def test_checkin_idempotence_different_guests(
        self,
        checkin_service: CheckInService,
        sample_wedding_with_guests: dict,
        db_session: Session
    ):
        """
        Test that check-in idempotence is per-guest (different guests can check in)
        """
        wedding = sample_wedding_with_guests["wedding"]
        guest1 = sample_wedding_with_guests["guests"][0]
        guest2 = sample_wedding_with_guests["guests"][1]
        staff_identifier = "test_staff"
        
        async def run_test():
            # Check in first guest
            checkin1 = await checkin_service.scan_qr_checkin(
                qr_code=guest1.qr_code,
                wedding_id=wedding.id,
                staff_identifier=staff_identifier
            )
            
            # Check in second guest should succeed
            checkin2 = await checkin_service.scan_qr_checkin(
                qr_code=guest2.qr_code,
                wedding_id=wedding.id,
                staff_identifier=staff_identifier
            )
            
            # Verify both check-ins exist
            assert checkin1.guest_id == guest1.id
            assert checkin2.guest_id == guest2.id
            assert checkin1.id != checkin2.id
            
            # Verify total check-ins
            total_checkins = db_session.query(CheckIn).filter(
                CheckIn.wedding_id == wedding.id
            ).count()
            
            assert total_checkins == 2
        
        # Run the async test
        asyncio.run(run_test())
