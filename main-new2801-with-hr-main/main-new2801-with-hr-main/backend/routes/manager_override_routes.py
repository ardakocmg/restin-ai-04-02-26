"""Manager override routes - temporary access management"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from datetime import datetime, timezone, timedelta

from core.database import db
from core.dependencies import get_current_user, check_venue_access
from models import UserRole
from services.audit_service import create_audit_log


def create_manager_override_router():
    router = APIRouter(tags=["manager_override"])

    @router.post("/venues/{venue_id}/manager-override")
    async def create_manager_override(
        venue_id: str,
        user_id: str,
        duration_hours: int = 4,
        reason: Optional[str] = None,
        current_user: dict = Depends(get_current_user)
    ):
        """Create temporary access override for a user"""
        if current_user["role"] not in [UserRole.OWNER, UserRole.MANAGER]:
            raise HTTPException(status_code=403, detail="Manager permission required")
        
        await check_venue_access(current_user, venue_id)
        
        expires_at = (datetime.now(timezone.utc) + timedelta(hours=duration_hours)).isoformat()
        
        override = {
            "venue_id": venue_id,
            "user_id": user_id,
            "created_by": current_user["id"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": expires_at,
            "reason": reason,
            "duration_hours": duration_hours
        }
        
        await db.manager_overrides.insert_one(override)
        
        await create_audit_log(
            venue_id, current_user["id"], current_user["name"],
            "create_override", "user", user_id,
            {"duration": duration_hours, "reason": reason}
        )
        
        return {"message": "Override created", "expires_at": expires_at}

    @router.get("/venues/{venue_id}/manager-override/{user_id}")
    async def get_user_override(
        venue_id: str,
        user_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Get active override for a user"""
        await check_venue_access(current_user, venue_id)
        
        now = datetime.now(timezone.utc).isoformat()
        override = await db.manager_overrides.find_one(
            {
                "venue_id": venue_id,
                "user_id": user_id,
                "expires_at": {"$gte": now}
            },
            {"_id": 0}
        )
        
        if not override:
            return {"has_override": False}
        
        return {"has_override": True, "expires_at": override["expires_at"]}

    @router.get("/venues/{venue_id}/manager-override")
    async def list_active_overrides(
        venue_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """List all active overrides for a venue"""
        if current_user["role"] not in [UserRole.OWNER, UserRole.MANAGER]:
            raise HTTPException(status_code=403, detail="Manager permission required")
        
        await check_venue_access(current_user, venue_id)
        
        now = datetime.now(timezone.utc).isoformat()
        overrides = await db.manager_overrides.find(
            {
                "venue_id": venue_id,
                "expires_at": {"$gte": now}
            },
            {"_id": 0}
        ).to_list(100)
        
        for override in overrides:
            user = await db.users.find_one({"id": override["user_id"]}, {"_id": 0, "name": 1})
            if user:
                override["user_name"] = user["name"]
        
        return overrides

    return router
