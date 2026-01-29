"""
WebSocket Connection Optimization

Optimized WebSocket handling with connection pooling, message batching, and performance monitoring.
"""

import asyncio
import json
import time
from typing import Dict, List, Set, Optional, Any, Callable
from dataclasses import dataclass, field
from enum import Enum
from fastapi import WebSocket, WebSocketDisconnect
from collections import defaultdict, deque

from app.core.redis import redis_service


class ConnectionState(Enum):
    """WebSocket connection states"""
    CONNECTING = "connecting"
    CONNECTED = "connected"
    DISCONNECTING = "disconnecting"
    DISCONNECTED = "disconnected"


@dataclass
class ConnectionInfo:
    """WebSocket connection information"""
    websocket: WebSocket
    user_id: Optional[int] = None
    wedding_id: Optional[int] = None
    connection_time: float = field(default_factory=time.time)
    last_activity: float = field(default_factory=time.time)
    state: ConnectionState = ConnectionState.CONNECTING
    message_count: int = 0
    bytes_sent: int = 0
    bytes_received: int = 0


class MessageBatcher:
    """Batch messages for efficient delivery"""
    
    def __init__(self, batch_size: int = 10, batch_timeout: float = 0.1):
        self.batch_size = batch_size
        self.batch_timeout = batch_timeout
        self.pending_messages: Dict[str, List[Dict]] = defaultdict(list)
        self.batch_timers: Dict[str, asyncio.Task] = {}
        self.connection_manager = None
    
    def set_connection_manager(self, manager):
        """Set reference to connection manager"""
        self.connection_manager = manager
    
    async def add_message(self, channel: str, message: Dict):
        """Add message to batch"""
        self.pending_messages[channel].append(message)
        
        # Send immediately if batch is full
        if len(self.pending_messages[channel]) >= self.batch_size:
            await self._send_batch(channel)
        elif channel not in self.batch_timers:
            # Start timer for batch
            self.batch_timers[channel] = asyncio.create_task(
                self._batch_timer(channel)
            )
    
    async def _batch_timer(self, channel: str):
        """Timer for sending batched messages"""
        await asyncio.sleep(self.batch_timeout)
        await self._send_batch(channel)
    
    async def _send_batch(self, channel: str):
        """Send batched messages"""
        if channel not in self.pending_messages or not self.pending_messages[channel]:
            return
        
        messages = self.pending_messages[channel].copy()
        self.pending_messages[channel].clear()
        
        # Cancel timer
        if channel in self.batch_timers:
            self.batch_timers[channel].cancel()
            del self.batch_timers[channel]
        
        # Send batch to connection manager
        if self.connection_manager:
            batch_message = {
                "type": "batch",
                "messages": messages,
                "count": len(messages),
                "timestamp": time.time()
            }
            await self.connection_manager._broadcast_to_channel(channel, batch_message)


class ConnectionPool:
    """Manage WebSocket connection pool"""
    
    def __init__(self, max_connections: int = 1000):
        self.max_connections = max_connections
        self.connections: Dict[str, ConnectionInfo] = {}
        self.channels: Dict[str, Set[str]] = defaultdict(set)
        self.user_connections: Dict[int, Set[str]] = defaultdict(set)
        self.wedding_connections: Dict[int, Set[str]] = defaultdict(set)
        self.connection_stats = {
            "total_connections": 0,
            "active_connections": 0,
            "messages_sent": 0,
            "messages_received": 0,
            "bytes_transferred": 0,
            "connection_errors": 0
        }
    
    def add_connection(self, connection_id: str, websocket: WebSocket, 
                      user_id: Optional[int] = None, wedding_id: Optional[int] = None) -> bool:
        """Add connection to pool"""
        if len(self.connections) >= self.max_connections:
            return False
        
        connection_info = ConnectionInfo(
            websocket=websocket,
            user_id=user_id,
            wedding_id=wedding_id
        )
        
        self.connections[connection_id] = connection_info
        
        # Track by user and wedding
        if user_id:
            self.user_connections[user_id].add(connection_id)
        if wedding_id:
            self.wedding_connections[wedding_id].add(connection_id)
        
        self.connection_stats["total_connections"] += 1
        self.connection_stats["active_connections"] += 1
        
        return True
    
    def remove_connection(self, connection_id: str):
        """Remove connection from pool"""
        if connection_id not in self.connections:
            return
        
        connection_info = self.connections[connection_id]
        
        # Remove from user and wedding tracking
        if connection_info.user_id:
            self.user_connections[connection_info.user_id].discard(connection_id)
        if connection_info.wedding_id:
            self.wedding_connections[connection_info.wedding_id].discard(connection_id)
        
        # Remove from channels
        for channel_connections in self.channels.values():
            channel_connections.discard(connection_id)
        
        del self.connections[connection_id]
        self.connection_stats["active_connections"] -= 1
    
    def get_connection(self, connection_id: str) -> Optional[ConnectionInfo]:
        """Get connection info"""
        return self.connections.get(connection_id)
    
    def get_user_connections(self, user_id: int) -> List[ConnectionInfo]:
        """Get all connections for a user"""
        connection_ids = self.user_connections.get(user_id, set())
        return [self.connections[cid] for cid in connection_ids if cid in self.connections]
    
    def get_wedding_connections(self, wedding_id: int) -> List[ConnectionInfo]:
        """Get all connections for a wedding"""
        connection_ids = self.wedding_connections.get(wedding_id, set())
        return [self.connections[cid] for cid in connection_ids if cid in self.connections]
    
    def subscribe_to_channel(self, connection_id: str, channel: str):
        """Subscribe connection to channel"""
        if connection_id in self.connections:
            self.channels[channel].add(connection_id)
    
    def unsubscribe_from_channel(self, connection_id: str, channel: str):
        """Unsubscribe connection from channel"""
        self.channels[channel].discard(connection_id)
    
    def get_channel_connections(self, channel: str) -> List[ConnectionInfo]:
        """Get all connections subscribed to channel"""
        connection_ids = self.channels.get(channel, set())
        return [self.connections[cid] for cid in connection_ids if cid in self.connections]
    
    def update_activity(self, connection_id: str, bytes_count: int = 0, is_sent: bool = True):
        """Update connection activity"""
        if connection_id in self.connections:
            connection = self.connections[connection_id]
            connection.last_activity = time.time()
            connection.message_count += 1
            
            if is_sent:
                connection.bytes_sent += bytes_count
                self.connection_stats["messages_sent"] += 1
            else:
                connection.bytes_received += bytes_count
                self.connection_stats["messages_received"] += 1
            
            self.connection_stats["bytes_transferred"] += bytes_count
    
    def cleanup_stale_connections(self, timeout: float = 300):  # 5 minutes
        """Remove stale connections"""
        current_time = time.time()
        stale_connections = []
        
        for connection_id, connection_info in self.connections.items():
            if current_time - connection_info.last_activity > timeout:
                stale_connections.append(connection_id)
        
        for connection_id in stale_connections:
            self.remove_connection(connection_id)
        
        return len(stale_connections)


class OptimizedWebSocketManager:
    """Optimized WebSocket connection manager"""
    
    def __init__(self, max_connections: int = 1000):
        self.connection_pool = ConnectionPool(max_connections)
        self.message_batcher = MessageBatcher()
        self.message_batcher.set_connection_manager(self)
        self.heartbeat_interval = 30  # seconds
        self.heartbeat_task: Optional[asyncio.Task] = None
        self.cleanup_task: Optional[asyncio.Task] = None
        self.message_queue: deque = deque(maxlen=10000)  # Message history
        self._tasks_started = False
    
    def _start_background_tasks(self):
        """Start background maintenance tasks"""
        if self._tasks_started:
            return
        
        try:
            # Only start tasks if there's a running event loop
            loop = asyncio.get_running_loop()
            self.heartbeat_task = asyncio.create_task(self._heartbeat_loop())
            self.cleanup_task = asyncio.create_task(self._cleanup_loop())
            self._tasks_started = True
        except RuntimeError:
            # No running event loop, tasks will be started later
            pass
    
    async def connect(self, websocket: WebSocket, connection_id: str,
                     user_id: Optional[int] = None, wedding_id: Optional[int] = None) -> bool:
        """Accept WebSocket connection"""
        # Start background tasks if not already started
        if not self._tasks_started:
            self._start_background_tasks()
        
        try:
            await websocket.accept()
            
            success = self.connection_pool.add_connection(
                connection_id, websocket, user_id, wedding_id
            )
            
            if success:
                connection_info = self.connection_pool.get_connection(connection_id)
                connection_info.state = ConnectionState.CONNECTED
                
                # Send welcome message
                await self.send_personal_message(connection_id, {
                    "type": "connection_established",
                    "connection_id": connection_id,
                    "timestamp": time.time()
                })
                
                return True
            else:
                await websocket.close(code=1013, reason="Server overloaded")
                return False
                
        except Exception as e:
            self.connection_pool.connection_stats["connection_errors"] += 1
            print(f"Connection error: {e}")
            return False
    
    async def disconnect(self, connection_id: str):
        """Disconnect WebSocket"""
        connection_info = self.connection_pool.get_connection(connection_id)
        if connection_info:
            connection_info.state = ConnectionState.DISCONNECTING
            
            try:
                await connection_info.websocket.close()
            except:
                pass
            
            self.connection_pool.remove_connection(connection_id)
    
    async def send_personal_message(self, connection_id: str, message: Dict):
        """Send message to specific connection"""
        connection_info = self.connection_pool.get_connection(connection_id)
        if not connection_info or connection_info.state != ConnectionState.CONNECTED:
            return False
        
        try:
            message_json = json.dumps(message)
            await connection_info.websocket.send_text(message_json)
            
            self.connection_pool.update_activity(
                connection_id, len(message_json.encode()), is_sent=True
            )
            
            # Add to message history
            self.message_queue.append({
                "connection_id": connection_id,
                "message": message,
                "timestamp": time.time(),
                "type": "personal"
            })
            
            return True
            
        except WebSocketDisconnect:
            await self.disconnect(connection_id)
            return False
        except Exception as e:
            print(f"Send message error: {e}")
            return False
    
    async def broadcast_to_wedding(self, wedding_id: int, message: Dict):
        """Broadcast message to all connections for a wedding"""
        connections = self.connection_pool.get_wedding_connections(wedding_id)
        
        if not connections:
            return 0
        
        # Use message batching for efficiency
        channel = f"wedding_{wedding_id}"
        await self.message_batcher.add_message(channel, message)
        
        return len(connections)
    
    async def broadcast_to_user(self, user_id: int, message: Dict):
        """Broadcast message to all user connections"""
        connections = self.connection_pool.get_user_connections(user_id)
        
        success_count = 0
        for connection_info in connections:
            connection_id = next(
                cid for cid, info in self.connection_pool.connections.items() 
                if info == connection_info
            )
            if await self.send_personal_message(connection_id, message):
                success_count += 1
        
        return success_count
    
    async def _broadcast_to_channel(self, channel: str, message: Dict):
        """Internal method to broadcast to channel"""
        connections = self.connection_pool.get_channel_connections(channel)
        
        success_count = 0
        for connection_info in connections:
            connection_id = next(
                cid for cid, info in self.connection_pool.connections.items() 
                if info == connection_info
            )
            if await self.send_personal_message(connection_id, message):
                success_count += 1
        
        # Add to message history
        self.message_queue.append({
            "channel": channel,
            "message": message,
            "timestamp": time.time(),
            "type": "broadcast",
            "recipients": success_count
        })
        
        return success_count
    
    def subscribe_to_channel(self, connection_id: str, channel: str):
        """Subscribe connection to channel"""
        self.connection_pool.subscribe_to_channel(connection_id, channel)
    
    def unsubscribe_from_channel(self, connection_id: str, channel: str):
        """Unsubscribe connection from channel"""
        self.connection_pool.unsubscribe_from_channel(connection_id, channel)
    
    async def _heartbeat_loop(self):
        """Send heartbeat to all connections"""
        while True:
            try:
                await asyncio.sleep(self.heartbeat_interval)
                
                heartbeat_message = {
                    "type": "heartbeat",
                    "timestamp": time.time()
                }
                
                # Send heartbeat to all active connections
                for connection_id, connection_info in self.connection_pool.connections.items():
                    if connection_info.state == ConnectionState.CONNECTED:
                        await self.send_personal_message(connection_id, heartbeat_message)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"Heartbeat error: {e}")
    
    async def _cleanup_loop(self):
        """Cleanup stale connections"""
        while True:
            try:
                await asyncio.sleep(60)  # Run every minute
                
                # Cleanup stale connections
                removed = self.connection_pool.cleanup_stale_connections()
                if removed > 0:
                    print(f"Cleaned up {removed} stale connections")
                
                # Publish stats to Redis for monitoring
                if redis_service.is_available():
                    stats = self.get_stats()
                    await redis_service.set_json("websocket_stats", stats, expire_minutes=5)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"Cleanup error: {e}")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get WebSocket statistics"""
        return {
            **self.connection_pool.connection_stats,
            "active_channels": len(self.connection_pool.channels),
            "message_queue_size": len(self.message_queue),
            "pending_batches": len(self.message_batcher.pending_messages),
            "connections_by_wedding": {
                wedding_id: len(connections) 
                for wedding_id, connections in self.connection_pool.wedding_connections.items()
            },
            "connections_by_user": {
                user_id: len(connections) 
                for user_id, connections in self.connection_pool.user_connections.items()
            }
        }
    
    async def shutdown(self):
        """Shutdown WebSocket manager"""
        # Cancel background tasks
        if self.heartbeat_task:
            self.heartbeat_task.cancel()
        if self.cleanup_task:
            self.cleanup_task.cancel()
        
        # Close all connections
        for connection_id in list(self.connection_pool.connections.keys()):
            await self.disconnect(connection_id)


# Global WebSocket manager instance
websocket_manager = OptimizedWebSocketManager()


# WebSocket connection decorator for automatic management
def websocket_endpoint(wedding_id_param: str = "wedding_id"):
    """Decorator for WebSocket endpoints with automatic connection management"""
    def decorator(func):
        async def wrapper(websocket: WebSocket, **kwargs):
            import uuid
            connection_id = str(uuid.uuid4())
            wedding_id = kwargs.get(wedding_id_param)
            
            # Connect
            success = await websocket_manager.connect(
                websocket, connection_id, wedding_id=wedding_id
            )
            
            if not success:
                return
            
            try:
                # Subscribe to wedding channel
                if wedding_id:
                    websocket_manager.subscribe_to_channel(
                        connection_id, f"wedding_{wedding_id}"
                    )
                
                # Call the original function
                await func(websocket, connection_id, **kwargs)
                
            except WebSocketDisconnect:
                pass
            finally:
                await websocket_manager.disconnect(connection_id)
        
        return wrapper
    return decorator