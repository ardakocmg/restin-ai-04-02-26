"""
Market Radar Routes (Pillar 6)
==============================
Competitive intelligence, yield management, and market scanning.
Connected to Intelligence Engine for AI-powered analysis.
"""
from fastapi import APIRouter, Depends, HTTPException, Body
from typing import List, Dict, Any
from core.database import db
from core.dependencies import get_current_user
from datetime import datetime, timezone, timedelta
from uuid import uuid4
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/radar", tags=["Market Radar (Pillar 6)"])


@router.get("/competitors")
async def list_competitors(venue_id: str):
    """
    List monitored competitors with their current status.
    Uses real data from MongoDB, falls back to demo data if empty.
    """
    competitors = await db.competitors.find(
        {"venue_id": venue_id}, {"_id": 0}
    ).sort("last_updated", -1).to_list(50)

    if competitors:
        return competitors

    # Seed-quality fallback when no real data
    return [
        {"name": "Trattoria Zero", "price": "€14.50", "trend": "up", "confidence": "98%",
         "items_scanned": 32, "last_updated": "Demo"},
        {"name": "The Artisan", "price": "€12.00", "trend": "down", "confidence": "94%",
         "items_scanned": 14, "last_updated": "Demo"},
        {"name": "Harbor Grill", "price": "€18.00", "trend": "stable", "confidence": "96%",
         "items_scanned": 28, "last_updated": "Demo"},
    ]


@router.get("/insights")
async def get_insights(venue_id: str):
    """
    Get yield management insights based on real venue data.
    Uses Intelligence Engine to analyze sales trends.
    """
    from services.intelligence_engine import intelligence_engine

    # Get real sales data for analysis
    try:
        today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        week_ago = today - timedelta(days=7)

        # This week's revenue
        pipeline = [
            {"$match": {
                "venue_id": venue_id,
                "created_at": {"$gte": week_ago.isoformat()},
                "status": {"$nin": ["cancelled", "voided"]}
            }},
            {"$group": {"_id": None, "total": {"$sum": "$total"}, "count": {"$sum": 1}}}
        ]
        this_week = await db.orders.aggregate(pipeline).to_list(1)
        this_week_rev = this_week[0]["total"] if this_week else 0
        this_week_orders = this_week[0]["count"] if this_week else 0

        # Previous week
        two_weeks_ago = week_ago - timedelta(days=7)
        pipeline[0]["$match"]["created_at"] = {"$gte": two_weeks_ago.isoformat(), "$lt": week_ago.isoformat()}
        last_week = await db.orders.aggregate(pipeline).to_list(1)
        last_week_rev = last_week[0]["total"] if last_week else 0

        # Calculate demand change
        if last_week_rev > 0:
            demand_change = round(((this_week_rev - last_week_rev) / last_week_rev) * 100, 1)
        else:
            demand_change = 0

        trend = "up" if demand_change > 0 else "down" if demand_change < 0 else "stable"
        yield_estimate = round(this_week_rev * abs(demand_change) / 100, 2) if demand_change > 0 else 0

        return {
            "summary": f"{'Demand surging' if demand_change > 5 else 'Market stable'} ({demand_change:+.1f}% WoW). "
                       f"{'Consider temporary premium pricing.' if demand_change > 10 else 'Monitor trends.'} "
                       f"{this_week_orders} orders this week.",
            "metrics": [
                {"label": "Demand Change", "value": f"{demand_change:+.1f}%", "trend": trend},
                {"label": "Weekly Orders", "value": str(this_week_orders), "trend": "info"},
                {"label": "Yield Opportunity", "value": f"€{yield_estimate:,.0f}", "trend": trend},
            ],
            "events": [],  # Future: integrate with event APIs
            "data_source": "live_mongodb",
        }

    except Exception as e:
        logger.error("Radar insights error: %s", e)
        return {
            "summary": "Unable to calculate insights. Check data availability.",
            "metrics": [],
            "events": [],
            "data_source": "error",
        }


@router.post("/scan")
async def scan_market(
    venue_id: str,
    payload: Dict[str, Any] = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Trigger a market scan using Intelligence Engine.
    Uses local AI to analyze venue's competitive position.
    """
    from services.intelligence_engine import intelligence_engine

    city = payload.get("city", "Valletta")
    cuisine = payload.get("cuisine", "Mediterranean")

    # Use intelligence engine to analyze market position
    query = f"Compare our menu prices and sales against {cuisine} restaurants in {city}"
    ai_result = await intelligence_engine.ask(
        venue_id=venue_id,
        query=query,
        user=current_user,
        session_id=f"radar_{venue_id}"
    )

    # Log the scan
    scan_record = {
        "id": str(uuid4()),
        "venue_id": venue_id,
        "city": city,
        "cuisine": cuisine,
        "ai_analysis": ai_result.get("response", ""),
        "intent": ai_result.get("intent"),
        "scanned_by": current_user.get("id"),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.market_scans.insert_one(scan_record)

    return {
        "status": "completed",
        "analysis": ai_result.get("response", ""),
        "intent": ai_result.get("intent"),
        "processing_ms": ai_result.get("processing_ms", 0),
        "source": ai_result.get("source", "local_intelligence"),
    }


@router.get("/scans")
async def list_scans(venue_id: str, limit: int = 20):
    """List recent market scan results."""
    scans = await db.market_scans.find(
        {"venue_id": venue_id}, {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    return scans
