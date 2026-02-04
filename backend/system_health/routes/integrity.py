"""System Integrity Routes"""
from fastapi import APIRouter, Depends, Query

from core.database import db
from core.dependencies import get_current_user, check_venue_access
from system_health.services.integrity_engine import integrity_engine


def create_system_integrity_router():
    router = APIRouter(tags=["system_integrity"])

    @router.post("/system/integrity/run")
    async def run_integrity_checks(
        venue_id: str = Query(...),
        data: dict = {},
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        run_id = await integrity_engine.run_checks(
            venue_id,
            data.get("check_keys"),
            data.get("mode", "SAFE")
        )
        
        return {"ok": True, "data": {"run_id": run_id}}

    @router.get("/system/integrity/runs")
    async def list_integrity_runs(
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        runs = await db.integrity_runs.find(
            {"venue_id": venue_id},
            {"_id": 0}
        ).sort("started_at", -1).to_list(50)
        
        return {"ok": True, "data": runs}

    @router.get("/system/integrity/findings")
    async def list_integrity_findings(
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        findings = await db.integrity_findings.find(
            {"venue_id": venue_id},
            {"_id": 0}
        ).sort("first_seen_at", -1).to_list(100)
        
        return {"ok": True, "data": findings}

    return router
