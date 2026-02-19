"""
Tip Presets Routes — Configurable tip suggestions at payment screen
Lightspeed Parity: fixed amounts, percentages, or combo displayed at checkout
"""
from fastapi import APIRouter, Depends, HTTPException, Body
from core.dependencies import get_current_user, get_database
from datetime import datetime, timezone
import logging
import uuid

logger = logging.getLogger(__name__)


def create_tip_presets_router():
    router = APIRouter(prefix="/tip-presets", tags=["tip-presets"])

    @router.get("/{venue_id}")
    async def get_tip_presets(
        venue_id: str,
        current_user: dict = Depends(get_current_user),
        db=Depends(get_database),
    ):
        """Get tip preset config for a venue."""
        config = await db.tip_presets.find_one(
            {"venue_id": venue_id}, {"_id": 0}
        )
        if not config:
            # Return sensible defaults
            config = {
                "id": str(uuid.uuid4())[:12],
                "venue_id": venue_id,
                "enabled": True,
                "mode": "percent",  # percent | fixed | combo
                "percent_options": [10, 15, 20],
                "fixed_options_cents": [200, 500, 1000],
                "default_selected": 1,  # index of default (15% or €5)
                "show_custom": True,
                "show_on": ["pos", "receipt", "kiosk"],
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            await db.tip_presets.insert_one(config)

        return {"success": True, "data": config}

    @router.put("/{venue_id}")
    async def update_tip_presets(
        venue_id: str,
        payload: dict = Body(...),
        current_user: dict = Depends(get_current_user),
        db=Depends(get_database),
    ):
        """Update tip preset config for a venue."""
        role = current_user.get("role", "")
        if role not in ["owner", "product_owner", "OWNER", "ADMIN", "admin"]:
            raise HTTPException(status_code=403, detail="Owner or admin required")

        allowed_fields = {
            "enabled", "mode", "percent_options", "fixed_options_cents",
            "default_selected", "show_custom", "show_on"
        }
        update = {k: v for k, v in payload.items() if k in allowed_fields}
        if not update:
            raise HTTPException(status_code=400, detail="No valid fields to update")

        # Validate mode
        if "mode" in update and update["mode"] not in ("percent", "fixed", "combo"):
            raise HTTPException(status_code=400, detail="mode must be percent, fixed, or combo")

        update["updated_at"] = datetime.now(timezone.utc).isoformat()
        update["updated_by"] = current_user["id"]

        result = await db.tip_presets.update_one(
            {"venue_id": venue_id},
            {"$set": update},
            upsert=True,
        )

        config = await db.tip_presets.find_one({"venue_id": venue_id}, {"_id": 0})
        logger.info(f"Tip presets updated for venue {venue_id}")
        return {"success": True, "data": config}

    @router.post("/{venue_id}/seed")
    async def seed_tip_presets(
        venue_id: str,
        current_user: dict = Depends(get_current_user),
        db=Depends(get_database),
    ):
        """Seed default tip presets for a venue."""
        await db.tip_presets.delete_many({"venue_id": venue_id})
        config = {
            "id": str(uuid.uuid4())[:12],
            "venue_id": venue_id,
            "enabled": True,
            "mode": "combo",
            "percent_options": [10, 15, 20],
            "fixed_options_cents": [200, 500, 1000],
            "default_selected": 1,
            "show_custom": True,
            "show_on": ["pos", "receipt", "kiosk"],
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.tip_presets.insert_one(config)
        return {"success": True, "data": config}

    return router
