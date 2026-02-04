"""Trust Overrides Routes"""
from fastapi import APIRouter, Depends, Query

from core.database import db
from core.dependencies import get_current_user, check_venue_access


def create_trust_overrides_router():
    router = APIRouter(tags=["trust_overrides"])

    @router.get("/trust/overrides")
    async def list_overrides(
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        overrides = await db.override_requests.find(
            {"venue_id": venue_id},
            {"_id": 0}
        ).sort("created_at", -1).to_list(100)
        
        return {"ok": True, "data": overrides}

    @router.post("/trust/overrides/{id}/approve")
    async def approve_override(
        id: str,
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        await db.override_requests.update_one(
            {"id": id, "venue_id": venue_id},
            {"$set": {
                "status": "APPROVED",
                "approved_by": current_user["id"]
            }}
        )
        
        return {"ok": True, "message": "Override approved"}

    return router
