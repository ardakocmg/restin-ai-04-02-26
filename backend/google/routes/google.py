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

    @router.post("/google/connect")
    async def connect_google(
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        """Mock OAuth connection - stores settings"""
        await check_venue_access(current_user, venue_id)
        
        from datetime import datetime, timezone
        
        settings = {
            "venue_id": venue_id,
            "enabled": True,
            "oauth_ref": f"mock://oauth-{venue_id}",
            "enabled_features": {
                "business_profile": True,
                "reviews": True,
                "calendar": True,
                "drive": True,
                "analytics": True,
                "ads": False,
                "forms": False,
                "sheets": False
            },
            "connected_at": datetime.now(timezone.utc).isoformat(),
            "last_sync_at": ""
        }
        
        await db.google_settings.update_one(
            {"venue_id": venue_id},
            {"$set": settings},
            upsert=True
        )
        
        return {"ok": True, "message": "Google connected successfully", "data": settings}

    @router.post("/google/disconnect")
    async def disconnect_google(
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        """Revoke Google connection"""
        await check_venue_access(current_user, venue_id)
        
        await db.google_settings.update_one(
            {"venue_id": venue_id},
            {"$set": {"enabled": False, "oauth_ref": ""}}
        )
        
        return {"ok": True, "message": "Google disconnected"}

    @router.post("/google/sync")
    async def trigger_sync(
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        """Trigger manual sync (skeleton for future implementation)"""
        await check_venue_access(current_user, venue_id)
        
        from datetime import datetime, timezone
        
        # Update last_sync_at
        await db.google_settings.update_one(
            {"venue_id": venue_id},
            {"$set": {"last_sync_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        # In production, this would trigger actual Google API calls
        return {"ok": True, "message": "Sync triggered", "synced_at": datetime.now(timezone.utc).isoformat()}

    @router.post("/google/reviews/{review_id}/reply")
    async def reply_to_review(
        review_id: str,
        venue_id: str = Query(...),
        reply_text: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        """Reply to a Google review"""
        await check_venue_access(current_user, venue_id)
        
        from datetime import datetime, timezone
        
        result = await db.google_reviews.update_one(
            {"id": review_id, "venue_id": venue_id},
            {"$set": {
                "reply_text": reply_text,
                "replied_at": datetime.now(timezone.utc).isoformat(),
                "status": "REPLIED"
            }}
        )
        
        if result.modified_count == 0:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Review not found")
        
        return {"ok": True, "message": "Reply saved"}

    return router

