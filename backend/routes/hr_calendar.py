"""
HR Calendar Routes — Auto-track key dates
Based on Shireburn Indigo Calendar feature:
- Work anniversaries, probation expiry, contract end dates
- Birthdays, custom events, reminders
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel
import uuid

from core.database import db
from core.dependencies import get_current_user, check_venue_access


class CalendarEventRequest(BaseModel):
    title: str
    event_type: str  # birthday, anniversary, probation_expiry, contract_end, custom, public_holiday
    date: str  # ISO date
    employee_id: Optional[str] = None
    description: str = ""
    recurring: bool = False  # yearly recurrence
    reminder_days_before: int = 7


def create_hr_calendar_router():
    router = APIRouter(tags=["hr_calendar"])

    @router.get("/venues/{venue_id}/hr/calendar/events")
    async def list_calendar_events(
        venue_id: str,
        month: Optional[str] = None,
        event_type: Optional[str] = None,
        current_user: dict = Depends(get_current_user)
    ):
        """List all HR calendar events. Includes auto-generated employee events."""
        await check_venue_access(current_user, venue_id)

        # 1. Get all employees to auto-generate events
        employees = await db.employees.find(
            {"venue_id": venue_id, "status": "active"},
            {"_id": 0, "id": 1, "full_name": 1, "name": 1, "date_of_birth": 1, "start_date": 1,
             "probation_end_date": 1, "contract_end_date": 1}
        ).to_list(1000)

        now = datetime.now(timezone.utc)
        auto_events = []

        for emp in employees:
            emp_name = emp.get("full_name") or emp.get("name", "Unknown")
            emp_id = emp.get("id")

            # Birthday
            dob = emp.get("date_of_birth")
            if dob:
                auto_events.append({
                    "id": f"auto-bday-{emp_id}",
                    "title": f"🎂 {emp_name}'s Birthday",
                    "event_type": "birthday",
                    "date": dob,
                    "employee_id": emp_id,
                    "recurring": True,
                    "auto_generated": True
                })

            # Work Anniversary
            start = emp.get("start_date")
            if start:
                auto_events.append({
                    "id": f"auto-anniv-{emp_id}",
                    "title": f"🏆 {emp_name}'s Work Anniversary",
                    "event_type": "anniversary",
                    "date": start,
                    "employee_id": emp_id,
                    "recurring": True,
                    "auto_generated": True
                })

            # Probation Expiry
            prob_end = emp.get("probation_end_date")
            if prob_end:
                auto_events.append({
                    "id": f"auto-prob-{emp_id}",
                    "title": f"⚠️ {emp_name} Probation Ends",
                    "event_type": "probation_expiry",
                    "date": prob_end,
                    "employee_id": emp_id,
                    "recurring": False,
                    "auto_generated": True
                })

            # Contract End
            contract_end = emp.get("contract_end_date")
            if contract_end:
                auto_events.append({
                    "id": f"auto-contract-{emp_id}",
                    "title": f"📋 {emp_name} Contract Ends",
                    "event_type": "contract_end",
                    "date": contract_end,
                    "employee_id": emp_id,
                    "recurring": False,
                    "auto_generated": True
                })

        # 2. Get custom events from DB
        query = {"venue_id": venue_id}
        if event_type:
            query["event_type"] = event_type
        custom_events = await db.hr_calendar_events.find(query, {"_id": 0}).to_list(500)

        all_events = auto_events + custom_events

        # 3. Filter by month if requested
        if month:
            all_events = [e for e in all_events if e.get("date", "").startswith(month)]

        return all_events

    @router.post("/venues/{venue_id}/hr/calendar/events")
    async def create_calendar_event(
        venue_id: str,
        event_data: CalendarEventRequest,
        current_user: dict = Depends(get_current_user)
    ):
        """Create a custom HR calendar event."""
        await check_venue_access(current_user, venue_id)

        event = {
            "id": f"evt-{uuid.uuid4().hex[:12]}",
            "venue_id": venue_id,
            "title": event_data.title,
            "event_type": event_data.event_type,
            "date": event_data.date,
            "employee_id": event_data.employee_id,
            "description": event_data.description,
            "recurring": event_data.recurring,
            "reminder_days_before": event_data.reminder_days_before,
            "auto_generated": False,
            "created_by": current_user["id"],
            "created_at": datetime.now(timezone.utc).isoformat()
        }

        await db.hr_calendar_events.insert_one(event)
        return event

    @router.delete("/venues/{venue_id}/hr/calendar/events/{event_id}")
    async def delete_calendar_event(
        venue_id: str,
        event_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Delete a custom calendar event."""
        await check_venue_access(current_user, venue_id)
        await db.hr_calendar_events.delete_one({"id": event_id, "venue_id": venue_id})
        return {"message": "Event deleted"}

    @router.get("/venues/{venue_id}/hr/calendar/upcoming")
    async def get_upcoming_events(
        venue_id: str,
        days: int = 30,
        current_user: dict = Depends(get_current_user)
    ):
        """Get upcoming events within the next N days for alerts/reminders."""
        await check_venue_access(current_user, venue_id)

        now = datetime.now(timezone.utc)
        cutoff = (now + timedelta(days=days)).isoformat()[:10]
        today = now.isoformat()[:10]

        employees = await db.employees.find(
            {"venue_id": venue_id, "status": "active"},
            {"_id": 0, "id": 1, "full_name": 1, "name": 1,
             "probation_end_date": 1, "contract_end_date": 1}
        ).to_list(1000)

        alerts = []
        for emp in employees:
            emp_name = emp.get("full_name") or emp.get("name", "Unknown")

            prob = emp.get("probation_end_date", "")
            if prob and today <= prob <= cutoff:
                alerts.append({"type": "probation_expiry", "employee": emp_name, "date": prob, "severity": "warning"})

            contract = emp.get("contract_end_date", "")
            if contract and today <= contract <= cutoff:
                alerts.append({"type": "contract_end", "employee": emp_name, "date": contract, "severity": "critical"})

        return {"upcoming_count": len(alerts), "alerts": alerts}

    return router
