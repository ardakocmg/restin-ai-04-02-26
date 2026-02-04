"""POS-KDS Integration: Route POS orders to KDS stations"""
from services.kds_order_integration import KdsOrderIntegration

class PosKdsIntegration:
    def __init__(self, db):
        self.db = db
        self.kds_integration = KdsOrderIntegration(db)

    async def send_order_to_kds(self, pos_order_id: str, venue_id: str, actor_id: str):
        """Convert POS order to KDS tickets"""
        # Get POS order
        pos_order = await self.db.pos_orders.find_one({"id": pos_order_id, "venue_id": venue_id}, {"_id": 0})
        if not pos_order:
            return []
        
        # Get items
        items = await self.db.pos_order_items.find(
            {"order_id": pos_order_id, "venue_id": venue_id, "state": "SENT"},
            {"_id": 0}
        ).to_list(1000)
        
        # Create order structure for KDS
        order_for_kds = {
            "id": pos_order_id,
            "venue_id": venue_id,
            "table_id": pos_order.get("table_id"),
            "table_name": pos_order.get("table_name", "POS Order"),
            "server_id": pos_order.get("created_by"),
            "server_name": "POS",
            "guest_count": 1,
            "order_type": pos_order.get("order_type", "DINE_IN"),
            "items": []
        }
        
        # Convert items
        for item in items:
            order_for_kds["items"].append({
                "id": item["id"],
                "menu_item_id": item["menu_item_id"],
                "menu_item_name": item["menu_item_name"],
                "quantity": item["qty"],
                "category": "",  # Should get from menu snapshot
                "modifiers": item.get("modifiers", []),
                "notes": item.get("instructions")
            })
        
        # Insert as order if not exists
        await self.db.orders.update_one(
            {"id": pos_order_id, "venue_id": venue_id},
            {"$set": order_for_kds},
            upsert=True
        )
        
        # Route to KDS
        ticket_ids = await self.kds_integration.send_order_to_kds(pos_order_id, venue_id, actor_id)
        return ticket_ids
