"""POS Session Routes (Z Report / Shifts)"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, List
from datetime import datetime, timezone
import uuid

from core.database import db
from core.dependencies import get_current_user, check_venue_access
from models.pos_session import POSSession, POSSessionCreate, POSSessionClose, SessionStatus
from services.audit_service import create_audit_log

def create_pos_session_router():
    router = APIRouter(tags=["pos_sessions"])

    @router.post("/pos/sessions/open", response_model=POSSession)
    async def open_session(
        data: POSSessionCreate,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, data.venue_id)
        
        # Check if user already has an open session? 
        # Or check if station has open session?
        # For now, allow multiple, but in reality we might limit 1 per user/station.
        
        session_dict = data.model_dump()
        session_dict["id"] = str(uuid.uuid4())
        session_dict["opened_by"] = current_user["id"]
        session_dict["opening_time"] = datetime.now(timezone.utc)
        session_dict["status"] = SessionStatus.OPEN
        session_dict["created_at"] = datetime.now(timezone.utc)
        session_dict["updated_at"] = datetime.now(timezone.utc)
        
        # Init counters
        session_dict["cash_sales_cents"] = 0
        session_dict["card_sales_cents"] = 0
        session_dict["total_sales_cents"] = 0
        
        await db.pos_sessions.insert_one(session_dict)
        
        await create_audit_log(
            data.venue_id, current_user["id"], current_user["name"],
            "open", "pos_session", session_dict["id"],
            {"opening_balance": data.opening_balance_cents}
        )
        
        return session_dict

    @router.post("/pos/sessions/{session_id}/close", response_model=POSSession)
    async def close_session(
        session_id: str,
        data: POSSessionClose,
        current_user: dict = Depends(get_current_user)
    ):
        try:
            session = await db.pos_sessions.find_one({"id": session_id})
            if not session:
                raise HTTPException(status_code=404, detail="Session not found")
            
            await check_venue_access(current_user, session["venue_id"])
            
            if session["status"] == SessionStatus.CLOSED:
                raise HTTPException(status_code=400, detail="Session already closed")

            closing_time = datetime.now(timezone.utc)
            
            # expected_cash calculation
            # Safely get values
            opening = session.get("opening_balance_cents", 0)
            cash_sales = session.get("cash_sales_cents", 0)
            
            expected_cash = opening + cash_sales
            diff = data.closing_balance_cents - expected_cash
            
            update_data = {
                "status": SessionStatus.CLOSED,
                "closing_time": closing_time,
                "closing_balance_cents": data.closing_balance_cents,
                "closed_by": current_user["id"],
                "cash_difference_cents": diff,
                "notes": data.notes,
                "updated_at": closing_time
            }
            
            await db.pos_sessions.update_one(
                {"id": session_id},
                {"$set": update_data}
            )
            
            updated_session = await db.pos_sessions.find_one({"id": session_id})
            
            if updated_session and "_id" in updated_session:
                del updated_session["_id"]
                
            return updated_session
        except HTTPException:
            raise
        except Exception as e:
            import traceback
            print(f"ERROR closing session: {e}")
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"Internal Error: {str(e)}")

    @router.get("/pos/snapshots/{session_id}", response_model=POSSession)
    async def get_session_snapshot(
        session_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        session = await db.pos_sessions.find_one({"id": session_id})
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
            
        await check_venue_access(current_user, session["venue_id"])
        
        # Here we could re-calculate live sales stats to return a "snapshot"
        
        return session

    return router
