"""Loyalty Routes"""
from fastapi import APIRouter, Depends, Query

from core.database import db
from core.dependencies import get_current_user, check_venue_access
from core.feature_flags import require_feature
from core.venue_config import VenueConfigRepo


def create_loyalty_router():
    router = APIRouter(tags=["loyalty"])

    @router.get("/loyalty/accounts")
    async def list_accounts(
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        config_repo = VenueConfigRepo(db)
        cfg = await config_repo.get(venue_id)
        require_feature(cfg, "loyalty", "loyalty")
        
        accounts = await db.loyalty_accounts.find(
            {"venue_id": venue_id},
            {"_id": 0}
        ).to_list(500)
        
        return {"ok": True, "data": accounts}

    return router
