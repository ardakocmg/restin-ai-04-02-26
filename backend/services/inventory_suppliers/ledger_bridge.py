"""Ledger Bridge - Connect POS to Inventory Ledger"""
from datetime import datetime, timezone

from core.database import db
from models import LedgerAction, StockLedgerEntry
from services.event_bus import event_handler
from utils.helpers import compute_hash


@event_handler("order.closed")
async def handle_pos_order_closed(event: dict):
    """Deduct stock when POS order is closed"""
    data = event["data"]
    order_id = data.get("order_id")
    venue_id = data.get("venue_id")
    items = data.get("items", [])
    
    print(f"📦 LedgerBridge: Processing order {order_id} for stock deduction")
    
    # For each menu item, check if it has inventory recipes
    for item in items:
        menu_item_id = item.get("menu_item_id")
        quantity = item.get("quantity", 1)
        
        # Get recipe links
        recipes = await db.menu_item_inventory.find(
            {"menu_item_id": menu_item_id},
            {"_id": 0}
        ).to_list(100)
        
        for recipe in recipes:
            sku_id = recipe.get("inventory_item_id")
            recipe_qty = recipe.get("quantity", 1)
            total_qty = recipe_qty * quantity
            
            # Write to ledger
            last_entry = await db.stock_ledger.find_one(
                {"venue_id": venue_id},
                sort=[("created_at", -1)],
                projection={"_id": 0, "entry_hash": 1}
            )
            prev_hash = last_entry["entry_hash"] if last_entry else "genesis"
            
            entry_data = {
                "item_id": sku_id,
                "action": "OUT",
                "quantity": total_qty,
                "source": "POS",
                "source_id": order_id
            }
            entry_hash = compute_hash(entry_data, prev_hash)
            
            entry = StockLedgerEntry(
                venue_id=venue_id,
                item_id=sku_id,
                action=LedgerAction.OUT,
                quantity=total_qty,
                reason=f"POS Order: {order_id[:8]}",
                user_id="system",
                prev_hash=prev_hash,
                entry_hash=entry_hash
            )
            
            await db.stock_ledger.insert_one(entry.model_dump())
            
            # Update current stock
            await db.inventory_items.update_one(
                {"id": sku_id},
                {"$inc": {"quantity": -total_qty}}
            )
    
    print(f"✅ LedgerBridge: Stock deducted for order {order_id}")


@event_handler("pos.order.voided")
async def handle_pos_order_voided(event: dict):
    """Reverse stock deduction when order is voided"""
    data = event["data"]
    order_id = data.get("order_id")
    
    # Find all ledger entries for this order
    entries = await db.stock_ledger.find(
        {"reason": {"$regex": order_id}},
        {"_id": 0}
    ).to_list(100)
    
    # Reverse each entry
    for entry in entries:
        reverse_qty = entry["quantity"] if entry["action"] == "OUT" else -entry["quantity"]
        
        await db.inventory_items.update_one(
            {"id": entry["item_id"]},
            {"$inc": {"quantity": reverse_qty}}
        )
    
    print(f"🔄 LedgerBridge: Stock reversed for voided order {order_id}")
