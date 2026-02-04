"""System Health Routes"""
from fastapi import APIRouter, Depends, Query

from core.dependencies import get_current_user, check_venue_access
from system_health.services.health_service import health_service


def create_system_health_router():
    router = APIRouter(tags=["system_health"])

    @router.get("/system/health")
    async def get_system_health(
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        snapshot = await health_service.get_health_snapshot(venue_id)
        
        return {"ok": True, "data": snapshot}

    return router
