from fastapi import APIRouter, Depends, HTTPException, Query
from datetime import datetime, timezone
import uuid

from core.database import db
from core.dependencies import get_current_user, check_venue_access
from models.table_presets import TablePreset


def create_table_presets_router():
    router = APIRouter(prefix="/table-presets", tags=["table-presets"])

    @router.get("")
    async def list_presets(
        table_id: str = Query(...),
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        presets = await db.table_presets.find(
            {
                "table_id": table_id,
                "venue_id": venue_id,
                "$or": [
                    {"scope": "USER", "user_id": current_user["id"]},
                    {"scope": "ROLE", "role": current_user.get("role")}
                ]
            },
            {"_id": 0}
        ).sort("created_at", -1).to_list(100)
        return {"success": True, "presets": presets}

    @router.post("")
    async def create_preset(payload: dict, current_user: dict = Depends(get_current_user)):
        table_id = payload.get("table_id")
        venue_id = payload.get("venue_id")
        name = payload.get("name")
        scope = payload.get("scope", "USER")
        state = payload.get("state") or {}
        if not table_id or not venue_id or not name:
            raise HTTPException(status_code=400, detail="table_id, venue_id, name required")
        await check_venue_access(current_user, venue_id)
        if scope == "ROLE" and current_user.get("role") not in ["owner", "product_owner"]:
            raise HTTPException(status_code=403, detail="Role-scoped presets require owner or product owner")

        preset = TablePreset(
            id=str(uuid.uuid4()),
            table_id=table_id,
            venue_id=venue_id,
            name=name,
            scope=scope,
            user_id=current_user["id"] if scope == "USER" else None,
            role=current_user.get("role") if scope == "ROLE" else None,
            state=state,
            created_at=datetime.now(timezone.utc).isoformat(),
            created_by=current_user["id"],
            created_by_role=current_user.get("role")
        )

        await db.table_presets.insert_one(preset.model_dump())
        return {"success": True, "preset": preset.model_dump()}

    @router.delete("/{preset_id}")
    async def delete_preset(preset_id: str, current_user: dict = Depends(get_current_user)):
        preset = await db.table_presets.find_one({"id": preset_id}, {"_id": 0})
        if not preset:
            raise HTTPException(status_code=404, detail="Preset not found")
        if preset.get("scope") == "USER" and preset.get("user_id") != current_user["id"]:
            raise HTTPException(status_code=403, detail="Permission denied")
        if preset.get("scope") == "ROLE" and current_user.get("role") not in ["owner", "product_owner", preset.get("role")]:
            raise HTTPException(status_code=403, detail="Permission denied")
        await db.table_presets.delete_one({"id": preset_id})
        return {"success": True}

    return router
