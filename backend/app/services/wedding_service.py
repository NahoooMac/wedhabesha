"""
Wedding Service

Business logic for wedding management, guest handling, and check-in operations.
"""

from typing import Optional, List
from sqlalchemy.orm import Session
from datetime import datetime, date

from app.models.wedding import Wedding, Guest, CheckIn, CheckInMethod, CheckInSession
from app.models.user import Couple
from app.core.security import (
    generate_wedding_code, generate_staff_pin, hash_pin, 
    verify_pin, generate_qr_code
)


class WeddingService:
    """Service class for wedding management operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_wedding(
        self,
        couple_id: int,
        wedding_date: date,
        venue_name: str,
        venue_address: str,
        expected_guests: int
    ) -> Wedding:
        """
        Create a new wedding with unique code and staff PIN.
        
        Args:
            couple_id: ID of the couple creating the wedding
            wedding_date: Date of the wedding
            venue_name: Name of the venue
            venue_address: Address of the venue
            expected_guests: Expected number of guests
            
        Returns:
            Wedding object
            
        Raises:
            ValueError: If validation fails
        """
        # Verify couple exists
        couple = self.db.query(Couple).filter(Couple.id == couple_id).first()
        if not couple:
            raise ValueError(f"Couple with ID {couple_id} not found")
        
        # Generate unique wedding code
        wedding_code = self._generate_unique_wedding_code()
        
        # Generate and hash staff PIN
        staff_pin = generate_staff_pin()
        hashed_pin = hash_pin(staff_pin)
        
        # Create wedding
        wedding = Wedding(
            couple_id=couple_id,
            wedding_code=wedding_code,
            staff_pin=hashed_pin,
            wedding_date=wedding_date,
            venue_name=venue_name,
            venue_address=venue_address,
            expected_guests=expected_guests
        )
        
        self.db.add(wedding)
        self.db.commit()
        self.db.refresh(wedding)
        
        # Store the plain PIN temporarily for return (in real app, this would be shown once)
        wedding._plain_staff_pin = staff_pin
        
        return wedding
    
    def _generate_unique_wedding_code(self) -> str:
        """Generate a unique wedding code that doesn't exist in database"""
        max_attempts = 100
        for _ in range(max_attempts):
            code = generate_wedding_code()
            existing = self.db.query(Wedding).filter(Wedding.wedding_code == code).first()
            if not existing:
                return code
        
        raise ValueError("Unable to generate unique wedding code after maximum attempts")
    
    def add_guest(
        self,
        wedding_id: int,
        name: str,
        email: Optional[str] = None,
        phone: Optional[str] = None,
        table_number: Optional[int] = None,
        dietary_restrictions: Optional[str] = None
    ) -> Guest:
        """
        Add a guest to a wedding with unique QR code.
        
        Args:
            wedding_id: ID of the wedding
            name: Guest name
            email: Guest email (optional)
            phone: Guest phone (optional)
            table_number: Table number (optional)
            dietary_restrictions: Dietary restrictions (optional)
            
        Returns:
            Guest object
            
        Raises:
            ValueError: If validation fails
        """
        # Verify wedding exists
        wedding = self.db.query(Wedding).filter(Wedding.id == wedding_id).first()
        if not wedding:
            raise ValueError(f"Wedding with ID {wedding_id} not found")
        
        # Generate unique QR code
        qr_code = self._generate_unique_qr_code()
        
        # Create guest
        guest = Guest(
            wedding_id=wedding_id,
            name=name,
            email=email,
            phone=phone,
            qr_code=qr_code,
            table_number=table_number,
            dietary_restrictions=dietary_restrictions
        )
        
        self.db.add(guest)
        self.db.commit()
        self.db.refresh(guest)
        
        return guest
    
    def _generate_unique_qr_code(self) -> str:
        """Generate a unique QR code that doesn't exist in database"""
        max_attempts = 100
        for _ in range(max_attempts):
            code = generate_qr_code()
            existing = self.db.query(Guest).filter(Guest.qr_code == code).first()
            if not existing:
                return code
        
        raise ValueError("Unable to generate unique QR code after maximum attempts")
    
    def authenticate_staff(self, wedding_code: str, staff_pin: str) -> Optional[Wedding]:
        """
        Authenticate staff with wedding code and PIN.
        
        Args:
            wedding_code: Wedding code
            staff_pin: Plain text staff PIN
            
        Returns:
            Wedding object if authentication successful, None otherwise
        """
        wedding = self.db.query(Wedding).filter(Wedding.wedding_code == wedding_code).first()
        
        if not wedding:
            return None
        
        if not verify_pin(staff_pin, wedding.staff_pin):
            return None
        
        return wedding
    
    def check_in_guest(
        self,
        wedding_id: int,
        qr_code: str,
        checked_in_by: str,
        method: CheckInMethod = CheckInMethod.QR_SCAN
    ) -> Optional[CheckIn]:
        """
        Check in a guest using QR code.
        
        Args:
            wedding_id: ID of the wedding
            qr_code: Guest QR code
            checked_in_by: Staff identifier
            method: Check-in method
            
        Returns:
            CheckIn object if successful, None if guest not found or already checked in
        """
        # Find guest by QR code and wedding
        guest = self.db.query(Guest).filter(
            Guest.qr_code == qr_code,
            Guest.wedding_id == wedding_id
        ).first()
        
        if not guest:
            return None
        
        # Check if already checked in
        existing_checkin = self.db.query(CheckIn).filter(CheckIn.guest_id == guest.id).first()
        
        if existing_checkin:
            # Return existing check-in (idempotent behavior)
            return existing_checkin
        
        # Create check-in record
        checkin = CheckIn(
            guest_id=guest.id,
            wedding_id=wedding_id,
            checked_in_by=checked_in_by,
            method=method
        )
        
        self.db.add(checkin)
        self.db.commit()
        self.db.refresh(checkin)
        
        return checkin
    
    def get_wedding_by_code(self, wedding_code: str) -> Optional[Wedding]:
        """Get wedding by wedding code"""
        return self.db.query(Wedding).filter(Wedding.wedding_code == wedding_code).first()
    
    def get_wedding_by_id(self, wedding_id: int) -> Optional[Wedding]:
        """Get wedding by ID"""
        return self.db.query(Wedding).filter(Wedding.id == wedding_id).first()
    
    def get_wedding_guests(self, wedding_id: int) -> List[Guest]:
        """Get all guests for a wedding"""
        return list(self.db.query(Guest).filter(Guest.wedding_id == wedding_id).all())
    
    def get_wedding_checkins(self, wedding_id: int) -> List[CheckIn]:
        """Get all check-ins for a wedding"""
        return list(self.db.query(CheckIn).filter(CheckIn.wedding_id == wedding_id).all())
    
    def update_guest(
        self,
        guest_id: int,
        wedding_id: int,
        **update_data
    ) -> Optional[Guest]:
        """
        Update guest information while preserving QR code.
        
        Args:
            guest_id: ID of the guest to update
            wedding_id: ID of the wedding (for verification)
            **update_data: Fields to update
            
        Returns:
            Updated Guest object or None if not found
        """
        guest = self.db.query(Guest).filter(
            Guest.id == guest_id,
            Guest.wedding_id == wedding_id
        ).first()
        
        if not guest:
            return None
        
        # Update provided fields (preserve QR code)
        for field, value in update_data.items():
            if hasattr(guest, field) and field != 'qr_code':
                setattr(guest, field, value)
        
        self.db.commit()
        self.db.refresh(guest)
        
        return guest
    
    def delete_guest(self, guest_id: int, wedding_id: int) -> bool:
        """
        Delete a guest and associated check-ins.
        
        Args:
            guest_id: ID of the guest to delete
            wedding_id: ID of the wedding (for verification)
            
        Returns:
            True if deleted, False if not found
        """
        guest = self.db.query(Guest).filter(
            Guest.id == guest_id,
            Guest.wedding_id == wedding_id
        ).first()
        
        if not guest:
            return False
        
        # Delete associated check-ins first
        self.db.query(CheckIn).filter(CheckIn.guest_id == guest_id).delete()
        
        # Delete guest
        self.db.delete(guest)
        self.db.commit()
        
        return True
    
    def get_guest_by_id(self, guest_id: int, wedding_id: int) -> Optional[Guest]:
        """Get guest by ID within a specific wedding"""
        return self.db.query(Guest).filter(
            Guest.id == guest_id,
            Guest.wedding_id == wedding_id
        ).first()
    
    def create_checkin_session(self, wedding_id: int, session_token: str, expires_at: datetime) -> CheckInSession:
        """
        Create a check-in session for staff.
        
        Args:
            wedding_id: ID of the wedding
            session_token: Unique session token
            expires_at: Session expiration time
            
        Returns:
            CheckInSession object
        """
        session = CheckInSession(
            wedding_id=wedding_id,
            session_token=session_token,
            expires_at=expires_at
        )
        
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        
        return session
    
    def verify_checkin_session(self, session_token: str, wedding_id: int) -> Optional[CheckInSession]:
        """
        Verify a check-in session token.
        
        Args:
            session_token: Session token to verify
            wedding_id: Expected wedding ID
            
        Returns:
            CheckInSession if valid and not expired, None otherwise
        """
        return self.db.query(CheckInSession).filter(
            CheckInSession.session_token == session_token,
            CheckInSession.wedding_id == wedding_id,
            CheckInSession.expires_at > datetime.utcnow()
        ).first()
    
    def get_wedding_by_couple_id(self, couple_id: int) -> Optional[Wedding]:
        """Get wedding by couple ID"""
        return self.db.query(Wedding).filter(Wedding.couple_id == couple_id).first()
    
    def get_guests_by_ids(self, wedding_id: int, guest_ids: List[int]) -> List[Guest]:
        """Get guests by their IDs within a specific wedding"""
        return list(self.db.query(Guest).filter(
            Guest.wedding_id == wedding_id,
            Guest.id.in_(guest_ids)
        ).all())