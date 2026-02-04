"""Visual Content Editor Routes"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from datetime import datetime, timezone

from core.database import db
from core.dependencies import get_current_user, check_venue_access


def create_content_editor_router():
    router = APIRouter(tags=["content_editor"])
    
    @router.post("/venues/{venue_id}/content-editor/save")
    async def save_visual_content(
        venue_id: str,
        content_data: dict,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        content_record = {
            "id": content_data.get("id", f"content_{datetime.now(timezone.utc).timestamp()}"),
            "venue_id": venue_id,
            "content_type": content_data.get("content_type", "page"),
            "title": content_data["title"],
            "markdown_content": content_data.get("markdown_content", ""),
            "html_content": content_data.get("html_content", ""),
            "metadata": content_data.get("metadata", {}),
            "created_by": current_user["id"],
            "updated_by": current_user["id"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Upsert
        await db.VisualContent.update_one(
            {"id": content_record["id"]},
            {"$set": content_record},
            upsert=True
        )
        
        return content_record
    
    @router.get("/venues/{venue_id}/content-editor/{content_id}")
    async def get_visual_content(
        venue_id: str,
        content_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        content = await db.VisualContent.find_one(
            {"id": content_id, "venue_id": venue_id},
            {"_id": 0}
        )
        
        if not content:
            raise HTTPException(404, "Content not found")
        
        return content
    
    @router.get("/venues/{venue_id}/content-editor")
    async def list_visual_content(
        venue_id: str,
        content_type: Optional[str] = None,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        query = {"venue_id": venue_id}
        if content_type:
            query["content_type"] = content_type
        
        content_list = await db.VisualContent.find(query, {"_id": 0}).sort("updated_at", -1).to_list(1000)
        return content_list
    
    return router
