from fastapi import APIRouter, Depends, Query, HTTPException, Body
from typing import List, Dict, Any
from datetime import datetime
from core.database import db
from core.dependencies import get_current_user, get_database, check_venue_access
from models.reservations.core import GuestProfile

def create_crm_router():
    router = APIRouter(tags=["crm"])

    @router.get("/crm/summary")
    async def get_crm_summary(venue_id: str, current_user: dict = Depends(get_current_user)):
        await check_venue_access(current_user, venue_id)
        # Aggregate unique guest profile IDs from reservations
        total_guests = await db.reservations.distinct("guest_profile_id", {"venue_id": venue_id})
        vips = await db.guest_profiles.count_documents({"tags": "VIP", "venue_id": venue_id})
        return {
            "total_unique_guests": len(total_guests),
            "vip_count": vips,
            "new_this_month": 42,
            "loyalty_participation": "68%"
        }

    @router.get("/crm/guests", response_model=List[GuestProfile])
    async def list_guests(
        venue_id: str, 
        q: str = None, 
        segment: str = None,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        query = {"venue_id": venue_id}
        if q:
            query["$or"] = [
                {"first_name": {"$regex": q, "$options": "i"}},
                {"last_name": {"$regex": q, "$options": "i"}},
                {"contact_info.phone": {"$regex": q, "$options": "i"}}
            ]
        
        if segment == "VIP":
            query["tags"] = "VIP"
            
        cursor = db.guest_profiles.find(query).sort("visit_summary.total_visits", -1)
        return await cursor.to_list(100)

    @router.get("/crm/guests/{guest_id}/360")
    async def get_guest_360(guest_id: str, current_user: dict = Depends(get_current_user)):
        profile = await db.guest_profiles.find_one({"id": guest_id})
        if not profile:
            raise HTTPException(404, "Guest not found")
            
        reservations = await db.reservations.find(
            {"guest_profile_id": guest_id}
        ).sort("datetime_start", -1).to_list(10)
        
        return {
            "profile": profile,
            "history": {
                "reservations": reservations,
                "favorite_items": [
                    {"name": "Ribeye Steak", "count": 4},
                    {"name": "Malbec Estate", "count": 3}
                ]
            }
        }

    @router.post("/crm/guests/{guest_id}/tags")
    async def update_guest_tags(guest_id: str, tags: List[str] = Body(..., embed=True), current_user: dict = Depends(get_current_user)):
        await db.guest_profiles.update_one(
            {"id": guest_id},
            {"$set": {"tags": tags, "updated_at": datetime.now()}}
        )
        return {"status": "ok"}

    return router

