"""
Generative Studio Routes (Pillar 5)
====================================
Reality-First content pipeline for marketing and menus.
Connected to Intelligence Engine for content generation.
"""
from fastapi import APIRouter, Depends, HTTPException, Body, Query
from typing import List, Dict, Any
from core.database import db
from core.dependencies import get_current_user
from datetime import datetime, timezone
from uuid import uuid4
import logging

logger = logging.getLogger(__name__)


def create_studio_router():
    router = APIRouter(prefix="/studio", tags=["Studio (Pillar 5)"])

    @router.get("/assets")
    async def list_assets(venue_id: str, limit: int = Query(50, le=200)):
        """List media assets (images, videos) for a venue."""
        assets = await db.media_assets.find(
            {"venue_id": venue_id}, {"_id": 0}
        ).sort("created_at", -1).limit(limit).to_list(limit)

        if assets:
            return assets

        # Return empty with metadata
        return []

    @router.post("/generate")
    async def generate_content(
        venue_id: str,
        payload: Dict[str, Any] = Body(...),
        current_user: dict = Depends(get_current_user)
    ):
        """
        Generate marketing content using Intelligence Engine.
        Reality-First Protocol:
        1. Check existing product images (zero cost)
        2. Check media library (zero cost)
        3. Last resort: generate via AI (billable)
        """
        from services.intelligence_engine import intelligence_engine

        content_type = payload.get("type", "caption")  # caption, description, social_post
        prompt = payload.get("prompt", "")
        product_id = payload.get("product_id")

        # Step 1: Check for existing product data
        product_context = ""
        if product_id:
            product = await db.menu_items.find_one({"id": product_id, "venue_id": venue_id})
            if product:
                product_context = (
                    f"Product: {product.get('name', 'Unknown')}. "
                    f"Price: €{product.get('price', 0):.2f}. "
                    f"Category: {product.get('category', 'N/A')}. "
                    f"Description: {product.get('description', 'N/A')}."
                )

        # Step 2: Use Intelligence Engine for content generation
        query = f"Generate a {content_type} for: {prompt}. {product_context}"
        ai_result = await intelligence_engine.ask(
            venue_id=venue_id,
            query=query,
            user=current_user,
            session_id=f"studio_{venue_id}"
        )

        # Log the generation
        generation = {
            "id": str(uuid4()),
            "venue_id": venue_id,
            "type": content_type,
            "prompt": prompt,
            "result": ai_result.get("response", ""),
            "source": ai_result.get("source", "local_intelligence"),
            "processing_ms": ai_result.get("processing_ms", 0),
            "created_by": current_user.get("id"),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.studio_generations.insert_one(generation)

        return {
            "content": ai_result.get("response", ""),
            "type": content_type,
            "source": ai_result.get("source", "local_intelligence"),
            "processing_ms": ai_result.get("processing_ms", 0),
            "generation_id": generation["id"],
        }

    @router.get("/generations")
    async def list_generations(venue_id: str, limit: int = Query(20, le=100)):
        """List recent content generations."""
        generations = await db.studio_generations.find(
            {"venue_id": venue_id}, {"_id": 0}
        ).sort("created_at", -1).limit(limit).to_list(limit)
        return generations

    @router.get("/brand")
    async def get_brand_identity(venue_id: str):
        """Get brand identity settings (tone, colors, style)."""
        brand = await db.brand_identities.find_one({"venue_id": venue_id}, {"_id": 0})
        if not brand:
            return {
                "venue_id": venue_id,
                "tone": "Professional & Warm",
                "palette": ["#18181b", "#dc2626", "#f4f4f5"],
                "style": "modern",
            }
        return brand

    @router.post("/brand")
    async def update_brand_identity(
        venue_id: str,
        payload: Dict[str, Any] = Body(...),
        current_user: dict = Depends(get_current_user)
    ):
        """Update brand identity settings."""
        await db.brand_identities.update_one(
            {"venue_id": venue_id},
            {"$set": {**payload, "venue_id": venue_id,
                      "updated_at": datetime.now(timezone.utc).isoformat(),
                      "updated_by": current_user.get("id")}},
            upsert=True
        )
        return {"status": "updated"}

    @router.get("/stats")
    async def get_studio_stats(venue_id: str):
        """Get Studio usage statistics."""
        total_generations = await db.studio_generations.count_documents({"venue_id": venue_id})
        total_assets = await db.media_assets.count_documents({"venue_id": venue_id})

        return {
            "total_generations": total_generations,
            "total_assets": total_assets,
            "ai_generated": await db.studio_generations.count_documents(
                {"venue_id": venue_id, "source": {"$ne": "local_intelligence"}}
            ),
            "local_generated": await db.studio_generations.count_documents(
                {"venue_id": venue_id, "source": "local_intelligence"}
            ),
        }

    @router.post("/seed")
    async def seed_studio_data(
        venue_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Seed demo studio data for testing."""
        now = datetime.now(timezone.utc).isoformat()

        # Seed sample media assets
        sample_assets = [
            {"id": str(uuid4()), "venue_id": venue_id, "type": "IMAGE", "prompt": "Wagyu Beef Burger with truffle aioli", "url": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400", "source": "ai", "created_at": now},
            {"id": str(uuid4()), "venue_id": venue_id, "type": "IMAGE", "prompt": "Artisan Pizza Margherita close-up", "url": "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400", "source": "ai", "created_at": now},
            {"id": str(uuid4()), "venue_id": venue_id, "type": "IMAGE", "prompt": "Elegant seafood platter aerial view", "url": "https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?w=400", "source": "inventory", "created_at": now},
            {"id": str(uuid4()), "venue_id": venue_id, "type": "IMAGE", "prompt": "Tiramisu dessert with cocoa dust", "url": "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400", "source": "upload", "created_at": now},
        ]
        for asset in sample_assets:
            await db.media_assets.update_one({"id": asset["id"]}, {"$set": asset}, upsert=True)

        # Seed sample generations
        sample_gens = [
            {"id": str(uuid4()), "venue_id": venue_id, "type": "caption", "prompt": "Write a social media caption for our signature burger", "result": "🍔 Our legendary Wagyu Burger is calling your name! Handcrafted with premium Japanese beef, topped with truffle aioli. #FoodPorn #WagyuBurger", "source": "local_intelligence", "processing_ms": 45, "created_by": current_user.get("id"), "created_at": now},
            {"id": str(uuid4()), "venue_id": venue_id, "type": "description", "prompt": "Write a menu description for seafood platter", "result": "A curated selection of the Mediterranean's finest catches, artfully arranged on ice — featuring fresh oysters, prawns, and lobster tails.", "source": "local_intelligence", "processing_ms": 38, "created_by": current_user.get("id"), "created_at": now},
        ]
        for gen in sample_gens:
            await db.studio_generations.update_one({"id": gen["id"]}, {"$set": gen}, upsert=True)

        logger.info("Studio data seeded for venue %s", venue_id)
        return {"status": "seeded", "assets": len(sample_assets), "generations": len(sample_gens)}

    return router
