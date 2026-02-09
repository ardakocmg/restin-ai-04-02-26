"""
POS routes - orders from MongoDB.
"""
from fastapi import APIRouter, HTTPException, Body, Query
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from .models import Order, OrderCreate
from app.core.database import get_database
import uuid
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/pos", tags=["POS"])


@router.get("/dashboard")
async def pos_dashboard(
    venue_id: str = Query(...),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
):
    """Aggregate real POS data for the dashboard charts and KPIs."""
    db = get_database()

    # Parse date range (defaults to today)
    now = datetime.now(timezone.utc)
    try:
        d_from = datetime.fromisoformat(date_from) if date_from else now.replace(hour=0, minute=0, second=0, microsecond=0)
        d_to = datetime.fromisoformat(date_to) if date_to else now
    except Exception:
        d_from = now.replace(hour=0, minute=0, second=0, microsecond=0)
        d_to = now

    query = {
        "venue_id": venue_id,
        "created_at": {"$gte": d_from.isoformat(), "$lte": d_to.isoformat()},
    }

    orders = await db.orders.find(query).sort("created_at", 1).to_list(length=5000)

    # Determine if single day (hourly) or multi-day (daily)
    is_same_day = d_from.date() == d_to.date()

    # Build time-bucketed aggregation
    buckets = {}
    categories = {}
    total_revenue = 0
    total_receipts = len(orders)
    customer_ids = set()

    for order in orders:
        created = order.get("created_at", "")
        try:
            if isinstance(created, str):
                ts = datetime.fromisoformat(created.replace("Z", "+00:00"))
            else:
                ts = created
        except Exception:
            continue

        # Bucket key
        if is_same_day:
            bucket_key = f"{ts.hour}:00"
        else:
            bucket_key = ts.strftime("%b %d")

        if bucket_key not in buckets:
            buckets[bucket_key] = {"time": bucket_key, "revenue": 0, "receipts": 0, "customers": 0}

        order_total = float(order.get("total", 0) or 0)
        buckets[bucket_key]["revenue"] += order_total
        buckets[bucket_key]["receipts"] += 1
        total_revenue += order_total

        # Track unique customers
        cust_id = order.get("customer_id") or order.get("guest_id")
        if cust_id:
            customer_ids.add(cust_id)
            buckets[bucket_key]["customers"] += 1
        else:
            buckets[bucket_key]["customers"] += 1

        # Category breakdown from line items
        for item in order.get("items", []):
            cat = item.get("category", "Uncategorized")
            item_total = float(item.get("price", 0)) * int(item.get("quantity", 1))
            if cat not in categories:
                categories[cat] = {"label": cat, "value": 0, "count": 0}
            categories[cat]["value"] += item_total
            categories[cat]["count"] += 1

    # Sort buckets by time
    if is_same_day:
        sorted_data = sorted(buckets.values(), key=lambda x: int(x["time"].split(":")[0]))
    else:
        sorted_data = list(buckets.values())

    # Sort categories by revenue desc
    sorted_categories = sorted(categories.values(), key=lambda x: x["value"], reverse=True)

    return {
        "data": sorted_data,
        "view_mode": "hourly" if is_same_day else "daily",
        "totals": {
            "revenue": round(total_revenue, 2),
            "receipts": total_receipts,
            "customers": len(customer_ids) or total_receipts,
        },
        "categories": sorted_categories,
    }


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
