"""
Wedding Management Models

Models for wedding events, guests, and check-in system.
"""

from datetime import datetime, date
from typing import Optional
from enum import Enum
from sqlmodel import SQLModel, Field, Relationship
from pydantic import validator

from app.core.security import generate_wedding_code, generate_staff_pin, hash_pin, generate_qr_code


class Wedding(SQLModel, table=True):
    """Wedding event model"""
    id: Optional[int] = Field(default=None, primary_key=True)
    couple_id: int = Field(foreign_key="couple.id")
    wedding_code: str = Field(unique=True, index=True)
    staff_pin: str  # bcrypt hashed
    wedding_date: date
    venue_name: str
    venue_address: str
    expected_guests: int
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    couple: "Couple" = Relationship(back_populates="weddings")
    guests: list["Guest"] = Relationship(back_populates="wedding")
    checkins: list["CheckIn"] = Relationship(back_populates="wedding")
    checkin_sessions: list["CheckInSession"] = Relationship(back_populates="wedding")
    budget: Optional["Budget"] = Relationship(back_populates="wedding")
    # Communication relationships (will be added when communication models are integrated)


class Guest(SQLModel, table=True):
    """Guest model"""
    id: Optional[int] = Field(default=None, primary_key=True)
    wedding_id: int = Field(foreign_key="wedding.id")
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    qr_code: str = Field(unique=True, index=True)
    table_number: Optional[int] = None
    dietary_restrictions: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    wedding: Wedding = Relationship(back_populates="guests")
    checkins: list["CheckIn"] = Relationship(back_populates="guest")
    # Communication relationships (will be added when communication models are integrated)


class CheckInMethod(str, Enum):
    """Check-in method enumeration"""
    QR_SCAN = "qr_scan"
    MANUAL = "manual"


class CheckIn(SQLModel, table=True):
    """Guest check-in record"""
    id: Optional[int] = Field(default=None, primary_key=True)
    guest_id: int = Field(foreign_key="guest.id")
    wedding_id: int = Field(foreign_key="wedding.id")
    checked_in_at: datetime = Field(default_factory=datetime.utcnow)
    checked_in_by: str  # staff identifier
    method: CheckInMethod
    
    # Relationships
    guest: Guest = Relationship(back_populates="checkins")
    wedding: Wedding = Relationship(back_populates="checkins")


class CheckInSession(SQLModel, table=True):
    """Staff check-in session"""
    id: Optional[int] = Field(default=None, primary_key=True)
    wedding_id: int = Field(foreign_key="wedding.id")
    session_token: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime
    
    # Relationships
    wedding: Wedding = Relationship(back_populates="checkin_sessions")