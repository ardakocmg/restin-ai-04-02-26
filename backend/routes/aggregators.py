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
    Mocked for demo purposes.
    """
    return [
        {"name": "UberEats", "status": "Online", "orders": 12, "revenue": "€240.50", "color": "bg-green-500"},
        {"name": "Wolt", "status": "Online", "orders": 8, "revenue": "€160.00", "color": "bg-blue-500"},
        {"name": "Bolt Food", "status": "Busy", "orders": 15, "revenue": "€310.20", "color": "bg-amber-500"},
        {"name": "Glovo", "status": "Offline", "orders": 0, "revenue": "€0.00", "color": "bg-zinc-500"},
    ]

def create_aggregator_router():
    return router
