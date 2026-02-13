"""
Billing Routes (Pillar 0: The Commercial Engine)
Handles subscription plans, module toggling, and usage-based billing.
"""
from fastapi import APIRouter, Depends, Query
from typing import List, Dict, Any, Optional
from core.dependencies import get_current_user, get_database
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/billing", tags=["Billing"])


# ─── In-memory billing state (per venue) ─────────────────────────────────
_billing_state: Dict[str, Dict[str, Any]] = {}

DEFAULT_PLAN = {
    "name": "Pro",
    "price": 149.00,
    "features": ["POS", "HR", "Inventory", "Reports", "KDS"]
}

MODULE_PRICES = {
    "hasVoice": {"name": "Voice AI", "price": 50.00},
    "hasRadar": {"name": "Market Radar", "price": 30.00},
    "hasStudio": {"name": "Content Studio", "price": 20.00},
    "hasCRM": {"name": "Autopilot CRM", "price": 40.00},
    "hasFintech": {"name": "Omni-Payment", "price": 25.00},
}

def _get_billing(venue_id: str) -> Dict[str, Any]:
    """Get or initialize billing state for a venue."""
    if venue_id not in _billing_state:
        _billing_state[venue_id] = {
            "plan": DEFAULT_PLAN.copy(),
            "active_modules": ["Voice AI", "Market Radar"],
            "module_keys": {"hasVoice": True, "hasRadar": True, "hasStudio": False, "hasCRM": False, "hasFintech": False},
            "ai_tokens_used": 12450,
            "storage_mb": 2340,
        }
    return _billing_state[venue_id]


@router.get("/current")
async def get_current_billing(
    venue_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
):
    """Get current billing/invoice estimate for the venue."""
    state = _get_billing(venue_id)

    # Calculate module costs
    active_modules = [
        MODULE_PRICES[k]["name"]
        for k, v in state["module_keys"].items()
        if v and k in MODULE_PRICES
    ]
    module_total = sum(
        MODULE_PRICES[k]["price"]
        for k, v in state["module_keys"].items()
        if v and k in MODULE_PRICES
    )

    # Usage-based costs
    ai_cost = round(state["ai_tokens_used"] * 0.00015, 2)  # $0.15 per 1k tokens
    storage_cost = round(state["storage_mb"] / 1024 * 2.50, 2)  # $2.50/GB

    total = state["plan"]["price"] + module_total + ai_cost + storage_cost

    return {
        "period": datetime.now(timezone.utc).strftime("%B %Y"),
        "plan": {
            "name": state["plan"]["name"],
            "price": state["plan"]["price"]
        },
        "modules": {
            "active": active_modules,
            "price": module_total
        },
        "usage": {
            "ai_cost": ai_cost,
            "storage_cost": storage_cost,
            "ai_tokens": state["ai_tokens_used"],
            "storage_mb": state["storage_mb"],
        },
        "total_estimated": round(total, 2),
        "currency": "€"
    }


@router.post("/modules")
async def toggle_module(
    venue_id: str = Query(...),
    module: str = Query(...),
    enabled: bool = Query(...),
    current_user: dict = Depends(get_current_user),
):
    """Enable or disable an add-on module."""
    state = _get_billing(venue_id)

    if module not in MODULE_PRICES:
        return {"error": f"Unknown module: {module}"}

    state["module_keys"][module] = enabled
    module_name = MODULE_PRICES[module]["name"]

    if enabled and module_name not in state["active_modules"]:
        state["active_modules"].append(module_name)
    elif not enabled and module_name in state["active_modules"]:
        state["active_modules"].remove(module_name)

    logger.info(f"Module {module_name} {'enabled' if enabled else 'disabled'} for venue {venue_id}")

    return {"status": "ok", "module": module_name, "enabled": enabled}


def create_billing_router():
    return router
