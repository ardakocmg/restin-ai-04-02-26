"""Log routes - venue and system logs"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
from datetime import datetime, timezone

from core.database import db
from core.dependencies import get_current_user, check_venue_access
from models import UserRole


def create_log_router():
    router = APIRouter(tags=["logs"])

    @router.get("/venues/{venue_id}/logs")
    async def get_venue_logs(
        venue_id: str,
        level: Optional[str] = None,
        code: Optional[str] = None,
        limit: int = Query(100, le=500),
        current_user: dict = Depends(get_current_user)
    ):
        """Get venue-specific logs"""
        await check_venue_access(current_user, venue_id)
        
        query = {"venue_id": venue_id}
        if level:
            query["level"] = level
        if code:
            query["code"] = code
        
        logs = await db.system_logs.find(query, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
        return logs

    @router.get("/system/logs")
    async def get_system_logs(
        level: Optional[str] = None,
        code: Optional[str] = None,
        venue_id: Optional[str] = None,
        limit: int = Query(100, le=500),
        current_user: dict = Depends(get_current_user)
    ):
        """Get system logs (requires elevated permissions)"""
        if current_user["role"] not in [UserRole.PRODUCT_OWNER, UserRole.OWNER, UserRole.IT_ADMIN]:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        query = {}
        if level:
            query["level"] = level
        if code:
            query["code"] = code
        if venue_id:
            query["venue_id"] = venue_id
        
        logs = await db.system_logs.find(query, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
        return logs

    @router.post("/system/logs/cleanup")
    async def cleanup_old_logs(
        days_to_keep: int = 30,
        current_user: dict = Depends(get_current_user)
    ):
        """Cleanup logs older than specified days"""
        if current_user["role"] not in [UserRole.PRODUCT_OWNER, UserRole.IT_ADMIN]:
            raise HTTPException(status_code=403, detail="Requires admin access")
        
        cutoff_date = datetime.now(timezone.utc)
        from datetime import timedelta
        cutoff_date = cutoff_date - timedelta(days=days_to_keep)
        cutoff_iso = cutoff_date.isoformat()
        
        result = await db.system_logs.delete_many({"timestamp": {"$lt": cutoff_iso}})
        
        return {
            "message": "Logs cleaned up",
            "deleted_count": result.deleted_count,
            "cutoff_date": cutoff_iso
        }

    return router
