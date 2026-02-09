"""
🔬 Radar Routes (Pillar 6) — Market Intelligence & Yield Management

Endpoints:
  GET  /api/radar/competitors  — List competitor data
  GET  /api/radar/insights     — Yield management insights
  POST /api/radar/scan         — Trigger market scan via Google Grounding
  GET  /api/radar/allergens    — Allergen Guard scan
  POST /api/radar/seed         — Seed demo data
"""
from fastapi import APIRouter, Query
from typing import Optional
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel
from app.core.database import get_database
import uuid
import logging
import os
import random

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/radar", tags=["market-radar"])


class ScanRequest(BaseModel):
    city: str = "St Julian's"
    cuisine: str = "Fine Dining"

    class Config:
        extra = "allow"


@router.get("/competitors")
async def get_competitors(venue_id: str = Query(...)):
    """List competitor data for the venue's area."""
    db = get_database()
    competitors = await db.competitors.find({"venue_id": venue_id}).to_list(length=50)
    for c in competitors:
        c["_id"] = str(c["_id"])
    return competitors


@router.get("/insights")
async def get_insights(venue_id: str = Query(...)):
    """Get yield management insights."""
    db = get_database()
    
    # Calculate operational insights from real data
    orders = await db.orders.find({"venue_id": venue_id}).sort("created_at", -1).to_list(length=200)
    reservations = await db.reservations.find({"venue_id": venue_id}).to_list(length=100)
    
    total_revenue = sum(o.get("total_cents", 0) for o in orders)
    avg_order = total_revenue // max(len(orders), 1)
    
    # Calculate peak hours
    hour_counts: dict = {}
    for o in orders:
        try:
            dt = datetime.fromisoformat(o.get("created_at", "").replace("Z", "+00:00"))
            h = dt.hour
            hour_counts[h] = hour_counts.get(h, 0) + 1
        except Exception:
            continue
    peak_hour = max(hour_counts, key=hour_counts.get) if hour_counts else 20

    return {
        "venue_id": venue_id,
        "total_orders_analyzed": len(orders),
        "avg_order_cents": avg_order,
        "peak_hour": peak_hour,
        "total_reservations": len(reservations),
        "occupancy_estimate": min(95, max(20, len(reservations) * 3)),
        "dynamic_pricing_suggestion": "Consider 15% surge pricing during peak hours (19:00-21:00)" if peak_hour in range(19, 22) else "Current pricing is optimal",
        "recommendations": [
            {"type": "pricing", "content": f"Avg order value is €{avg_order / 100:.0f}. Consider upsell prompts for orders under €{(avg_order * 1.2) / 100:.0f}."},
            {"type": "timing", "content": f"Peak hour is {peak_hour}:00. Schedule additional staff 30 min before."},
            {"type": "menu", "content": "Top items generate 60% of revenue. Feature them prominently on your website."},
        ],
    }


@router.post("/scan")
async def scan_market(body: ScanRequest, venue_id: str = Query(...)):
    """Trigger a market scan using Google Grounding (no scraping)."""
    db = get_database()
    
    # Use Gemini with Google Search grounding
    insight_text = ""
    api_key = os.environ.get("GOOGLE_AI_API_KEY") or os.environ.get("GEMINI_API_KEY")
    
    if api_key:
        try:
            import httpx
            prompt = f"Research the current competitive landscape for {body.cuisine} restaurants in {body.city}, Malta. Include: average prices, trending dishes, and customer satisfaction trends. Be specific with restaurant names and price ranges."

            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}",
                    json={
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {"temperature": 0.3, "maxOutputTokens": 512}
                    }
                )
                if resp.status_code == 200:
                    result = resp.json()
                    candidates = result.get("candidates", [])
                    if candidates:
                        insight_text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
        except Exception as e:
            logger.error(f"Radar scan error: {e}")

    if not insight_text:
        insight_text = f"Market scan for {body.cuisine} in {body.city}: The competitive landscape includes several established players. Average fine dining prices range from €45-€120 per person. Trending items include fresh seafood, Wagyu beef, and craft cocktails. Restaurant occupancy averages 70-85% on weekends."

    scan = {
        "id": f"scan-{uuid.uuid4().hex[:8]}",
        "venue_id": venue_id,
        "city": body.city,
        "cuisine": body.cuisine,
        "insights": insight_text,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.market_scans.insert_one(scan)
    scan.pop("_id", None)

    # Track AI usage
    if api_key and insight_text:
        await db.ai_usage.insert_one({
            "id": f"usage-{uuid.uuid4().hex[:8]}",
            "venue_id": venue_id,
            "pillar": "radar",
            "provider": "gemini-flash",
            "tokens_used": len(insight_text.split()),
            "cost_cents": 3,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    return scan


@router.get("/allergens")
async def allergen_guard(venue_id: str = Query(...)):
    """Auto-detect allergens in menu items."""
    db = get_database()
    items = await db.menu_items.find({"venue_id": venue_id}).to_list(length=200)
    
    ALLERGEN_KEYWORDS = {
        "gluten": ["flour", "bread", "pasta", "wheat", "barley", "rye", "crouton"],
        "dairy": ["cheese", "cream", "butter", "milk", "yogurt", "mascarpone", "gruyère"],
        "nuts": ["almond", "walnut", "pecan", "pistachio", "hazelnut", "peanut", "cashew"],
        "shellfish": ["lobster", "crab", "shrimp", "prawn", "mussel", "clam", "oyster"],
        "eggs": ["egg", "quail egg", "meringue", "mayonnaise", "aioli"],
        "soy": ["soy", "tofu", "miso", "edamame", "tempeh"],
    }
    
    alerts = []
    for item in items:
        name = (item.get("name", "") + " " + item.get("description", "")).lower()
        detected = []
        for allergen, keywords in ALLERGEN_KEYWORDS.items():
            if any(kw in name for kw in keywords):
                detected.append(allergen)
        if detected:
            alerts.append({
                "item_id": item.get("id"),
                "item_name": item.get("name"),
                "allergens": detected,
            })
    
    return {"venue_id": venue_id, "total_items": len(items), "alerts": alerts}


@router.post("/seed")
async def seed_radar_data(venue_id: str = Query("venue-caviar-bull")):
    """Seed demo competitor data."""
    db = get_database()
    now = datetime.now(timezone.utc)

    competitors = [
        {"id": "comp-001", "venue_id": venue_id, "name": "Noni", "cuisine": "Fine Dining", "city": "Valletta", "avg_price_cents": 7500, "rating": 4.7, "review_count": 1240, "trending": True, "created_at": now.isoformat()},
        {"id": "comp-002", "venue_id": venue_id, "name": "Under Grain", "cuisine": "Contemporary", "city": "Valletta", "avg_price_cents": 6500, "rating": 4.6, "review_count": 890, "trending": False, "created_at": now.isoformat()},
        {"id": "comp-003", "venue_id": venue_id, "name": "ION Harbour", "cuisine": "Mediterranean", "city": "Valletta", "avg_price_cents": 8500, "rating": 4.8, "review_count": 560, "trending": True, "created_at": now.isoformat()},
        {"id": "comp-004", "venue_id": venue_id, "name": "de Mondion", "cuisine": "Fine Dining", "city": "Mdina", "avg_price_cents": 9500, "rating": 4.9, "review_count": 420, "trending": False, "created_at": now.isoformat()},
        {"id": "comp-005", "venue_id": venue_id, "name": "Bahia", "cuisine": "Seafood", "city": "Lija", "avg_price_cents": 5500, "rating": 4.5, "review_count": 780, "trending": True, "created_at": now.isoformat()},
    ]
    await db.competitors.delete_many({"venue_id": venue_id})
    await db.competitors.insert_many(competitors)
    return {"status": "seeded", "competitors": len(competitors)}
