"""
Template Assets Routes
──────────────────────
Upload, list, and delete image assets for use in templates.
Max 500KB, PNG/JPEG only. Includes malware scan status tracking.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from datetime import datetime, timezone
from uuid import uuid4
import logging

from core.database import db
from core.dependencies import get_current_user
from services.permission_service import effective_permissions

logger = logging.getLogger("restin.template.assets")

ALLOWED_MIME_TYPES = {"image/png", "image/jpeg", "image/jpg"}
MAX_ASSET_SIZE = 512_000  # 500KB


def create_template_assets_router():
    router = APIRouter(prefix="/template-assets", tags=["Template Assets"])

    async def _get_perms(current_user: dict, venue_id: str) -> set:
        venue = await db.venues.find_one({"id": venue_id}, {"_id": 0})
        venue_settings = venue.get("settings", {}) if venue else {}
        return effective_permissions(current_user["role"], venue_settings)

    # ── LIST ASSETS ─────────────────────────────────────────────
    @router.get("")
    async def list_assets(
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        """List template assets for a venue (TEMPLATE_VIEW required)"""
        perms = await _get_perms(current_user, venue_id)
        if "TEMPLATE_VIEW" not in perms:
            raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "No access to template assets"})

        assets = await db.template_assets.find(
            {"venue_id": venue_id},
            {"_id": 0}
        ).sort("uploaded_at", -1).to_list(200)

        return assets

    # ── UPLOAD ASSET ────────────────────────────────────────────
    @router.post("/upload")
    async def upload_asset(
        data: dict,
        current_user: dict = Depends(get_current_user)
    ):
        """
        Upload an image asset for template use.
        TEMPLATE_ASSETS permission required.
        Accepts base64 or URL reference.
        Max 500KB PNG/JPEG.
        """
        venue_id = data.get("venue_id")
        if not venue_id:
            raise HTTPException(status_code=400, detail="venue_id required")

        perms = await _get_perms(current_user, venue_id)
        if "TEMPLATE_ASSETS" not in perms:
            raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "No permission to upload assets"})

        mime_type = data.get("mime_type", "image/png")
        if mime_type not in ALLOWED_MIME_TYPES:
            raise HTTPException(status_code=400, detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_MIME_TYPES)}")

        size_bytes = data.get("size_bytes", 0)
        if size_bytes > MAX_ASSET_SIZE:
            raise HTTPException(status_code=400, detail=f"File too large. Max: {MAX_ASSET_SIZE // 1000}KB")

        now = datetime.now(timezone.utc).isoformat()
        asset_id = str(uuid4())

        asset_doc = {
            "id": asset_id,
            "venue_id": venue_id,
            "filename": data.get("filename", f"asset-{asset_id[:8]}"),
            "original_filename": data.get("original_filename", ""),
            "mime_type": mime_type,
            "size_bytes": size_bytes,
            "storage_key": f"venues/{venue_id}/template-assets/{asset_id}",
            "url": data.get("url", ""),
            "status": "scanning",  # Will be updated by async malware scan
            "width": data.get("width"),
            "height": data.get("height"),
            "uploaded_at": now,
            "uploaded_by": current_user.get("id", "")
        }

        # If URL provided, mark as safe immediately (external URL)
        if data.get("url"):
            asset_doc["status"] = "safe"

        await db.template_assets.insert_one(asset_doc)

        # Audit
        await db.event_logs.insert_one({
            "id": str(uuid4()),
            "level": "AUDIT",
            "code": "TEMPLATE_ASSET_UPLOADED",
            "message": f"Template asset uploaded: {asset_doc.get('original_filename', asset_id)}",
            "user_id": current_user.get("id"),
            "venue_id": venue_id,
            "meta": {
                "asset_id": asset_id,
                "filename": asset_doc.get("original_filename"),
                "size_bytes": size_bytes,
                "mime_type": mime_type
            },
            "timestamp": now
        })

        logger.info(f"Template asset uploaded: {asset_id} by {current_user.get('name', 'Unknown')}")
        return asset_doc

    # ── GET ASSET ───────────────────────────────────────────────
    @router.get("/{asset_id}")
    async def get_asset(
        asset_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Get asset detail (TEMPLATE_VIEW required)"""
        asset = await db.template_assets.find_one({"id": asset_id}, {"_id": 0})
        if not asset:
            raise HTTPException(status_code=404, detail="Asset not found")

        perms = await _get_perms(current_user, asset["venue_id"])
        if "TEMPLATE_VIEW" not in perms:
            raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "No access to template assets"})

        return asset

    # ── UPDATE ASSET STATUS (Malware Scan Result) ───────────────
    @router.patch("/{asset_id}/status")
    async def update_asset_status(
        asset_id: str,
        data: dict,
        current_user: dict = Depends(get_current_user)
    ):
        """Update asset scan status (it_admin or owner only)"""
        asset = await db.template_assets.find_one({"id": asset_id}, {"_id": 0})
        if not asset:
            raise HTTPException(status_code=404, detail="Asset not found")

        if current_user.get("role", "").lower() not in ["owner", "product_owner", "it_admin"]:
            raise HTTPException(status_code=403, detail="Only admins can update asset status")

        new_status = data.get("status")
        if new_status not in ["safe", "rejected"]:
            raise HTTPException(status_code=400, detail="Status must be 'safe' or 'rejected'")

        await db.template_assets.update_one(
            {"id": asset_id},
            {"$set": {"status": new_status}}
        )

        return {"message": f"Asset status updated to {new_status}"}

    # ── DELETE ASSET ────────────────────────────────────────────
    @router.delete("/{asset_id}")
    async def delete_asset(
        asset_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Delete an asset (TEMPLATE_DELETE required)"""
        asset = await db.template_assets.find_one({"id": asset_id}, {"_id": 0})
        if not asset:
            raise HTTPException(status_code=404, detail="Asset not found")

        perms = await _get_perms(current_user, asset["venue_id"])
        if "TEMPLATE_DELETE" not in perms:
            raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "No permission to delete assets"})

        await db.template_assets.delete_one({"id": asset_id})

        return {"message": "Asset deleted"}

    return router
