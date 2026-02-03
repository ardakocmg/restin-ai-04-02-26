"""Cash Routes"""
from fastapi import APIRouter, Depends, Query

from core.database import db
from core.dependencies import get_current_user, check_venue_access


def create_cash_router():
    router = APIRouter(tags=["cash"])

    @router.get("/cash/shifts")
    async def list_shifts(
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        shifts = await db.cash_shifts.find(
            {"venue_id": venue_id},
            {"_id": 0}
        ).sort("opened_at", -1).to_list(100)
        
        return {"ok": True, "data": shifts}

    return router
