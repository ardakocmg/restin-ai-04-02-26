from fastapi import APIRouter, Depends, HTTPException, Query
from datetime import datetime, timezone
import uuid

from core.database import db
from core.dependencies import get_current_user, check_venue_access
from models.table_preferences import TablePreferences


def create_table_preferences_router():
    router = APIRouter(prefix="/table-preferences", tags=["table-preferences"])

    @router.get("")
    async def get_preferences(
        table_id: str = Query(...),
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        prefs = await db.table_preferences.find_one(
            {"user_id": current_user["id"], "venue_id": venue_id, "table_id": table_id},
            {"_id": 0}
        )
        return {"success": True, "preferences": prefs.get("preferences") if prefs else {}}

    @router.post("")
    async def upsert_preferences(payload: dict, current_user: dict = Depends(get_current_user)):
        table_id = payload.get("table_id")
        venue_id = payload.get("venue_id")
        preferences = payload.get("preferences") or {}
        if not table_id or not venue_id:
            raise HTTPException(status_code=400, detail="table_id and venue_id required")
        await check_venue_access(current_user, venue_id)
        now = datetime.now(timezone.utc).isoformat()
        prefs_doc = TablePreferences(
            id=str(uuid.uuid4()),
            user_id=current_user["id"],
            venue_id=venue_id,
            table_id=table_id,
            preferences=preferences,
            updated_at=now
        )

        await db.table_preferences.update_one(
            {"user_id": current_user["id"], "venue_id": venue_id, "table_id": table_id},
            {"$set": prefs_doc.model_dump()},
            upsert=True
        )

        return {"success": True}

    return router
