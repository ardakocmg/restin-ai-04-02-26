"""Meta Routes"""
from fastapi import APIRouter, Depends, Query

from core.database import db
from core.dependencies import get_current_user, check_venue_access


def create_meta_router():
    router = APIRouter(tags=["meta"])

    @router.get("/meta/settings")
    async def get_meta_settings(
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        settings = await db.meta_settings.find_one(
            {"venue_id": venue_id},
            {"_id": 0}
        )
        
        if not settings:
            settings = {
                "venue_id": venue_id,
                "enabled": False,
                "enabled_features": {
                    "whatsapp": True,
                    "instagram": True,
                    "facebook": True,
                    "ads": True
                }
            }
        
        return {"ok": True, "data": settings}

    @router.get("/meta/inbox")
    async def get_meta_inbox(
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        messages = await db.meta_messages.find(
            {"venue_id": venue_id},
            {"_id": 0}
        ).sort("received_at", -1).to_list(200)
        
        return {"ok": True, "data": messages}

    return router
