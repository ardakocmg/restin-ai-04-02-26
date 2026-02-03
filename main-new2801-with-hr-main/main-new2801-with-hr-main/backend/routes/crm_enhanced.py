from fastapi import APIRouter, Depends, Query, HTTPException
from typing import List, Dict, Any
from datetime import datetime, timedelta
from core.database import db
from core.dependencies import get_current_user, get_database
from models.reservations.core import GuestProfile, ReservationStatus

router = APIRouter(prefix="/crm", tags=["CRM & Guest 360 (Phase XI)"])

@router.get("/summary")
async def get_crm_summary(venue_id: str, db = Depends(get_database)):
    """High-level CRM metrics"""
    total_guests = await db.reservations.distinct("guest_profile_id", {"venue_id": venue_id})
    # Mock some data for VIPs and At-Risk until scoring engine is fully active
    vips = await db.guest_profiles.count_documents({"tags": "VIP"})
    return {
        "total_unique_guests": len(total_guests),
        "vip_count": vips,
        "new_this_month": 42, # Mock
        "loyalty_participation": "68%"
    }

@router.get("/guests", response_model=List[GuestProfile])
async def list_guests(
    venue_id: str, 
    q: str = None, 
    segment: str = None,
    db = Depends(get_database)
):
    """List enriched guest profiles"""
    query = {"venue_id": venue_id}
    if q:
        query["$or"] = [
            {"first_name": {"$regex": q, "$options": "i"}},
            {"last_name": {"$regex": q, "$options": "i"}},
            {"contact_info.phone": {"$regex": q, "$options": "i"}}
        ]
    
    if segment == "VIP":
        query["tags"] = "VIP"
    elif segment == "NO_SHOW":
        query["visit_summary.no_show_count": {"$gt": 0}]
        
    cursor = db.guest_profiles.find(query).sort("visit_summary.total_visits", -1)
    return await cursor.to_list(100)

@router.get("/guests/{guest_id}/360")
async def get_guest_360(guest_id: str, db = Depends(get_database)):
    """Full 360 view of a guest including history"""
    profile = await db.guest_profiles.find_one({"id": guest_id})
    if not profile:
        raise HTTPException(404, "Guest not found")
        
    # Get reservation history
    reservations = await db.reservations.find(
        {"guest_profile_id": guest_id}
    ).sort("datetime_start", -1).to_list(10)
    
    # Get last items (Mock from POS integration)
    favorite_items = [
        {"name": "Ribeye Steak", "count": 4},
        {"name": "Malbec Estate", "count": 3}
    ]
    
    return {
        "profile": profile,
        "history": {
            "reservations": reservations,
            "favorite_items": favorite_items
        }
    }

@router.post("/guests/{guest_id}/tags")
async def update_guest_tags(guest_id: str, tags: List[str], db = Depends(get_database)):
    """Manually update guest tags"""
    await db.guest_profiles.update_one(
        {"id": guest_id},
        {"$set": {"tags": tags, "updated_at": datetime.now()}}
    )
    return {"status": "ok"}
