"""Trust Kill Switches Routes"""
from fastapi import APIRouter, Depends, Query

from core.database import db
from core.dependencies import get_current_user, check_venue_access
from trust.services.kill_switch_service import kill_switch_service


def create_trust_kill_switches_router():
    router = APIRouter(tags=["trust_kill_switches"])

    @router.get("/trust/kill-switches")
    async def list_kill_switches(
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        switches = await db.kill_switches.find(
            {"venue_id": venue_id},
            {"_id": 0}
        ).to_list(100)
        
        return {"ok": True, "data": switches}

    @router.put("/trust/kill-switches/{key}")
    async def update_kill_switch(
        key: str,
        venue_id: str = Query(...),
        data: dict = {},
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        await db.kill_switches.update_one(
            {"venue_id": venue_id, "key": key},
            {"$set": {
                "enabled": data.get("enabled", True),
                "reason": data.get("reason", ""),
                "updated_by": current_user["id"]
            }},
            upsert=True
        )
        
        return {"ok": True, "message": "Kill switch updated"}

    return router
