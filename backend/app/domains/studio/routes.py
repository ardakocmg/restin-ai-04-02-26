"""
🎨 Studio Routes (Pillar 5) — Generative Content Engine

Endpoints:
  GET  /api/media/assets      — List media assets
  POST /api/media/generate    — Generate content via AI (Imagen/Gemini)
  POST /api/media/upload      — Upload asset metadata
  DELETE /api/media/{id}      — Delete asset
  POST /api/media/seed        — Seed demo data
"""
from fastapi import APIRouter, Query, UploadFile, File
from typing import Optional
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel
from app.core.database import get_database
import uuid
import logging
import os
import random

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/media", tags=["studio"])


class GenerateRequest(BaseModel):
    prompt: str
    type: str = "IMAGE"  # IMAGE | VIDEO | COPY

    class Config:
        extra = "allow"


@router.get("/assets")
async def list_assets(venue_id: str = Query(...)):
    """List all media assets for a venue."""
    db = get_database()
    assets = await db.media_assets.find({"venue_id": venue_id}).sort("created_at", -1).to_list(length=100)
    for a in assets:
        a["_id"] = str(a["_id"])
    return assets


@router.post("/generate")
async def generate_asset(body: GenerateRequest, venue_id: str = Query(...)):
    """
    Generate content via AI — 'Reality-First Protocol':
    1. Check InventoryProduct.image (Zero Cost)
    2. Check MediaAsset Library (Zero Cost)
    3. Last Resort: Call AI to generate (Billable Event)
    """
    db = get_database()
    prompt = body.prompt
    gen_type = body.type

    # Step 1: Check if existing asset matches
    existing = await db.media_assets.find_one({
        "venue_id": venue_id,
        "tags": {"$regex": prompt.split()[0] if prompt.split() else "", "$options": "i"}
    })
    if existing:
        existing["_id"] = str(existing["_id"])
        existing["source"] = "library"
        existing["cost_cents"] = 0
        return existing

    # Step 2: Check inventory images
    inventory = await db.inventory_items.find_one({
        "venue_id": venue_id,
        "name": {"$regex": prompt.split()[0] if prompt.split() else "", "$options": "i"},
        "image_url": {"$exists": True, "$ne": None}
    })
    if inventory:
        asset = {
            "id": f"asset-{uuid.uuid4().hex[:8]}",
            "venue_id": venue_id,
            "type": "IMAGE",
            "url": inventory.get("image_url"),
            "prompt": prompt,
            "source": "inventory",
            "cost_cents": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.media_assets.insert_one(asset)
        asset.pop("_id", None)
        return asset

    # Step 3: Generate via AI (Billable)
    generated_url = None
    cost_cents = 0
    provider = "placeholder"

    api_key = os.environ.get("GOOGLE_AI_API_KEY") or os.environ.get("GEMINI_API_KEY")
    if api_key and gen_type in ("IMAGE", "COPY"):
        try:
            import httpx
            if gen_type == "COPY":
                # Text generation via Gemini
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.post(
                        f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}",
                        json={
                            "contents": [{"parts": [{"text": f"Write marketing copy for a restaurant: {prompt}. Keep it under 200 words, professional, enticing."}]}],
                            "generationConfig": {"temperature": 0.8, "maxOutputTokens": 256}
                        }
                    )
                    if resp.status_code == 200:
                        result = resp.json()
                        candidates = result.get("candidates", [])
                        if candidates:
                            generated_url = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                            cost_cents = 2
                            provider = "gemini-flash"
            # IMAGE generation would use Imagen 3 API (separate endpoint)
        except Exception as e:
            logger.error(f"Studio AI generation error: {e}")

    if not generated_url:
        generated_url = f"https://placehold.co/1200x800/1a1a2e/e0e0e0?text={prompt.replace(' ', '+')[:30]}"
        provider = "placeholder"

    asset = {
        "id": f"asset-{uuid.uuid4().hex[:8]}",
        "venue_id": venue_id,
        "type": gen_type,
        "url": generated_url,
        "prompt": prompt,
        "source": provider,
        "cost_cents": cost_cents,
        "tags": prompt.lower().split()[:5],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.media_assets.insert_one(asset)
    asset.pop("_id", None)

    # Track billing
    if cost_cents > 0:
        await db.ai_usage.insert_one({
            "id": f"usage-{uuid.uuid4().hex[:8]}",
            "venue_id": venue_id,
            "pillar": "studio",
            "provider": provider,
            "tokens_used": len(prompt.split()) * 2,
            "cost_cents": cost_cents,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    return asset


@router.post("/upload")
async def upload_asset(venue_id: str = Query(...), file: UploadFile = File(None)):
    """Upload a media asset."""
    db = get_database()
    content = await file.read() if file else b""
    
    asset = {
        "id": f"asset-{uuid.uuid4().hex[:8]}",
        "venue_id": venue_id,
        "type": "IMAGE",
        "filename": file.filename if file else "unknown",
        "content_type": file.content_type if file else "application/octet-stream",
        "size_bytes": len(content),
        "source": "upload",
        "cost_cents": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.media_assets.insert_one(asset)
    asset.pop("_id", None)
    return asset


@router.delete("/{asset_id}")
async def delete_asset(asset_id: str):
    """Delete a media asset."""
    db = get_database()
    await db.media_assets.delete_one({"id": asset_id})
    return {"status": "deleted", "id": asset_id}


@router.post("/seed")
async def seed_studio_data(venue_id: str = Query("venue-caviar-bull")):
    """Seed demo media assets."""
    db = get_database()
    now = datetime.now(timezone.utc)

    assets = [
        {"id": "asset-hero-1", "venue_id": venue_id, "type": "IMAGE", "url": "https://placehold.co/1920x1080/1a1a2e/gold?text=Hero+Shot", "prompt": "Restaurant hero banner", "source": "upload", "cost_cents": 0, "tags": ["hero", "banner"], "created_at": (now - timedelta(days=10)).isoformat()},
        {"id": "asset-menu-1", "venue_id": venue_id, "type": "IMAGE", "url": "https://placehold.co/800x600/1a1a2e/gold?text=Wagyu+Steak", "prompt": "Wagyu ribeye presentation", "source": "upload", "cost_cents": 0, "tags": ["food", "wagyu", "steak"], "created_at": (now - timedelta(days=8)).isoformat()},
        {"id": "asset-ai-1", "venue_id": venue_id, "type": "IMAGE", "url": "https://placehold.co/800x600/1a1a2e/gold?text=AI+Generated", "prompt": "Elegant seafood platter on marble", "source": "gemini", "cost_cents": 5, "tags": ["food", "seafood", "ai"], "created_at": (now - timedelta(days=2)).isoformat()},
        {"id": "asset-copy-1", "venue_id": venue_id, "type": "COPY", "url": "Experience culinary artistry at its finest. Our award-winning chefs craft each dish with passion and the freshest Mediterranean ingredients.", "prompt": "Restaurant marketing copy", "source": "gemini-flash", "cost_cents": 2, "tags": ["copy", "marketing"], "created_at": (now - timedelta(days=1)).isoformat()},
    ]
    await db.media_assets.delete_many({"venue_id": venue_id})
    await db.media_assets.insert_many(assets)
    return {"status": "seeded", "assets": len(assets)}
