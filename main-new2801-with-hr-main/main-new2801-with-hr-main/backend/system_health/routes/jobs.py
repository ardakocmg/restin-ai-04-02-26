"""System Jobs Routes"""
from fastapi import APIRouter, Depends, Query

from core.database import db
from core.dependencies import get_current_user, check_venue_access


def create_system_jobs_router():
    router = APIRouter(tags=["system_jobs"])

    @router.get("/system/jobs")
    async def list_jobs(
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        jobs = await db.job_definitions.find({}, {"_id": 0}).to_list(100)
        heartbeats = await db.job_heartbeats.find(
            {"venue_id": venue_id},
            {"_id": 0}
        ).to_list(100)
        
        # Merge
        heartbeat_map = {h["job_key"]: h for h in heartbeats}
        
        result = []
        for job in jobs:
            result.append({
                **job,
                "heartbeat": heartbeat_map.get(job["job_key"])
            })
        
        return {"ok": True, "data": result}

    return router
