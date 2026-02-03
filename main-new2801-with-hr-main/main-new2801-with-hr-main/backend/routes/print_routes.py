"""Print routes - print job management"""
from fastapi import APIRouter, HTTPException
from typing import Optional
from datetime import datetime, timezone

from core.database import db


def create_print_router():
    router = APIRouter(tags=["print"])

    @router.get("/venues/{venue_id}/print-jobs")
    async def list_print_jobs(venue_id: str, status: Optional[str] = None):
        query = {"venue_id": venue_id}
        if status:
            query["status"] = status
        jobs = await db.print_jobs.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
        return jobs

    @router.post("/print-jobs/{job_id}/complete")
    async def complete_print_job(job_id: str):
        job = await db.print_jobs.find_one({"id": job_id}, {"_id": 0})
        if not job:
            raise HTTPException(status_code=404, detail="Print job not found")
        
        if job["status"] == "printed":
            return {"message": "Already printed", "idempotent": True}
        
        now = datetime.now(timezone.utc).isoformat()
        await db.print_jobs.update_one(
            {"id": job_id},
            {"$set": {"status": "printed", "printed_at": now}}
        )
        
        return {"message": "Print job completed"}

    return router
