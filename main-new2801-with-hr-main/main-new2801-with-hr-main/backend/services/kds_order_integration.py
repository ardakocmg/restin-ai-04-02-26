"""Integration service to connect Orders with KDS"""
from typing import List, Dict, Any
from datetime import datetime, timezone
from kds.models import KdsTicketStateCreate, KdsItemStateCreate
from kds.services import KdsRuntimeService, KdsRoutingService

class KdsOrderIntegration:
    """Handle order-to-KDS routing and state management"""
    
    def __init__(self, db):
        self.db = db
        self.runtime_service = KdsRuntimeService(db)
        self.routing_service = KdsRoutingService(db)
    
    async def send_order_to_kds(self, order_id: str, venue_id: str, actor_id: str) -> List[str]:
        """
        Route order items to appropriate KDS stations and create tickets.
        Returns list of created ticket IDs.
        """
        # Get order
        order = await self.db.orders.find_one({"id": order_id, "venue_id": venue_id}, {"_id": 0})
        if not order:
            raise ValueError(f"Order {order_id} not found")
        
        # Group items by station
        station_items = {}
        
        for item in order.get("items", []):
            # Get stations for this item
            stations = await self.routing_service.get_stations_for_item(venue_id, item)
            
            for station_key in stations:
                if station_key not in station_items:
                    station_items[station_key] = []
                station_items[station_key].append(item)
        
        # Create tickets for each station
        created_tickets = []
        
        for station_key, items in station_items.items():
            # Create ticket
            ticket_data = KdsTicketStateCreate(
                order_id=order_id,
                station_key=station_key,
                venue_id=venue_id,
                metadata={
                    "table_name": order.get("table_name"),
                    "server_name": order.get("server_name"),
                    "guest_count": order.get("guest_count"),
                    "order_type": order.get("order_type", "DINE_IN")
                }
            )
            
            ticket = await self.runtime_service.create_ticket(ticket_data, actor_id)
            created_tickets.append(ticket.id)
            
            # Create item states
            for item in items:
                item_data = KdsItemStateCreate(
                    item_id=item["id"],
                    order_id=order_id,
                    station_key=station_key,
                    venue_id=venue_id
                )
                await self.runtime_service.create_item_state(item_data, actor_id)
        
        return created_tickets
    
    async def sync_kds_to_order(self, order_id: str, venue_id: str):
        """
        Update order status based on KDS ticket states.
        Called periodically or via event.
        """
        # Get all tickets for this order
        tickets = await self.db.kds_ticket_states.find(
            {"order_id": order_id, "venue_id": venue_id},
            {"_id": 0}
        ).to_list(100)
        
        if not tickets:
            return
        
        # Determine overall order status
        all_completed = all(t["status"] == "COMPLETED" for t in tickets)
        any_ready = any(t["status"] == "READY" for t in tickets)
        any_preparing = any(t["status"] == "PREPARING" for t in tickets)
        
        if all_completed:
            order_status = "ready_to_serve"
        elif any_ready:
            order_status = "partially_ready"
        elif any_preparing:
            order_status = "in_progress"
        else:
            order_status = "sent_to_kitchen"
        
        # Update order
        await self.db.orders.update_one(
            {"id": order_id, "venue_id": venue_id},
            {"$set": {
                "kds_status": order_status,
                "kds_updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
