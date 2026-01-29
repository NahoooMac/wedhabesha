"""
API Router Configuration

Main API router that includes all endpoint routers.
"""

from fastapi import APIRouter

from app.api.v1.endpoints import auth, weddings, guests, vendors, budget, analytics, checkin, websocket, communication, admin

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(weddings.router, prefix="/weddings", tags=["weddings"])
api_router.include_router(guests.router, prefix="/guests", tags=["guests"])
api_router.include_router(vendors.router, prefix="/vendors", tags=["vendors"])
api_router.include_router(budget.router, prefix="/budget", tags=["budget"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(checkin.router, prefix="/checkin", tags=["checkin"])
api_router.include_router(websocket.router, prefix="/ws", tags=["websocket"])
api_router.include_router(communication.router, prefix="/communication", tags=["communication"])
api_router.include_router(admin.router, prefix="/admin", tags=["administration"])