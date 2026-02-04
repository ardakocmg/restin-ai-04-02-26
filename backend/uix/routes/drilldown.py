"""UIX Drilldown Routes"""
from fastapi import APIRouter, Depends, Query

from core.dependencies import get_current_user, check_venue_access
from uix.services.drilldown_service import drilldown_service


def create_uix_drilldown_router():
    router = APIRouter(tags=["uix_drilldown"])

    @router.post("/uix/drilldown/resolve")
    async def resolve_drilldown(
        venue_id: str = Query(...),
        data: dict = {},
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        result = await drilldown_service.resolve_drilldown(
            data.get("source_page_key"),
            data.get("tile_id"),
            data.get("cell", {}),
            data.get("current_state", {})
        )
        
        if not result:
            return {"ok": False, "error": {"code": "NOT_FOUND", "message": "Drilldown not defined"}}
        
        return {"ok": True, "data": result}

    return router
