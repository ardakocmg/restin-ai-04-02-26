"""Floor plan routes - floor plan management"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from datetime import datetime, timezone

from core.database import db
from core.dependencies import get_current_user, check_venue_access
from models import UserRole
from services.audit_service import create_audit_log


def create_floor_plan_router():
    router = APIRouter(tags=["floor_plan"])

    @router.get("/venues/{venue_id}/floor-plans")
    async def get_floor_plan(venue_id: str, current_user: dict = Depends(get_current_user)):
        """Get venue floor plan"""
        await check_venue_access(current_user, venue_id)
        
        venue = await db.venues.find_one({"id": venue_id}, {"_id": 0})
        if not venue:
            raise HTTPException(status_code=404, detail="Venue not found")
        
        return [
            {
                "id": venue_id,
                "name": venue.get("name", "Main Floor"),
                "floor_plan": venue.get("floor_plan", {}),
                "version": venue.get("floor_plan_version", 0),
                "is_active": True,
                "width": venue.get("floor_plan", {}).get("width", 1000),
                "height": venue.get("floor_plan", {}).get("height", 800)
            }
        ]

    @router.put("/venues/{venue_id}/floor-plan")
    async def update_floor_plan(
        venue_id: str,
        floor_plan_data: dict,
        current_user: dict = Depends(get_current_user)
    ):
        """Update venue floor plan"""
        if current_user["role"] not in [UserRole.OWNER, UserRole.MANAGER]:
            raise HTTPException(status_code=403, detail="Manager permission required")
        
        await check_venue_access(current_user, venue_id)
        
        venue = await db.venues.find_one({"id": venue_id}, {"_id": 0})
        if not venue:
            raise HTTPException(status_code=404, detail="Venue not found")
        
        new_version = venue.get("floor_plan_version", 0) + 1
        
        await db.venues.update_one(
            {"id": venue_id},
            {"$set": {
                "floor_plan": floor_plan_data,
                "floor_plan_version": new_version,
                "floor_plan_updated_at": datetime.now(timezone.utc).isoformat(),
                "floor_plan_updated_by": current_user["id"]
            }}
        )
        
        await create_audit_log(
            venue_id, current_user["id"], current_user["name"],
            "update_floor_plan", "venue", venue_id,
            {"version": new_version}
        )
        
        return {"message": "Floor plan updated", "version": new_version}

    @router.get("/venues/{venue_id}/active-config-version")
    async def get_active_config_version(venue_id: str):
        """Get active configuration version"""
        venue = await db.venues.find_one({"id": venue_id}, {"_id": 0})
        if not venue:
            raise HTTPException(status_code=404, detail="Venue not found")
        
        floor_plan_version = venue.get("floor_plan_version", 0)
        floor_plan_updated = venue.get("floor_plan_updated_at")
        
        return {
            "venue_id": venue_id,
            "floor_plan_version": floor_plan_version,
            "floor_plan_updated_at": floor_plan_updated,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

    return router
