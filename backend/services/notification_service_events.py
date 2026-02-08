"""Notification Service - Real-time Push via WebSocket"""
import logging
from typing import Dict, Optional, List
from datetime import datetime, timezone

from core.database import db
from services.event_bus import event_handler
from services.service_registry import service_registry
from services.websocket_manager import ws_manager

logger = logging.getLogger(__name__)


class NotificationService:
    """Push notification service via WebSocket (and FCM for mobile)"""
    
    def __init__(self):
        self.service_name = "NotificationService"
    
    async def initialize(self):
        await service_registry.register_service(
            service_name=self.service_name,
            capabilities=["push_notification", "websocket_broadcast", "fcm_send"],
            subscribed_events=["order.created", "kds.ticket_ready", "table.occupied", "alert.created"]
        )
        logger.info("✓ NotificationService: WebSocket ready")
    
    async def send_notification(
        self, 
        user_id: str, 
        title: str, 
        message: str, 
        data: Optional[Dict] = None,
        notification_type: str = "info"
    ) -> Dict:
        """Send push notification to user via WebSocket"""
        notification = {
            "id": f"notif_{datetime.now(timezone.utc).timestamp()}",
            "user_id": user_id,
            "title": title,
            "message": message,
            "type": notification_type,  # info, success, warning, error
            "data": data or {},
            "created_at": datetime.now(timezone.utc).isoformat(),
            "read": False
        }
        
        # Store in DB
        await db.notifications.insert_one(notification)
        
        # Send via WebSocket
        await ws_manager.send_to_user(user_id, {
            "type": "notification",
            "payload": notification
        })
        
        logger.info(f"🔔 Notification sent to {user_id}: {title}")
        return notification
    
    async def broadcast_to_venue(
        self, 
        venue_id: str, 
        title: str, 
        message: str,
        notification_type: str = "info"
    ):
        """Broadcast notification to all users in venue"""
        payload = {
            "type": "broadcast",
            "payload": {
                "title": title,
                "message": message,
                "type": notification_type,
                "venue_id": venue_id,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        }
        
        await ws_manager.send_to_venue(venue_id, payload)
        logger.info(f"🔔 Broadcast to venue {venue_id}: {title}")
    
    async def get_user_notifications(
        self, 
        user_id: str, 
        limit: int = 50,
        unread_only: bool = False
    ) -> List[Dict]:
        """Get notifications for user"""
        query = {"user_id": user_id}
        if unread_only:
            query["read"] = False
        
        notifications = await db.notifications.find(
            query, {"_id": 0}
        ).sort("created_at", -1).to_list(limit)
        
        return notifications
    
    async def mark_as_read(self, notification_id: str, user_id: str):
        """Mark notification as read"""
        await db.notifications.update_one(
            {"id": notification_id, "user_id": user_id},
            {"$set": {"read": True, "read_at": datetime.now(timezone.utc).isoformat()}}
        )


# Event handlers
@event_handler("order.created")
async def notify_kitchen_new_order(event: Dict):
    """Notify kitchen staff of new order"""
    data = event.get("data", {})
    venue_id = data.get("venue_id")
    order_id = data.get("order_id")
    table_name = data.get("table_name", "Unknown")
    
    if venue_id:
        await notification_service.broadcast_to_venue(
            venue_id,
            title="New Order",
            message=f"New order from {table_name}",
            notification_type="info"
        )
    
    logger.debug(f"🔔 Kitchen notified of order {order_id}")


@event_handler("kds.ticket_ready")
async def notify_server_order_ready(event: Dict):
    """Notify server when order is ready"""
    data = event.get("data", {})
    server_id = data.get("server_id")
    table_name = data.get("table_name", "")
    
    if server_id:
        await notification_service.send_notification(
            user_id=server_id,
            title="Order Ready! 🍽️",
            message=f"Table {table_name} order is ready for pickup",
            notification_type="success"
        )


@event_handler("alert.created")
async def broadcast_alert(event: Dict):
    """Broadcast system alert to venue"""
    data = event.get("data", {})
    venue_id = data.get("venue_id")
    message = data.get("message", "System Alert")
    severity = data.get("severity", "warning")
    
    if venue_id:
        await notification_service.broadcast_to_venue(
            venue_id,
            title="⚠️ Alert",
            message=message,
            notification_type=severity
        )


notification_service = NotificationService()
