"""UIX ViewState Routes"""
from fastapi import APIRouter, Depends, Query

from core.dependencies import get_current_user, check_venue_access
from uix.services.view_state_service import view_state_service


def create_uix_view_state_router():
    router = APIRouter(tags=["uix"])

    @router.get("/uix/view-state")
    async def get_view_state(
        venue_id: str = Query(...),
        page_key: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        state = await view_state_service.get_view_state(
            venue_id,
            current_user["id"],
            page_key
        )
        
        return {"ok": True, "data": state}

    @router.put("/uix/view-state")
    async def save_view_state(
        venue_id: str = Query(...),
        page_key: str = Query(...),
        data: dict = {},
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        state = await view_state_service.save_view_state(
            venue_id,
            current_user["id"],
            page_key,
            data.get("ui", {}),
            data.get("query", {})
        )
        
        return {"ok": True, "data": state}

    return router
