"""
WebSocket Endpoints

Real-time communication for check-in updates and analytics with optimized connection management.
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, status
from typing import Dict, List, Set
import json
import asyncio
import logging
from datetime import datetime

from app.core.redis import redis_service
from app.core.websocket_optimization import websocket_manager, websocket_endpoint
from app.services.checkin_service import CheckInService
from app.core.database import get_db
from sqlalchemy.orm import Session

router = APIRouter()
logger = logging.getLogger(__name__)


async def verify_wedding_access(wedding_id: int, token: str) -> bool:
    """
    Verify that the token has access to the wedding
    This could be either a staff session token or a couple's JWT token
    """
    try:
        # Check if it's a staff session token
        session_data = await redis_service.get_session(token)
        if session_data and session_data.get("session_type") == "staff":
            return session_data.get("wedding_id") == wedding_id
        
        # TODO: Add JWT token verification for couples
        # For now, we'll allow any token for development
        return True
        
    except Exception as e:
        logger.error(f"Token verification failed: {e}")
        return False


@router.websocket("/wedding/{wedding_id}")
@websocket_endpoint("wedding_id")
async def wedding_websocket(
    websocket: WebSocket,
    connection_id: str,
    wedding_id: int,
    token: str = None
):
    """
    WebSocket endpoint for real-time wedding updates with optimized connection management
    
    Query parameters:
    - token: Authentication token (staff session or JWT)
    """
    # Verify authentication
    if not token or not await verify_wedding_access(wedding_id, token):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    
    try:
        # Send initial connection confirmation
        await websocket_manager.send_personal_message(connection_id, {
            "type": "connection_established",
            "wedding_id": wedding_id,
            "connection_id": connection_id,
            "timestamp": datetime.utcnow().isoformat(),
            "message": "Connected to real-time updates"
        })
        
        # Subscribe to wedding-specific updates
        websocket_manager.subscribe_to_channel(connection_id, f"wedding_{wedding_id}")
        websocket_manager.subscribe_to_channel(connection_id, f"checkin_{wedding_id}")
        websocket_manager.subscribe_to_channel(connection_id, f"analytics_{wedding_id}")
        
        # Keep connection alive and handle incoming messages
        while True:
            try:
                # Wait for messages from client
                data = await websocket.receive_text()
                message = json.loads(data)
                
                # Update connection activity
                websocket_manager.connection_pool.update_activity(
                    connection_id, len(data.encode()), is_sent=False
                )
                
                # Handle different message types
                if message.get("type") == "ping":
                    await websocket_manager.send_personal_message(connection_id, {
                        "type": "pong",
                        "timestamp": datetime.utcnow().isoformat()
                    })
                
                elif message.get("type") == "request_stats":
                    # Send current stats
                    await websocket_manager.send_personal_message(connection_id, {
                        "type": "stats_requested",
                        "message": "Stats update will be sent shortly"
                    })
                
                elif message.get("type") == "subscribe_channel":
                    # Allow dynamic channel subscription
                    channel = message.get("channel")
                    if channel and channel.startswith(f"wedding_{wedding_id}"):
                        websocket_manager.subscribe_to_channel(connection_id, channel)
                        await websocket_manager.send_personal_message(connection_id, {
                            "type": "subscribed",
                            "channel": channel
                        })
                
                elif message.get("type") == "unsubscribe_channel":
                    # Allow dynamic channel unsubscription
                    channel = message.get("channel")
                    if channel:
                        websocket_manager.unsubscribe_from_channel(connection_id, channel)
                        await websocket_manager.send_personal_message(connection_id, {
                            "type": "unsubscribed",
                            "channel": channel
                        })
                
            except json.JSONDecodeError:
                await websocket_manager.send_personal_message(connection_id, {
                    "type": "error",
                    "message": "Invalid JSON format"
                })
            
            except Exception as e:
                logger.error(f"Error handling WebSocket message: {e}")
                break
                
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for wedding {wedding_id}")
    except Exception as e:
        logger.error(f"WebSocket error for wedding {wedding_id}: {e}")


@router.websocket("/admin")
async def admin_websocket(
    websocket: WebSocket,
    token: str = None
):
    """
    WebSocket endpoint for admin real-time updates
    
    Query parameters:
    - token: Admin JWT token
    """
    import uuid
    connection_id = str(uuid.uuid4())
    
    # TODO: Add admin token verification
    # For now, we'll allow any token for development
    
    success = await websocket_manager.connect(websocket, connection_id)
    if not success:
        await websocket.close(code=1013, reason="Server overloaded")
        return
    
    try:
        # Send initial connection confirmation
        await websocket_manager.send_personal_message(connection_id, {
            "type": "admin_connection_established",
            "connection_id": connection_id,
            "timestamp": datetime.utcnow().isoformat(),
            "message": "Connected to admin real-time updates"
        })
        
        # Subscribe to admin channels
        websocket_manager.subscribe_to_channel(connection_id, "admin_notifications")
        websocket_manager.subscribe_to_channel(connection_id, "platform_stats")
        
        # Keep connection alive
        while True:
            try:
                data = await websocket.receive_text()
                message = json.loads(data)
                
                # Update connection activity
                websocket_manager.connection_pool.update_activity(
                    connection_id, len(data.encode()), is_sent=False
                )
                
                if message.get("type") == "ping":
                    await websocket_manager.send_personal_message(connection_id, {
                        "type": "pong",
                        "timestamp": datetime.utcnow().isoformat()
                    })
                
                elif message.get("type") == "request_platform_stats":
                    # Send platform statistics
                    stats = websocket_manager.get_stats()
                    await websocket_manager.send_personal_message(connection_id, {
                        "type": "platform_stats",
                        "data": stats,
                        "timestamp": datetime.utcnow().isoformat()
                    })
                
            except json.JSONDecodeError:
                await websocket_manager.send_personal_message(connection_id, {
                    "type": "error",
                    "message": "Invalid JSON format"
                })
            except Exception as e:
                logger.error(f"Error handling admin WebSocket message: {e}")
                break
                
    except WebSocketDisconnect:
        logger.info("Admin WebSocket disconnected")
    except Exception as e:
        logger.error(f"Admin WebSocket error: {e}")
    finally:
        await websocket_manager.disconnect(connection_id)


# Background task to listen for Redis pub/sub messages and broadcast to WebSocket clients
async def redis_listener():
    """
    Background task to listen for Redis pub/sub messages and forward to WebSocket clients
    """
    if not redis_service.is_available():
        logger.warning("Redis not available, WebSocket updates will not work")
        return
    
    try:
        logger.info("Redis WebSocket listener started")
        
        # In a real implementation, you would:
        # 1. Subscribe to Redis channels
        # 2. Listen for messages
        # 3. Parse messages and forward to appropriate WebSocket connections
        
        while True:
            await asyncio.sleep(1)  # Placeholder - replace with actual Redis listening
            
    except Exception as e:
        logger.error(f"Redis listener error: {e}")


# Utility functions for sending updates using optimized WebSocket manager
async def broadcast_checkin_update(wedding_id: int, update_data: dict):
    """
    Broadcast check-in update to all connected clients for a wedding
    
    Args:
        wedding_id: Wedding ID
        update_data: Update data to broadcast
    """
    message = {
        "type": "checkin_update",
        "wedding_id": wedding_id,
        "data": update_data,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    # Use optimized broadcast
    await websocket_manager.broadcast_to_wedding(wedding_id, message)


async def broadcast_stats_update(wedding_id: int, stats_data: dict):
    """
    Broadcast statistics update to all connected clients for a wedding
    
    Args:
        wedding_id: Wedding ID
        stats_data: Statistics data to broadcast
    """
    message = {
        "type": "stats_update",
        "wedding_id": wedding_id,
        "data": stats_data,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    # Use optimized broadcast with message batching
    await websocket_manager.broadcast_to_wedding(wedding_id, message)


async def broadcast_guest_update(wedding_id: int, guest_data: dict):
    """
    Broadcast guest update to all connected clients for a wedding
    
    Args:
        wedding_id: Wedding ID
        guest_data: Guest data to broadcast
    """
    message = {
        "type": "guest_update",
        "wedding_id": wedding_id,
        "data": guest_data,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    # Use optimized broadcast
    await websocket_manager.broadcast_to_wedding(wedding_id, message)


async def broadcast_admin_notification(notification_data: dict):
    """
    Broadcast notification to all admin connections
    
    Args:
        notification_data: Notification data to broadcast
    """
    message = {
        "type": "admin_notification",
        "data": notification_data,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    # Broadcast to admin channel
    channel = "admin_notifications"
    connections = websocket_manager.connection_pool.get_channel_connections(channel)
    
    for connection_info in connections:
        connection_id = next(
            cid for cid, info in websocket_manager.connection_pool.connections.items() 
            if info == connection_info
        )
        await websocket_manager.send_personal_message(connection_id, message)


# WebSocket statistics endpoint
@router.get("/stats")
async def websocket_stats():
    """Get WebSocket connection statistics"""
    return websocket_manager.get_stats()