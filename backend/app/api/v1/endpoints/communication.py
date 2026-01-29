"""
Communication API Endpoints

Endpoints for WhatsApp, SMS, and bulk messaging functionality.
"""

from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from datetime import datetime
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.services.notification_service import CommunicationService, MessageType
from app.services.wedding_service import WeddingService
from app.services.user_service import UserService

router = APIRouter()


class QRInvitationRequest(BaseModel):
    """Request model for sending QR code invitations"""
    guest_ids: List[int] = Field(..., description="List of guest IDs to send invitations to")
    prefer_whatsapp: bool = Field(True, description="Prefer WhatsApp over SMS")
    custom_message: str = Field(None, description="Optional custom message to include")


class EventUpdateRequest(BaseModel):
    """Request model for sending event updates"""
    guest_ids: List[int] = Field(..., description="List of guest IDs to send updates to")
    update_message: str = Field(..., description="Update message content")
    prefer_whatsapp: bool = Field(True, description="Prefer WhatsApp over SMS")


class BulkMessageRequest(BaseModel):
    """Request model for bulk messaging"""
    recipients: List[Dict[str, str]] = Field(..., description="List of recipients with phone and message")
    prefer_whatsapp: bool = Field(True, description="Prefer WhatsApp over SMS")


class MessageResponse(BaseModel):
    """Response model for message sending"""
    phone: str
    status: str
    method: str
    message_id: str = None
    error: str = None
    timestamp: str


class BulkMessageResponse(BaseModel):
    """Response model for bulk messaging"""
    total_sent: int
    successful: int
    failed: int
    results: List[MessageResponse]


@router.post("/send-qr-invitations", response_model=BulkMessageResponse)
async def send_qr_invitations(
    request: QRInvitationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send QR code invitations to selected guests"""
    
    try:
        # Initialize services
        communication_service = CommunicationService()
        wedding_service = WeddingService(db)
        user_service = UserService(db)
        
        # Get user's wedding
        wedding = wedding_service.get_wedding_by_couple_id(current_user.id)
        if not wedding:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Wedding not found"
            )
        
        # Get guests
        guests = wedding_service.get_guests_by_ids(wedding.id, request.guest_ids)
        if not guests:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No guests found"
            )
        
        # Get couple names
        couple = user_service.get_couple_by_user_id(current_user.id)
        couple_names = f"{couple.partner1_name} & {couple.partner2_name}"
        
        # Send invitations
        results = []
        for guest in guests:
            if not guest.phone:
                results.append({
                    "phone": "N/A",
                    "status": "failed",
                    "method": "none",
                    "error": "No phone number provided",
                    "timestamp": datetime.utcnow().isoformat()
                })
                continue
            
            result = communication_service.send_qr_invitation(
                guest_phone=guest.phone,
                guest_name=guest.name,
                couple_names=couple_names,
                wedding_date=wedding.wedding_date.strftime("%B %d, %Y"),
                venue_name=wedding.venue_name,
                venue_address=wedding.venue_address,
                qr_code=guest.qr_code,
                prefer_whatsapp=request.prefer_whatsapp
            )
            results.append(result)
        
        # Calculate statistics
        successful = len([r for r in results if r["status"] == "sent"])
        failed = len([r for r in results if r["status"] == "failed"])
        
        return BulkMessageResponse(
            total_sent=len(results),
            successful=successful,
            failed=failed,
            results=results
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send invitations: {str(e)}"
        )


@router.post("/send-event-update", response_model=BulkMessageResponse)
async def send_event_update(
    request: EventUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send event update to selected guests"""
    
    try:
        # Initialize services
        communication_service = CommunicationService()
        wedding_service = WeddingService(db)
        user_service = UserService(db)
        
        # Get user's wedding
        wedding = wedding_service.get_wedding_by_couple_id(current_user.id)
        if not wedding:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Wedding not found"
            )
        
        # Get guests
        guests = wedding_service.get_guests_by_ids(wedding.id, request.guest_ids)
        if not guests:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No guests found"
            )
        
        # Get couple names
        couple = user_service.get_couple_by_user_id(current_user.id)
        couple_names = f"{couple.partner1_name} & {couple.partner2_name}"
        
        # Collect phone numbers
        guest_phones = [guest.phone for guest in guests if guest.phone]
        
        # Send updates
        results = communication_service.send_event_update(
            guest_phones=guest_phones,
            couple_names=couple_names,
            wedding_date=wedding.wedding_date.strftime("%B %d, %Y"),
            venue_name=wedding.venue_name,
            update_message=request.update_message,
            prefer_whatsapp=request.prefer_whatsapp
        )
        
        # Calculate statistics
        successful = len([r for r in results if r["status"] == "sent"])
        failed = len([r for r in results if r["status"] == "failed"])
        
        return BulkMessageResponse(
            total_sent=len(results),
            successful=successful,
            failed=failed,
            results=results
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send event update: {str(e)}"
        )


@router.post("/send-bulk-messages", response_model=BulkMessageResponse)
async def send_bulk_messages(
    request: BulkMessageRequest,
    current_user: User = Depends(get_current_user)
):
    """Send bulk messages to custom recipients"""
    
    try:
        # Initialize service
        communication_service = CommunicationService()
        
        # Send bulk messages
        results = communication_service.send_bulk_messages(
            recipients=request.recipients,
            prefer_whatsapp=request.prefer_whatsapp
        )
        
        # Calculate statistics
        successful = len([r for r in results if r["status"] == "sent"])
        failed = len([r for r in results if r["status"] == "failed"])
        
        return BulkMessageResponse(
            total_sent=len(results),
            successful=successful,
            failed=failed,
            results=results
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send bulk messages: {str(e)}"
        )


@router.get("/message-templates")
async def get_message_templates():
    """Get available message templates"""
    
    return {
        "templates": {
            "qr_invitation": {
                "type": MessageType.QR_INVITATION,
                "description": "QR code invitation template",
                "variables": [
                    "couple_names", "wedding_date", "venue_name", 
                    "venue_address", "qr_code"
                ]
            },
            "event_update": {
                "type": MessageType.EVENT_UPDATE,
                "description": "Event update template",
                "variables": [
                    "couple_names", "wedding_date", "venue_name", 
                    "update_message"
                ]
            },
            "reminder": {
                "type": MessageType.REMINDER,
                "description": "Wedding reminder template",
                "variables": [
                    "couple_names", "wedding_date", "venue_name", 
                    "time_until_wedding", "qr_code"
                ]
            }
        }
    }


@router.get("/delivery-status/{message_id}")
async def get_delivery_status(
    message_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get message delivery status"""
    
    try:
        communication_service = CommunicationService()
        status_info = communication_service.track_delivery_status(message_id)
        return status_info
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get delivery status: {str(e)}"
        )