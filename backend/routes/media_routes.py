from fastapi import APIRouter, Depends, HTTPException, Body
from typing import List, Dict, Any
from core.database import db
from core.dependencies import get_current_user
from datetime import datetime
import uuid

# Mocking Google Service for now as we don't have the real creds in this context
# from services.google_service import google_ai 

router = APIRouter(prefix="/media", tags=["Studio (Pillar 5)"])

@router.get("/assets")
async def list_assets(venue_id: str):
    """List all media assets for a venue"""
    assets = await db.media_assets.find(
        {"venue_id": venue_id}
    ).sort("created_at", -1).to_list(100)
    return assets

@router.post("/generate")
async def generate_asset(
    venue_id: str,
    payload: Dict[str, Any] = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Generate an image using Imagen 3 (Mocked for Demo).
    Billable Event: 0.04 EUR / Gen.
    """
    prompt = payload.get("prompt")
    asset_type = payload.get("type", "IMAGE")
    
    # Simulating Generation Delay & Result
    # In prod: await google_ai.generate_image(prompt)
    
    # Mock result
    mock_id = str(uuid.uuid4())
    new_asset = {
        "id": mock_id,
        "venue_id": venue_id,
        "name": f"Generated: {prompt[:20]}...",
        "type": asset_type,
        "source": "GENERATIVE",
        "status": "Ready",
        "url": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=1000&auto=format&fit=crop", # Generic Food ID
        "created_at": datetime.now(),
        "created_by": current_user["id"],
        "cost": 0.04
    }
    
    await db.media_assets.insert_one(new_asset)
    
    # Log usage (Pillar 0)
    # await db.ai_usage_logs.insert_one({...})
    
    new_asset["_id"] = str(new_asset.get("_id")) # Serialize ObjectId
    return new_asset

@router.post("/upload")
async def upload_asset_metadata(
    venue_id: str,
    payload: Dict[str, Any] = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """Record metadata for a real uploaded asset"""
    new_asset = {
        "id": str(uuid.uuid4()),
        "venue_id": venue_id,
        "name": payload.get("name"),
        "type": payload.get("type", "IMAGE"),
        "source": "REALITY",
        "status": "Ready",
        "url": payload.get("url"),
        "created_at": datetime.now(),
        "created_by": current_user["id"],
        "cost": 0.00
    }
    
    await db.media_assets.insert_one(new_asset)
    new_asset["_id"] = str(new_asset.get("_id"))
    return new_asset
