"""Venue Config Routes"""
from fastapi import APIRouter, Depends, Query

from core.database import db
from core.dependencies import get_current_user, check_venue_access
from core.venue_config import VenueConfigRepo


def create_venue_config_router():
    router = APIRouter(tags=["venue_config"])

    @router.get("/config/venues/{venue_id}")
    async def get_venue_config(
        venue_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        config_repo = VenueConfigRepo(db)
        cfg = await config_repo.get(venue_id)
        
        return {"ok": True, "data": cfg}

    @router.put("/config/venues/{venue_id}")
    async def update_venue_config(
        venue_id: str,
        data: dict,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        config_repo = VenueConfigRepo(db)
        cfg = await config_repo.upsert(
            venue_id,
            features=data.get("features"),
            rules=data.get("rules"),
            user_id=current_user["id"]
        )
        
        return {"ok": True, "data": cfg}

    return router
