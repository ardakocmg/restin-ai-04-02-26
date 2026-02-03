"""Guide system routes - universal guide documents"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Query
from typing import Optional
from pathlib import Path
from datetime import datetime, timezone
import uuid

from core.database import db
from core.dependencies import get_current_user, check_venue_access
from models import Asset, GuideDocument, EntityType


def create_guide_router():
    router = APIRouter(tags=["guides"])

    @router.post("/assets/upload")
    async def upload_asset(
        file: UploadFile = File(...),
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        """Upload an asset (photo) for guides"""
        await check_venue_access(current_user, venue_id)
        
        content = await file.read()
        
        file_ext = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
        storage_key = f"assets/{venue_id}/{uuid.uuid4()}.{file_ext}"
        
        upload_dir = Path(f"/app/uploads/{venue_id}")
        upload_dir.mkdir(parents=True, exist_ok=True)
        file_path = upload_dir / f"{uuid.uuid4()}.{file_ext}"
        
        with open(file_path, "wb") as f:
            f.write(content)
        
        asset = Asset(
            venue_id=venue_id,
            filename=file.filename,
            mime_type=file.content_type or "image/jpeg",
            size_bytes=len(content),
            storage_key=storage_key,
            url=f"/uploads/{venue_id}/{file_path.name}",
            created_by=current_user["id"]
        )
        
        await db.assets.insert_one(asset.model_dump())
        
        return asset.model_dump()

    @router.get("/venues/{venue_id}/guides")
    async def list_guides(
        venue_id: str,
        entity_type: Optional[str] = None,
        entity_id: Optional[str] = None,
        guide_kind: Optional[str] = None,
        current_user: dict = Depends(get_current_user)
    ):
        """List all guides for a venue"""
        await check_venue_access(current_user, venue_id)
        
        query = {"venue_id": venue_id}
        if entity_type:
            query["entity_type"] = entity_type
        if entity_id:
            query["entity_id"] = entity_id
        if guide_kind:
            query["guide_kind"] = guide_kind
        
        guides = await db.guide_documents.find(query, {"_id": 0}).sort("updated_at", -1).to_list(200)
        return guides

    @router.get("/guides/{guide_id}")
    async def get_guide(guide_id: str, current_user: dict = Depends(get_current_user)):
        """Get a specific guide"""
        guide = await db.guide_documents.find_one({"id": guide_id}, {"_id": 0})
        if not guide:
            raise HTTPException(status_code=404, detail="Guide not found")
        
        await check_venue_access(current_user, guide["venue_id"])
        return guide

    @router.post("/guides")
    async def create_guide(data: dict, current_user: dict = Depends(get_current_user)):
        """Create a new guide"""
        venue_id = data.get("venue_id")
        if not venue_id:
            raise HTTPException(status_code=400, detail="venue_id required")
        
        await check_venue_access(current_user, venue_id)
        
        guide = GuideDocument(
            venue_id=venue_id,
            entity_type=EntityType(data.get("entity_type", "menu_item")),
            entity_id=data.get("entity_id"),
            guide_kind=data.get("guide_kind", "preparation"),
            title=data.get("title", ""),
            content=data.get("content", {}),
            created_by=current_user["id"]
        )
        
        await db.guide_documents.insert_one(guide.model_dump())
        return guide.model_dump()

    @router.put("/guides/{guide_id}")
    async def update_guide(guide_id: str, data: dict, current_user: dict = Depends(get_current_user)):
        guide = await db.guide_documents.find_one({"id": guide_id}, {"_id": 0})
        if not guide:
            raise HTTPException(status_code=404, detail="Guide not found")
        
        await check_venue_access(current_user, guide["venue_id"])
        
        data["updated_at"] = datetime.now(timezone.utc).isoformat()
        data["updated_by"] = current_user["id"]
        
        await db.guide_documents.update_one({"id": guide_id}, {"$set": data})
        return {"message": "Guide updated"}

    return router
