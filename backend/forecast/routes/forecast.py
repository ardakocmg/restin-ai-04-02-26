"""Forecast Routes"""
from fastapi import APIRouter, Depends, Query

from core.database import db
from core.dependencies import get_current_user, check_venue_access


def create_forecast_router():
    router = APIRouter(tags=["forecast"])

    @router.get("/forecast/runs")
    async def list_runs(
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        runs = await db.forecast_runs.find(
            {"venue_id": venue_id},
            {"_id": 0}
        ).sort("created_at", -1).to_list(50)
        
        return {"ok": True, "data": runs}

    return router
