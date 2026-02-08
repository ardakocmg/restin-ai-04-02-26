"""
Inventory routes - reads from MongoDB inventory_items collection.
"""
from fastapi import APIRouter, HTTPException, Body
from typing import List
from .models import InventoryItem, StockAdjustment
from .services import InventoryService
from app.core.database import get_database

router = APIRouter(prefix="/api/inventory", tags=["Inventory"])


@router.get("/items")
async def get_inventory():
    """Get all inventory items from MongoDB."""
    db = get_database()
    items = await db.inventory_items.find({}).to_list(length=500)
    # Convert ObjectId to string
    for item in items:
        item["_id"] = str(item["_id"])
    return items


@router.get("/valuation")
async def get_valuation():
    """Calculate total inventory valuation from MongoDB."""
    db = get_database()
    items_raw = await db.inventory_items.find({}).to_list(length=500)
    
    total_cents = 0
    for item in items_raw:
        price = item.get("priceCents", item.get("price_cents", 0)) or 0
        stock = item.get("current_stock", item.get("stock", 0)) or 0
        total_cents += int(price) * int(stock)
    
    return {"total_valuation_cents": total_cents, "currency": "EUR"}


@router.get("/alerts/reorder")
async def get_reorder_alerts():
    """Get items that need reordering from MongoDB."""
    db = get_database()
    items = await db.inventory_items.find({}).to_list(length=500)
    
    alerts = []
    for item in items:
        stock = item.get("current_stock", item.get("stock", 0)) or 0
        min_stock = item.get("min_stock", item.get("minStock", 0)) or 0
        if stock <= min_stock:
            item["_id"] = str(item["_id"])
            alerts.append(item)
    
    return alerts


@router.post("/adjust")
async def adjust_stock(adjustment: StockAdjustment):
    """Adjust stock level for an item in MongoDB."""
    db = get_database()
    
    result = await db.inventory_items.update_one(
        {"id": adjustment.item_id},
        {"$inc": {"current_stock": adjustment.quantity_change}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(404, "Item not found")
    
    updated = await db.inventory_items.find_one({"id": adjustment.item_id})
    if updated:
        updated["_id"] = str(updated["_id"])
    
    return {"status": "success", "item": updated}
