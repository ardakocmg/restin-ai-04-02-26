"""Pre-Go-Live Routes"""
from fastapi import APIRouter, Depends, Query

from core.database import db
from core.dependencies import get_current_user, check_venue_access
from ops.services.pre_go_live_service import pre_go_live_service


def create_ops_pre_go_live_router():
    router = APIRouter(tags=["ops_pre_go_live"])

    @router.post("/ops/pre-go-live/run")
    async def run_certification(
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        run = await pre_go_live_service.run_certification(venue_id, current_user["id"])
        
        return {"ok": True, "data": run.model_dump()}

    @router.get("/ops/pre-go-live/runs")
    async def list_runs(
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        runs = await db.pre_go_live_runs.find(
            {"venue_id": venue_id},
            {"_id": 0}
        ).sort("started_at", -1).to_list(20)
        
        return {"ok": True, "data": runs}

    return router
