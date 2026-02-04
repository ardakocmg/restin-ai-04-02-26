"""Known Issues Routes"""
from fastapi import APIRouter, Depends, Query

from core.database import db
from core.dependencies import get_current_user, check_venue_access


def create_ops_known_issues_router():
    router = APIRouter(tags=["ops_known_issues"])

    @router.get("/ops/known-issues")
    async def list_known_issues(
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        issues = await db.known_issues.find(
            {"venue_id": venue_id},
            {"_id": 0}
        ).to_list(200)
        
        return {"ok": True, "data": issues}

    return router
