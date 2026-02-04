"""Stock Adjustments Routes"""
from fastapi import APIRouter, HTTPException, Depends, Query

from core.database import db
from core.dependencies import get_current_user, check_venue_access
from services.inventory.stock_adjustment_service import stock_adjustment_service


def create_inventory_adjustments_router():
    router = APIRouter(tags=["inventory_adjustments"])

    @router.get("/inventory/adjustments")
    async def list_adjustments(
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        adjustments = await db.stock_adjustments.find(
            {"venue_id": venue_id},
            {"_id": 0}
        ).sort("created_at", -1).to_list(200)
        
        return {"ok": True, "data": adjustments}

    @router.post("/inventory/adjustments/{id}/lock")
    async def lock_adjustment(
        id: str,
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        result = await stock_adjustment_service.lock_adjustment(id, current_user["id"])
        return result

    return router
