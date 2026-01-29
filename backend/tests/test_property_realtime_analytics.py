"""
Property Test: Real-time Analytics Updates

**Feature: wedding-platform, Property 8: Real-time Analytics Updates**
**Validates: Requirements 4.5, 7.2**

Property: For any check-in event, the analytics dashboard should reflect the update 
immediately with accurate guest counts and arrival statistics.
"""

import pytest
from hypothesis import given, strategies as st, settings, HealthCheck
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
import asyncio
import json

from app.models.user import User, Couple, UserType, AuthProvider
from app.models.wedding import Wedding, Guest, CheckIn, CheckInMethod
from app.services.checkin_service import CheckInService
from app.core.security import generate_wedding_code, generate_staff_pin, hash_pin, generate_qr_code
from app.core.redis import redis_service


@pytest.fixture
def analytics_wedding_with_guests(db_session: Session):
    """Create a wedding with guests for analytics testing"""
    # Create user and couple
    user = User(
        email="analytics@example.com",
        password_hash="hashed_password",
        user_type=UserType.COUPLE,
        auth_provider=AuthProvider.EMAIL
    )
    db_session.add(user)
    db_session.flush()
    
    couple = Couple(
        user_id=user.id,
        partner1_name="Analytics Partner 1",
        partner2_name="Analytics Partner 2"
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
        venue_name="Analytics Test Venue",
        venue_address="Analytics Address",
        expected_guests=15
    )
    db_session.add(wedding)
    db_session.flush()
    
    # Create guests for analytics testing
    guests = []
    for i in range(10):
        guest = Guest(
            wedding_id=wedding.id,
            name=f"Analytics Guest {i+1}",
            email=f"analytics_guest{i+1}@example.com",
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


class TestRealtimeAnalyticsUpdates:
    """Test class for real-time analytics updates property"""
    
    @given(
        checkin_sequence=st.lists(
            st.integers(min_value=0, max_value=9), 
            min_size=1, 
            max_size=8, 
            unique=True
        )
    )
    @settings(max_examples=10, deadline=10000, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_analytics_update_after_checkin(
        self,
        analytics_wedding_with_guests: dict,
        db_session: Session,
        checkin_sequence: list
    ):
        """
        **Property 8: Real-time Analytics Updates**
        **Validates: Requirements 4.5, 7.2**
        
        Test that analytics are updated immediately after each check-in with accurate counts.
        """
        wedding = analytics_wedding_with_guests["wedding"]
        guests = analytics_wedding_with_guests["guests"]
        checkin_service = CheckInService(db_session)
        
        async def run_test():
            initial_stats = await checkin_service.get_checkin_stats(wedding.id)
            
            # Verify initial state
            assert initial_stats["total_guests"] == len(guests)
            assert initial_stats["checked_in_count"] == 0
            assert initial_stats["pending_count"] == len(guests)
            assert initial_stats["checkin_rate"] == 0.0
            assert len(initial_stats["recent_checkins"]) == 0
            
            # Check in guests according to the sequence
            for i, guest_index in enumerate(checkin_sequence):
                guest = guests[guest_index]
                staff_identifier = f"analytics_staff_{i}"
                
                # Perform check-in
                checkin = await checkin_service.scan_qr_checkin(
                    qr_code=guest.qr_code,
                    wedding_id=wedding.id,
                    staff_identifier=staff_identifier
                )
                
                # Verify check-in was successful
                assert checkin is not None
                assert checkin.guest_id == guest.id
                assert checkin.wedding_id == wedding.id
                
                # Get updated analytics
                updated_stats = await checkin_service.get_checkin_stats(wedding.id)
                
                # Verify analytics are immediately updated
                expected_checked_in = i + 1
                expected_pending = len(guests) - expected_checked_in
                expected_rate = (expected_checked_in / len(guests)) * 100
                
                assert updated_stats["total_guests"] == len(guests), f"Total guests should remain {len(guests)}"
                assert updated_stats["checked_in_count"] == expected_checked_in, f"Expected {expected_checked_in} checked in, got {updated_stats['checked_in_count']}"
                assert updated_stats["pending_count"] == expected_pending, f"Expected {expected_pending} pending, got {updated_stats['pending_count']}"
                assert abs(updated_stats["checkin_rate"] - expected_rate) < 0.1, f"Expected rate ~{expected_rate}%, got {updated_stats['checkin_rate']}%"
                
                # Verify recent check-ins list is updated
                assert len(updated_stats["recent_checkins"]) == expected_checked_in, f"Recent check-ins should have {expected_checked_in} entries"
                
                # Verify the most recent check-in is at the top
                most_recent = updated_stats["recent_checkins"][0]
                assert most_recent["guest_name"] == guest.name
                assert most_recent["method"] == CheckInMethod.QR_SCAN.value
                
                # Verify timestamp is recent
                checkin_timestamp = most_recent["checked_in_at"]
                
                # Handle both datetime objects and ISO strings
                if isinstance(checkin_timestamp, datetime):
                    checkin_time = checkin_timestamp
                else:
                    checkin_time = datetime.fromisoformat(str(checkin_timestamp).replace('Z', '+00:00').replace('+00:00', ''))
                
                time_diff = abs((datetime.utcnow() - checkin_time).total_seconds())
                assert time_diff < 5, f"Check-in timestamp should be recent, but was {time_diff} seconds ago"
        
        # Run the async test
        asyncio.run(run_test())
    
    @given(
        guest_count=st.integers(min_value=3, max_value=7),
        batch_size=st.integers(min_value=1, max_value=3)
    )
    @settings(max_examples=10, deadline=15000, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_analytics_consistency_across_batches(
        self,
        analytics_wedding_with_guests: dict,
        db_session: Session,
        guest_count: int,
        batch_size: int
    ):
        """
        **Property 8: Real-time Analytics Updates**
        **Validates: Requirements 4.5, 7.2**
        
        Test that analytics remain consistent when processing check-ins in batches.
        """
        wedding = analytics_wedding_with_guests["wedding"]
        guests = analytics_wedding_with_guests["guests"][:guest_count]
        checkin_service = CheckInService(db_session)
        
        async def run_test():
            total_checked_in = 0
            
            # Process guests in batches
            for batch_start in range(0, len(guests), batch_size):
                batch_end = min(batch_start + batch_size, len(guests))
                batch_guests = guests[batch_start:batch_end]
                
                # Check in all guests in this batch
                for guest in batch_guests:
                    await checkin_service.scan_qr_checkin(
                        qr_code=guest.qr_code,
                        wedding_id=wedding.id,
                        staff_identifier=f"batch_staff_{total_checked_in}"
                    )
                    total_checked_in += 1
                
                # Verify analytics after each batch
                stats = await checkin_service.get_checkin_stats(wedding.id)
                
                assert stats["total_guests"] == len(guests)
                assert stats["checked_in_count"] == total_checked_in
                assert stats["pending_count"] == len(guests) - total_checked_in
                
                expected_rate = (total_checked_in / len(guests)) * 100
                assert abs(stats["checkin_rate"] - expected_rate) < 0.1
                
                # Verify recent check-ins list length
                expected_recent_count = min(total_checked_in, 10)  # Service limits to 10 recent
                assert len(stats["recent_checkins"]) == expected_recent_count
        
        # Run the async test
        asyncio.run(run_test())
    
    @given(
        manual_checkins=st.integers(min_value=1, max_value=3),
        qr_checkins=st.integers(min_value=1, max_value=3)
    )
    @settings(max_examples=10, deadline=12000, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_analytics_mixed_checkin_methods(
        self,
        analytics_wedding_with_guests: dict,
        db_session: Session,
        manual_checkins: int,
        qr_checkins: int
    ):
        """
        **Property 8: Real-time Analytics Updates**
        **Validates: Requirements 4.5, 7.2**
        
        Test that analytics correctly track different check-in methods.
        """
        wedding = analytics_wedding_with_guests["wedding"]
        guests = analytics_wedding_with_guests["guests"]
        checkin_service = CheckInService(db_session)
        
        total_operations = manual_checkins + qr_checkins
        if total_operations > len(guests):
            # Skip if we don't have enough guests
            return
        
        async def run_test():
            checked_in_count = 0
            
            # Perform manual check-ins
            for i in range(manual_checkins):
                guest = guests[i]
                await checkin_service.manual_checkin(
                    guest_id=guest.id,
                    wedding_id=wedding.id,
                    staff_identifier=f"manual_staff_{i}"
                )
                checked_in_count += 1
                
                # Verify analytics update
                stats = await checkin_service.get_checkin_stats(wedding.id)
                assert stats["checked_in_count"] == checked_in_count
                
                # Verify method is recorded correctly
                recent_checkin = stats["recent_checkins"][0]
                assert recent_checkin["method"] == CheckInMethod.MANUAL.value
            
            # Perform QR check-ins
            for i in range(qr_checkins):
                guest = guests[manual_checkins + i]
                await checkin_service.scan_qr_checkin(
                    qr_code=guest.qr_code,
                    wedding_id=wedding.id,
                    staff_identifier=f"qr_staff_{i}"
                )
                checked_in_count += 1
                
                # Verify analytics update
                stats = await checkin_service.get_checkin_stats(wedding.id)
                assert stats["checked_in_count"] == checked_in_count
                
                # Verify method is recorded correctly
                recent_checkin = stats["recent_checkins"][0]
                assert recent_checkin["method"] == CheckInMethod.QR_SCAN.value
            
            # Final verification
            final_stats = await checkin_service.get_checkin_stats(wedding.id)
            assert final_stats["checked_in_count"] == total_operations
            assert final_stats["pending_count"] == len(guests) - total_operations
            
            # Verify recent check-ins contain both methods
            methods_in_recent = [checkin["method"] for checkin in final_stats["recent_checkins"]]
            if manual_checkins > 0:
                assert CheckInMethod.MANUAL.value in methods_in_recent
            if qr_checkins > 0:
                assert CheckInMethod.QR_SCAN.value in methods_in_recent
        
        # Run the async test
        asyncio.run(run_test())
    
    def test_redis_analytics_storage(
        self,
        analytics_wedding_with_guests: dict,
        db_session: Session
    ):
        """
        Test that analytics are properly stored in Redis for real-time access
        """
        wedding = analytics_wedding_with_guests["wedding"]
        guest = analytics_wedding_with_guests["guests"][0]
        checkin_service = CheckInService(db_session)
        
        async def run_test():
            # Perform a check-in
            await checkin_service.scan_qr_checkin(
                qr_code=guest.qr_code,
                wedding_id=wedding.id,
                staff_identifier="redis_test_staff"
            )
            
            # Check if Redis is available
            if redis_service.is_available():
                # Verify stats are stored in Redis
                redis_key = f"wedding:{wedding.id}:stats"
                cached_stats = await redis_service.get_json(redis_key)
                
                if cached_stats:  # Only test if Redis is working
                    assert cached_stats["total_guests"] == len(analytics_wedding_with_guests["guests"])
                    assert cached_stats["checked_in_count"] == 1
                    assert cached_stats["pending_count"] == len(analytics_wedding_with_guests["guests"]) - 1
                    assert len(cached_stats["recent_checkins"]) == 1
                    assert cached_stats["recent_checkins"][0]["guest_name"] == guest.name
            else:
                # If Redis is not available, just verify the service still works
                stats = await checkin_service.get_checkin_stats(wedding.id)
                assert stats["checked_in_count"] == 1
        
        # Run the async test
        asyncio.run(run_test())
    
    def test_analytics_timestamp_accuracy(
        self,
        analytics_wedding_with_guests: dict,
        db_session: Session
    ):
        """
        Test that analytics timestamps are accurate and properly ordered
        """
        wedding = analytics_wedding_with_guests["wedding"]
        guests = analytics_wedding_with_guests["guests"][:3]
        checkin_service = CheckInService(db_session)
        
        async def run_test():
            checkin_times = []
            
            # Check in guests with small delays
            for i, guest in enumerate(guests):
                start_time = datetime.utcnow()
                
                await checkin_service.scan_qr_checkin(
                    qr_code=guest.qr_code,
                    wedding_id=wedding.id,
                    staff_identifier=f"timestamp_staff_{i}"
                )
                
                end_time = datetime.utcnow()
                checkin_times.append((start_time, end_time))
                
                # Small delay between check-ins
                await asyncio.sleep(0.1)
            
            # Get final analytics
            stats = await checkin_service.get_checkin_stats(wedding.id)
            recent_checkins = stats["recent_checkins"]
            
            # Verify timestamps are in correct order (most recent first)
            for i in range(len(recent_checkins) - 1):
                current_checkin = recent_checkins[i]["checked_in_at"]
                next_checkin = recent_checkins[i + 1]["checked_in_at"]
                
                # Handle both datetime objects and ISO strings
                if isinstance(current_checkin, datetime):
                    current_time = current_checkin
                else:
                    current_time = datetime.fromisoformat(str(current_checkin).replace('Z', '+00:00').replace('+00:00', ''))
                
                if isinstance(next_checkin, datetime):
                    next_time = next_checkin
                else:
                    next_time = datetime.fromisoformat(str(next_checkin).replace('Z', '+00:00').replace('+00:00', ''))
                
                assert current_time >= next_time, "Recent check-ins should be ordered by time (newest first)"
            
            # Verify timestamps are within expected ranges
            for i, checkin in enumerate(recent_checkins):
                checkin_timestamp = checkin["checked_in_at"]
                
                # Handle both datetime objects and ISO strings
                if isinstance(checkin_timestamp, datetime):
                    checkin_time = checkin_timestamp
                else:
                    checkin_time = datetime.fromisoformat(str(checkin_timestamp).replace('Z', '+00:00').replace('+00:00', ''))
                
                expected_start, expected_end = checkin_times[len(guests) - 1 - i]  # Reverse order
                
                assert expected_start <= checkin_time <= expected_end + timedelta(seconds=1), f"Check-in timestamp should be within expected range"
        
        # Run the async test
        asyncio.run(run_test())
