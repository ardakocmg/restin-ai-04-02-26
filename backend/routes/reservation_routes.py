from fastapi import APIRouter, Depends, HTTPException, Body
from typing import List, Dict, Any
from datetime import datetime
from pydantic import BaseModel

from core.dependencies import get_current_user, get_database
from services.reservation_engine import ReservationEngine
from models.reservations.core import Reservation, ReservationChannel

router = APIRouter(prefix="/reservations", tags=["Reservations (Phase X)"])

# --- Request Models ---

class AvailabilityQuery(BaseModel):
    venue_id: str
    date: str # YYYY-MM-DD
    guest_count: int

class CreateReservationRequest(BaseModel):
    venue_id: str
    guest_count: int
    datetime_start: str # ISO
    channel: ReservationChannel = ReservationChannel.INTERNAL
    guest: Dict[str, Any] # nested guest info
    notes: str = ""

# --- Endpoints ---

@router.post("/check-availability")
async def check_availability(
    query: AvailabilityQuery,
    db = Depends(get_database)
):
    """
    Public/Private endpoint to check slots.
    """
    engine = ReservationEngine(db)
    slots = await engine.get_available_slots(
        venue_id=query.venue_id,
        date_str=query.date,
        pax=query.guest_count
    )
    return {"slots": slots}

@router.post("/", response_model=Reservation)
async def create_reservation(
    payload: CreateReservationRequest,
    current_user: dict = Depends(get_current_user), # Auth required for now
    db = Depends(get_database)
):
    """
    Create a new reservation.
    """
    engine = ReservationEngine(db)
    
    # Inject user info into audit if internal
    # payload_dict = payload.dict() 
    # Use .model_dump() for Pydantic v2, or .dict() for v1. Assumig v2 compat.
    payload_dict = payload.model_dump()
    
    # Sanity check: if channel is INTERNAL, ensure we have user actor
    # This logic belongs in the service layer ideally, but here for context injection
    
    reservation = await engine.create_reservation(payload_dict)
    return reservation

@router.patch("/{reservation_id}/status")
async def update_reservation_status(
    reservation_id: str,
    status: str = Body(..., embed=True),
    db = Depends(get_database)
):
    """
    Update reservation status (e.g. SEATED, COMPLETED, NO_SHOW).
    Triggers loyalty updates on completion.
    """
    from services.loyalty_service import LoyaltyService
    from models.reservations.core import ReservationStatus

    res = await db.reservations.find_one({"id": reservation_id})
    if not res:
        raise HTTPException(404, "Reservation not found")

    # Update Status
    await db.reservations.update_one(
        {"id": reservation_id},
        {"$set": {"status": status, "updated_at": datetime.now()}}
    )

    # CRM/Loyalty Triggers
    loyalty = LoyaltyService(db)
    if status == ReservationStatus.COMPLETED.value:
        await loyalty.record_visit(res["guest_profile_id"])
    elif status == ReservationStatus.NO_SHOW.value:
        await loyalty.record_no_show(res["guest_profile_id"])

    return {"status": "ok", "new_status": status}

@router.get("/analytics/summary")
async def get_reservation_analytics(
    venue_id: str,
    db = Depends(get_database)
):
    """
    Returns high-level analytics for the reservation system.
    Calculates conversion by channel and no-show stats.
    """
    from models.reservations.core import ReservationStatus
    
    # 1. Total Reservations
    total_res = await db.reservations.count_documents({"venue_id": venue_id})
    if total_res == 0:
        return {
            "total_reservations": 0,
            "no_show_rate": 0,
            "channel_distribution": {},
            "status_distribution": {}
        }
    
    # 2. No-Show Rate
    no_shows = await db.reservations.count_documents({
        "venue_id": venue_id, 
        "status": ReservationStatus.NO_SHOW.value
    })
    
    # 3. Channel Distribution
    pipeline = [
        {"$match": {"venue_id": venue_id}},
        {"$group": {"_id": "$channel", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    channel_cursor = db.reservations.aggregate(pipeline)
    channel_dist = {item["_id"]: item["count"] async for item in channel_cursor}
    
    # 4. Conversion Logic (Mock for now: Web vs Google vs Social)
    # Future: Compare against 'Check Availability' hits (Analytics events)
    
    return {
        "total_reservations": total_res,
        "no_show_rate": round((no_shows / total_res) * 100, 1),
        "channel_distribution": channel_dist,
        "status_distribution": {
            "completed": await db.reservations.count_documents({"venue_id": venue_id, "status": ReservationStatus.COMPLETED.value}),
            "cancelled": await db.reservations.count_documents({"venue_id": venue_id, "status": ReservationStatus.CANCELLED.value}),
            "confirmed": await db.reservations.count_documents({"venue_id": venue_id, "status": ReservationStatus.CONFIRMED.value})
        }
    }
