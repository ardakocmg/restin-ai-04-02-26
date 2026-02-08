"""
POS routes - orders from MongoDB.
"""
from fastapi import APIRouter, HTTPException, Body
from typing import List, Optional
from datetime import datetime, timezone
from .models import Order, OrderCreate
from app.core.database import get_database
import uuid

router = APIRouter(prefix="/api/pos", tags=["POS"])


@router.post("/orders")
async def create_order(order: OrderCreate):
    """Create a new order in MongoDB."""
    db = get_database()
    
    order_data = order.dict()
    order_data["id"] = f"order-{uuid.uuid4().hex[:8]}"
    order_data["status"] = "pending"
    order_data["created_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.orders.insert_one(order_data)
    order_data.pop("_id", None)
    return order_data


@router.get("/orders")
async def get_orders(venue_id: str, status: Optional[str] = None):
    """Get orders for a venue from MongoDB."""
    db = get_database()
    
    query = {"venue_id": venue_id}
    if status:
        query["status"] = status
    
    orders = await db.orders.find(query).sort("created_at", -1).to_list(length=200)
    for o in orders:
        o["_id"] = str(o["_id"])
    return orders


@router.patch("/orders/{order_id}/status")
async def update_status(order_id: str, status: str = Body(..., embed=True)):
    """Update order status in MongoDB."""
    db = get_database()
    
    result = await db.orders.update_one(
        {"id": order_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(404, "Order not found")
    
    updated = await db.orders.find_one({"id": order_id})
    if updated:
        updated["_id"] = str(updated["_id"])
    return updated
