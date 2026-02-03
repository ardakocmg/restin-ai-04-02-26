"""Order Service - Event-driven order operations"""
from typing import Dict, Any, Tuple
from datetime import datetime, timezone

from core.database import db
from services.event_bus import event_bus, event_handler
from services.service_registry import service_registry


class OrderService:
    """Order management with event-driven architecture"""
    
    def __init__(self):
        self.service_name = "OrderService"
    
    async def initialize(self):
        """Initialize service and register with service registry"""
        await service_registry.register_service(
            service_name=self.service_name,
            capabilities=["order_create", "order_update", "order_close"],
            subscribed_events=["order.payment_received"]
        )
    
    async def close_order_event_driven(self, order_id: str, user: Dict) -> Tuple[bool, Dict]:
        """
        Close order with event-driven approach
        This is the NEW microservice way!
        """
        # 1. Update order status
        order = await db.orders.find_one({"id": order_id}, {"_id": 0})
        if not order:
            return False, {"error": "Order not found"}
        
        now = datetime.now(timezone.utc).isoformat()
        
        await db.orders.update_one(
            {"id": order_id},
            {"$set": {
                "status": "CLOSED",
                "closed_at": now,
                "closed_by": user["id"]
            }}
        )
        
        # 2. Publish event (other services will react)
        event_data = {
            "order_id": order_id,
            "venue_id": order["venue_id"],
            "table_id": order.get("table_id"),
            "total": order.get("total", 0),
            "items": order.get("items", []),
            "closed_by": user["id"],
            "closed_at": now
        }
        
        await event_bus.publish("order.closed", event_data, metadata={"user_id": user["id"]})
        
        return True, {"message": "Order closed", "order_id": order_id}


# Event handlers for OrderService
@event_handler("order.payment_received")
async def on_payment_received(event: Dict):
    """Handle payment received event"""
    order_id = event["data"].get("order_id")
    
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {
            "payment_status": "PAID",
            "paid_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    print(f"✅ OrderService: Payment processed for order {order_id}")


# Singleton instance
order_service = OrderService()
