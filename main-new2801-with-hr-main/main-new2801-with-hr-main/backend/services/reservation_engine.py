from datetime import datetime, timedelta
from typing import List, Optional, Dict
from uuid import uuid4

from fastapi import HTTPException
from models.reservations.core import (
    Table, Reservation, Restaurant, Section, ReservationStatus, 
    ReservationChannel, GuestProfile, AuditLogEntry, ContactInfo
)

class ReservationEngine:
    def __init__(self, db):
        self.db = db

    async def _fetch_venue_config(self, venue_id: str):
        """Helper to get venue config/policies. Using Mock for Phase X if DB empty."""
        venue_data = await self.db.venues.find_one({"id": venue_id})
        if not venue_data: 
             # Return defaults if venue not found (for dev safety)
             return {
                 "default_turn_time": 120,
                 "pacing_limit": 20 # covers/15min
             }
        return venue_data

    async def calculate_turn_time(self, venue_id: str, pax: int) -> int:
        """
        Calculates turn time in minutes based on party size.
        """
        # Could be fetched from Restaurant Policy
        if pax <= 2: return 90
        if pax <= 4: return 120
        if pax <= 6: return 150
        return 180

    async def get_available_slots(
        self, 
        venue_id: str, 
        date_str: str, 
        pax: int
    ) -> List[Dict[str, any]]:
        """
        Returns a list of available time slots for a given date and party size.
        """
        # 1. Get Venue & Tables
        tables_cursor = self.db.tables.find({
            "venue_id": venue_id,
            "capacity": {"$gte": pax},
            # Basic optimization: Don't show 10-top for 2-pax if avoidable? 
            # For now, simplistic approach: "capacity >= pax"
            "is_active": True
        })
        candidate_tables = await tables_cursor.to_list(1000)
        
        if not candidate_tables:
            return []

        # 2. Get Existing Reservations
        start_of_day = datetime.strptime(date_str, "%Y-%m-%d")
        end_of_day = start_of_day + timedelta(days=1)
        
        reservations_cursor = self.db.reservations.find({
            "venue_id": venue_id,
            "datetime_start": {"$gte": start_of_day, "$lt": end_of_day},
            "status": {"$ne": ReservationStatus.CANCELLED.value}
        })
        existing_reservations = await reservations_cursor.to_list(1000)
        
        # 3. Generate Slots (18:00 - 23:00 Mock default)
        slots = []
        # TODO: Read OpeningHours from Restaurant model
        current_time = start_of_day.replace(hour=18, minute=0)
        close_time = start_of_day.replace(hour=23, minute=0)
        
        turn_time_min = await self.calculate_turn_time(venue_id, pax)
        
        while current_time < close_time:
            slot_end = current_time + timedelta(minutes=turn_time_min)
            
            # Find a table
            available_table = self._find_free_table(
                candidate_tables, 
                existing_reservations, 
                current_time, 
                slot_end
            )
            
            if available_table:
                slots.append({
                    "time": current_time.strftime("%H:%M"),
                    "available": True,
                    "turn_time_minutes": turn_time_min,
                    "table_id": available_table["id"] # Internal use, maybe hide from frontend?
                })
            else:
                 slots.append({
                    "time": current_time.strftime("%H:%M"),
                    "available": False
                })
            
            current_time += timedelta(minutes=15)
            
        return slots

    def _find_free_table(
        self, 
        tables: List[dict], 
        reservations: List[dict], 
        start: datetime, 
        end: datetime
    ) -> Optional[dict]:
        """Finds the first table that has no overlapping reservation"""
        for table in tables:
            is_blocked = False
            for res in reservations:
                # 1. Check Table Match
                # Handle cases where table_ids is list or single (legacy support)
                res_table_ids = res.get("table_ids", [])
                if not res_table_ids and "table_id" in res:
                    res_table_ids = [res["table_id"]]
                
                if table["id"] in res_table_ids:
                    # 2. Check Time Overlap
                    res_start = res["datetime_start"]
                    # Handle Mongo stored datetime vs string
                    if isinstance(res_start, str):
                        res_start = datetime.fromisoformat(res_start)
                        
                    res_end = res["datetime_end"]
                    if isinstance(res_end, str):
                        res_end = datetime.fromisoformat(res_end)
                    
                    # Overlap logic: (StartA < EndB) and (EndA > StartB)
                    if res_start < end and res_end > start:
                        is_blocked = True
                        break
            
            if not is_blocked:
                return table
        return None

    async def create_reservation(self, payload: dict) -> Reservation:
        """
        Creates a reservation.
        Payload expected to match 'Reservation' model roughly, 
        but we calculate end_time and assign tables here.
        """
        venue_id = payload.get("venue_id")
        pax = payload.get("guest_count")
        start_time_str = payload.get("datetime_start") # ISO Str
        
        dt_start = datetime.fromisoformat(start_time_str)
        
        # 1. Recalculate Turn Time (Rule Enforcement)
        turn_time = await self.calculate_turn_time(venue_id, pax)
        dt_end = dt_start + timedelta(minutes=turn_time)
        
        # 2. Check Availability Again (Concurrency check)
        # Re-fetch tables/reservations or optimize
        # For Phase X, we utilize the _find_free_table helper directly
        
        candidate_tables_cursor = self.db.tables.find({
            "venue_id": venue_id,
            "capacity": {"$gte": pax},
            "is_active": True
        })
        tables = await candidate_tables_cursor.to_list(1000)
        
        existing_res_cursor = self.db.reservations.find({
             "venue_id": venue_id,
             "datetime_start": {"$gte": dt_start - timedelta(hours=4), "$lt": dt_end + timedelta(hours=4)}, # Narrow window
             "status": {"$ne": ReservationStatus.CANCELLED.value}
        })
        reservations = await existing_res_cursor.to_list(1000)
        
        assigned_table = self._find_free_table(tables, reservations, dt_start, dt_end)
        
        if not assigned_table and payload.get("status") != ReservationStatus.WAITLIST.value:
            raise HTTPException(status_code=409, detail="No availability for selected time")
            
        # 3. Create / Get Guest Profile
        guest_data = payload.get("guest", {})
        phone = guest_data.get("phone", "")
        email = guest_data.get("email")
        
        # Check for existing guest in this venue
        existing_guest = await self.db.guest_profiles.find_one({
            "venue_id": venue_id,
            "$or": [
                {"contact_info.phone": phone},
                {"contact_info.email": email}
            ] if email else [{"contact_info.phone": phone}]
        })
        
        if existing_guest:
            guest_id = existing_guest["id"]
        else:
             # Create new guest
             guest_id = str(uuid4())
             new_guest = GuestProfile(
                 id=guest_id,
                 venue_id=venue_id, # Added for multi-venue isolation
                 first_name=guest_data.get("first_name", "Unknown"),
                 last_name=guest_data.get("last_name", "Guest"),
                 contact_info=ContactInfo(
                     phone=phone,
                     email=email
                 ),
                 created_at=datetime.now(),
                 updated_at=datetime.now()
             )
             await self.db.guest_profiles.insert_one(new_guest.model_dump())
        
        # 4. Construct Reservation Object
        res_id = str(uuid4())
        
        # Audit Log
        audit = AuditLogEntry(
            timestamp=datetime.now(),
            action="CREATE",
            actor=payload.get("channel", "SYSTEM"),
            details=f"Created via {payload.get('channel')}",
            metadata={"assigned_table": assigned_table["id"] if assigned_table else "WAITLIST"}
        )
        
        reservation = Reservation(
            id=res_id,
            venue_id=venue_id,
            guest_profile_id=guest_id,
            guest_name=f"{guest_data.get('first_name')} {guest_data.get('last_name')}",
            guest_count=pax,
            datetime_start=dt_start,
            datetime_end=dt_end,
            table_ids=[assigned_table["id"]] if assigned_table else [],
            section_id=assigned_table.get("section_id") if assigned_table else None,
            channel=payload.get("channel", ReservationChannel.INTERNAL),
            status=payload.get("status", ReservationStatus.CONFIRMED if assigned_table else ReservationStatus.WAITLIST),
            audit_log=[audit],
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        # 5. Persist
        await self.db.reservations.insert_one(reservation.model_dump())
        
        return reservation
