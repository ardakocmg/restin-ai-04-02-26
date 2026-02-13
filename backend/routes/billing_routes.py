"""
Billing Routes (Pillar 0: The Commercial Engine)
Handles subscription plans, module toggling, and usage-based billing.
Now connected to MongoDB for persistence.
"""
from fastapi import APIRouter, Depends, Query
from typing import Dict, Any, Optional
from core.dependencies import get_current_user, get_database
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/billing", tags=["Billing"])

MODULE_PRICES = {
    "hasVoice": {"name": "Voice AI", "price": 50.00},
    "hasRadar": {"name": "Market Radar", "price": 30.00},
    "hasStudio": {"name": "Content Studio", "price": 20.00},
    "hasCRM": {"name": "Autopilot CRM", "price": 40.00},
    "hasFintech": {"name": "Omni-Payment", "price": 25.00},
}

DEFAULT_BILLING = {
    "plan": {"name": "Pro", "price": 149.00},
    "module_keys": {"hasVoice": True, "hasRadar": True, "hasStudio": False, "hasCRM": False, "hasFintech": False},
    "ai_tokens_used": 12450,
    "storage_mb": 2340,
}


async def _get_billing(db, venue_id: str) -> Dict[str, Any]:
    """Get or initialize billing state from MongoDB."""
    doc = await db.billing.find_one({"venue_id": venue_id})
    if not doc:
        doc = {
            "venue_id": venue_id,
            **DEFAULT_BILLING,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.billing.insert_one(doc)
        # Re-fetch to get _id
        doc = await db.billing.find_one({"venue_id": venue_id})
    return doc


@router.get("/current")
async def get_current_billing(
    venue_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """Get current billing/invoice estimate for the venue."""
    state = await _get_billing(db, venue_id)

    module_keys = state.get("module_keys", DEFAULT_BILLING["module_keys"])
    plan = state.get("plan", DEFAULT_BILLING["plan"])
    ai_tokens = state.get("ai_tokens_used", 12450)
    storage_mb = state.get("storage_mb", 2340)

    active_modules = [
        MODULE_PRICES[k]["name"]
        for k, v in module_keys.items()
        if v and k in MODULE_PRICES
    ]
    module_total = sum(
        MODULE_PRICES[k]["price"]
        for k, v in module_keys.items()
        if v and k in MODULE_PRICES
    )

    ai_cost = round(ai_tokens * 0.00015, 2)
    storage_cost = round(storage_mb / 1024 * 2.50, 2)
    total = plan["price"] + module_total + ai_cost + storage_cost

    return {
        "period": datetime.now(timezone.utc).strftime("%B %Y"),
        "plan": plan,
        "modules": {"active": active_modules, "price": module_total},
        "usage": {
            "ai_cost": ai_cost,
            "storage_cost": storage_cost,
            "ai_tokens": ai_tokens,
            "storage_mb": storage_mb,
        },
        "total_estimated": round(total, 2),
        "currency": "€",
    }


@router.post("/modules")
async def toggle_module(
    venue_id: str = Query(...),
    module: str = Query(...),
    enabled: bool = Query(...),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """Enable or disable an add-on module. Persisted to MongoDB."""
    if module not in MODULE_PRICES:
        return {"error": f"Unknown module: {module}"}

    state = await _get_billing(db, venue_id)
    module_keys = state.get("module_keys", DEFAULT_BILLING["module_keys"])
    module_keys[module] = enabled

    await db.billing.update_one(
        {"venue_id": venue_id},
        {"$set": {"module_keys": module_keys, "updated_at": datetime.now(timezone.utc).isoformat()}},
    )

    module_name = MODULE_PRICES[module]["name"]
    logger.info(f"Module {module_name} {'enabled' if enabled else 'disabled'} for venue {venue_id}")
    return {"status": "ok", "module": module_name, "enabled": enabled}


def create_billing_router():
    return router
