"""UI error telemetry routes"""
from fastapi import APIRouter, HTTPException, Depends, Query
from datetime import datetime, timezone, timedelta
import uuid

from core.database import db
from core.dependencies import get_current_user
from models import UserRole


def create_telemetry_router():
    router = APIRouter(tags=["telemetry"])

    @router.post("/incidents/ui-error")
    async def log_ui_error(payload: dict, current_user: dict = Depends(get_current_user)):
        """Log UI error with dedupe"""
        key = f"{current_user['id']}|{payload.get('app_mode')}|{payload.get('name')}|{payload.get('message', '')[:120]}"
        now = datetime.now(timezone.utc)
        
        existing = await db.ui_errors.find_one({
            "dedupe_key": key,
            "created_at": {"$gte": (now - timedelta(seconds=60)).isoformat()}
        })
        
        if existing:
            return {"ok": True, "deduped": True}
        
        doc = {
            "id": str(uuid.uuid4()),
            "dedupe_key": key,
            "user_id": current_user["id"],
            "role": current_user.get("role"),
            "venue_id": current_user.get("venue_id"),
            "app_mode": payload.get("app_mode", "UNKNOWN"),
            "name": payload.get("name", "Error"),
            "message": payload.get("message", ""),
            "stack": payload.get("stack", ""),
            "component_stack": payload.get("component_stack", ""),
            "url": payload.get("url", ""),
            "user_agent": payload.get("user_agent", ""),
            "ts": payload.get("ts", now.isoformat()),
            "created_at": now.isoformat()
        }
        
        await db.ui_errors.insert_one(doc)
        return {"ok": True}

    @router.get("/incidents/ui-errors")
    async def list_ui_errors(limit: int = Query(200), current_user: dict = Depends(get_current_user)):
        """List UI errors (admin only)"""
        if current_user.get("role") not in [UserRole.OWNER, UserRole.GENERAL_MANAGER, UserRole.MANAGER, UserRole.IT_ADMIN, UserRole.FINANCE, UserRole.SUPERVISOR]:
            raise HTTPException(status_code=403, detail="Admin role required")
        
        limit = min(max(limit, 1), 500)
        items = await db.ui_errors.find({}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
        return {"items": items}

    return router
