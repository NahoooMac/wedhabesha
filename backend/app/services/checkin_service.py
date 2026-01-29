"""
Check-In Service

Business logic for guest check-in operations.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, func, desc

from app.models.wedding import Wedding, Guest, CheckIn, CheckInMethod
from app.core.redis import redis_service


class GuestWithStatus:
    """Helper class for guest with check-in status"""
    def __init__(self, guest: Guest, checkin: Optional[CheckIn] = None):
        self.id = guest.id
        self.name = guest.name
        self.table_number = guest.table_number
        self.qr_code = guest.qr_code
        self.is_checked_in = checkin is not None
        self.checked_in_at = checkin.checked_in_at if checkin else None


class CheckInService:
    """Service class for check-in operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def scan_qr_checkin(
        self,
        qr_code: str,
        wedding_id: int,
        staff_identifier: str
    ) -> CheckIn:
        """
        Check in guest by QR code scan
        
        Args:
            qr_code: Guest's QR code
            wedding_id: Wedding ID
            staff_identifier: Staff member identifier
            
        Returns:
            CheckIn record
            
        Raises:
            ValueError: If QR code is invalid or guest already checked in
        """
        # Find guest by QR code and wedding
        guest = self.db.query(Guest).filter(
            and_(
                Guest.qr_code == qr_code,
                Guest.wedding_id == wedding_id
            )
        ).first()
        
        if not guest:
            raise ValueError("Invalid QR code or guest not found for this wedding")
        
        # Check if already checked in
        existing_checkin = self.db.query(CheckIn).filter(
            and_(
                CheckIn.guest_id == guest.id,
                CheckIn.wedding_id == wedding_id
            )
        ).first()
        
        if existing_checkin:
            raise ValueError(f"Guest {guest.name} already checked in")
        
        # Create check-in record
        checkin = CheckIn(
            guest_id=guest.id,
            wedding_id=wedding_id,
            checked_in_at=datetime.utcnow(),
            checked_in_by=staff_identifier,
            method=CheckInMethod.QR_SCAN
        )
        
        self.db.add(checkin)
        self.db.commit()
        self.db.refresh(checkin)
        
        # Update real-time analytics
        await self._update_realtime_stats(wedding_id)
        
        return checkin
    
    async def manual_checkin(
        self,
        guest_id: int,
        wedding_id: int,
        staff_identifier: str
    ) -> CheckIn:
        """
        Check in guest manually by guest ID
        
        Args:
            guest_id: Guest ID
            wedding_id: Wedding ID
            staff_identifier: Staff member identifier
            
        Returns:
            CheckIn record
            
        Raises:
            ValueError: If guest not found or already checked in
        """
        # Find guest
        guest = self.db.query(Guest).filter(
            and_(
                Guest.id == guest_id,
                Guest.wedding_id == wedding_id
            )
        ).first()
        
        if not guest:
            raise ValueError("Guest not found for this wedding")
        
        # Check if already checked in
        existing_checkin = self.db.query(CheckIn).filter(
            and_(
                CheckIn.guest_id == guest.id,
                CheckIn.wedding_id == wedding_id
            )
        ).first()
        
        if existing_checkin:
            raise ValueError(f"Guest {guest.name} already checked in")
        
        # Create check-in record
        checkin = CheckIn(
            guest_id=guest_id,
            wedding_id=wedding_id,
            checked_in_at=datetime.utcnow(),
            checked_in_by=staff_identifier,
            method=CheckInMethod.MANUAL
        )
        
        self.db.add(checkin)
        self.db.commit()
        self.db.refresh(checkin)
        
        # Update real-time analytics
        await self._update_realtime_stats(wedding_id)
        
        return checkin
    
    async def get_guest_checkin_by_qr(
        self,
        qr_code: str,
        wedding_id: int
    ) -> Optional[CheckIn]:
        """Get existing check-in by QR code"""
        guest = self.db.query(Guest).filter(
            and_(
                Guest.qr_code == qr_code,
                Guest.wedding_id == wedding_id
            )
        ).first()
        
        if not guest:
            return None
        
        return self.db.query(CheckIn).filter(
            and_(
                CheckIn.guest_id == guest.id,
                CheckIn.wedding_id == wedding_id
            )
        ).first()
    
    async def get_guest_checkin_by_id(
        self,
        guest_id: int,
        wedding_id: int
    ) -> Optional[CheckIn]:
        """Get existing check-in by guest ID"""
        return self.db.query(CheckIn).filter(
            and_(
                CheckIn.guest_id == guest_id,
                CheckIn.wedding_id == wedding_id
            )
        ).first()
    
    async def get_checkin_stats(self, wedding_id: int) -> Dict[str, Any]:
        """
        Get real-time check-in statistics
        
        Args:
            wedding_id: Wedding ID
            
        Returns:
            Dictionary with statistics
        """
        # Get total guests
        total_guests = self.db.query(func.count(Guest.id)).filter(
            Guest.wedding_id == wedding_id
        ).scalar()
        
        # Get checked in count
        checked_in_count = self.db.query(func.count(CheckIn.id)).filter(
            CheckIn.wedding_id == wedding_id
        ).scalar()
        
        # Calculate pending and rate
        pending_count = total_guests - checked_in_count
        checkin_rate = (checked_in_count / total_guests * 100) if total_guests > 0 else 0
        
        # Get recent check-ins (last 10)
        recent_checkins_query = self.db.query(CheckIn, Guest).join(
            Guest, CheckIn.guest_id == Guest.id
        ).filter(
            CheckIn.wedding_id == wedding_id
        ).order_by(desc(CheckIn.checked_in_at)).limit(10)
        
        recent_checkins = []
        for checkin, guest in recent_checkins_query:
            recent_checkins.append({
                "guest_name": guest.name,
                "checked_in_at": checkin.checked_in_at,
                "method": checkin.method.value
            })
        
        return {
            "total_guests": total_guests,
            "checked_in_count": checked_in_count,
            "pending_count": pending_count,
            "checkin_rate": round(checkin_rate, 1),
            "recent_checkins": recent_checkins
        }
    
    async def get_guests_with_status(
        self,
        wedding_id: int,
        search_term: Optional[str] = None
    ) -> List[GuestWithStatus]:
        """
        Get guests with their check-in status
        
        Args:
            wedding_id: Wedding ID
            search_term: Optional search term for guest names
            
        Returns:
            List of guests with status
        """
        # Base query for guests
        query = self.db.query(Guest).filter(Guest.wedding_id == wedding_id)
        
        # Add search filter if provided
        if search_term:
            query = query.filter(Guest.name.ilike(f"%{search_term}%"))
        
        guests = query.order_by(Guest.name).all()
        
        # Get check-ins for these guests
        guest_ids = [guest.id for guest in guests]
        checkins = self.db.query(CheckIn).filter(
            and_(
                CheckIn.guest_id.in_(guest_ids),
                CheckIn.wedding_id == wedding_id
            )
        ).all()
        
        # Create lookup for check-ins
        checkin_lookup = {checkin.guest_id: checkin for checkin in checkins}
        
        # Create guest status objects
        guests_with_status = []
        for guest in guests:
            checkin = checkin_lookup.get(guest.id)
            guests_with_status.append(GuestWithStatus(guest, checkin))
        
        return guests_with_status
    
    async def get_checkin_history(
        self,
        wedding_id: int,
        limit: int = 50,
        method_filter: Optional[str] = None,
        time_filter: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get detailed check-in history with filtering options
        
        Args:
            wedding_id: Wedding ID
            limit: Maximum number of records to return
            method_filter: Filter by check-in method ('QR_SCAN' or 'MANUAL')
            time_filter: Filter by time ('last_hour' or 'last_30min')
            
        Returns:
            List of check-in history records
        """
        # Base query
        query = self.db.query(CheckIn, Guest).join(
            Guest, CheckIn.guest_id == Guest.id
        ).filter(CheckIn.wedding_id == wedding_id)
        
        # Apply method filter
        if method_filter and method_filter in ['QR_SCAN', 'MANUAL']:
            query = query.filter(CheckIn.method == CheckInMethod(method_filter))
        
        # Apply time filter
        if time_filter:
            now = datetime.utcnow()
            if time_filter == 'last_hour':
                cutoff_time = now - timedelta(hours=1)
                query = query.filter(CheckIn.checked_in_at >= cutoff_time)
            elif time_filter == 'last_30min':
                cutoff_time = now - timedelta(minutes=30)
                query = query.filter(CheckIn.checked_in_at >= cutoff_time)
        
        # Order by most recent first and apply limit
        query = query.order_by(desc(CheckIn.checked_in_at)).limit(limit)
        
        # Execute query and format results
        results = query.all()
        
        history = []
        for checkin, guest in results:
            history.append({
                "id": checkin.id,
                "guest_name": guest.name,
                "checked_in_at": checkin.checked_in_at,
                "method": checkin.method.value,
                "checked_in_by": checkin.checked_in_by,
                "table_number": guest.table_number
            })
        
        return history
    
    async def _update_realtime_stats(self, wedding_id: int):
        """Update real-time statistics in Redis and broadcast via WebSocket"""
        try:
            stats = await self.get_checkin_stats(wedding_id)
            
            # Store in Redis with wedding-specific key
            redis_key = f"wedding:{wedding_id}:stats"
            await redis_service.set_json(redis_key, stats, expire_minutes=60)
            
            # Publish update for WebSocket clients
            await redis_service.publish(f"wedding:{wedding_id}:updates", {
                "type": "checkin_update",
                "stats": stats,
                "timestamp": datetime.utcnow().isoformat()
            })
            
            # Import here to avoid circular imports
            from app.api.v1.endpoints.websocket import broadcast_stats_update
            
            # Broadcast to WebSocket clients
            await broadcast_stats_update(wedding_id, stats)
            
        except Exception as e:
            # Log error but don't fail the check-in operation
            print(f"Failed to update real-time stats: {e}")