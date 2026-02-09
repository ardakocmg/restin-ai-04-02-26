from fastapi import APIRouter, Depends, HTTPException
from core.database import db
from core.dependencies import get_current_user
from datetime import datetime, timezone
from uuid import uuid4
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/data-export", tags=["Data Sovereignty"])

EXPORTABLE_COLLECTIONS = [
    "orders", "reservations", "guests", "employees",
    "inventory_items", "menu_items", "recipes", "suppliers",
    "transactions", "shifts", "haccp_logs", "audit_logs"
]


@router.post("/request")
async def request_export(
    venue_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Queue a full data export job for the venue.
    Data Sovereignty: 'Export Everything' button (Rule 58).
    """
    # Check permission — only owner/admin
    if current_user.get("role") not in ["owner", "general_manager", "it_admin"]:
        raise HTTPException(status_code=403, detail="Only owners can export data")

    job = {
        "id": str(uuid4()),
        "venue_id": venue_id,
        "status": "processing",
        "collections": EXPORTABLE_COLLECTIONS,
        "requested_by": current_user.get("id"),
        "requested_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": None,
        "record_count": 0,
        "file_size_bytes": 0,
        "download_url": None
    }

    await db.data_export_jobs.insert_one(job)

    # Simulate export processing — in production, a background worker handles this
    total_records = 0
    for collection_name in EXPORTABLE_COLLECTIONS:
        collection = db[collection_name]
        count = await collection.count_documents({"venue_id": venue_id})
        total_records += count

    # Mark job as complete
    download_url = f"/data-export/download/{job['id']}"
    await db.data_export_jobs.update_one(
        {"id": job["id"]},
        {"$set": {
            "status": "complete",
            "record_count": total_records,
            "file_size_bytes": total_records * 512,  # Estimate
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "download_url": download_url
        }}
    )

    logger.info("Data export completed: %s records for venue %s", total_records, venue_id)

    job["status"] = "complete"
    job["record_count"] = total_records
    job["download_url"] = download_url
    job.pop("_id", None)
    return job


@router.get("/status/{job_id}")
async def export_status(job_id: str):
    """Check export job status"""
    job = await db.data_export_jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Export job not found")
    return job


@router.get("/history")
async def export_history(venue_id: str):
    """List past export jobs for a venue"""
    jobs = await db.data_export_jobs.find(
        {"venue_id": venue_id}, {"_id": 0}
    ).sort("requested_at", -1).to_list(20)
    return jobs
