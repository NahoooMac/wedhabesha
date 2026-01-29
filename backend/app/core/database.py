"""
Database Configuration and Session Management

SQLAlchemy setup with PostgreSQL and session management.
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel, Session
import redis.asyncio as redis
from typing import AsyncGenerator

from app.core.config import settings

# Create database engine
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    echo=settings.DEBUG,
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Redis connection
redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)


async def init_db() -> None:
    """Initialize database tables"""
    # Import all models to ensure they are registered with SQLModel
    from app.models import user, wedding, vendor, budget  # noqa
    
    # Create all tables
    SQLModel.metadata.create_all(bind=engine)


def get_db() -> Session:
    """Get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


async def get_redis() -> redis.Redis:
    """Get Redis client"""
    return redis_client