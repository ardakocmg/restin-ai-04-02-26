"""AP Routes"""
from fastapi import APIRouter, Depends, Query

from core.database import db
from core.dependencies import get_current_user, check_venue_access


def create_ap_router():
    router = APIRouter(tags=["ap"])

    @router.get("/ap/invoices")
    async def list_invoices(
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        invoices = await db.ap_invoices.find(
            {"venue_id": venue_id},
            {"_id": 0}
        ).sort("created_at", -1).to_list(200)
        
        return {"ok": True, "data": invoices}

    @router.get("/ap/payment-runs")
    async def list_payment_runs(
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        runs = await db.ap_payment_runs.find(
            {"venue_id": venue_id},
            {"_id": 0}
        ).sort("created_at", -1).to_list(100)
        
        return {"ok": True, "data": runs}

    return router
