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

    # Check for low stock after deduction and publish events
    for item in items:
        menu_item_id = item.get("menu_item_id")
        links = await db.menu_item_inventory.find({"menu_item_id": menu_item_id}, {"_id": 0}).to_list(100)
        for link in links:
            inv_item = await db.inventory_items.find_one(
                {"id": link["inventory_item_id"], "venue_id": venue_id},
                {"_id": 0}
            )
            if inv_item and inv_item.get("quantity", 0) < inv_item.get("min_quantity", 0):
                from services.event_bus import event_bus
                await event_bus.publish("inventory.low_stock", {
                    "venue_id": venue_id,
                    "item_id": inv_item["id"],
                    "item_name": inv_item.get("name", "Unknown"),
                    "current_qty": inv_item.get("quantity", 0),
                    "min_qty": inv_item.get("min_quantity", 0),
                    "supplier_id": inv_item.get("preferred_supplier_id")
                })


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


@event_handler("inventory.low_stock")
async def on_low_stock_auto_po(event: Dict):
    """Auto-generate draft purchase order when stock is low"""
    import uuid
    data = event["data"]
    venue_id = data.get("venue_id")
    item_id = data.get("item_id")
    supplier_id = data.get("supplier_id")
    
    if not supplier_id:
        print(f"⚠️  Auto-PO: No preferred supplier for {data.get('item_name')}, skipping")
        return
    
    # Check if a pending PO already exists for this item
    existing = await db.purchase_orders.find_one({
        "venue_id": venue_id,
        "status": "DRAFT",
        "items.item_id": item_id
    })
    if existing:
        return  # Already have a draft PO
    
    # Calculate reorder quantity (double the min)
    min_qty = data.get("min_qty", 0)
    reorder_qty = max(min_qty * 2, 1)
    
    po = {
        "id": str(uuid.uuid4()),
        "venue_id": venue_id,
        "supplier_id": supplier_id,
        "status": "DRAFT",
        "auto_generated": True,
        "items": [{
            "item_id": item_id,
            "item_name": data.get("item_name"),
            "quantity": reorder_qty,
            "unit_cost": 0  # To be filled by manager
        }],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "notes": f"Auto-generated: {data.get('item_name')} below minimum ({data.get('current_qty')}/{min_qty})"
    }
    
    await db.purchase_orders.insert_one(po)
    print(f"📦 Auto-PO: Draft PO created for {data.get('item_name')} (qty: {reorder_qty})")


inventory_service = InventoryService()

