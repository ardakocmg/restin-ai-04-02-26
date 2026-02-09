"""
🏛️ Web Builder Routes (Pillar 2) — Digital Storefront

Endpoints:
  GET  /api/web/site          — Get site configuration
  POST /api/web/site          — Save site configuration
  POST /api/web/publish       — Publish site (sync menu)
  GET  /api/web/seo           — Get/generate SEO meta tags
  POST /api/web/seed          — Seed demo data
"""
from fastapi import APIRouter, Query
from typing import Optional
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel
from app.core.database import get_database
import uuid
import logging
import os

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/web", tags=["web-builder"])


class SiteConfigUpdate(BaseModel):
    site_name: Optional[str] = None
    tagline: Optional[str] = None
    hero_image: Optional[str] = None
    theme: Optional[str] = "dark"
    sections: Optional[list] = None
    custom_domain: Optional[str] = None
    published: Optional[bool] = False

    class Config:
        extra = "allow"


@router.get("/site")
async def get_site_config(venue_id: str = Query(...)):
    """Get site configuration for venue."""
    db = get_database()
    config = await db.web_sites.find_one({"venue_id": venue_id})
    if config:
        config["_id"] = str(config["_id"])
        return config
    return {
        "venue_id": venue_id,
        "site_name": "My Restaurant",
        "tagline": "Fine Dining Experience",
        "theme": "dark",
        "sections": ["hero", "menu", "about", "reservations", "contact"],
        "published": False,
        "seo": {},
    }


@router.post("/site")
async def update_site_config(config: SiteConfigUpdate, venue_id: str = Query(...)):
    """Save site configuration."""
    db = get_database()
    data = config.dict(exclude_none=True)
    data["venue_id"] = venue_id
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.web_sites.update_one({"venue_id": venue_id}, {"$set": data}, upsert=True)
    return {"status": "saved", "venue_id": venue_id}


@router.post("/publish")
async def publish_site(venue_id: str = Query(...)):
    """Publish site — sync menu items from POS to web."""
    db = get_database()
    
    # Get menu items from inventory
    menu_items = await db.menu_items.find({"venue_id": venue_id}).to_list(length=200)
    categories = await db.menu_categories.find({"venue_id": venue_id}).to_list(length=50)
    
    # Generate SEO meta tags using menu data
    item_names = [i.get("name", "") for i in menu_items[:10]]
    seo = {
        "title": f"Restaurant Menu | Fine Dining",
        "description": f"Explore our menu featuring {', '.join(item_names[:5])}. Book your table now.",
        "keywords": item_names,
        "og_image": None,
    }

    # Try Gemini for SEO
    api_key = os.environ.get("GOOGLE_AI_API_KEY") or os.environ.get("GEMINI_API_KEY")
    if api_key and item_names:
        try:
            import httpx
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}",
                    json={
                        "contents": [{"parts": [{"text": f"Write a 150-char SEO meta description for a premium restaurant menu featuring: {', '.join(item_names[:8])}. Make it enticing and include a call to action."}]}],
                        "generationConfig": {"temperature": 0.7, "maxOutputTokens": 60}
                    }
                )
                if resp.status_code == 200:
                    result = resp.json()
                    candidates = result.get("candidates", [])
                    if candidates:
                        seo["description"] = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", seo["description"])
        except Exception as e:
            logger.error(f"SEO generation error: {e}")

    await db.web_sites.update_one(
        {"venue_id": venue_id},
        {"$set": {"published": True, "seo": seo, "published_at": datetime.now(timezone.utc).isoformat(),
                  "menu_item_count": len(menu_items), "category_count": len(categories)}},
        upsert=True
    )

    return {
        "status": "published",
        "menu_items": len(menu_items),
        "categories": len(categories),
        "seo": seo,
    }


@router.get("/seo")
async def get_seo(venue_id: str = Query(...)):
    """Get SEO metadata."""
    db = get_database()
    site = await db.web_sites.find_one({"venue_id": venue_id})
    return site.get("seo", {}) if site else {}


@router.post("/seed")
async def seed_web_data(venue_id: str = Query("venue-caviar-bull")):
    """Seed demo web builder data."""
    db = get_database()
    now = datetime.now(timezone.utc)
    
    await db.web_sites.update_one(
        {"venue_id": venue_id},
        {"$set": {
            "venue_id": venue_id,
            "site_name": "Caviar & Bull",
            "tagline": "Where Luxury Meets Culinary Art",
            "theme": "dark",
            "hero_image": "/images/hero-caviar.jpg",
            "sections": ["hero", "menu", "chef", "gallery", "reservations", "contact"],
            "published": True,
            "custom_domain": "caviarbull.restin.ai",
            "seo": {
                "title": "Caviar & Bull | Premium Fine Dining in Malta",
                "description": "Experience Malta's finest culinary journey. Wagyu, fresh seafood, and handcrafted cocktails at Spinola Bay.",
                "keywords": ["fine dining", "malta restaurant", "caviar", "wagyu", "seafood"],
                "og_image": "/images/og-caviar.jpg",
            },
            "published_at": now.isoformat(),
            "updated_at": now.isoformat(),
        }},
        upsert=True,
    )
    return {"status": "seeded", "venue_id": venue_id}
