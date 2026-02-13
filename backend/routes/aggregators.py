"""Delivery Aggregator Webhooks (UberEats, Wolt, Bolt)"""
from fastapi import APIRouter, Request, HTTPException
from typing import Dict, Any

router = APIRouter(tags=["aggregators"])

@router.post("/webhooks/ubereats")
async def uber_webhook(payload: Dict[str, Any]):
    print(f"[UberEats] Webhook received: {payload.get('event_type')}")
    # Integration logic would go here (Order Injection)
    return {"status": "success", "provider": "UBER"}

@router.post("/webhooks/wolt")
async def wolt_webhook(payload: Dict[str, Any]):
    print(f"[Wolt] Webhook received: {payload.get('type')}")
    return {"status": "success", "provider": "WOLT"}

@router.post("/webhooks/bolt")
async def bolt_webhook(payload: Dict[str, Any]):
    print(f"[Bolt] Webhook received")
    return {"status": "success", "provider": "BOLT"}

@router.get("/status")
async def get_aggregator_status(venue_id: str):
    """
    Get connection status for delivery platforms.
    Returns data in the format expected by OpsDashboard.tsx
    """
    return [
        {"platform": "uber_eats", "status": "online", "orders_today": 12, "revenue_today_cents": 24050, "commission_pct": 25.0},
        {"platform": "wolt", "status": "online", "orders_today": 8, "revenue_today_cents": 16000, "commission_pct": 22.0},
        {"platform": "bolt_food", "status": "paused", "orders_today": 15, "revenue_today_cents": 31020, "commission_pct": 20.0},
    ]

def create_aggregator_router():
    return router
