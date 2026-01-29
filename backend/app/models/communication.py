"""
Communication Models

Database models for tracking messages, delivery status, and communication history.
"""

from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
from enum import Enum

from app.core.database import Base


class MessageType(str, Enum):
    """Message types for different communication purposes"""
    QR_INVITATION = "qr_invitation"
    EVENT_UPDATE = "event_update"
    REMINDER = "reminder"
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


class MessageLog(Base):
    """Log of all messages sent through the platform"""
    __tablename__ = "message_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    wedding_id = Column(Integer, ForeignKey("weddings.id"), nullable=False, index=True)
    guest_id = Column(Integer, ForeignKey("guests.id"), nullable=True, index=True)
    
    # Message details
    message_type = Column(SQLEnum(MessageType), nullable=False)
    method = Column(SQLEnum(MessageMethod), nullable=False)
    recipient_phone = Column(String(20), nullable=False)
    recipient_name = Column(String(255), nullable=True)
    
    # Message content
    subject = Column(String(255), nullable=True)
    message_content = Column(Text, nullable=False)
    
    # Delivery tracking
    status = Column(SQLEnum(DeliveryStatus), default=DeliveryStatus.PENDING, nullable=False)
    external_message_id = Column(String(255), nullable=True, index=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    sent_at = Column(DateTime, nullable=True)
    delivered_at = Column(DateTime, nullable=True)
    read_at = Column(DateTime, nullable=True)
    failed_at = Column(DateTime, nullable=True)
    
    # Error tracking
    error_message = Column(Text, nullable=True)
    retry_count = Column(Integer, default=0, nullable=False)
    
    # Relationships
    wedding = relationship("Wedding", back_populates="message_logs")
    guest = relationship("Guest", back_populates="message_logs")


class BulkMessageCampaign(Base):
    """Bulk messaging campaigns for tracking group communications"""
    __tablename__ = "bulk_message_campaigns"
    
    id = Column(Integer, primary_key=True, index=True)
    wedding_id = Column(Integer, ForeignKey("weddings.id"), nullable=False, index=True)
    
    # Campaign details
    campaign_name = Column(String(255), nullable=False)
    message_type = Column(SQLEnum(MessageType), nullable=False)
    message_content = Column(Text, nullable=False)
    
    # Targeting
    target_guest_count = Column(Integer, nullable=False)
    sent_count = Column(Integer, default=0, nullable=False)
    delivered_count = Column(Integer, default=0, nullable=False)
    failed_count = Column(Integer, default=0, nullable=False)
    
    # Preferences
    prefer_whatsapp = Column(Boolean, default=True, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Relationships
    wedding = relationship("Wedding", back_populates="bulk_campaigns")
    messages = relationship("MessageLog", backref="campaign", foreign_keys="MessageLog.id")


class MessageTemplate(Base):
    """Custom message templates created by couples"""
    __tablename__ = "message_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    wedding_id = Column(Integer, ForeignKey("weddings.id"), nullable=False, index=True)
    
    # Template details
    template_name = Column(String(255), nullable=False)
    message_type = Column(SQLEnum(MessageType), nullable=False)
    template_content = Column(Text, nullable=False)
    
    # Usage tracking
    usage_count = Column(Integer, default=0, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Status
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Relationships
    wedding = relationship("Wedding", back_populates="message_templates")