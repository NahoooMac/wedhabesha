"""
Check-In Endpoints

Real-time guest check-in system for staff.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.core.database import get_db
from app.services.checkin_service import CheckInService
from app.models.auth import MessageResponse
from app.models.checkin import (
    QRScanRequest,
    CheckInResponse,
    CheckInStatsResponse,
    ManualCheckInRequest,
    GuestStatusResponse
)
from app.middleware.auth_middleware import get_staff_session

router = APIRouter()


@router.post("/scan-qr", response_model=CheckInResponse)
async def scan_qr_code(
    request: QRScanRequest,
    staff_session: dict = Depends(get_staff_session),
    db: Session = Depends(get_db)
):
    """Scan QR code and check in guest"""
    checkin_service = CheckInService(db)
    
    wedding_id = staff_session["wedding_id"]
    staff_identifier = f"staff_{staff_session.get('session_token', 'unknown')[:8]}"
    
    try:
        checkin = await checkin_service.scan_qr_checkin(
            qr_code=request.qr_code,
            wedding_id=wedding_id,
            staff_identifier=staff_identifier
        )
        
        return CheckInResponse(
            success=True,
            message="Guest checked in successfully",
            guest_name=checkin.guest.name,
            checked_in_at=checkin.checked_in_at,
            is_duplicate=False
        )
        
    except ValueError as e:
        if "already checked in" in str(e):
            # Get existing check-in for duplicate response
            existing_checkin = await checkin_service.get_guest_checkin_by_qr(
                qr_code=request.qr_code,
                wedding_id=wedding_id
            )
            
            return CheckInResponse(
                success=True,
                message=f"Guest was already checked in at {existing_checkin.checked_in_at.strftime('%H:%M')}",
                guest_name=existing_checkin.guest.name,
                checked_in_at=existing_checkin.checked_in_at,
                is_duplicate=True
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )


@router.post("/manual", response_model=CheckInResponse)
async def manual_checkin(
    request: ManualCheckInRequest,
    staff_session: dict = Depends(get_staff_session),
    db: Session = Depends(get_db)
):
    """Manual guest check-in by name search"""
    checkin_service = CheckInService(db)
    
    wedding_id = staff_session["wedding_id"]
    staff_identifier = f"staff_{staff_session.get('session_token', 'unknown')[:8]}"
    
    try:
        checkin = await checkin_service.manual_checkin(
            guest_id=request.guest_id,
            wedding_id=wedding_id,
            staff_identifier=staff_identifier
        )
        
        return CheckInResponse(
            success=True,
            message="Guest checked in successfully",
            guest_name=checkin.guest.name,
            checked_in_at=checkin.checked_in_at,
            is_duplicate=False
        )
        
    except ValueError as e:
        if "already checked in" in str(e):
            # Get existing check-in for duplicate response
            existing_checkin = await checkin_service.get_guest_checkin_by_id(
                guest_id=request.guest_id,
                wedding_id=wedding_id
            )
            
            return CheckInResponse(
                success=True,
                message=f"Guest was already checked in at {existing_checkin.checked_in_at.strftime('%H:%M')}",
                guest_name=existing_checkin.guest.name,
                checked_in_at=existing_checkin.checked_in_at,
                is_duplicate=True
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )


@router.get("/stats", response_model=CheckInStatsResponse)
async def get_checkin_stats(
    staff_session: dict = Depends(get_staff_session),
    db: Session = Depends(get_db)
):
    """Get real-time check-in statistics"""
    checkin_service = CheckInService(db)
    
    wedding_id = staff_session["wedding_id"]
    
    stats = await checkin_service.get_checkin_stats(wedding_id)
    
    return CheckInStatsResponse(
        total_guests=stats["total_guests"],
        checked_in_count=stats["checked_in_count"],
        pending_count=stats["pending_count"],
        checkin_rate=stats["checkin_rate"],
        recent_checkins=stats["recent_checkins"]
    )


@router.get("/history", response_model=List[dict])
async def get_checkin_history(
    limit: Optional[int] = 50,
    method_filter: Optional[str] = None,
    time_filter: Optional[str] = None,
    staff_session: dict = Depends(get_staff_session),
    db: Session = Depends(get_db)
):
    """Get detailed check-in history with filtering options"""
    checkin_service = CheckInService(db)
    
    wedding_id = staff_session["wedding_id"]
    
    history = await checkin_service.get_checkin_history(
        wedding_id=wedding_id,
        limit=limit,
        method_filter=method_filter,
        time_filter=time_filter
    )
    
@router.get("/guests", response_model=List[GuestStatusResponse])
async def get_guest_status(
    search: Optional[str] = None,
    staff_session: dict = Depends(get_staff_session),
    db: Session = Depends(get_db)
):
    """Get guest list with check-in status"""
    checkin_service = CheckInService(db)
    
    wedding_id = staff_session["wedding_id"]
    
    guests = await checkin_service.get_guests_with_status(
        wedding_id=wedding_id,
        search_term=search
    )
    
    return [
        GuestStatusResponse(
            id=guest.id,
            name=guest.name,
            table_number=guest.table_number,
            is_checked_in=guest.is_checked_in,
            checked_in_at=guest.checked_in_at,
            qr_code=guest.qr_code
        )
        for guest in guests
    ]