"""
Wedding Management Endpoints

Wedding creation, configuration, and management.
"""

from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.auth import get_current_couple
from app.services.wedding_service import WeddingService
from app.models.user import User
from app.models.wedding import Wedding

router = APIRouter()


class WeddingCreateRequest(BaseModel):
    """Request model for creating a wedding"""
    wedding_date: date = Field(..., description="Date of the wedding")
    venue_name: str = Field(..., min_length=1, max_length=200, description="Name of the venue")
    venue_address: str = Field(..., min_length=1, max_length=500, description="Address of the venue")
    expected_guests: int = Field(..., ge=1, le=10000, description="Expected number of guests")


class WeddingUpdateRequest(BaseModel):
    """Request model for updating a wedding"""
    wedding_date: Optional[date] = Field(None, description="Date of the wedding")
    venue_name: Optional[str] = Field(None, min_length=1, max_length=200, description="Name of the venue")
    venue_address: Optional[str] = Field(None, min_length=1, max_length=500, description="Address of the venue")
    expected_guests: Optional[int] = Field(None, ge=1, le=10000, description="Expected number of guests")


class WeddingResponse(BaseModel):
    """Response model for wedding data"""
    id: int
    wedding_code: str
    wedding_date: date
    venue_name: str
    venue_address: str
    expected_guests: int
    created_at: str
    
    class Config:
        from_attributes = True


class WeddingCreateResponse(WeddingResponse):
    """Response model for wedding creation (includes staff PIN)"""
    staff_pin: str


@router.post("/", response_model=WeddingCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_wedding(
    wedding_data: WeddingCreateRequest,
    current_user: User = Depends(get_current_couple),
    db: Session = Depends(get_db)
):
    """
    Create a new wedding for the authenticated couple.
    
    This endpoint creates a new wedding with a unique wedding code and staff PIN.
    The staff PIN is only returned once during creation for security purposes.
    
    Args:
        wedding_data: Wedding creation data
        current_user: Current authenticated couple user
        db: Database session
        
    Returns:
        Wedding details including the staff PIN (shown only once)
        
    Raises:
        HTTPException: If validation fails or couple not found
    """
    try:
        wedding_service = WeddingService(db)
        
        # Get couple ID from current user
        if not current_user.couple:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is not associated with a couple profile"
            )
        
        couple_id = current_user.couple.id
        
        # Create wedding
        wedding = wedding_service.create_wedding(
            couple_id=couple_id,
            wedding_date=wedding_data.wedding_date,
            venue_name=wedding_data.venue_name,
            venue_address=wedding_data.venue_address,
            expected_guests=wedding_data.expected_guests
        )
        
        # Return wedding data with staff PIN (only shown once)
        return WeddingCreateResponse(
            id=wedding.id,
            wedding_code=wedding.wedding_code,
            staff_pin=getattr(wedding, '_plain_staff_pin', ''),
            wedding_date=wedding.wedding_date,
            venue_name=wedding.venue_name,
            venue_address=wedding.venue_address,
            expected_guests=wedding.expected_guests,
            created_at=wedding.created_at.isoformat()
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create wedding"
        )


@router.get("/{wedding_id}", response_model=WeddingResponse)
async def get_wedding(
    wedding_id: int,
    current_user: User = Depends(get_current_couple),
    db: Session = Depends(get_db)
):
    """
    Get wedding details by ID.
    
    Only the couple who owns the wedding can access its details.
    
    Args:
        wedding_id: ID of the wedding to retrieve
        current_user: Current authenticated couple user
        db: Database session
        
    Returns:
        Wedding details
        
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
                detail="Access denied: You can only access your own weddings"
            )
        
        return WeddingResponse(
            id=wedding.id,
            wedding_code=wedding.wedding_code,
            wedding_date=wedding.wedding_date,
            venue_name=wedding.venue_name,
            venue_address=wedding.venue_address,
            expected_guests=wedding.expected_guests,
            created_at=wedding.created_at.isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve wedding"
        )


@router.get("/me", response_model=WeddingResponse)
async def get_my_wedding(
    current_user: User = Depends(get_current_couple),
    db: Session = Depends(get_db)
):
    """
    Get the current couple's wedding details.
    
    Returns the wedding associated with the authenticated couple.
    
    Args:
        current_user: Current authenticated couple user
        db: Database session
        
    Returns:
        Wedding details or 404 if no wedding exists
        
    Raises:
        HTTPException: If no wedding found for the couple
    """
    try:
        wedding_service = WeddingService(db)
        
        if not current_user.couple:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is not associated with a couple profile"
            )
        
        wedding = wedding_service.get_wedding_by_couple_id(current_user.couple.id)
        
        if not wedding:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No wedding found for this couple"
            )
        
        return WeddingResponse(
            id=wedding.id,
            wedding_code=wedding.wedding_code,
            wedding_date=wedding.wedding_date,
            venue_name=wedding.venue_name,
            venue_address=wedding.venue_address,
            expected_guests=wedding.expected_guests,
            created_at=wedding.created_at.isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve wedding"
        )


@router.put("/{wedding_id}", response_model=WeddingResponse)
async def update_wedding(
    wedding_id: int,
    wedding_data: WeddingUpdateRequest,
    current_user: User = Depends(get_current_couple),
    db: Session = Depends(get_db)
):
    """
    Update wedding details.
    
    Only the couple who owns the wedding can update its details.
    Wedding code and staff PIN cannot be changed through this endpoint.
    
    Args:
        wedding_id: ID of the wedding to update
        wedding_data: Wedding update data
        current_user: Current authenticated couple user
        db: Database session
        
    Returns:
        Updated wedding details
        
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
                detail="Access denied: You can only update your own weddings"
            )
        
        # Update fields if provided
        update_data = wedding_data.dict(exclude_unset=True)
        
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No update data provided"
            )
        
        for field, value in update_data.items():
            setattr(wedding, field, value)
        
        db.commit()
        db.refresh(wedding)
        
        return WeddingResponse(
            id=wedding.id,
            wedding_code=wedding.wedding_code,
            wedding_date=wedding.wedding_date,
            venue_name=wedding.venue_name,
            venue_address=wedding.venue_address,
            expected_guests=wedding.expected_guests,
            created_at=wedding.created_at.isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update wedding"
        )