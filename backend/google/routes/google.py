"""Google Routes - Complete Integration"""
from fastapi import APIRouter, Depends, Query

from core.database import db
from core.dependencies import get_current_user, check_venue_access


def create_google_router():
    router = APIRouter(tags=["google"])

    @router.get("/google/settings")
    async def get_google_settings(
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        settings = await db.google_settings.find_one(
            {"venue_id": venue_id},
            {"_id": 0}
        )
        
        if not settings:
            settings = {
                "venue_id": venue_id,
                "enabled": False,
                "enabled_features": {
                    "business_profile": True,
                    "reviews": True,
                    "calendar": True,
                    "drive": True,
                    "analytics": True
                }
            }
        
        return {"ok": True, "data": settings}

    @router.get("/google/reviews")
    async def list_reviews(
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        reviews = await db.google_reviews.find(
            {"venue_id": venue_id},
            {"_id": 0}
        ).sort("published_at", -1).to_list(100)
        
        return {"ok": True, "data": reviews}

    @router.get("/google/calendar/events")
    async def list_calendar_events(
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        events = await db.google_calendar_events.find(
            {"venue_id": venue_id},
            {"_id": 0}
        ).sort("start_time", -1).to_list(100)
        
        return {"ok": True, "data": events}

    @router.get("/google/analytics/snapshot")
    async def get_analytics_snapshot(
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        snapshots = await db.google_analytics_snapshots.find(
            {"venue_id": venue_id},
            {"_id": 0}
        ).sort("captured_at", -1).to_list(30)
        
        return {"ok": True, "data": snapshots}

    return router
