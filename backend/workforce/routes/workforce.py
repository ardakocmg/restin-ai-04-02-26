"""Workforce Hub Routes"""
from fastapi import APIRouter, Depends, Query

from core.database import db
from core.dependencies import get_current_user, check_venue_access


def create_workforce_router():
    router = APIRouter(tags=["workforce"])

    @router.get("/workforce/shifts")
    async def list_shifts(
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        shifts = await db.shift_plans.find(
            {"venue_id": venue_id},
            {"_id": 0}
        ).sort("shift_date", -1).to_list(200)
        
        return {"ok": True, "data": shifts}

    @router.get("/workforce/timesheets")
    async def list_timesheets(
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        timesheets = await db.timesheets.find(
            {"venue_id": venue_id},
            {"_id": 0}
        ).sort("period", -1).to_list(100)
        
        return {"ok": True, "data": timesheets}

    return router
