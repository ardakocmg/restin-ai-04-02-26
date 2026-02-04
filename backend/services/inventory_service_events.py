"""Inventory Service - Event-driven stock management"""
from typing import Dict
from datetime import datetime, timezone

from core.database import db
from services.event_bus import event_handler
from services.service_registry import service_registry


class InventoryService:
    """Inventory management service (listens to order events)"""
    
    def __init__(self):
        self.service_name = "InventoryService"
    
    async def initialize(self):
        """Register service"""
        await service_registry.register_service(
            service_name=self.service_name,
            capabilities=["stock_update", "stock_check", "low_stock_alert"],
            subscribed_events=["order.closed", "order.item_added"]
        )


# Event handlers
@event_handler("order.closed")
async def on_order_closed(event: Dict):
    """Update inventory when order closes"""
    items = event["data"].get("items", [])
    venue_id = event["data"].get("venue_id")
    
    for item in items:
        menu_item_id = item.get("menu_item_id")
        quantity = item.get("quantity", 1)
        
        # Find linked inventory items
        links = await db.menu_item_inventory.find({"menu_item_id": menu_item_id}, {"_id": 0}).to_list(100)
        
        for link in links:
            inventory_item_id = link.get("inventory_item_id")
            usage_qty = link.get("quantity", 1) * quantity
            
            # Update stock
            await db.inventory_items.update_one(
                {"id": inventory_item_id, "venue_id": venue_id},
                {"$inc": {"quantity": -usage_qty}}
            )
    
    print(f"✅ InventoryService: Stock updated for order {event['data'].get('order_id')}")


@event_handler("order.item_added")
async def on_item_added(event: Dict):
    """Check stock availability when item is added"""
    menu_item_id = event["data"].get("menu_item_id")
    venue_id = event["data"].get("venue_id")
    
    # Check if ingredients are available
    links = await db.menu_item_inventory.find({"menu_item_id": menu_item_id}, {"_id": 0}).to_list(100)
    
    low_stock_items = []
    for link in links:
        inv_item = await db.inventory_items.find_one(
            {"id": link["inventory_item_id"], "venue_id": venue_id},
            {"_id": 0}
        )
        
        if inv_item and inv_item.get("quantity", 0) < inv_item.get("min_quantity", 0):
            low_stock_items.append(inv_item["name"])
    
    if low_stock_items:
        print(f"⚠️  InventoryService: Low stock warning for items: {', '.join(low_stock_items)}")


inventory_service = InventoryService()
