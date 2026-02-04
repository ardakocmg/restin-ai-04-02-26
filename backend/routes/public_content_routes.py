from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional

from core.database import db
from core.dependencies import get_current_user
from services.public_content_service import get_public_content_service


def create_public_content_router():
    router = APIRouter(prefix="/public-content", tags=["public-content"])

    DRAFTER_ROLES = ["owner", "product_owner", "it_admin", "general_manager", "manager"]
    APPROVER_ROLES = ["owner", "product_owner"]

    def require_drafter(current_user: dict):
        if current_user.get("role") not in DRAFTER_ROLES:
            raise HTTPException(status_code=403, detail="Permission denied")

    def require_approver(current_user: dict):
        if current_user.get("role") not in APPROVER_ROLES:
            raise HTTPException(status_code=403, detail="Approval permission required")

    @router.get("/current")
    async def get_current_content(content_type: str = Query(..., alias="type")):
        service = get_public_content_service(db)
        content_doc = await service.get_current_content(content_type)
        if not content_doc:
            raise HTTPException(status_code=404, detail="Content not found")
        return {
            "success": True,
            "content": content_doc.get("content"),
            "version": content_doc.get("version"),
            "status": content_doc.get("status")
        }

    @router.get("/versions")
    async def list_versions(
        content_type: str = Query(..., alias="type"),
        current_user: dict = Depends(get_current_user)
    ):
        require_drafter(current_user)
        service = get_public_content_service(db)
        versions = await service.list_versions(content_type)
        return {"success": True, "versions": versions}

    @router.get("/preview/{version_id}")
    async def preview_version(version_id: str, current_user: dict = Depends(get_current_user)):
        require_drafter(current_user)
        version_doc = await db.public_content_versions.find_one({"id": version_id}, {"_id": 0})
        if not version_doc:
            raise HTTPException(status_code=404, detail="Version not found")
        if version_doc.get("type") == "modules":
            service = get_public_content_service(db)
            version_doc["content"] = service._apply_registry_sync(version_doc.get("content", {}))
        return {
            "success": True,
            "content": version_doc.get("content"),
            "version": version_doc.get("version"),
            "status": version_doc.get("status")
        }

    @router.post("")
    async def create_version(payload: dict, current_user: dict = Depends(get_current_user)):
        require_drafter(current_user)
        content_type = payload.get("type")
        content = payload.get("content") or {}
        changelog = payload.get("changelog")
        scheduled_publish_at = payload.get("scheduled_publish_at")
        if not content_type:
            raise HTTPException(status_code=400, detail="type is required")
        service = get_public_content_service(db)
        version_doc = await service.create_version(
            content_type,
            content,
            changelog,
            current_user.get("id"),
            scheduled_publish_at,
            current_user.get("role")
        )
        return {"success": True, "version": version_doc}

    @router.post("/sync-modules")
    async def sync_modules_from_registry(current_user: dict = Depends(get_current_user)):
        require_drafter(current_user)
        service = get_public_content_service(db)
        current_doc = await service.get_current_content("modules")
        content = current_doc.get("content", {})
        content["auto_sync_registry"] = True
        version_doc = await service.create_version(
            "modules",
            content,
            "Synced from module registry",
            current_user.get("id"),
            None,
            current_user.get("role")
        )
        return {"success": True, "version": version_doc}

    @router.patch("/{version_id}")
    async def update_version(version_id: str, payload: dict, current_user: dict = Depends(get_current_user)):
        require_drafter(current_user)
        content = payload.get("content") or {}
        changelog = payload.get("changelog")
        scheduled_publish_at = payload.get("scheduled_publish_at")
        service = get_public_content_service(db)
        updated = await service.update_version(version_id, content, changelog, scheduled_publish_at)
        if not updated:
            raise HTTPException(status_code=404, detail="Draft not found")
        return {"success": True, "version": updated}

    @router.post("/{version_id}/approve")
    async def approve_version(version_id: str, current_user: dict = Depends(get_current_user)):
        require_approver(current_user)
        service = get_public_content_service(db)
        updated = await service.approve_version(version_id, current_user.get("id"), current_user.get("role"))
        if not updated:
            raise HTTPException(status_code=404, detail="Version not found")
        return {"success": True, "version": updated}

    return router
