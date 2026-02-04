"""Stats and dashboard routes"""
from fastapi import APIRouter, Depends
from datetime import datetime, timezone

from core.database import db
from core.dependencies import get_current_user, check_venue_access


def create_stats_router():
    router = APIRouter(tags=["stats"])

    @router.get("/venues/{venue_id}/stats")
    async def get_venue_stats(venue_id: str, current_user: dict = Depends(get_current_user)):
        await check_venue_access(current_user, venue_id)
        
        open_orders = await db.orders.count_documents({"venue_id": venue_id, "status": {"$nin": ["closed", "voided"]}})
        tables = await db.tables.count_documents({"venue_id": venue_id})
        occupied_tables = await db.tables.count_documents({"venue_id": venue_id, "status": "occupied"})
        pending_kds = await db.kds_tickets.count_documents({"venue_id": venue_id, "status": {"$in": ["pending", "preparing"]}})
        low_stock = await db.inventory_items.count_documents({"venue_id": venue_id, "quantity": {"$lte": "$min_quantity"}})
        
        return {
            "open_orders": open_orders,
            "total_tables": tables,
            "occupied_tables": occupied_tables,
            "pending_kds_tickets": pending_kds,
            "low_stock_items": low_stock,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

    return router
