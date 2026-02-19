"""
Web Architect Routes (Pillar 2)
================================
Digital Storefront synced with Inventory.
Live Menu — Price changes in POS reflect instantly on the website.
"""
from fastapi import APIRouter, Depends, HTTPException, Body, Query
from typing import Dict, Any
from core.database import db
from core.dependencies import get_current_user, check_venue_access
from datetime import datetime, timezone
from uuid import uuid4
import logging

logger = logging.getLogger(__name__)


def create_web_router():
    router = APIRouter(prefix="/web", tags=["Web Architect (Pillar 2)"])

    # ─── GET SITE CONFIG ───
    @router.get("/site/{venue_id}")
    async def get_site_config(
        venue_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        site = await db.web_sites.find_one({"venue_id": venue_id}, {"_id": 0})
        if not site:
            site = {
                "venue_id": venue_id,
                "status": "draft",
                "domain": "",
                "theme": "modern-dark",
                "sections": [],
                "seo": {"title": "", "description": "", "keywords": []},
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        return {"ok": True, "data": site}

    # ─── UPDATE SITE ───
    @router.put("/site/{venue_id}")
    async def update_site(
        venue_id: str,
        payload: Dict[str, Any] = Body(...),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        payload["updated_at"] = datetime.now(timezone.utc).isoformat()
        payload["updated_by"] = current_user.get("email", "system")

        await db.web_sites.update_one(
            {"venue_id": venue_id},
            {"$set": payload},
            upsert=True
        )
        return {"ok": True, "message": "Site updated"}

    # ─── PUBLISH SITE ───
    @router.post("/site/{venue_id}/publish")
    async def publish_site(
        venue_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        site = await db.web_sites.find_one({"venue_id": venue_id})
        if not site:
            raise HTTPException(404, "No site configured")

        await db.web_sites.update_one(
            {"venue_id": venue_id},
            {"$set": {
                "status": "published",
                "published_at": datetime.now(timezone.utc).isoformat(),
                "published_by": current_user.get("email", "system"),
            }}
        )
        logger.info(f"Site published for venue {venue_id}")
        return {"ok": True, "message": "Site published successfully"}

    # ─── LIST PAGES ───
    @router.get("/site/{venue_id}/pages")
    async def list_pages(venue_id: str, current_user: dict = Depends(get_current_user)):
        await check_venue_access(current_user, venue_id)
        pages = await db.web_pages.find(
            {"venue_id": venue_id}, {"_id": 0}
        ).sort("order", 1).to_list(50)
        return {"ok": True, "data": pages}

    # ─── ADD PAGE ───
    @router.post("/site/{venue_id}/pages")
    async def add_page(
        venue_id: str,
        payload: Dict[str, Any] = Body(...),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        page = {
            "id": str(uuid4()),
            "venue_id": venue_id,
            "title": payload.get("title", "New Page"),
            "slug": payload.get("slug", "new-page"),
            "type": payload.get("type", "custom"),
            "content": payload.get("content", []),
            "order": payload.get("order", 99),
            "visible": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.web_pages.insert_one(page)
        page.pop("_id", None)
        return {"ok": True, "data": page}

    # ─── LIVE MENU (Synced with Inventory) ───
    @router.get("/site/{venue_id}/live-menu")
    async def get_live_menu(venue_id: str):
        """Public endpoint — returns active menu items synced from POS/Inventory"""
        categories = await db.menu_categories.find(
            {"venue_id": venue_id, "active": True}, {"_id": 0}
        ).sort("sort_order", 1).to_list(100)

        items = await db.menu_items.find(
            {"venue_id": venue_id, "active": True}, {"_id": 0}
        ).sort("category", 1).to_list(500)

        return {
            "ok": True,
            "data": {
                "categories": categories,
                "items": items,
                "last_synced": datetime.now(timezone.utc).isoformat(),
            }
        }

    # ─── SEED DEMO ───
    @router.post("/site/seed/{venue_id}")
    async def seed_web_data(
        venue_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)

        site = {
            "venue_id": venue_id,
            "status": "published",
            "domain": "demo.restin.ai",
            "theme": "modern-dark",
            "sections": [
                {"type": "hero", "title": "Welcome to Our Restaurant", "subtitle": "Fine Dining, Unforgettable Experience", "image": "/hero.webp"},
                {"type": "menu", "title": "Our Menu", "source": "live", "linked_category": "all"},
                {"type": "about", "title": "Our Story", "content": "A family-owned restaurant serving authentic Mediterranean cuisine since 2010."},
                {"type": "gallery", "title": "Gallery", "images": []},
                {"type": "contact", "title": "Find Us", "address": "123 Republic Street, Valletta", "phone": "+356 2123 4567"},
                {"type": "reservations", "title": "Book a Table", "provider": "restin"},
            ],
            "seo": {
                "title": "Restaurant | Fine Dining in Valletta",
                "description": "Experience authentic Mediterranean cuisine in the heart of Valletta.",
                "keywords": ["restaurant", "valletta", "fine dining", "mediterranean"],
            },
            "published_at": datetime.now(timezone.utc).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        pages = [
            {"id": str(uuid4()), "venue_id": venue_id, "title": "Home", "slug": "/", "type": "home", "order": 0, "visible": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid4()), "venue_id": venue_id, "title": "Menu", "slug": "/menu", "type": "menu", "order": 1, "visible": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid4()), "venue_id": venue_id, "title": "About", "slug": "/about", "type": "about", "order": 2, "visible": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid4()), "venue_id": venue_id, "title": "Contact", "slug": "/contact", "type": "contact", "order": 3, "visible": True, "created_at": datetime.now(timezone.utc).isoformat()},
        ]

        await db.web_sites.delete_many({"venue_id": venue_id})
        await db.web_pages.delete_many({"venue_id": venue_id})
        await db.web_sites.insert_one(site)
        await db.web_pages.insert_many(pages)

        logger.info(f"Seeded web site data for {venue_id}")
        return {"ok": True, "seeded_pages": len(pages)}

    return router
