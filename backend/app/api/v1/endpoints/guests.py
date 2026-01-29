"""
Guest Management Endpoints

Guest list management, QR code generation, and check-in system.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field, validator
from datetime import datetime, timedelta
import csv
import io

from app.core.database import get_db
from app.core.auth import get_current_couple
from app.services.wedding_service import WeddingService
from app.models.user import User
from app.models.wedding import Guest, CheckIn, CheckInMethod

router = APIRouter()


class GuestCreateRequest(BaseModel):
    """Request model for creating a guest"""
    name: str = Field(..., min_length=1, max_length=200, description="Guest name")
    email: Optional[str] = Field(None, max_length=254, description="Guest email")
    phone: Optional[str] = Field(None, max_length=20, description="Guest phone number")
    table_number: Optional[int] = Field(None, ge=1, le=1000, description="Table number")
    dietary_restrictions: Optional[str] = Field(None, max_length=500, description="Dietary restrictions")

    @validator('email')
    def validate_email(cls, v):
        if v is not None and v.strip():
            import re
            email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
            if not re.match(email_pattern, v.strip()):
                raise ValueError('Invalid email format')
            return v.strip()
        return None

    @validator('phone')
    def validate_phone(cls, v):
        if v is not None and v.strip():
            import re
            # Allow various phone formats
            phone_pattern = r'^[\+]?[1-9][\d\s\-\(\)]{7,15}$'
            cleaned_phone = re.sub(r'[\s\-\(\)]', '', v.strip())
            if not re.match(phone_pattern, cleaned_phone):
                raise ValueError('Invalid phone number format')
            return v.strip()
        return None


class GuestUpdateRequest(BaseModel):
    """Request model for updating a guest"""
    name: Optional[str] = Field(None, min_length=1, max_length=200, description="Guest name")
    email: Optional[str] = Field(None, max_length=254, description="Guest email")
    phone: Optional[str] = Field(None, max_length=20, description="Guest phone number")
    table_number: Optional[int] = Field(None, ge=1, le=1000, description="Table number")
    dietary_restrictions: Optional[str] = Field(None, max_length=500, description="Dietary restrictions")

    @validator('email')
    def validate_email(cls, v):
        if v is not None and v.strip():
            import re
            email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
            if not re.match(email_pattern, v.strip()):
                raise ValueError('Invalid email format')
            return v.strip()
        return None

    @validator('phone')
    def validate_phone(cls, v):
        if v is not None and v.strip():
            import re
            phone_pattern = r'^[\+]?[1-9][\d\s\-\(\)]{7,15}$'
            cleaned_phone = re.sub(r'[\s\-\(\)]', '', v.strip())
            if not re.match(phone_pattern, cleaned_phone):
                raise ValueError('Invalid phone number format')
            return v.strip()
        return None


class GuestResponse(BaseModel):
    """Response model for guest data"""
    id: int
    wedding_id: int
    name: str
    email: Optional[str]
    phone: Optional[str]
    qr_code: str
    table_number: Optional[int]
    dietary_restrictions: Optional[str]
    created_at: str
    is_checked_in: bool = False
    checked_in_at: Optional[str] = None

    class Config:
        from_attributes = True


class BulkGuestImportRequest(BaseModel):
    """Request model for bulk guest import"""
    guests: List[GuestCreateRequest] = Field(..., min_items=1, max_items=1000, description="List of guests to import")


class BulkGuestImportResponse(BaseModel):
    """Response model for bulk guest import"""
    total_guests: int
    successful_imports: int
    failed_imports: int
    errors: List[str] = []
    imported_guests: List[GuestResponse] = []


class CheckInVerifyRequest(BaseModel):
    """Request model for check-in verification"""
    wedding_code: str = Field(..., min_length=4, max_length=4, description="Wedding code")
    staff_pin: str = Field(..., min_length=6, max_length=6, description="Staff PIN")


class CheckInVerifyResponse(BaseModel):
    """Response model for check-in verification"""
    wedding_id: int
    wedding_code: str
    venue_name: str
    session_token: str
    expires_at: str


class QRScanRequest(BaseModel):
    """Request model for QR code scanning"""
    qr_code: str = Field(..., description="QR code to scan")
    session_token: str = Field(..., description="Check-in session token")
    checked_in_by: str = Field(..., min_length=1, max_length=100, description="Staff identifier")


class QRScanResponse(BaseModel):
    """Response model for QR code scanning"""
    guest_id: int
    guest_name: str
    table_number: Optional[int]
    checked_in_at: str
    was_already_checked_in: bool


class CheckInStatsResponse(BaseModel):
    """Response model for check-in statistics"""
    total_guests: int
    checked_in_count: int
    pending_count: int
    check_in_percentage: float
    recent_checkins: List[dict]


@router.get("/{wedding_id}/guests", response_model=List[GuestResponse])
async def get_guests(
    wedding_id: int,
    current_user: User = Depends(get_current_couple),
    db: Session = Depends(get_db)
):
    """
    Get wedding guest list.
    
    Returns all guests for the specified wedding with their check-in status.
    Only the couple who owns the wedding can access the guest list.
    
    Args:
        wedding_id: ID of the wedding
        current_user: Current authenticated couple user
        db: Database session
        
    Returns:
        List of guests with their details and check-in status
        
    Raises:
        HTTPException: If wedding not found or access denied
    """
    try:
        wedding_service = WeddingService(db)
        wedding = wedding_service.get_wedding_by_id(wedding_id)
        
        if not wedding:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Wedding not found"
            )
        
        # Verify ownership
        if not current_user.couple or wedding.couple_id != current_user.couple.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You can only access your own wedding guests"
            )
        
        # Get guests with check-in status
        guests = wedding_service.get_wedding_guests(wedding_id)
        checkins = {ci.guest_id: ci for ci in wedding_service.get_wedding_checkins(wedding_id)}
        
        guest_responses = []
        for guest in guests:
            checkin = checkins.get(guest.id)
            guest_responses.append(GuestResponse(
                id=guest.id,
                wedding_id=guest.wedding_id,
                name=guest.name,
                email=guest.email,
                phone=guest.phone,
                qr_code=guest.qr_code,
                table_number=guest.table_number,
                dietary_restrictions=guest.dietary_restrictions,
                created_at=guest.created_at.isoformat(),
                is_checked_in=checkin is not None,
                checked_in_at=checkin.checked_in_at.isoformat() if checkin else None
            ))
        
        return guest_responses
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve guests"
        )


@router.post("/{wedding_id}/guests", response_model=GuestResponse, status_code=status.HTTP_201_CREATED)
async def add_guest(
    wedding_id: int,
    guest_data: GuestCreateRequest,
    current_user: User = Depends(get_current_couple),
    db: Session = Depends(get_db)
):
    """
    Add a new guest to the wedding.
    
    Creates a new guest with a unique QR code for check-in.
    Only the couple who owns the wedding can add guests.
    
    Args:
        wedding_id: ID of the wedding
        guest_data: Guest creation data
        current_user: Current authenticated couple user
        db: Database session
        
    Returns:
        Created guest details including QR code
        
    Raises:
        HTTPException: If wedding not found or access denied
    """
    try:
        wedding_service = WeddingService(db)
        wedding = wedding_service.get_wedding_by_id(wedding_id)
        
        if not wedding:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Wedding not found"
            )
        
        # Verify ownership
        if not current_user.couple or wedding.couple_id != current_user.couple.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You can only add guests to your own wedding"
            )
        
        # Create guest
        guest = wedding_service.add_guest(
            wedding_id=wedding_id,
            name=guest_data.name,
            email=guest_data.email,
            phone=guest_data.phone,
            table_number=guest_data.table_number,
            dietary_restrictions=guest_data.dietary_restrictions
        )
        
        return GuestResponse(
            id=guest.id,
            wedding_id=guest.wedding_id,
            name=guest.name,
            email=guest.email,
            phone=guest.phone,
            qr_code=guest.qr_code,
            table_number=guest.table_number,
            dietary_restrictions=guest.dietary_restrictions,
            created_at=guest.created_at.isoformat(),
            is_checked_in=False,
            checked_in_at=None
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add guest"
        )


@router.put("/{wedding_id}/guests/{guest_id}", response_model=GuestResponse)
async def update_guest(
    wedding_id: int,
    guest_id: int,
    guest_data: GuestUpdateRequest,
    current_user: User = Depends(get_current_couple),
    db: Session = Depends(get_db)
):
    """
    Update guest information.
    
    Updates guest details while preserving the original QR code.
    Only the couple who owns the wedding can update guests.
    
    Args:
        wedding_id: ID of the wedding
        guest_id: ID of the guest to update
        guest_data: Guest update data
        current_user: Current authenticated couple user
        db: Database session
        
    Returns:
        Updated guest details
        
    Raises:
        HTTPException: If wedding/guest not found or access denied
    """
    try:
        wedding_service = WeddingService(db)
        wedding = wedding_service.get_wedding_by_id(wedding_id)
        
        if not wedding:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Wedding not found"
            )
        
        # Verify ownership
        if not current_user.couple or wedding.couple_id != current_user.couple.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You can only update guests in your own wedding"
            )
        
        # Find guest
        guest = db.query(Guest).filter(
            Guest.id == guest_id,
            Guest.wedding_id == wedding_id
        ).first()
        
        if not guest:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Guest not found"
            )
        
        # Update fields if provided (preserve QR code)
        update_data = guest_data.dict(exclude_unset=True)
        
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No update data provided"
            )
        
        for field, value in update_data.items():
            setattr(guest, field, value)
        
        db.commit()
        db.refresh(guest)
        
        # Check if guest is checked in
        checkin = db.query(CheckIn).filter(CheckIn.guest_id == guest.id).first()
        
        return GuestResponse(
            id=guest.id,
            wedding_id=guest.wedding_id,
            name=guest.name,
            email=guest.email,
            phone=guest.phone,
            qr_code=guest.qr_code,
            table_number=guest.table_number,
            dietary_restrictions=guest.dietary_restrictions,
            created_at=guest.created_at.isoformat(),
            is_checked_in=checkin is not None,
            checked_in_at=checkin.checked_in_at.isoformat() if checkin else None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update guest"
        )


@router.delete("/{wedding_id}/guests/{guest_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_guest(
    wedding_id: int,
    guest_id: int,
    current_user: User = Depends(get_current_couple),
    db: Session = Depends(get_db)
):
    """
    Delete a guest from the wedding.
    
    Removes the guest and any associated check-in records.
    Only the couple who owns the wedding can delete guests.
    
    Args:
        wedding_id: ID of the wedding
        guest_id: ID of the guest to delete
        current_user: Current authenticated couple user
        db: Database session
        
    Raises:
        HTTPException: If wedding/guest not found or access denied
    """
    try:
        wedding_service = WeddingService(db)
        wedding = wedding_service.get_wedding_by_id(wedding_id)
        
        if not wedding:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Wedding not found"
            )
        
        # Verify ownership
        if not current_user.couple or wedding.couple_id != current_user.couple.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You can only delete guests from your own wedding"
            )
        
        # Find guest
        guest = db.query(Guest).filter(
            Guest.id == guest_id,
            Guest.wedding_id == wedding_id
        ).first()
        
        if not guest:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Guest not found"
            )
        
        # Delete associated check-ins first
        db.query(CheckIn).filter(CheckIn.guest_id == guest_id).delete()
        
        # Delete guest
        db.delete(guest)
        db.commit()
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete guest"
        )


@router.post("/{wedding_id}/guests/bulk-import", response_model=BulkGuestImportResponse)
async def bulk_import_guests(
    wedding_id: int,
    import_data: BulkGuestImportRequest,
    current_user: User = Depends(get_current_couple),
    db: Session = Depends(get_db)
):
    """
    Bulk import guests from a list.
    
    Imports multiple guests at once, generating unique QR codes for each.
    Returns summary of successful and failed imports.
    
    Args:
        wedding_id: ID of the wedding
        import_data: Bulk import data with list of guests
        current_user: Current authenticated couple user
        db: Database session
        
    Returns:
        Import summary with successful and failed imports
        
    Raises:
        HTTPException: If wedding not found or access denied
    """
    try:
        wedding_service = WeddingService(db)
        wedding = wedding_service.get_wedding_by_id(wedding_id)
        
        if not wedding:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Wedding not found"
            )
        
        # Verify ownership
        if not current_user.couple or wedding.couple_id != current_user.couple.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You can only import guests to your own wedding"
            )
        
        imported_guests = []
        errors = []
        successful_imports = 0
        failed_imports = 0
        
        for i, guest_data in enumerate(import_data.guests):
            try:
                guest = wedding_service.add_guest(
                    wedding_id=wedding_id,
                    name=guest_data.name,
                    email=guest_data.email,
                    phone=guest_data.phone,
                    table_number=guest_data.table_number,
                    dietary_restrictions=guest_data.dietary_restrictions
                )
                
                imported_guests.append(GuestResponse(
                    id=guest.id,
                    wedding_id=guest.wedding_id,
                    name=guest.name,
                    email=guest.email,
                    phone=guest.phone,
                    qr_code=guest.qr_code,
                    table_number=guest.table_number,
                    dietary_restrictions=guest.dietary_restrictions,
                    created_at=guest.created_at.isoformat(),
                    is_checked_in=False,
                    checked_in_at=None
                ))
                
                successful_imports += 1
                
            except Exception as e:
                failed_imports += 1
                errors.append(f"Guest {i+1} ({guest_data.name}): {str(e)}")
        
        return BulkGuestImportResponse(
            total_guests=len(import_data.guests),
            successful_imports=successful_imports,
            failed_imports=failed_imports,
            errors=errors,
            imported_guests=imported_guests
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to import guests"
        )


@router.post("/{wedding_id}/guests/bulk-import-csv", response_model=BulkGuestImportResponse)
async def bulk_import_guests_csv(
    wedding_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_couple),
    db: Session = Depends(get_db)
):
    """
    Bulk import guests from CSV file.
    
    Expected CSV format: name,email,phone,table_number,dietary_restrictions
    
    Args:
        wedding_id: ID of the wedding
        file: CSV file with guest data
        current_user: Current authenticated couple user
        db: Database session
        
    Returns:
        Import summary with successful and failed imports
        
    Raises:
        HTTPException: If wedding not found or access denied
    """
    try:
        wedding_service = WeddingService(db)
        wedding = wedding_service.get_wedding_by_id(wedding_id)
        
        if not wedding:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Wedding not found"
            )
        
        # Verify ownership
        if not current_user.couple or wedding.couple_id != current_user.couple.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You can only import guests to your own wedding"
            )
        
        # Validate file type
        if not file.filename.endswith('.csv'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File must be a CSV file"
            )
        
        # Read and parse CSV
        content = await file.read()
        csv_content = content.decode('utf-8')
        csv_reader = csv.DictReader(io.StringIO(csv_content))
        
        imported_guests = []
        errors = []
        successful_imports = 0
        failed_imports = 0
        row_number = 1
        
        for row in csv_reader:
            row_number += 1
            try:
                # Parse row data
                name = row.get('name', '').strip()
                email = row.get('email', '').strip() or None
                phone = row.get('phone', '').strip() or None
                table_number = None
                dietary_restrictions = row.get('dietary_restrictions', '').strip() or None
                
                # Parse table number
                table_str = row.get('table_number', '').strip()
                if table_str:
                    try:
                        table_number = int(table_str)
                    except ValueError:
                        raise ValueError(f"Invalid table number: {table_str}")
                
                if not name:
                    raise ValueError("Name is required")
                
                # Create guest data object for validation
                guest_data = GuestCreateRequest(
                    name=name,
                    email=email,
                    phone=phone,
                    table_number=table_number,
                    dietary_restrictions=dietary_restrictions
                )
                
                guest = wedding_service.add_guest(
                    wedding_id=wedding_id,
                    name=guest_data.name,
                    email=guest_data.email,
                    phone=guest_data.phone,
                    table_number=guest_data.table_number,
                    dietary_restrictions=guest_data.dietary_restrictions
                )
                
                imported_guests.append(GuestResponse(
                    id=guest.id,
                    wedding_id=guest.wedding_id,
                    name=guest.name,
                    email=guest.email,
                    phone=guest.phone,
                    qr_code=guest.qr_code,
                    table_number=guest.table_number,
                    dietary_restrictions=guest.dietary_restrictions,
                    created_at=guest.created_at.isoformat(),
                    is_checked_in=False,
                    checked_in_at=None
                ))
                
                successful_imports += 1
                
            except Exception as e:
                failed_imports += 1
                errors.append(f"Row {row_number}: {str(e)}")
        
        return BulkGuestImportResponse(
            total_guests=successful_imports + failed_imports,
            successful_imports=successful_imports,
            failed_imports=failed_imports,
            errors=errors,
            imported_guests=imported_guests
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to import guests from CSV"
        )


@router.post("/checkin/verify-code", response_model=CheckInVerifyResponse)
async def verify_checkin_code(
    verify_data: CheckInVerifyRequest,
    db: Session = Depends(get_db)
):
    """
    Verify wedding code and staff PIN for check-in access.
    
    Authenticates staff using wedding code and PIN, returns session token.
    
    Args:
        verify_data: Wedding code and staff PIN
        db: Database session
        
    Returns:
        Session token and wedding details for check-in
        
    Raises:
        HTTPException: If authentication fails
    """
    try:
        wedding_service = WeddingService(db)
        wedding = wedding_service.authenticate_staff(
            wedding_code=verify_data.wedding_code,
            staff_pin=verify_data.staff_pin
        )
        
        if not wedding:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid wedding code or staff PIN"
            )
        
        # Create check-in session
        from datetime import datetime, timedelta
        import uuid
        
        session_token = str(uuid.uuid4())
        expires_at = datetime.utcnow() + timedelta(hours=12)  # 12-hour session
        
        from app.models.wedding import CheckInSession
        session = CheckInSession(
            wedding_id=wedding.id,
            session_token=session_token,
            expires_at=expires_at
        )
        
        db.add(session)
        db.commit()
        
        return CheckInVerifyResponse(
            wedding_id=wedding.id,
            wedding_code=wedding.wedding_code,
            venue_name=wedding.venue_name,
            session_token=session_token,
            expires_at=expires_at.isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to verify check-in code"
        )


@router.post("/checkin/scan-qr", response_model=QRScanResponse)
async def scan_qr_code(
    scan_data: QRScanRequest,
    db: Session = Depends(get_db)
):
    """
    Process QR code scan for guest check-in.
    
    Validates QR code and checks in the guest if valid.
    Prevents duplicate check-ins (idempotent operation).
    
    Args:
        scan_data: QR code and session data
        db: Database session
        
    Returns:
        Guest check-in details
        
    Raises:
        HTTPException: If QR code invalid or session expired
    """
    try:
        # Verify session token
        from app.models.wedding import CheckInSession
        from datetime import datetime
        
        session = db.query(CheckInSession).filter(
            CheckInSession.session_token == scan_data.session_token,
            CheckInSession.expires_at > datetime.utcnow()
        ).first()
        
        if not session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired session token"
            )
        
        # Check in guest
        wedding_service = WeddingService(db)
        checkin = wedding_service.check_in_guest(
            wedding_id=session.wedding_id,
            qr_code=scan_data.qr_code,
            checked_in_by=scan_data.checked_in_by,
            method=CheckInMethod.QR_SCAN
        )
        
        if not checkin:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invalid QR code or guest not found"
            )
        
        # Check if this was a duplicate check-in
        was_already_checked_in = checkin.checked_in_at < datetime.utcnow() - timedelta(seconds=1)
        
        return QRScanResponse(
            guest_id=checkin.guest_id,
            guest_name=checkin.guest.name,
            table_number=checkin.guest.table_number,
            checked_in_at=checkin.checked_in_at.isoformat(),
            was_already_checked_in=was_already_checked_in
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process QR code scan"
        )


@router.get("/checkin/{wedding_id}/stats", response_model=CheckInStatsResponse)
async def get_checkin_stats(
    wedding_id: int,
    session_token: str,
    db: Session = Depends(get_db)
):
    """
    Get real-time check-in statistics for a wedding.
    
    Returns current check-in counts and recent activity.
    Requires valid check-in session token.
    
    Args:
        wedding_id: ID of the wedding
        session_token: Valid check-in session token
        db: Database session
        
    Returns:
        Check-in statistics and recent activity
        
    Raises:
        HTTPException: If session invalid or wedding not found
    """
    try:
        # Verify session token
        from app.models.wedding import CheckInSession
        from datetime import datetime, timedelta
        
        session = db.query(CheckInSession).filter(
            CheckInSession.session_token == session_token,
            CheckInSession.wedding_id == wedding_id,
            CheckInSession.expires_at > datetime.utcnow()
        ).first()
        
        if not session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired session token"
            )
        
        wedding_service = WeddingService(db)
        
        # Get guest and check-in counts
        guests = wedding_service.get_wedding_guests(wedding_id)
        checkins = wedding_service.get_wedding_checkins(wedding_id)
        
        total_guests = len(guests)
        checked_in_count = len(checkins)
        pending_count = total_guests - checked_in_count
        check_in_percentage = (checked_in_count / total_guests * 100) if total_guests > 0 else 0
        
        # Get recent check-ins (last 10)
        recent_checkins = []
        for checkin in sorted(checkins, key=lambda x: x.checked_in_at, reverse=True)[:10]:
            recent_checkins.append({
                "guest_name": checkin.guest.name,
                "table_number": checkin.guest.table_number,
                "checked_in_at": checkin.checked_in_at.isoformat(),
                "method": checkin.method.value
            })
        
        return CheckInStatsResponse(
            total_guests=total_guests,
            checked_in_count=checked_in_count,
            pending_count=pending_count,
            check_in_percentage=round(check_in_percentage, 1),
            recent_checkins=recent_checkins
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve check-in statistics"
        )