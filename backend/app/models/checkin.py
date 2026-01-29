"""
Check-In Models

Pydantic models for check-in requests and responses.
"""

from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field


class QRScanRequest(BaseModel):
    """Request model for QR code scanning"""
    qr_code: str = Field(..., min_length=1, max_length=100)


class ManualCheckInRequest(BaseModel):
    """Request model for manual check-in"""
    guest_id: int = Field(..., gt=0)


class CheckInResponse(BaseModel):
    """Response model for check-in operations"""
    success: bool
    message: str
    guest_name: str
    checked_in_at: datetime
    is_duplicate: bool


class RecentCheckIn(BaseModel):
    """Model for recent check-in information"""
    guest_name: str
    checked_in_at: datetime
    method: str


class CheckInStatsResponse(BaseModel):
    """Response model for check-in statistics"""
    total_guests: int
    checked_in_count: int
    pending_count: int
    checkin_rate: float
    recent_checkins: List[RecentCheckIn]


class GuestStatusResponse(BaseModel):
    """Response model for guest status"""
    id: int
    name: str
    table_number: Optional[int]
    is_checked_in: bool
    checked_in_at: Optional[datetime]
    qr_code: str