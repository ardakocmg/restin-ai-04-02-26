"""Apple Routes"""
from fastapi import APIRouter, Depends, Query

from core.database import db
from core.dependencies import get_current_user, check_venue_access


def create_apple_router():
    router = APIRouter(tags=["apple"])

    @router.get("/apple/settings")
    async def get_apple_settings(
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        settings = await db.apple_settings.find_one(
            {"venue_id": venue_id},
            {"_id": 0}
        )
        
        if not settings:
            settings = {
                "venue_id": venue_id,
                "enabled": False,
                "enabled_features": {"maps": True, "wallet": False}
            }
        
        return {"ok": True, "data": settings}

    return router
