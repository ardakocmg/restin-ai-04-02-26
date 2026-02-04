from fastapi import APIRouter, Depends, HTTPException, Query
from core.dependencies import get_current_user
from services.updates_service import UpdatesService
from core.database import db


def create_updates_router():
    router = APIRouter(prefix="/updates", tags=["updates"])
    service = UpdatesService()

    @router.get("/changes")
    async def list_changes(published: bool = Query(False), current_user: dict = Depends(get_current_user)):
        if current_user.get("role") not in ["owner", "product_owner"]:
            raise HTTPException(status_code=403, detail="Permission denied")
        items = await db.update_changes.find({"published": published}, {"_id": 0}).sort("created_at", -1).to_list(200)
        return {"success": True, "items": items}

    @router.post("/changes")
    async def create_change(payload: dict, current_user: dict = Depends(get_current_user)):
        if current_user.get("role") not in ["owner", "product_owner"]:
            raise HTTPException(status_code=403, detail="Permission denied")
        change = await service.create_change(payload)
        return {"success": True, "change": change}

    @router.post("/publish")
    async def publish_release(current_user: dict = Depends(get_current_user)):
        if current_user.get("role") not in ["owner", "product_owner"]:
            raise HTTPException(status_code=403, detail="Permission denied")
        release = await service.publish_release(actor_id=current_user.get("id"), actor_role=current_user.get("role"), auto_published=False)
        if not release:
            return {"success": False, "message": "No pending changes"}
        return {"success": True, "release": release}

    @router.get("/releases")
    async def list_releases(view: str = Query("user")):
        items = await db.release_notes.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
        response_items = []
        for item in items:
            response_items.append({
                "id": item.get("id"),
                "version_code": item.get("version_code"),
                "created_at": item.get("created_at"),
                "notes": item.get("user_notes") if view == "user" else item.get("technical_notes")
            })
        return {"success": True, "items": response_items}

    return router
