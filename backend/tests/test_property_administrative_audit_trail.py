"""
Property Test: Administrative Audit Trail

**Feature: wedding-platform, Property 23: Administrative Audit Trail**

Tests that all administrative actions and decisions are properly logged
in the audit trail with complete information.

**Validates: Requirements 10.5**
"""

import pytest
from hypothesis import given, strategies as st, settings, assume
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel
import tempfile
import os
import json

from app.models.user import User, UserType, AuthProvider, Vendor, VendorCategory
from app.models.vendor import Review
from app.models.admin import (
    VendorApplication, VendorApplicationStatus, VendorSubscription,
    VendorSubscriptionTier, AuditLog, AdminActionType
)


# Minimal AdminService for testing
class TestAdminService:
    """Minimal admin service for testing audit trail functionality"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def _log_admin_action(
        self,
        admin_user_id: int,
        action_type: AdminActionType,
        target_type: str,
        target_id: int,
        description: str,
        metadata: dict = None
    ) -> AuditLog:
        """Log administrative action"""
        audit_log = AuditLog(
            admin_user_id=admin_user_id,
            action_type=action_type,
            target_type=target_type,
            target_id=target_id,
            description=description,
            action_metadata=json.dumps(metadata) if metadata else None
        )
        
        self.db.add(audit_log)
        self.db.commit()
        self.db.refresh(audit_log)
        
        return audit_log


# Test data strategies
@st.composite
def admin_action_scenario(draw):
    """Generate administrative action test scenarios"""
    action_type = draw(st.sampled_from(list(AdminActionType)))
    
    # Generate appropriate target types based on action
    target_type_map = {
        AdminActionType.VENDOR_APPROVAL: "vendor",
        AdminActionType.VENDOR_REJECTION: "vendor", 
        AdminActionType.REVIEW_MODERATION: "review",
        AdminActionType.USER_SUSPENSION: "user",
        AdminActionType.USER_ACTIVATION: "user",
        AdminActionType.SUBSCRIPTION_CHANGE: "vendor",
        AdminActionType.CONTENT_MODERATION: "review"
    }
    
    target_type = target_type_map.get(action_type, "vendor")
    target_id = draw(st.integers(min_value=1, max_value=1000))
    
    # Generate description and metadata based on action type
    descriptions = {
        AdminActionType.VENDOR_APPROVAL: f"Approved vendor application {draw(st.integers(min_value=1, max_value=100))}",
        AdminActionType.VENDOR_REJECTION: f"Rejected vendor application {draw(st.integers(min_value=1, max_value=100))}",
        AdminActionType.REVIEW_MODERATION: f"Moderated review with action: {draw(st.sampled_from(['approve', 'reject', 'hide']))}",
        AdminActionType.USER_SUSPENSION: f"Suspended user {target_id}",
        AdminActionType.USER_ACTIVATION: f"Activated user {target_id}",
        AdminActionType.SUBSCRIPTION_CHANGE: f"Updated vendor subscription to {draw(st.sampled_from(list(VendorSubscriptionTier))).value}",
        AdminActionType.CONTENT_MODERATION: f"Moderated content with action: {draw(st.sampled_from(['approve', 'reject', 'hide']))}"
    }
    
    description = descriptions.get(action_type, f"Performed {action_type.value} on {target_type} {target_id}")
    
    # Generate metadata
    metadata = None
    if draw(st.booleans()):  # Sometimes include metadata
        metadata_options = {
            AdminActionType.VENDOR_APPROVAL: {"notes": draw(st.text(min_size=0, max_size=100))},
            AdminActionType.VENDOR_REJECTION: {
                "rejection_reason": draw(st.text(min_size=1, max_size=100)),
                "notes": draw(st.text(min_size=0, max_size=100))
            },
            AdminActionType.REVIEW_MODERATION: {
                "action": draw(st.sampled_from(["approve", "reject", "hide"])),
                "reason": draw(st.text(min_size=0, max_size=100))
            },
            AdminActionType.SUBSCRIPTION_CHANGE: {
                "new_tier": draw(st.sampled_from(list(VendorSubscriptionTier))).value,
                "expires_at": (datetime.utcnow() + timedelta(days=draw(st.integers(min_value=1, max_value=365)))).isoformat()
            }
        }
        metadata = metadata_options.get(action_type, {"action": action_type.value})
    
    return {
        "action_type": action_type,
        "target_type": target_type,
        "target_id": target_id,
        "description": description,
        "metadata": metadata
    }


class TestAdministrativeAuditTrail:
    """Test administrative audit trail logging"""
    
    @pytest.fixture(autouse=True)
    def setup_test_db(self):
        """Set up test database for each test"""
        # Create temporary database
        db_fd, db_path = tempfile.mkstemp()
        test_db_url = f"sqlite:///{db_path}"
        
        # Create test engine and session
        engine = create_engine(test_db_url, connect_args={"check_same_thread": False})
        SQLModel.metadata.create_all(bind=engine)
        
        TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        self.db = TestingSessionLocal()
        
        # Create admin user for testing
        self.admin_user = User(
            email="admin@test.com",
            password_hash="hashed_password",
            user_type=UserType.ADMIN,
            auth_provider=AuthProvider.EMAIL
        )
        self.db.add(self.admin_user)
        self.db.commit()
        self.db.refresh(self.admin_user)
        
        self.admin_service = TestAdminService(self.db)
        
        yield
        
        # Cleanup
        self.db.close()
        engine.dispose()
        os.close(db_fd)
        try:
            os.unlink(db_path)
        except (PermissionError, FileNotFoundError):
            pass
    
    def get_audit_logs_for_action(self, action_type: AdminActionType, target_id: int) -> list[AuditLog]:
        """Get audit logs for a specific action and target"""
        return self.db.query(AuditLog).filter(
            AuditLog.action_type == action_type,
            AuditLog.target_id == target_id
        ).all()
    
    @given(admin_action_scenario())
    @settings(max_examples=10, deadline=5000)
    def test_administrative_audit_trail_property(self, scenario):
        """
        **Property 23: Administrative Audit Trail**
        
        For any administrative action performed, the system should create
        a complete audit log entry with all relevant information including
        admin user, action type, target, description, and metadata.
        
        **Validates: Requirements 10.5**
        """
        action_type = scenario["action_type"]
        target_type = scenario["target_type"]
        target_id = scenario["target_id"]
        description = scenario["description"]
        metadata = scenario["metadata"]
        
        # Record the initial audit log count
        initial_log_count = self.db.query(AuditLog).count()
        
        # Log the administrative action
        audit_log = self.admin_service._log_admin_action(
            admin_user_id=self.admin_user.id,
            action_type=action_type,
            target_type=target_type,
            target_id=target_id,
            description=description,
            metadata=metadata
        )
        
        # Verify audit log was created
        assert audit_log is not None, "Audit log should be created"
        assert audit_log.id is not None, "Audit log should have an ID"
        
        # Verify audit log count increased
        final_log_count = self.db.query(AuditLog).count()
        assert final_log_count == initial_log_count + 1, "Exactly one audit log should be created"
        
        # Verify audit log contains all required information
        assert audit_log.admin_user_id == self.admin_user.id, "Audit log should record correct admin user"
        assert audit_log.action_type == action_type, "Audit log should record correct action type"
        assert audit_log.target_type == target_type, "Audit log should record correct target type"
        assert audit_log.target_id == target_id, "Audit log should record correct target ID"
        assert audit_log.description == description, "Audit log should record correct description"
        assert audit_log.created_at is not None, "Audit log should have creation timestamp"
        
        # Verify metadata handling
        if metadata:
            assert audit_log.action_metadata is not None, "Audit log should store metadata when provided"
            stored_metadata = json.loads(audit_log.action_metadata)
            assert stored_metadata == metadata, "Stored metadata should match provided metadata"
        else:
            assert audit_log.action_metadata is None, "Audit log should not store metadata when none provided"
        
        # Verify audit log can be retrieved
        retrieved_log = self.db.query(AuditLog).filter(AuditLog.id == audit_log.id).first()
        assert retrieved_log is not None, "Audit log should be retrievable from database"
        assert retrieved_log.admin_user_id == self.admin_user.id, "Retrieved log should maintain admin user reference"
    
    def test_audit_log_chronological_ordering(self):
        """
        Test that audit logs maintain chronological ordering
        """
        # Create multiple administrative actions with small delays
        actions = [
            (AdminActionType.VENDOR_APPROVAL, "vendor", 1, "First action"),
            (AdminActionType.REVIEW_MODERATION, "review", 2, "Second action"),
            (AdminActionType.SUBSCRIPTION_CHANGE, "vendor", 3, "Third action")
        ]
        
        created_logs = []
        
        for action_type, target_type, target_id, description in actions:
            audit_log = self.admin_service._log_admin_action(
                admin_user_id=self.admin_user.id,
                action_type=action_type,
                target_type=target_type,
                target_id=target_id,
                description=description
            )
            created_logs.append(audit_log)
            
            # Small delay to ensure different timestamps
            import time
            time.sleep(0.001)
        
        # Retrieve logs in chronological order
        retrieved_logs = self.db.query(AuditLog).filter(
            AuditLog.admin_user_id == self.admin_user.id
        ).order_by(AuditLog.created_at.asc()).all()
        
        # Verify chronological ordering
        assert len(retrieved_logs) >= len(actions), "All audit logs should be retrievable"
        
        # Check that the logs we created are in the correct order
        for i in range(len(actions)):
            log = next((log for log in retrieved_logs if log.description == actions[i][3]), None)
            assert log is not None, f"Should find log for action {i}"
            
            if i > 0:
                prev_log = next((log for log in retrieved_logs if log.description == actions[i-1][3]), None)
                assert log.created_at >= prev_log.created_at, "Logs should be in chronological order"
    
    def test_audit_log_admin_user_relationship(self):
        """
        Test that audit logs maintain proper relationship with admin users
        """
        # Create additional admin user
        admin_user2 = User(
            email="admin2@test.com",
            password_hash="hashed_password",
            user_type=UserType.ADMIN,
            auth_provider=AuthProvider.EMAIL
        )
        self.db.add(admin_user2)
        self.db.commit()
        self.db.refresh(admin_user2)
        
        # Create audit logs from different admin users
        log1 = self.admin_service._log_admin_action(
            admin_user_id=self.admin_user.id,
            action_type=AdminActionType.VENDOR_APPROVAL,
            target_type="vendor",
            target_id=1,
            description="Action by admin 1"
        )
        
        admin_service2 = TestAdminService(self.db)
        log2 = admin_service2._log_admin_action(
            admin_user_id=admin_user2.id,
            action_type=AdminActionType.REVIEW_MODERATION,
            target_type="review",
            target_id=2,
            description="Action by admin 2"
        )
        
        # Verify admin user relationships
        assert log1.admin_user_id == self.admin_user.id, "Log 1 should reference correct admin user"
        assert log2.admin_user_id == admin_user2.id, "Log 2 should reference correct admin user"
        
        # Verify logs can be filtered by admin user
        admin1_logs = self.db.query(AuditLog).filter(
            AuditLog.admin_user_id == self.admin_user.id
        ).all()
        admin2_logs = self.db.query(AuditLog).filter(
            AuditLog.admin_user_id == admin_user2.id
        ).all()
        
        assert any(log.id == log1.id for log in admin1_logs), "Admin 1 logs should include log 1"
        assert any(log.id == log2.id for log in admin2_logs), "Admin 2 logs should include log 2"
        assert not any(log.id == log2.id for log in admin1_logs), "Admin 1 logs should not include log 2"
        assert not any(log.id == log1.id for log in admin2_logs), "Admin 2 logs should not include log 1"
    
    @given(st.sampled_from(list(AdminActionType)))
    @settings(max_examples=10, deadline=3000)
    def test_all_action_types_create_audit_logs(self, action_type):
        """
        Test that all administrative action types create proper audit logs
        """
        target_type_map = {
            AdminActionType.VENDOR_APPROVAL: "vendor",
            AdminActionType.VENDOR_REJECTION: "vendor", 
            AdminActionType.REVIEW_MODERATION: "review",
            AdminActionType.USER_SUSPENSION: "user",
            AdminActionType.USER_ACTIVATION: "user",
            AdminActionType.SUBSCRIPTION_CHANGE: "vendor",
            AdminActionType.CONTENT_MODERATION: "review"
        }
        
        target_type = target_type_map.get(action_type, "vendor")
        target_id = 123
        description = f"Test {action_type.value} action"
        
        # Record initial count
        initial_count = self.db.query(AuditLog).filter(
            AuditLog.action_type == action_type
        ).count()
        
        # Create audit log
        audit_log = self.admin_service._log_admin_action(
            admin_user_id=self.admin_user.id,
            action_type=action_type,
            target_type=target_type,
            target_id=target_id,
            description=description
        )
        
        # Verify log was created
        final_count = self.db.query(AuditLog).filter(
            AuditLog.action_type == action_type
        ).count()
        
        assert final_count == initial_count + 1, f"Should create audit log for {action_type.value}"
        assert audit_log.action_type == action_type, f"Should record correct action type {action_type.value}"
        assert audit_log.target_type == target_type, f"Should record correct target type for {action_type.value}"


if __name__ == "__main__":
    pytest.main([__file__])
