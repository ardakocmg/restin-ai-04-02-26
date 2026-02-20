"""
Room Charge Routes — REST API for Oracle OPERA PMS + Micros Room Charge
Exposes guest lookup, charge posting, folio queries, and charge history.

Endpoints:
  POST /venues/{venue_id}/room-charge/test          — Test PMS connection
  GET  /venues/{venue_id}/room-charge/guest          — Lookup in-house guest
  POST /venues/{venue_id}/room-charge/post           — Post charge to folio
  GET  /venues/{venue_id}/room-charge/folio/{res_id} — Get folio balance
  GET  /venues/{venue_id}/room-charge/history        — Charge audit history
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field
from typing import Optional
from core.dependencies import get_current_user
from core.database import db
from models.auth import User
from services.room_charge_service import RoomChargeService
import logging

logger = logging.getLogger("room_charge_routes")


# ── Request / Response Models ────────────────────────────────────────────

class RoomChargePostRequest(BaseModel):
    reservation_id: str = Field(..., description="OPERA reservation ID")
    amount_cents: int = Field(..., gt=0, description="Amount in cents")
    description: str = Field(..., max_length=200, description="Posting description")
    currency_code: str = Field(default="EUR", description="ISO currency code")
    pos_check_id: Optional[str] = Field(default=None, description="POS check/ticket reference")


class ConnectionTestRequest(BaseModel):
    provider: str = Field(default="oracle_opera", description="oracle_opera or oracle_micros")


# ── Router Factory ───────────────────────────────────────────────────────

def create_room_charge_router():
    router = APIRouter(prefix="/venues", tags=["room-charge"])
    svc = RoomChargeService(db)

    # ── Test Connection ──────────────────────────────────────────────────
    @router.post("/{venue_id}/room-charge/test")
    async def test_pms_connection(
        venue_id: str,
        body: ConnectionTestRequest,
        current_user: User = Depends(get_current_user),
    ):
        """Test OAuth connection to OPERA or Micros — verifies credentials are valid."""
        result = await svc.test_connection(venue_id, body.provider)
        return result

    # ── Guest Lookup ─────────────────────────────────────────────────────
    @router.get("/{venue_id}/room-charge/guest")
    async def lookup_guest(
        venue_id: str,
        room: Optional[str] = Query(None, description="Room number"),
        name: Optional[str] = Query(None, description="Guest last name"),
        reservation_id: Optional[str] = Query(None, description="Reservation ID"),
        current_user: User = Depends(get_current_user),
    ):
        """Search for an in-house hotel guest by room number, name, or reservation ID."""
        if not any([room, name, reservation_id]):
            raise HTTPException(status_code=400, detail="Provide at least one search parameter: room, name, or reservation_id")

        try:
            result = await svc.lookup_guest(
                venue_id=venue_id,
                room_number=room,
                last_name=name,
                reservation_id=reservation_id,
            )
            return result
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

    # ── Post Room Charge ─────────────────────────────────────────────────
    @router.post("/{venue_id}/room-charge/post")
    async def post_room_charge(
        venue_id: str,
        body: RoomChargePostRequest,
        current_user: User = Depends(get_current_user),
    ):
        """Post a charge to a guest's room folio in OPERA PMS."""
        user_name = current_user.get("name") or current_user.get("email") or current_user.get("id", "system")

        try:
            result = await svc.post_room_charge(
                venue_id=venue_id,
                reservation_id=body.reservation_id,
                amount_cents=body.amount_cents,
                description=body.description,
                currency_code=body.currency_code,
                pos_check_id=body.pos_check_id,
                posted_by=user_name,
            )
            return result
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

    # ── Folio Balance ────────────────────────────────────────────────────
    @router.get("/{venue_id}/room-charge/folio/{reservation_id}")
    async def get_folio_balance(
        venue_id: str,
        reservation_id: str,
        current_user: User = Depends(get_current_user),
    ):
        """Query the guest folio balance from OPERA PMS."""
        try:
            result = await svc.get_folio_balance(
                venue_id=venue_id,
                reservation_id=reservation_id,
            )
            return result
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

    # ── Charge History ───────────────────────────────────────────────────
    @router.get("/{venue_id}/room-charge/history")
    async def get_charge_history(
        venue_id: str,
        limit: int = Query(50, ge=1, le=200),
        current_user: User = Depends(get_current_user),
    ):
        """Get room charge posting history from local audit log."""
        charges = await svc.get_charge_history(venue_id=venue_id, limit=limit)
        return {"charges": charges, "count": len(charges)}

    return router
