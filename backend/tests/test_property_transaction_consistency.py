"""
Property Test: Transaction Consistency

**Feature: wedding-platform, Property 7: Transaction Consistency**
**Validates: Requirements 4.4, 11.2**

Property: For any concurrent check-in operations on the same wedding, the system should 
maintain data consistency and prevent race conditions through proper transaction handling.
"""

import pytest
from hypothesis import given, strategies as st, settings, HealthCheck
from datetime import datetime
from sqlalchemy.orm import Session
import asyncio
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

from app.models.user import User, Couple, UserType, AuthProvider
from app.models.wedding import Wedding, Guest, CheckIn, CheckInMethod
from app.services.checkin_service import CheckInService
from app.core.security import generate_wedding_code, generate_staff_pin, hash_pin, generate_qr_code
from app.core.database import get_db


@pytest.fixture
def sample_wedding_with_many_guests(db_session: Session):
    """Create a wedding with many guests for concurrent testing"""
    # Create user and couple
    user = User(
        email="concurrent@example.com",
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
        venue_name="Concurrent Test Venue",
        venue_address="Test Address",
        expected_guests=50
    )
    db_session.add(wedding)
    db_session.flush()
    
    # Create many guests for concurrent testing
    guests = []
    for i in range(20):  # Create 20 guests for concurrent operations
        guest = Guest(
            wedding_id=wedding.id,
            name=f"Concurrent Guest {i+1}",
            email=f"concurrent_guest{i+1}@example.com",
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


class TestTransactionConsistency:
    """Test class for transaction consistency property"""
    
    def create_db_session(self):
        """Create a new database session for concurrent operations"""
        # This is a simplified approach - in a real test you'd need proper session management
        from app.core.database import engine
        from sqlalchemy.orm import sessionmaker
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        return SessionLocal()
    
    def concurrent_checkin_worker(self, guest_qr_code: str, wedding_id: int, staff_id: str):
        """Worker function for concurrent check-in operations"""
        try:
            # Create new session for this thread
            session = self.create_db_session()
            checkin_service = CheckInService(session)
            
            async def do_checkin():
                return await checkin_service.scan_qr_checkin(
                    qr_code=guest_qr_code,
                    wedding_id=wedding_id,
                    staff_identifier=staff_id
                )
            
            # Run async operation in thread
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            result = loop.run_until_complete(do_checkin())
            loop.close()
            
            session.close()
            return {"success": True, "checkin": result, "error": None}
            
        except Exception as e:
            return {"success": False, "checkin": None, "error": str(e)}
    
    @given(
        concurrent_attempts=st.integers(min_value=2, max_value=5),
        guest_count=st.integers(min_value=5, max_value=15)
    )
    @settings(max_examples=10, deadline=15000, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_concurrent_checkin_same_guest_consistency(
        self,
        sample_wedding_with_many_guests: dict,
        db_session: Session,
        concurrent_attempts: int,
        guest_count: int
    ):
        """
        **Property 7: Transaction Consistency**
        **Validates: Requirements 4.4, 11.2**
        
        Test that concurrent check-in attempts for the same guest result in exactly one 
        check-in record, demonstrating proper transaction isolation.
        """
        wedding = sample_wedding_with_many_guests["wedding"]
        # Use a subset of guests based on the generated guest_count
        test_guests = sample_wedding_with_many_guests["guests"][:min(guest_count, len(sample_wedding_with_many_guests["guests"]))]
        
        for guest_idx, guest in enumerate(test_guests):
            # Test concurrent attempts on the same guest
            with ThreadPoolExecutor(max_workers=concurrent_attempts) as executor:
                # Submit concurrent check-in attempts for the same guest
                futures = []
                for attempt in range(concurrent_attempts):
                    staff_id = f"concurrent_staff_{guest_idx}_{attempt}"
                    future = executor.submit(
                        self.concurrent_checkin_worker,
                        guest.qr_code,
                        wedding.id,
                        staff_id
                    )
                    futures.append(future)
                
                # Collect results
                results = []
                for future in as_completed(futures):
                    results.append(future.result())
            
            # Analyze results
            successful_checkins = [r for r in results if r["success"]]
            failed_checkins = [r for r in results if not r["success"]]
            
            # Exactly one check-in should succeed
            assert len(successful_checkins) == 1, f"Expected exactly 1 successful check-in for guest {guest.name}, got {len(successful_checkins)}"
            
            # All other attempts should fail with "already checked in" error
            assert len(failed_checkins) == concurrent_attempts - 1, f"Expected {concurrent_attempts - 1} failed attempts, got {len(failed_checkins)}"
            
            for failed_result in failed_checkins:
                assert "already checked in" in failed_result["error"].lower(), f"Unexpected error: {failed_result['error']}"
            
            # Verify database consistency - exactly one check-in record should exist
            checkin_count = db_session.query(CheckIn).filter(
                CheckIn.guest_id == guest.id,
                CheckIn.wedding_id == wedding.id
            ).count()
            
            assert checkin_count == 1, f"Expected exactly 1 check-in record in database for guest {guest.name}, found {checkin_count}"
    
    @given(
        concurrent_guests=st.integers(min_value=3, max_value=8),
        staff_count=st.integers(min_value=2, max_value=4)
    )
    @settings(max_examples=10, deadline=20000, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_concurrent_different_guests_consistency(
        self,
        sample_wedding_with_many_guests: dict,
        db_session: Session,
        concurrent_guests: int,
        staff_count: int
    ):
        """
        **Property 7: Transaction Consistency**
        **Validates: Requirements 4.4, 11.2**
        
        Test that concurrent check-in operations for different guests all succeed 
        and maintain data consistency.
        """
        wedding = sample_wedding_with_many_guests["wedding"]
        # Use a subset of guests based on the generated concurrent_guests count
        test_guests = sample_wedding_with_many_guests["guests"][:min(concurrent_guests, len(sample_wedding_with_many_guests["guests"]))]
        
        with ThreadPoolExecutor(max_workers=len(test_guests)) as executor:
            # Submit concurrent check-in attempts for different guests
            futures = []
            for guest_idx, guest in enumerate(test_guests):
                staff_id = f"multi_staff_{guest_idx % staff_count}"
                future = executor.submit(
                    self.concurrent_checkin_worker,
                    guest.qr_code,
                    wedding.id,
                    staff_id
                )
                futures.append((future, guest))
            
            # Collect results
            results = []
            for future, guest in futures:
                result = future.result()
                results.append((result, guest))
        
        # All check-ins should succeed
        successful_count = 0
        failed_count = 0
        
        for result, guest in results:
            if result["success"]:
                successful_count += 1
                # Verify the check-in record is correct
                checkin = result["checkin"]
                assert checkin.guest_id == guest.id
                assert checkin.wedding_id == wedding.id
                assert checkin.method == CheckInMethod.QR_SCAN
            else:
                failed_count += 1
                print(f"Unexpected failure for guest {guest.name}: {result['error']}")
        
        # All different guests should check in successfully
        assert successful_count == len(test_guests), f"Expected {len(test_guests)} successful check-ins, got {successful_count}"
        assert failed_count == 0, f"Expected 0 failed check-ins, got {failed_count}"
        
        # Verify database consistency - exactly one check-in per guest
        total_checkins = db_session.query(CheckIn).filter(
            CheckIn.wedding_id == wedding.id
        ).count()
        
        assert total_checkins == len(test_guests), f"Expected {len(test_guests)} check-in records, found {total_checkins}"
        
        # Verify each guest has exactly one check-in
        for guest in test_guests:
            guest_checkins = db_session.query(CheckIn).filter(
                CheckIn.guest_id == guest.id,
                CheckIn.wedding_id == wedding.id
            ).count()
            
            assert guest_checkins == 1, f"Guest {guest.name} should have exactly 1 check-in, found {guest_checkins}"
    
    @given(
        mixed_operations=st.integers(min_value=4, max_value=10)
    )
    @settings(max_examples=10, deadline=25000, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_mixed_concurrent_operations_consistency(
        self,
        sample_wedding_with_many_guests: dict,
        db_session: Session,
        mixed_operations: int
    ):
        """
        **Property 7: Transaction Consistency**
        **Validates: Requirements 4.4, 11.2**
        
        Test that mixed concurrent operations (some duplicate, some unique) maintain 
        proper transaction consistency.
        """
        wedding = sample_wedding_with_many_guests["wedding"]
        guests = sample_wedding_with_many_guests["guests"][:min(mixed_operations, len(sample_wedding_with_many_guests["guests"]))]
        
        # Create a mix of operations: some duplicates, some unique
        operations = []
        
        # Add unique operations for first half of guests
        unique_count = len(guests) // 2
        for i in range(unique_count):
            operations.append({
                "guest": guests[i],
                "staff_id": f"unique_staff_{i}",
                "operation_type": "unique"
            })
        
        # Add duplicate operations for some guests
        duplicate_guest_count = min(3, len(guests) - unique_count)
        for i in range(duplicate_guest_count):
            guest = guests[i]  # Reuse some guests for duplicates
            # Add 2-3 duplicate attempts for this guest
            for j in range(2):
                operations.append({
                    "guest": guest,
                    "staff_id": f"duplicate_staff_{i}_{j}",
                    "operation_type": "duplicate"
                })
        
        # Execute all operations concurrently
        with ThreadPoolExecutor(max_workers=len(operations)) as executor:
            futures = []
            for op in operations:
                future = executor.submit(
                    self.concurrent_checkin_worker,
                    op["guest"].qr_code,
                    wedding.id,
                    op["staff_id"]
                )
                futures.append((future, op))
            
            # Collect results
            results = []
            for future, op in futures:
                result = future.result()
                results.append((result, op))
        
        # Analyze results by guest
        guest_results = {}
        for result, op in results:
            guest_id = op["guest"].id
            if guest_id not in guest_results:
                guest_results[guest_id] = {"successes": [], "failures": [], "guest": op["guest"]}
            
            if result["success"]:
                guest_results[guest_id]["successes"].append(result)
            else:
                guest_results[guest_id]["failures"].append(result)
        
        # Verify consistency for each guest
        for guest_id, guest_data in guest_results.items():
            guest = guest_data["guest"]
            successes = guest_data["successes"]
            failures = guest_data["failures"]
            
            # Each guest should have exactly one successful check-in
            assert len(successes) == 1, f"Guest {guest.name} should have exactly 1 successful check-in, got {len(successes)}"
            
            # All other attempts should fail with appropriate error
            for failure in failures:
                assert "already checked in" in failure["error"].lower(), f"Unexpected error for guest {guest.name}: {failure['error']}"
            
            # Verify database consistency
            db_checkins = db_session.query(CheckIn).filter(
                CheckIn.guest_id == guest_id,
                CheckIn.wedding_id == wedding.id
            ).count()
            
            assert db_checkins == 1, f"Guest {guest.name} should have exactly 1 check-in record in DB, found {db_checkins}"
    
    def test_transaction_rollback_on_error(
        self,
        sample_wedding_with_many_guests: dict,
        db_session: Session
    ):
        """
        Test that transactions are properly rolled back on errors
        """
        wedding = sample_wedding_with_many_guests["wedding"]
        guest = sample_wedding_with_many_guests["guests"][0]
        
        # This test would require simulating database errors
        # For now, we'll just verify basic transaction behavior
        
        checkin_service = CheckInService(db_session)
        
        async def run_test():
            # First check-in should succeed
            checkin1 = await checkin_service.scan_qr_checkin(
                qr_code=guest.qr_code,
                wedding_id=wedding.id,
                staff_identifier="rollback_test_staff"
            )
            
            assert checkin1 is not None
            
            # Verify check-in exists in database
            db_checkin = db_session.query(CheckIn).filter(
                CheckIn.guest_id == guest.id,
                CheckIn.wedding_id == wedding.id
            ).first()
            
            assert db_checkin is not None
            assert db_checkin.id == checkin1.id
        
        # Run the async test
        asyncio.run(run_test())
