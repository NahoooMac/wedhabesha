"""
Test Configuration and Fixtures

Shared test configuration, fixtures, and utilities.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel, Session
import tempfile
import os

# Set test environment before importing app modules
os.environ["DATABASE_URL"] = "sqlite:///./test_wedding.db"
os.environ["REDIS_URL"] = "redis://localhost:6379/1"
os.environ["ENVIRONMENT"] = "test"

from app.main import app
from app.core.database import get_db
from app.core.config import settings


@pytest.fixture(scope="session")
def test_db():
    """Create test database"""
    # Create temporary database file
    db_fd, db_path = tempfile.mkstemp()
    test_db_url = f"sqlite:///{db_path}"
    
    # Create test engine
    engine = create_engine(test_db_url, connect_args={"check_same_thread": False})
    
    # Create all tables
    SQLModel.metadata.create_all(bind=engine)
    
    yield engine
    
    # Cleanup - close engine first to release file handles
    engine.dispose()
    os.close(db_fd)
    try:
        os.unlink(db_path)
    except PermissionError:
        # File might still be in use, skip cleanup
        pass


@pytest.fixture
def db_session(test_db):
    """Create database session for testing"""
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_db)
    session = TestingSessionLocal()
    try:
        yield session
        # Rollback any uncommitted changes
        session.rollback()
    finally:
        session.close()


@pytest.fixture
def client(db_session):
    """Create test client with database session override"""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    
    with TestClient(app) as test_client:
        yield test_client
    
    app.dependency_overrides.clear()


@pytest.fixture
def sample_user_data():
    """Sample user data for testing"""
    return {
        "email": "test@example.com",
        "password": "testpassword123",
        "user_type": "couple",
        "auth_provider": "email"
    }


@pytest.fixture
def sample_couple_data():
    """Sample couple data for testing"""
    return {
        "partner1_name": "John Doe",
        "partner2_name": "Jane Smith",
        "phone": "+1234567890"
    }


@pytest.fixture
def sample_wedding_data():
    """Sample wedding data for testing"""
    return {
        "wedding_date": "2024-06-15",
        "venue_name": "Beautiful Garden Venue",
        "venue_address": "123 Garden St, City, Country",
        "expected_guests": 150
    }