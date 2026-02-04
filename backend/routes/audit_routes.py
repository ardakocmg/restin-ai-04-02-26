"""Audit log routes - audit trail management"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
from datetime import datetime, timezone

from core.database import db
from core.dependencies import get_current_user, check_venue_access
from models import UserRole
from services.audit_service import create_audit_log


def create_audit_router():
    router = APIRouter(tags=["audit"])

    @router.get("/venues/{venue_id}/audit-logs")
    async def get_audit_logs(
        venue_id: str,
        resource_type: Optional[str] = None,
        action: Optional[str] = None,
        limit: int = Query(default=100, le=500),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        if limit > 100 and current_user["role"] not in [UserRole.OWNER, UserRole.MANAGER]:
            raise HTTPException(status_code=403, detail="Export quota exceeded for staff")
        
        query = {"venue_id": venue_id}
        if resource_type:
            query["resource_type"] = resource_type
        if action:
            query["action"] = action
        
        logs = await db.audit_logs.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
        return logs

    @router.get("/venues/{venue_id}/audit-logs/export")
    async def export_audit_logs(
        venue_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Export with DLP controls - watermarked"""
        if current_user["role"] not in [UserRole.OWNER, UserRole.MANAGER]:
            raise HTTPException(status_code=403, detail="Export permission denied")
        
        await check_venue_access(current_user, venue_id)
        
        logs = await db.audit_logs.find({"venue_id": venue_id}, {"_id": 0}).to_list(1000)
        
        export_metadata = {
            "exported_by": current_user["name"],
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "venue_id": venue_id,
            "watermark": f"CONFIDENTIAL - Exported by {current_user['name']} on {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M')}"
        }
        
        await create_audit_log(
            venue_id, current_user["id"], current_user["name"],
            "export", "audit_logs", venue_id, {"count": len(logs)}
        )
        
        return {"metadata": export_metadata, "logs": logs}

    return router
