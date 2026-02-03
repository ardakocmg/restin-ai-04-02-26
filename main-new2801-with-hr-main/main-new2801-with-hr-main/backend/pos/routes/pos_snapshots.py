"""POS snapshot endpoint for menu loading"""
from fastapi import APIRouter, Depends
from core.database import db
from core.dependencies import get_current_user

def create_pos_snapshot_router():
    router = APIRouter(prefix="/pos/snapshots", tags=["pos-snapshots"])

    @router.get("/{snapshot_id}")
    async def get_snapshot(
        snapshot_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        doc = await db.pos_menu_snapshots.find_one({"snapshot_id": snapshot_id}, {"_id": 0})
        if not doc:
            return {"ok": False, "error": {"code": "NOT_FOUND"}}
        return doc

    return router
