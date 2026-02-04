"""Reporting routes - report definitions, runs, search"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional

from core.database import db
from core.dependencies import get_current_user, check_venue_access
from services.reporting_service import run_report, suggest_reports_from_search


def create_report_router():
    router = APIRouter(tags=["reports"])

    @router.get("/reports/defs")
    async def list_report_definitions(
        venue_id: Optional[str] = None,
        current_user: dict = Depends(get_current_user)
    ):
        """List available report definitions"""
        query = {}
        if venue_id:
            await check_venue_access(current_user, venue_id)
            query["$or"] = [{"venue_id": venue_id}, {"venue_id": "GLOBAL"}]
        else:
            query["venue_id"] = "GLOBAL"
        
        defs = await db.report_defs.find(query, {"_id": 0}).sort("name", 1).to_list(100)
        return defs

    @router.post("/reports/run")
    async def run_report_endpoint(
        report_id: str,
        venue_id: str,
        params: dict = {},
        current_user: dict = Depends(get_current_user)
    ):
        """Execute a report"""
        await check_venue_access(current_user, venue_id)
        
        report_def = await db.report_defs.find_one({"id": report_id}, {"_id": 0})
        if not report_def:
            raise HTTPException(status_code=404, detail="Report not found")
        
        success, result = await run_report(db, report_def, venue_id, params, current_user)
        
        if not success:
            raise HTTPException(status_code=400, detail=result.get("error", "Report execution failed"))
        
        return result

    @router.get("/reports/runs")
    async def list_report_runs(
        venue_id: str,
        limit: int = 50,
        current_user: dict = Depends(get_current_user)
    ):
        """List recent report runs"""
        await check_venue_access(current_user, venue_id)
        
        runs = await db.report_runs.find(
            {"venue_id": venue_id},
            {"_id": 0}
        ).sort("executed_at", -1).limit(limit).to_list(limit)
        
        return runs

    return router
