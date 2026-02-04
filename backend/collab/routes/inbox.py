"""Collab Inbox Routes"""
from fastapi import APIRouter, Depends, Query

from core.database import db
from core.dependencies import get_current_user, check_venue_access


def create_collab_inbox_router():
    router = APIRouter(tags=["collab_inbox"])

    @router.get("/collab/inbox")
    async def get_inbox(
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        notifications = await db.notifications.find(
            {"venue_id": venue_id, "identity_id": current_user["id"]},
            {"_id": 0}
        ).sort("created_at", -1).to_list(100)
        
        return {"ok": True, "data": notifications}

    @router.post("/collab/inbox/{notif_id}/read")
    async def mark_read(
        notif_id: str,
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        await db.notifications.update_one(
            {"id": notif_id, "identity_id": current_user["id"]},
            {"$set": {"status": "READ"}}
        )
        
        return {"ok": True, "message": "Marked as read"}

    return router
