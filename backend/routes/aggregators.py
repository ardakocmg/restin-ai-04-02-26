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

def create_aggregator_router():
    return router
