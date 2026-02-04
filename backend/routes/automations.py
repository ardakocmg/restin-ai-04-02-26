"""Automations Routes"""
from fastapi import APIRouter, Depends, Query

from core.database import db
from core.dependencies import get_current_user, check_venue_access
from core.feature_flags import require_feature
from core.venue_config import VenueConfigRepo


def create_automations_router():
    router = APIRouter(tags=["automations"])

    @router.get("/automations/flows")
    async def list_flows(
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        config_repo = VenueConfigRepo(db)
        cfg = await config_repo.get(venue_id)
        require_feature(cfg, "automations", "automations")
        
        flows = await db.automation_flows.find(
            {"venue_id": venue_id},
            {"_id": 0}
        ).to_list(100)
        
        return {"ok": True, "data": flows}

    return router
