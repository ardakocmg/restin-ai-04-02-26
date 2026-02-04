"""Accounting Malta Routes"""
from fastapi import APIRouter, Depends, Query

from core.database import db
from core.dependencies import get_current_user, check_venue_access
from core.feature_flags import require_feature
from core.venue_config import VenueConfigRepo


def create_accounting_mt_router():
    router = APIRouter(tags=["accounting_mt"])

    @router.get("/accounting-mt/accounts")
    async def list_accounts(
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        config_repo = VenueConfigRepo(db)
        cfg = await config_repo.get(venue_id)
        require_feature(cfg, "accounting_mt", "accounting")
        
        accounts = await db.accounts.find(
            {"venue_id": venue_id},
            {"_id": 0}
        ).to_list(500)
        
        return {"ok": True, "data": accounts}

    @router.get("/accounting-mt/journals")
    async def list_journals(
        venue_id: str = Query(...),
        from_date: str = Query(None, alias="from"),
        to_date: str = Query(None, alias="to"),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        config_repo = VenueConfigRepo(db)
        cfg = await config_repo.get(venue_id)
        require_feature(cfg, "accounting_mt", "accounting")
        
        query = {"venue_id": venue_id}
        if from_date:
            query["date"] = {"$gte": from_date}
        if to_date:
            query.setdefault("date", {})["$lte"] = to_date
        
        journals = await db.journal_entries.find(
            query,
            {"_id": 0}
        ).sort("date", -1).to_list(500)
        
        return {"ok": True, "data": journals}

    return router
