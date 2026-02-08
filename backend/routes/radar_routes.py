from fastapi import APIRouter, Depends, HTTPException, Body
from typing import List, Dict, Any
from core.database import db
from core.dependencies import get_current_user
from datetime import datetime, timedelta
import random

router = APIRouter(prefix="/radar", tags=["Market Radar (Pillar 6)"])

@router.get("/competitors")
async def list_competitors(venue_id: str):
    """
    List monitored competitors with their current status.
    Uses cached data from MongoDB.
    """
    # Real logic: return await db.competitors.find({"venue_id": venue_id}).to_list(100)
    
    # Mock data for Demo purposes (since we don't have scraped data yet)
    return [
        {"name": "Trattoria Zero", "price": "€14.50", "trend": "up", "confidence": "98%", "items_scanned": 32, "last_updated": "2m ago"},
        {"name": "The Artisan", "price": "€12.00", "trend": "down", "confidence": "94%", "items_scanned": 14, "last_updated": "1h ago"},
        {"name": "Harbor Grill", "price": "€18.00", "trend": "stable", "confidence": "96%", "items_scanned": 28, "last_updated": "10m ago"},
    ]

@router.get("/insights")
async def get_insights(venue_id: str):
    """
    Get Yield Management Suggestions based on local events and demand.
    """
    return {
        "summary": "Demand is surging in Valletta (+24%). We recommend a temporary 8% premium on main courses.",
        "metrics": [
            {"label": "Demand Surge", "value": "+24%", "trend": "up"},
            {"label": "Market Volatility", "value": "High", "trend": "alert"},
            {"label": "Predicted Yield", "value": "+€842", "trend": "up"}
        ],
        "events": [
            {"name": "Valletta Wine Festival", "distance": "200m away", "type": "surge"},
            {"name": "MSC World Europa", "details": "2k guests", "type": "cruise"}
        ]
    }

@router.post("/scan")
async def scan_market(
    venue_id: str,
    payload: Dict[str, Any] = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Trigger a Google Grounding Scan for competitors.
    """
    city = payload.get("city", "Valletta")
    cuisine = payload.get("cuisine", "Mediterranean")
    
    # Simulate AI processing time
    # In prod: await google_grounding.search(city, cuisine)
    
    return {
        "status": "scanning",
        "message": f"Deep scan initiated for {cuisine} in {city}. Results will trigger a webhook.",
        "estimated_time": "45s"
    }
