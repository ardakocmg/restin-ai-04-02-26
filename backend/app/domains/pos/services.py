"""
POS Service — MongoDB-backed Order Management.

Note: The main order CRUD lives in routes.py (direct MongoDB).
This module provides reusable helper functions for other services
that need to interact with orders programmatically.
"""
from typing import List, Optional
from datetime import datetime, timezone
from app.core.database import get_database
import uuid
import logging

logger = logging.getLogger(__name__)


class PosService:
    @staticmethod
    async def create_order(venue_id: str, table_id: str, user_id: str, items: list) -> dict:
        """Create a new order in MongoDB."""
        db = get_database()
        total = sum(i.get("quantity", 1) * i.get("price_cents", 0) for i in items)

        order_data = {
            "id": f"order-{uuid.uuid4().hex[:8]}",
            "venue_id": venue_id,
            "table_id": table_id,
            "user_id": user_id,
            "status": "PENDING",
            "total_cents": total,
            "items": items,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

        await db.orders.insert_one(order_data)
        order_data.pop("_id", None)
        return order_data

    @staticmethod
    async def get_active_orders(venue_id: str) -> List[dict]:
        """Get active (non-completed) orders for a venue."""
        db = get_database()
        orders = await db.orders.find({
            "venue_id": venue_id,
            "status": {"$ne": "COMPLETED"}
        }).sort("created_at", -1).to_list(length=200)

        for o in orders:
            o["_id"] = str(o["_id"])
        return orders

    @staticmethod
    async def update_status(order_id: str, status: str) -> Optional[dict]:
        """Update order status in MongoDB."""
        db = get_database()
        result = await db.orders.update_one(
            {"id": order_id},
            {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )

        if result.modified_count == 0:
            return None

        updated = await db.orders.find_one({"id": order_id})
        if updated:
            updated["_id"] = str(updated["_id"])
        return updated
