"""Guest and reservation routes"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from datetime import datetime, timezone

from core.database import db
from core.dependencies import get_current_user, check_venue_access
from models import Guest, GuestCreate, Reservation, ReservationCreate, ReservationStatus
from services.audit_service import create_audit_log
from services.pii_encryption import encrypt_document_pii, decrypt_document_pii

# PII fields in guest records
GUEST_PII = {"email", "phone", "full_name", "name"}


def create_guest_router():
    router = APIRouter(tags=["guests"])

    @router.post("/guests")
    async def create_guest(guest_data: GuestCreate, current_user: dict = Depends(get_current_user)):
        await check_venue_access(current_user, guest_data.venue_id)
        guest = Guest(**guest_data.model_dump())
        doc = encrypt_document_pii(guest.model_dump(), GUEST_PII)
        await db.guests.insert_one(doc)
        return guest.model_dump()

    @router.get("/venues/{venue_id}/guests")
    async def list_guests(
        venue_id: str,
        search: Optional[str] = None,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        query = {"venue_id": venue_id}
        if search:
            query["$or"] = [
                {"name": {"$regex": search, "$options": "i"}},
                {"email": {"$regex": search, "$options": "i"}},
                {"phone": {"$regex": search, "$options": "i"}}
            ]
        guests = await db.guests.find(query, {"_id": 0}).sort("name", 1).to_list(500)
        return [decrypt_document_pii(g, GUEST_PII) for g in guests]

    @router.get("/guests/{guest_id}")
    async def get_guest(guest_id: str, current_user: dict = Depends(get_current_user)):
        guest = await db.guests.find_one({"id": guest_id}, {"_id": 0})
        if not guest:
            raise HTTPException(status_code=404, detail="Guest not found")
        await check_venue_access(current_user, guest["venue_id"])
        return guest

    @router.put("/guests/{guest_id}")
    async def update_guest(
        guest_id: str,
        updates: dict,
        current_user: dict = Depends(get_current_user)
    ):
        guest = await db.guests.find_one({"id": guest_id}, {"_id": 0})
        if not guest:
            raise HTTPException(status_code=404, detail="Guest not found")
        await check_venue_access(current_user, guest["venue_id"])
        await db.guests.update_one({"id": guest_id}, {"$set": updates})
        return {"message": "Guest updated"}

    # RESERVATIONS
    @router.post("/reservations")
    async def create_reservation(
        res_data: ReservationCreate,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, res_data.venue_id)
        
        guest = await db.guests.find_one({"id": res_data.guest_id}, {"_id": 0})
        if not guest:
            raise HTTPException(status_code=404, detail="Guest not found")
        
        reservation = Reservation(**res_data.model_dump(), guest_name=guest["name"])
        await db.reservations.insert_one(reservation.model_dump())
        
        await create_audit_log(
            res_data.venue_id, current_user["id"], current_user["name"],
            "create_reservation", "reservation", reservation.id,
            {"guest": guest["name"], "date": res_data.date, "time": res_data.time}
        )
        
        return reservation.model_dump()

    @router.get("/venues/{venue_id}/reservations")
    async def list_reservations(
        venue_id: str,
        date: Optional[str] = None,
        status: Optional[str] = None,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        query = {"venue_id": venue_id}
        if date:
            query["date"] = date
        if status:
            query["status"] = status
        
        reservations = await db.reservations.find(query, {"_id": 0}).sort("time", 1).to_list(500)
        return reservations

    @router.patch("/reservations/{res_id}/seat")
    async def seat_reservation(
        res_id: str,
        table_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        reservation = await db.reservations.find_one({"id": res_id}, {"_id": 0})
        if not reservation:
            raise HTTPException(status_code=404, detail="Reservation not found")
        
        await check_venue_access(current_user, reservation["venue_id"])
        
        await db.reservations.update_one(
            {"id": res_id},
            {"$set": {
                "table_id": table_id,
                "status": ReservationStatus.SEATED,
                "seated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return {"message": "Reservation seated"}

    @router.patch("/reservations/{res_id}/status")
    async def update_reservation_status(
        res_id: str,
        status: ReservationStatus,
        current_user: dict = Depends(get_current_user)
    ):
        reservation = await db.reservations.find_one({"id": res_id}, {"_id": 0})
        if not reservation:
            raise HTTPException(status_code=404, detail="Reservation not found")
        
        await check_venue_access(current_user, reservation["venue_id"])
        
        updates = {"status": status}
        if status == ReservationStatus.COMPLETED:
            updates["completed_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.reservations.update_one({"id": res_id}, {"$set": updates})
        return {"message": "Status updated"}

    return router
