"""WebSocket Manager - Real-time Connection Management"""
import logging
from typing import Dict, List, Optional
from fastapi import WebSocket, WebSocketDisconnect
import json

logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    Manages WebSocket connections for real-time notifications.
    Supports per-user and per-venue connection grouping.
    """
    
    def __init__(self):
        # user_id -> list of websockets
        self.user_connections: Dict[str, List[WebSocket]] = {}
        # venue_id -> list of websockets
        self.venue_connections: Dict[str, List[WebSocket]] = {}
        # All active connections
        self.all_connections: List[WebSocket] = []
    
    async def connect(
        self, 
        websocket: WebSocket, 
        user_id: Optional[str] = None,
        venue_id: Optional[str] = None
    ):
        """Accept and register a WebSocket connection"""
        await websocket.accept()
        self.all_connections.append(websocket)
        
        if user_id:
            if user_id not in self.user_connections:
                self.user_connections[user_id] = []
            self.user_connections[user_id].append(websocket)
            logger.info(f"🔌 WebSocket: User {user_id} connected")
        
        if venue_id:
            if venue_id not in self.venue_connections:
                self.venue_connections[venue_id] = []
            self.venue_connections[venue_id].append(websocket)
            logger.info(f"🔌 WebSocket: Connected to venue {venue_id}")
    
    def disconnect(
        self, 
        websocket: WebSocket,
        user_id: Optional[str] = None,
        venue_id: Optional[str] = None
    ):
        """Remove a WebSocket connection"""
        if websocket in self.all_connections:
            self.all_connections.remove(websocket)
        
        if user_id and user_id in self.user_connections:
            if websocket in self.user_connections[user_id]:
                self.user_connections[user_id].remove(websocket)
                logger.info(f"🔌 WebSocket: User {user_id} disconnected")
        
        if venue_id and venue_id in self.venue_connections:
            if websocket in self.venue_connections[venue_id]:
                self.venue_connections[venue_id].remove(websocket)
    
    async def send_to_user(self, user_id: str, message: dict):
        """Send message to specific user"""
        if user_id in self.user_connections:
            disconnected = []
            for ws in self.user_connections[user_id]:
                try:
                    await ws.send_json(message)
                except Exception:
                    disconnected.append(ws)
            
            # Clean up disconnected
            for ws in disconnected:
                self.disconnect(ws, user_id=user_id)
    
    async def send_to_venue(self, venue_id: str, message: dict):
        """Broadcast message to all connections in a venue"""
        if venue_id in self.venue_connections:
            disconnected = []
            for ws in self.venue_connections[venue_id]:
                try:
                    await ws.send_json(message)
                except Exception:
                    disconnected.append(ws)
            
            for ws in disconnected:
                self.disconnect(ws, venue_id=venue_id)
    
    async def broadcast_all(self, message: dict):
        """Broadcast message to all connected clients"""
        disconnected = []
        for ws in self.all_connections:
            try:
                await ws.send_json(message)
            except Exception:
                disconnected.append(ws)
        
        for ws in disconnected:
            self.all_connections.remove(ws)
    
    def get_connection_count(self) -> dict:
        """Get current connection statistics"""
        return {
            "total": len(self.all_connections),
            "users": {uid: len(conns) for uid, conns in self.user_connections.items()},
            "venues": {vid: len(conns) for vid, conns in self.venue_connections.items()}
        }


# Global instance
ws_manager = ConnectionManager()
