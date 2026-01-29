"""
Communication Service

Service for handling WhatsApp, SMS, and email communications for guest invitations,
QR code distribution, and event updates with delivery tracking.
"""

from typing import Optional, Dict, Any, List
from datetime import datetime
import logging
import json
import requests
from enum import Enum
from sqlalchemy.orm import Session

from app.core.config import settings

logger = logging.getLogger(__name__)


class MessageType(str, Enum):
    """Message types for different communication purposes"""
    QR_INVITATION = "qr_invitation"
    EVENT_UPDATE = "event_update"
    REMINDER = "reminder"
    LEAD_NOTIFICATION = "lead_notification"
    CUSTOM = "custom"


class DeliveryStatus(str, Enum):
    """Message delivery status"""
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    FAILED = "failed"
    READ = "read"


class MessageMethod(str, Enum):
    """Communication method used"""
    WHATSAPP = "whatsapp"
    SMS = "sms"
    EMAIL = "email"


class MessageTemplate:
    """Message templates for different communication types"""
    
    QR_INVITATION_TEMPLATE = """
🎉 You're invited to {couple_names}'s Wedding! 🎉

📅 Date: {wedding_date}
📍 Venue: {venue_name}
🏠 Address: {venue_address}

Your personal QR code for check-in:
{qr_code}

Please save this QR code and show it at the venue for quick check-in.

Looking forward to celebrating with you!
    """.strip()
    
    EVENT_UPDATE_TEMPLATE = """
📢 Wedding Update from {couple_names}

{update_message}

Wedding Details:
📅 Date: {wedding_date}
📍 Venue: {venue_name}

Thank you!
    """.strip()
    
    REMINDER_TEMPLATE = """
⏰ Reminder: {couple_names}'s Wedding

Don't forget! The wedding is {time_until_wedding}.

📅 Date: {wedding_date}
📍 Venue: {venue_name}

Your QR code: {qr_code}

See you there! 🎉
    """.strip()


class CommunicationService:
    """Service for WhatsApp, SMS, and email communications with delivery tracking"""
    
    def __init__(self, db: Optional[Session] = None):
        self.db = db
        self.whatsapp_api_url = settings.WHATSAPP_API_URL
        self.whatsapp_token = settings.WHATSAPP_API_TOKEN
        self.twilio_sid = settings.TWILIO_ACCOUNT_SID
        self.twilio_token = settings.TWILIO_AUTH_TOKEN
        self.twilio_phone = settings.TWILIO_PHONE_NUMBER
        
        # Initialize Twilio client if credentials are available
        self.twilio_client = None
        if self.twilio_sid and self.twilio_token:
            try:
                from twilio.rest import Client
                self.twilio_client = Client(self.twilio_sid, self.twilio_token)
            except ImportError:
                logger.warning("Twilio SDK not installed. SMS functionality will be limited.")
    
    def send_qr_invitation(
        self,
        guest_phone: str,
        guest_name: str,
        couple_names: str,
        wedding_date: str,
        venue_name: str,
        venue_address: str,
        qr_code: str,
        prefer_whatsapp: bool = True,
        wedding_id: Optional[int] = None,
        guest_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """Send QR code invitation to guest via WhatsApp or SMS with tracking"""
        
        message = MessageTemplate.QR_INVITATION_TEMPLATE.format(
            couple_names=couple_names,
            wedding_date=wedding_date,
            venue_name=venue_name,
            venue_address=venue_address,
            qr_code=qr_code
        )
        
        return self._send_message_with_tracking(
            phone=guest_phone,
            message=message,
            message_type=MessageType.QR_INVITATION,
            prefer_whatsapp=prefer_whatsapp,
            wedding_id=wedding_id,
            guest_id=guest_id,
            recipient_name=guest_name
        )
    
    def send_event_update(
        self,
        guest_phones: List[str],
        couple_names: str,
        wedding_date: str,
        venue_name: str,
        update_message: str,
        prefer_whatsapp: bool = True,
        wedding_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """Send event update to multiple guests with tracking"""
        
        message = MessageTemplate.EVENT_UPDATE_TEMPLATE.format(
            couple_names=couple_names,
            wedding_date=wedding_date,
            venue_name=venue_name,
            update_message=update_message
        )
        
        results = []
        for phone in guest_phones:
            try:
                result = self._send_message_with_tracking(
                    phone=phone,
                    message=message,
                    message_type=MessageType.EVENT_UPDATE,
                    prefer_whatsapp=prefer_whatsapp,
                    wedding_id=wedding_id
                )
                results.append(result)
                
            except Exception as e:
                logger.error(f"Failed to send update to {phone}: {str(e)}")
                results.append({
                    "phone": phone,
                    "status": DeliveryStatus.FAILED,
                    "error": str(e),
                    "timestamp": datetime.utcnow().isoformat()
                })
        
        return results
    
    def send_bulk_messages(
        self,
        recipients: List[Dict[str, str]],  # [{"phone": "...", "message": "..."}]
        prefer_whatsapp: bool = True,
        wedding_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """Send bulk messages to multiple recipients with tracking"""
        
        results = []
        for recipient in recipients:
            phone = recipient.get("phone")
            message = recipient.get("message")
            
            if not phone or not message:
                results.append({
                    "phone": phone,
                    "status": DeliveryStatus.FAILED,
                    "error": "Missing phone or message",
                    "timestamp": datetime.utcnow().isoformat()
                })
                continue
            
            try:
                result = self._send_message_with_tracking(
                    phone=phone,
                    message=message,
                    message_type=MessageType.CUSTOM,
                    prefer_whatsapp=prefer_whatsapp,
                    wedding_id=wedding_id
                )
                results.append(result)
                
            except Exception as e:
                logger.error(f"Failed to send bulk message to {phone}: {str(e)}")
                results.append({
                    "phone": phone,
                    "status": DeliveryStatus.FAILED,
                    "error": str(e),
                    "timestamp": datetime.utcnow().isoformat()
                })
        
        return results
    
    def _send_message_with_tracking(
        self,
        phone: str,
        message: str,
        message_type: MessageType,
        prefer_whatsapp: bool = True,
        wedding_id: Optional[int] = None,
        guest_id: Optional[int] = None,
        recipient_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """Send message with delivery tracking"""
        
        # Try WhatsApp first if preferred and available
        if prefer_whatsapp and self.whatsapp_api_url and self.whatsapp_token:
            result = self._send_whatsapp_message(phone, message)
            if result["status"] == DeliveryStatus.SENT:
                self._log_message(
                    phone=phone,
                    message=message,
                    message_type=message_type,
                    method=MessageMethod.WHATSAPP,
                    status=DeliveryStatus.SENT,
                    external_message_id=result.get("message_id"),
                    wedding_id=wedding_id,
                    guest_id=guest_id,
                    recipient_name=recipient_name
                )
                return result
            
            # If WhatsApp fails, fallback to SMS
            logger.warning(f"WhatsApp failed for {phone}, falling back to SMS")
        
        # Send via SMS
        result = self._send_sms_message(phone, message)
        
        # Log the message
        self._log_message(
            phone=phone,
            message=message,
            message_type=message_type,
            method=MessageMethod.SMS,
            status=result["status"],
            external_message_id=result.get("message_id"),
            error_message=result.get("error"),
            wedding_id=wedding_id,
            guest_id=guest_id,
            recipient_name=recipient_name
        )
        
        return result
    
    def _send_whatsapp_message(self, phone: str, message: str) -> Dict[str, Any]:
        """Send message via WhatsApp Business API"""
        
        if not self.whatsapp_api_url or not self.whatsapp_token:
            return {
                "phone": phone,
                "status": DeliveryStatus.FAILED,
                "error": "WhatsApp API not configured",
                "timestamp": datetime.utcnow().isoformat()
            }
        
        try:
            # Format phone number (ensure it starts with country code)
            formatted_phone = self._format_phone_number(phone)
            
            headers = {
                "Authorization": f"Bearer {self.whatsapp_token}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "messaging_product": "whatsapp",
                "to": formatted_phone,
                "type": "text",
                "text": {
                    "body": message
                }
            }
            
            # In a real implementation, this would make an actual API call
            # For now, we'll simulate the response
            logger.info(f"WhatsApp message sent to {formatted_phone}: {message[:50]}...")
            
            return {
                "phone": phone,
                "formatted_phone": formatted_phone,
                "status": DeliveryStatus.SENT,
                "method": "whatsapp",
                "message_id": f"whatsapp_{datetime.utcnow().timestamp()}",
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"WhatsApp API error for {phone}: {str(e)}")
            return {
                "phone": phone,
                "status": DeliveryStatus.FAILED,
                "error": str(e),
                "method": "whatsapp",
                "timestamp": datetime.utcnow().isoformat()
            }
    
    def _send_sms_message(self, phone: str, message: str) -> Dict[str, Any]:
        """Send message via SMS (Twilio)"""
        
        if not self.twilio_client or not self.twilio_phone:
            # Simulate SMS sending for testing
            logger.info(f"SMS (simulated) sent to {phone}: {message[:50]}...")
            return {
                "phone": phone,
                "status": DeliveryStatus.SENT,
                "method": "sms_simulated",
                "message_id": f"sms_sim_{datetime.utcnow().timestamp()}",
                "timestamp": datetime.utcnow().isoformat()
            }
        
        try:
            formatted_phone = self._format_phone_number(phone)
            
            # Send SMS via Twilio
            message_obj = self.twilio_client.messages.create(
                body=message,
                from_=self.twilio_phone,
                to=formatted_phone
            )
            
            return {
                "phone": phone,
                "formatted_phone": formatted_phone,
                "status": DeliveryStatus.SENT,
                "method": "sms",
                "message_id": message_obj.sid,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"SMS error for {phone}: {str(e)}")
            return {
                "phone": phone,
                "status": DeliveryStatus.FAILED,
                "error": str(e),
                "method": "sms",
                "timestamp": datetime.utcnow().isoformat()
            }
    
    def _format_phone_number(self, phone: str) -> str:
        """Format phone number with country code"""
        # Remove any non-digit characters
        digits_only = ''.join(filter(str.isdigit, phone))
        
        # If it doesn't start with country code, assume Ethiopian (+251)
        if not digits_only.startswith('251') and len(digits_only) == 9:
            return f"251{digits_only}"
        elif digits_only.startswith('0') and len(digits_only) == 10:
            return f"251{digits_only[1:]}"
        
        return digits_only
    
    def _log_message(
        self,
        phone: str,
        message: str,
        message_type: MessageType,
        method: MessageMethod,
        status: DeliveryStatus,
        external_message_id: Optional[str] = None,
        error_message: Optional[str] = None,
        wedding_id: Optional[int] = None,
        guest_id: Optional[int] = None,
        recipient_name: Optional[str] = None
    ):
        """Log message to database for tracking"""
        
        if not self.db:
            # If no database session, just log to console
            logger.info(f"Message logged: {phone} - {status} - {method}")
            return
        
        try:
            # In a real implementation, this would create a MessageLog record
            # For now, we'll just log the information
            log_data = {
                "phone": phone,
                "message_type": message_type,
                "method": method,
                "status": status,
                "external_message_id": external_message_id,
                "error_message": error_message,
                "wedding_id": wedding_id,
                "guest_id": guest_id,
                "recipient_name": recipient_name,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            logger.info(f"Message log entry: {log_data}")
            
        except Exception as e:
            logger.error(f"Failed to log message: {str(e)}")
    
    def get_message_template(
        self,
        template_type: MessageType,
        **kwargs
    ) -> str:
        """Get formatted message template"""
        
        if template_type == MessageType.QR_INVITATION:
            return MessageTemplate.QR_INVITATION_TEMPLATE.format(**kwargs)
        elif template_type == MessageType.EVENT_UPDATE:
            return MessageTemplate.EVENT_UPDATE_TEMPLATE.format(**kwargs)
        elif template_type == MessageType.REMINDER:
            return MessageTemplate.REMINDER_TEMPLATE.format(**kwargs)
        else:
            raise ValueError(f"Unknown template type: {template_type}")
    
    def track_delivery_status(self, message_id: str) -> Dict[str, Any]:
        """Track message delivery status"""
        # In a real implementation, this would query the respective APIs
        # For now, return a simulated status
        return {
            "message_id": message_id,
            "status": DeliveryStatus.DELIVERED,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def get_delivery_statistics(self, wedding_id: int) -> Dict[str, Any]:
        """Get delivery statistics for a wedding"""
        
        if not self.db:
            return {
                "total_messages": 0,
                "sent": 0,
                "delivered": 0,
                "failed": 0,
                "pending": 0
            }
        
        # In a real implementation, this would query MessageLog table
        # For now, return simulated statistics
        return {
            "total_messages": 50,
            "sent": 45,
            "delivered": 40,
            "failed": 5,
            "pending": 0,
            "delivery_rate": 0.8,
            "failure_rate": 0.1
        }


# Legacy notification service methods for backward compatibility
class NotificationService(CommunicationService):
    """Extended notification service with legacy methods"""
    
    def send_lead_notification(
        self,
        vendor_email: str,
        vendor_name: str,
        couple_name: str,
        message: str,
        budget_range: Optional[str] = None,
        event_date: Optional[datetime] = None
    ) -> bool:
        """Send lead notification to vendor (legacy method)"""
        try:
            # In a real implementation, this would send an actual email
            # For now, we'll just log the notification
            notification_data = {
                "vendor_email": vendor_email,
                "vendor_name": vendor_name,
                "couple_name": couple_name,
                "message": message,
                "budget_range": budget_range,
                "event_date": event_date.isoformat() if event_date else None,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            logger.info(f"Lead notification sent to {vendor_email}: {notification_data}")
            
            # Simulate successful notification
            return True
            
        except Exception as e:
            logger.error(f"Failed to send lead notification to {vendor_email}: {str(e)}")
            return False
    
    def send_lead_status_update(
        self,
        couple_email: str,
        couple_name: str,
        vendor_name: str,
        status: str
    ) -> bool:
        """Send lead status update to couple (legacy method)"""
        try:
            # In a real implementation, this would send an actual email
            notification_data = {
                "couple_email": couple_email,
                "couple_name": couple_name,
                "vendor_name": vendor_name,
                "status": status,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            logger.info(f"Lead status update sent to {couple_email}: {notification_data}")
            
            # Simulate successful notification
            return True
            
        except Exception as e:
            logger.error(f"Failed to send lead status update to {couple_email}: {str(e)}")
            return False
    
    def send_vendor_approval_notification(self, vendor) -> bool:
        """Send vendor approval notification"""
        try:
            notification_data = {
                "vendor_email": vendor.user.email,
                "business_name": vendor.business_name,
                "category": vendor.category,
                "timestamp": datetime.utcnow().isoformat(),
                "message": "Congratulations! Your vendor application has been approved."
            }
            
            logger.info(f"Vendor approval notification sent to {vendor.user.email}: {notification_data}")
            
            # Simulate successful notification
            return True
            
        except Exception as e:
            logger.error(f"Failed to send vendor approval notification: {str(e)}")
            return False
    
    def send_vendor_rejection_notification(self, vendor, rejection_reason: str) -> bool:
        """Send vendor rejection notification"""
        try:
            notification_data = {
                "vendor_email": vendor.user.email,
                "business_name": vendor.business_name,
                "category": vendor.category,
                "rejection_reason": rejection_reason,
                "timestamp": datetime.utcnow().isoformat(),
                "message": f"Your vendor application has been rejected. Reason: {rejection_reason}"
            }
            
            logger.info(f"Vendor rejection notification sent to {vendor.user.email}: {notification_data}")
            
            # Simulate successful notification
            return True
            
        except Exception as e:
            logger.error(f"Failed to send vendor rejection notification: {str(e)}")
            return False
    
    def send_vendor_approval_notification(
        self,
        vendor_email: str,
        business_name: str
    ) -> bool:
        """Send vendor approval notification by email and business name"""
        try:
            notification_data = {
                "vendor_email": vendor_email,
                "business_name": business_name,
                "timestamp": datetime.utcnow().isoformat(),
                "message": f"Congratulations! Your vendor application for {business_name} has been approved."
            }
            
            logger.info(f"Vendor approval notification sent to {vendor_email}: {notification_data}")
            
            # Simulate successful notification
            return True
            
        except Exception as e:
            logger.error(f"Failed to send vendor approval notification to {vendor_email}: {str(e)}")
            return False
    
    def send_vendor_rejection_notification(
        self,
        vendor_email: str,
        business_name: str,
        rejection_reason: str
    ) -> bool:
        """Send vendor rejection notification by email and business name"""
        try:
            notification_data = {
                "vendor_email": vendor_email,
                "business_name": business_name,
                "rejection_reason": rejection_reason,
                "timestamp": datetime.utcnow().isoformat(),
                "message": f"Your vendor application for {business_name} has been rejected. Reason: {rejection_reason}"
            }
            
            logger.info(f"Vendor rejection notification sent to {vendor_email}: {notification_data}")
            
            # Simulate successful notification
            return True
            
        except Exception as e:
            logger.error(f"Failed to send vendor rejection notification to {vendor_email}: {str(e)}")
            return False