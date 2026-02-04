"""Bank Routes"""
from fastapi import APIRouter, Depends, Query

from core.database import db
from core.dependencies import get_current_user, check_venue_access


def create_bank_router():
    router = APIRouter(tags=["bank"])

    @router.get("/bank/feeds/lines")
    async def list_statement_lines(
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        lines = await db.bank_statement_lines.find(
            {"venue_id": venue_id},
            {"_id": 0}
        ).sort("date", -1).to_list(500)
        
        return {"ok": True, "data": lines}

    return router
