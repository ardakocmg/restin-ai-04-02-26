"""Payments & Settlements Routes"""
from fastapi import APIRouter, Depends, Query

from core.database import db
from core.dependencies import get_current_user, check_venue_access


def create_payments_router():
    router = APIRouter(tags=["payments"])

    @router.get("/payments/intents")
    async def list_payment_intents(
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        intents = await db.payment_intents.find(
            {"venue_id": venue_id},
            {"_id": 0}
        ).sort("created_at", -1).to_list(200)
        
        return {"ok": True, "data": intents}

    return router
