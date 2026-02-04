"""Notification Service - Real-time push notifications (FUTURE MICROSERVICE)"""
from typing import Dict
from datetime import datetime, timezone

from core.database import db
from services.event_bus import event_handler
from services.service_registry import service_registry


class NotificationService:
    """Push notification service via WebSocket/FCM"""
    
    def __init__(self):
        self.service_name = "NotificationService"
    
    async def initialize(self):
        await service_registry.register_service(
            service_name=self.service_name,
            capabilities=["push_notification", "websocket_broadcast", "fcm_send"],
            subscribed_events=["order.created", "kds.ticket_ready", "table.occupied", "alert.created"]
        )
    
    async def send_notification(self, user_id: str, title: str, message: str, data: Dict = None):
        """Send push notification to user"""
        notification = {
            "user_id": user_id,
            "title": title,
            "message": message,
            "data": data or {},
            "sent_at": datetime.now(timezone.utc).isoformat(),
            "status": "SENT"
        }
        
        await db.notifications.insert_one(notification)
        
        # TODO: Integrate WebSocket or FCM
        print(f"🔔 NotificationService: Notification sent to {user_id}")
        
        return notification


# Event handlers
@event_handler("order.created")
async def notify_kitchen_new_order(event: Dict):
    """Notify kitchen staff of new order"""
    data = event["data"]
    print(f"🔔 NotificationService: Kitchen notified of order {data.get('order_id')}")


@event_handler("kds.ticket_ready")
async def notify_server_order_ready(event: Dict):
    """Notify server when order is ready"""
    data = event["data"]
    server_id = data.get("server_id")
    
    if server_id:
        await db.notifications.insert_one({
            "user_id": server_id,
            "title": "Order Ready",
            "message": f"Table {data.get('table_name')} order is ready!",
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        print(f"🔔 NotificationService: Server notified - order ready")


@event_handler("alert.created")
async def broadcast_alert(event: Dict):
    """Broadcast system alert to all staff"""
    data = event["data"]
    print(f"🔔 NotificationService: Alert broadcast - {data.get('message')}")


notification_service = NotificationService()
