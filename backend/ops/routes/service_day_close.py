"""Service Day Close Routes"""
from fastapi import APIRouter, Depends, Query

from core.dependencies import get_current_user, check_venue_access
from ops.services.service_day_close_service import service_day_close_service


def create_ops_service_day_close_router():
    router = APIRouter(tags=["ops_service_day_close"])

    @router.get("/ops/service-day-close/status")
    async def get_close_status(
        venue_id: str = Query(...),
        date: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        run = await service_day_close_service.run_checks(venue_id, date)
        
        return {"ok": True, "data": run.model_dump()}

    return router
