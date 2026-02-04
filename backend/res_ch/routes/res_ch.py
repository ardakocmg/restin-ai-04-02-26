"""Reservations Channel Manager Routes"""
from fastapi import APIRouter, Depends, Query

from core.database import db
from core.dependencies import get_current_user, check_venue_access


def create_res_ch_router():
    router = APIRouter(tags=["res_ch"])

    @router.get("/res-ch/external")
    async def list_external_reservations(
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        reservations = await db.external_reservations.find(
            {"venue_id": venue_id},
            {"_id": 0}
        ).sort("synced_at", -1).to_list(200)
        
        return {"ok": True, "data": reservations}

    return router
