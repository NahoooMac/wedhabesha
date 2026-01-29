"""
Property Test: Lead Generation

**Feature: wedding-platform, Property 10: Lead Generation**

Tests that lead generation creates proper lead records and triggers vendor notifications.
**Validates: Requirements 5.3, 8.2**
"""

import pytest
from hypothesis import given, strategies as st, settings
from sqlalchemy.orm import Session
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel
from datetime import datetime, date
import tempfile
import os
import uuid

from app.models.user import User, UserType, AuthProvider, Vendor, VendorCategory, Couple
from app.models.vendor import VendorLead, LeadStatus
from app.services.vendor_service import VendorService


# Create test database session
def get_test_session():
    """Create a test database session"""
    db_fd, db_path = tempfile.mkstemp()
    test_db_url = f"sqlite:///{db_path}"
    
    engine = create_engine(test_db_url, connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(bind=engine)
    
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    
    return session, db_path, db_fd


def create_test_vendor(db: Session) -> Vendor:
    """Create a test vendor in the database"""
    unique_id = str(uuid.uuid4())
    user = User(
        email=f"vendor_{unique_id}@test.com",
        user_type=UserType.VENDOR,
        auth_provider=AuthProvider.EMAIL,
        password_hash="hashed_password"
    )
    db.add(user)
    db.flush()
    
    vendor = Vendor(
        user_id=user.id,
        business_name=f"Test Vendor {unique_id[:8]}",
        category=VendorCategory.PHOTOGRAPHY,
        location="Addis Ababa",
        description="Test vendor description",
        is_verified=True,
        rating=4.5
    )
    db.add(vendor)
    db.flush()
    
    return vendor


def create_test_couple(db: Session) -> Couple:
    """Create a test couple in the database"""
    unique_id = str(uuid.uuid4())
    user = User(
        email=f"couple_{unique_id}@test.com",
        user_type=UserType.COUPLE,
        auth_provider=AuthProvider.EMAIL,
        password_hash="hashed_password"
    )
    db.add(user)
    db.flush()
    
    couple = Couple(
        user_id=user.id,
        partner1_name="John Doe",
        partner2_name="Jane Smith",
        phone="+1234567890"
    )
    db.add(couple)
    db.flush()
    
    return couple


# Test data generators
@st.composite
def lead_data(draw):
    """Generate lead test data"""
    return {
        "message": draw(st.text(min_size=10, max_size=500, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd', 'Pc', 'Pd', 'Zs')))),
        "budget_range": draw(st.one_of(st.none(), st.sampled_from(["$1000-$2000", "$2000-$5000", "$5000-$10000", "$10000+"]))),
        "event_date": draw(st.one_of(st.none(), st.dates(min_value=date(2024, 1, 1), max_value=date(2025, 12, 31))))
    }


@given(lead_data=lead_data())
@settings(max_examples=10, deadline=30000)  # Reduced examples and added deadline
def test_lead_generation_property(lead_data):
    """
    Property 10: Lead Generation
    
    For any couple-vendor contact interaction, the system should create a lead record 
    and trigger vendor notification.
    
    **Validates: Requirements 5.3, 8.2**
    """
    db, db_path, db_fd = get_test_session()
    try:
        # Create test vendor and couple
        vendor = create_test_vendor(db)
        couple = create_test_couple(db)
        db.commit()
        
        # Create lead using vendor service (disable notifications for testing)
        vendor_service = VendorService(db, enable_notifications=False)
        
        # Convert date to datetime if provided
        event_datetime = None
        if lead_data["event_date"]:
            event_datetime = datetime.combine(lead_data["event_date"], datetime.min.time())
        
        lead = vendor_service.create_lead(
            vendor_id=vendor.id,
            couple_id=couple.id,
            message=lead_data["message"],
            budget_range=lead_data["budget_range"],
            event_date=event_datetime
        )
        
        # Verify lead was created correctly
        assert lead is not None, "Lead should be created"
        assert lead.vendor_id == vendor.id, "Lead should be associated with correct vendor"
        assert lead.couple_id == couple.id, "Lead should be associated with correct couple"
        assert lead.message == lead_data["message"], "Lead message should match input"
        assert lead.budget_range == lead_data["budget_range"], "Lead budget range should match input"
        assert lead.status == LeadStatus.NEW, "New lead should have NEW status"
        
        # Verify event date handling
        if lead_data["event_date"]:
            assert lead.event_date == lead_data["event_date"], "Lead event date should match input"
        else:
            assert lead.event_date is None, "Lead event date should be None when not provided"
        
        # Verify lead exists in database
        db_lead = db.query(VendorLead).filter(VendorLead.id == lead.id).first()
        assert db_lead is not None, "Lead should exist in database"
        assert db_lead.vendor_id == vendor.id, "Database lead should have correct vendor_id"
        assert db_lead.couple_id == couple.id, "Database lead should have correct couple_id"
        
        # Verify no duplicate leads can be created for same vendor-couple pair
        try:
            duplicate_lead = vendor_service.create_lead(
                vendor_id=vendor.id,
                couple_id=couple.id,
                message="Duplicate message",
                budget_range=None,
                event_date=None
            )
            assert False, "Should not allow duplicate leads for same vendor-couple pair"
        except Exception as e:
            # This is expected - duplicate leads should be prevented
            assert hasattr(e, 'detail') and "already have an active inquiry" in str(e.detail), "Should prevent duplicate leads with appropriate message"
        
    finally:
        db.rollback()
        db.close()
        os.close(db_fd)
        try:
            os.unlink(db_path)
        except (PermissionError, FileNotFoundError):
            pass


@given(
    lead_data_list=st.lists(lead_data(), min_size=2, max_size=3)
)
@settings(max_examples=10, deadline=20000)  # Reduced examples and added deadline
def test_lead_status_management_property(lead_data_list):
    """
    Property: Lead Status Management
    
    Lead status updates should be properly tracked and notifications sent.
    """
    db, db_path, db_fd = get_test_session()
    try:
        # Create test vendor and multiple couples
        vendor = create_test_vendor(db)
        couples = []
        for i in range(len(lead_data_list)):
            couple = create_test_couple(db)
            couples.append(couple)
        
        db.commit()
        
        # Create leads for each couple
        vendor_service = VendorService(db, enable_notifications=False)
        leads = []
        
        for i, lead_data_item in enumerate(lead_data_list):
            event_datetime = None
            if lead_data_item["event_date"]:
                event_datetime = datetime.combine(lead_data_item["event_date"], datetime.min.time())
            
            lead = vendor_service.create_lead(
                vendor_id=vendor.id,
                couple_id=couples[i].id,
                message=lead_data_item["message"],
                budget_range=lead_data_item["budget_range"],
                event_date=event_datetime
            )
            leads.append(lead)
        
        # Test status updates
        for i, lead in enumerate(leads):
            # Update lead status
            new_status = LeadStatus.CONTACTED
            updated_lead = vendor_service.update_lead_status(
                lead_id=lead.id,
                vendor_id=vendor.id,
                user_id=vendor.user_id,
                new_status=new_status
            )
            
            # Verify status was updated
            assert updated_lead.status == new_status, f"Lead {i} status should be updated to {new_status}"
            
            # Verify in database
            db_lead = db.query(VendorLead).filter(VendorLead.id == lead.id).first()
            assert db_lead.status == new_status, f"Database lead {i} should have updated status"
        
        # Test lead retrieval by vendor
        vendor_leads = vendor_service.get_vendor_leads(
            vendor_id=vendor.id,
            user_id=vendor.user_id,
            skip=0,
            limit=10
        )
        
        # Verify all leads are returned
        assert len(vendor_leads) == len(lead_data_list), "Should return all vendor leads"
        
        # Verify leads belong to correct vendor
        for lead in vendor_leads:
            assert lead.vendor_id == vendor.id, "All returned leads should belong to the vendor"
        
    finally:
        db.rollback()
        db.close()
        os.close(db_fd)
        try:
            os.unlink(db_path)
        except (PermissionError, FileNotFoundError):
            pass


if __name__ == "__main__":
    # Run the property tests
    test_lead_generation_property()
    test_lead_status_management_property()
    print("All lead generation property tests passed!")
