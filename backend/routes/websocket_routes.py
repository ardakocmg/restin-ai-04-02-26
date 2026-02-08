"""WebSocket Routes - Real-time notification endpoints"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
import logging

from services.websocket_manager import ws_manager

logger = logging.getLogger(__name__)


def create_websocket_router():
    router = APIRouter(tags=["websocket"])
    
    @router.websocket("/ws")
    async def websocket_endpoint(
        websocket: WebSocket,
        user_id: str = Query(None),
        venue_id: str = Query(None)
    ):
        """
        WebSocket endpoint for real-time notifications.
        
        Connect with: ws://localhost:8000/api/ws?user_id=USER_ID&venue_id=VENUE_ID
        
        Messages received:
        - { "type": "notification", "payload": {...} }
        - { "type": "broadcast", "payload": {...} }
        """
        await ws_manager.connect(websocket, user_id=user_id, venue_id=venue_id)
        
        try:
            while True:
                # Keep connection alive, listen for client messages
                data = await websocket.receive_text()
                
                # Handle ping/pong for keepalive
                if data == "ping":
                    await websocket.send_text("pong")
                else:
                    # Echo back any other messages (for debugging)
                    await websocket.send_json({"type": "echo", "data": data})
                    
        except WebSocketDisconnect:
            ws_manager.disconnect(websocket, user_id=user_id, venue_id=venue_id)
        except Exception as e:
            logger.error(f"WebSocket error: {e}")
            ws_manager.disconnect(websocket, user_id=user_id, venue_id=venue_id)
    
    @router.get("/ws/stats")
    async def websocket_stats():
        """Get current WebSocket connection statistics"""
        return ws_manager.get_connection_count()
    
    return router
