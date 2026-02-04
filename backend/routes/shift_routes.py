"""Shift management routes - shift scheduling, check-in/out"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from datetime import datetime, timezone

from core.database import db
from core.dependencies import get_current_user, check_venue_access
from models import Shift, ShiftCreate, UserRole
from services.audit_service import create_audit_log


def create_shift_router():
    router = APIRouter(tags=["shifts"])

    @router.post("/venues/{venue_id}/shifts")
    async def create_shift(
        venue_id: str,
        shift_data: ShiftCreate,
        current_user: dict = Depends(get_current_user)
    ):
        """Create a shift for a staff member (manager/owner only)"""
        if current_user["role"] not in [UserRole.OWNER, UserRole.MANAGER]:
            raise HTTPException(status_code=403, detail="Manager/Owner permission required")
        
        await check_venue_access(current_user, venue_id)
        
        if shift_data.venue_id != venue_id:
            raise HTTPException(status_code=400, detail="Venue ID mismatch")
        
        shift = Shift(**shift_data.model_dump())
        await db.shifts.insert_one(shift.model_dump())
        
        await create_audit_log(
            venue_id, current_user["id"], current_user["name"],
            "create_shift", "shift", shift.id,
            {"user_id": shift_data.user_id, "start": shift_data.start_time, "end": shift_data.end_time}
        )
        
        return shift.model_dump()

    @router.get("/venues/{venue_id}/shifts")
    async def get_shifts(
        venue_id: str,
        user_id: Optional[str] = None,
        date: Optional[str] = None,
        current_user: dict = Depends(get_current_user)
    ):
        """Get shifts for a venue, optionally filtered by user and date"""
        await check_venue_access(current_user, venue_id)
        
        query = {"venue_id": venue_id}
        if user_id:
            query["user_id"] = user_id
        if date:
            start_of_day = f"{date}T00:00:00"
            end_of_day = f"{date}T23:59:59"
            query["start_time"] = {"$gte": start_of_day, "$lte": end_of_day}
        
        shifts = await db.shifts.find(query, {"_id": 0}).to_list(1000)
        return shifts

    @router.get("/venues/{venue_id}/shifts/active")
    async def get_active_shifts(venue_id: str, current_user: dict = Depends(get_current_user)):
        """Get currently active shifts"""
        await check_venue_access(current_user, venue_id)
        
        now = datetime.now(timezone.utc).isoformat()
        
        shifts = await db.shifts.find({
            "venue_id": venue_id,
            "start_time": {"$lte": now},
            "end_time": {"$gte": now}
        }, {"_id": 0}).to_list(100)
        
        for shift in shifts:
            user = await db.users.find_one({"id": shift["user_id"]}, {"_id": 0, "name": 1, "role": 1})
            if user:
                shift["user_name"] = user["name"]
                shift["user_role"] = user["role"]
        
        return shifts

    @router.post("/venues/{venue_id}/shifts/{shift_id}/check-in")
    async def check_in_shift(
        venue_id: str,
        shift_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Check in to a shift"""
        await check_venue_access(current_user, venue_id)
        
        shift = await db.shifts.find_one({"id": shift_id, "venue_id": venue_id}, {"_id": 0})
        if not shift:
            raise HTTPException(status_code=404, detail="Shift not found")
        
        if shift["user_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Not your shift")
        
        if shift.get("checked_in"):
            raise HTTPException(status_code=400, detail="Already checked in")
        
        now = datetime.now(timezone.utc).isoformat()
        await db.shifts.update_one(
            {"id": shift_id},
            {"$set": {"checked_in": True, "checked_in_at": now}}
        )
        
        return {"message": "Checked in successfully"}

    @router.post("/venues/{venue_id}/shifts/{shift_id}/check-out")
    async def check_out_shift(
        venue_id: str,
        shift_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Check out from a shift"""
        await check_venue_access(current_user, venue_id)
        
        shift = await db.shifts.find_one({"id": shift_id, "venue_id": venue_id}, {"_id": 0})
        if not shift:
            raise HTTPException(status_code=404, detail="Shift not found")
        
        if shift["user_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Not your shift")
        
        if not shift.get("checked_in"):
            raise HTTPException(status_code=400, detail="Not checked in")
        
        if shift.get("checked_out"):
            raise HTTPException(status_code=400, detail="Already checked out")
        
        now = datetime.now(timezone.utc).isoformat()
        await db.shifts.update_one(
            {"id": shift_id},
            {"$set": {"checked_out": True, "checked_out_at": now}}
        )
        
        return {"message": "Checked out successfully"}

    return router
