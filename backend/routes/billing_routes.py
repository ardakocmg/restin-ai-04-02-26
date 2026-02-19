"""
Billing Routes (Pillar 0: The Commercial Engine)
=================================================
Handles subscription plans, module toggling, usage-based billing,
invoice generation, and the BillCalculator.
Connected to MongoDB for persistence.
"""
from fastapi import APIRouter, Depends, Query, Body, HTTPException
from typing import Dict, Any, Optional, List
from core.dependencies import get_current_user, get_database
from datetime import datetime, timezone, timedelta
from uuid import uuid4
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/billing", tags=["Billing"])

# ==================== CONSTANTS ====================

SUBSCRIPTION_PLANS = {
    "starter": {"name": "Starter", "price": 49.00, "features": ["POS", "KDS", "BasicReports"]},
    "pro": {"name": "Pro", "price": 149.00, "features": ["POS", "KDS", "Inventory", "HR", "Reports", "CRM"]},
    "enterprise": {"name": "Enterprise", "price": 349.00, "features": ["POS", "KDS", "Inventory", "HR", "Reports", "CRM", "Voice", "Radar", "Studio", "Fintech", "Ops"]},
}

MODULE_PRICES = {
    "hasVoice": {"name": "Voice AI", "price": 50.00, "pillar": 4},
    "hasRadar": {"name": "Market Radar", "price": 30.00, "pillar": 6},
    "hasStudio": {"name": "Content Studio", "price": 20.00, "pillar": 5},
    "hasCRM": {"name": "Autopilot CRM", "price": 40.00, "pillar": 3},
    "hasFintech": {"name": "Omni-Payment", "price": 25.00, "pillar": 8},
    "hasOps": {"name": "Operations Hub", "price": 35.00, "pillar": 7},
    "hasWeb": {"name": "Web Architect", "price": 30.00, "pillar": 2},
}

AI_BROKER_CONFIG = {
    "GEMINI_FLASH": {"name": "Gemini 1.5 Flash", "cost_per_1k": 0.075, "sell_per_1k": 0.15},
    "GEMINI_PRO": {"name": "Gemini 1.5 Pro", "cost_per_1k": 1.25, "sell_per_1k": 2.50},
    "GPT4O": {"name": "GPT-4o", "cost_per_1k": 2.50, "sell_per_1k": 5.00},
}

STORAGE_RATE_PER_GB = 2.50

DEFAULT_BILLING = {
    "plan_key": "pro",
    "plan": {"name": "Pro", "price": 149.00},
    "module_keys": {"hasVoice": True, "hasRadar": True, "hasStudio": False, "hasCRM": False, "hasFintech": False, "hasOps": False, "hasWeb": False},
    "ai_usage": {"model": "GEMINI_FLASH", "tokens_used": 12450},
    "storage_mb": 2340,
}


# ==================== HELPERS ====================

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
        doc = await db.billing.find_one({"venue_id": venue_id})
    return doc


def _calculate_bill(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    BillCalculator: Sum(Plan + Modules + AI*Markup + Storage*Rate)
    Returns full breakdown for invoice generation.
    """
    plan = state.get("plan", DEFAULT_BILLING["plan"])
    module_keys = state.get("module_keys", DEFAULT_BILLING["module_keys"])
    ai_usage = state.get("ai_usage", DEFAULT_BILLING["ai_usage"])
    storage_mb = state.get("storage_mb", 0)

    # Module cost
    active_modules = []
    module_total = 0.0
    for key, enabled in module_keys.items():
        if enabled and key in MODULE_PRICES:
            mod = MODULE_PRICES[key]
            active_modules.append({"key": key, "name": mod["name"], "price": mod["price"]})
            module_total += mod["price"]

    # AI cost (tokens * sell price per 1k tokens)
    model = ai_usage.get("model", "GEMINI_FLASH")
    tokens = ai_usage.get("tokens_used", 0)
    broker = AI_BROKER_CONFIG.get(model, AI_BROKER_CONFIG["GEMINI_FLASH"])
    ai_cost = round(tokens / 1000 * broker["cost_per_1k"], 2)
    ai_revenue = round(tokens / 1000 * broker["sell_per_1k"], 2)
    ai_margin = round(ai_revenue - ai_cost, 2)

    # Storage cost (MB -> GB * rate)
    storage_gb = storage_mb / 1024
    storage_cost = round(storage_gb * STORAGE_RATE_PER_GB, 2)

    total = round(plan["price"] + module_total + ai_revenue + storage_cost, 2)

    return {
        "plan": plan,
        "modules": {"items": active_modules, "total": module_total},
        "ai": {
            "model": broker["name"],
            "tokens_used": tokens,
            "cost": ai_cost,
            "billed": ai_revenue,
            "margin": ai_margin,
        },
        "storage": {
            "used_mb": storage_mb,
            "used_gb": round(storage_gb, 2),
            "cost": storage_cost,
            "rate_per_gb": STORAGE_RATE_PER_GB,
        },
        "total_estimated": total,
        "currency": "€",
    }


# ==================== ROUTES ====================

@router.get("/plans")
async def list_plans():
    """List all available subscription plans."""
    return [
        {"key": k, **v}
        for k, v in SUBSCRIPTION_PLANS.items()
    ]


@router.get("/current")
async def get_current_billing(
    venue_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """Get current billing/invoice estimate with full breakdown."""
    state = await _get_billing(db, venue_id)
    breakdown = _calculate_bill(state)
    breakdown["period"] = datetime.now(timezone.utc).strftime("%B %Y")
    breakdown["venue_id"] = venue_id
    return breakdown


@router.post("/subscribe")
async def change_plan(
    venue_id: str = Query(...),
    plan_key: str = Query(...),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """Change subscription plan."""
    if plan_key not in SUBSCRIPTION_PLANS:
        raise HTTPException(status_code=400, detail=f"Unknown plan: {plan_key}")

    plan = SUBSCRIPTION_PLANS[plan_key]
    await db.billing.update_one(
        {"venue_id": venue_id},
        {"$set": {
            "plan_key": plan_key,
            "plan": {"name": plan["name"], "price": plan["price"]},
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )

    logger.info("Venue %s changed plan to %s", venue_id, plan_key)
    return {"status": "ok", "plan": plan}


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
        raise HTTPException(status_code=400, detail=f"Unknown module: {module}")

    state = await _get_billing(db, venue_id)
    module_keys = state.get("module_keys", DEFAULT_BILLING["module_keys"])
    module_keys[module] = enabled

    await db.billing.update_one(
        {"venue_id": venue_id},
        {"$set": {"module_keys": module_keys, "updated_at": datetime.now(timezone.utc).isoformat()}},
    )

    module_name = MODULE_PRICES[module]["name"]
    logger.info("Module %s %s for venue %s", module_name, "enabled" if enabled else "disabled", venue_id)
    return {"status": "ok", "module": module_name, "enabled": enabled, "price": MODULE_PRICES[module]["price"]}


@router.get("/usage")
async def get_usage(
    venue_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """Get detailed AI and storage usage breakdown."""
    state = await _get_billing(db, venue_id)
    ai_usage = state.get("ai_usage", DEFAULT_BILLING["ai_usage"])
    storage_mb = state.get("storage_mb", 0)

    model = ai_usage.get("model", "GEMINI_FLASH")
    broker = AI_BROKER_CONFIG.get(model, AI_BROKER_CONFIG["GEMINI_FLASH"])

    # Get recent AI usage log
    usage_log = await db.ai_usage_log.find(
        {"venue_id": venue_id}
    ).sort("created_at", -1).limit(20).to_list(20)
    for entry in usage_log:
        entry.pop("_id", None)

    return {
        "ai": {
            "current_model": broker["name"],
            "model_key": model,
            "tokens_used": ai_usage.get("tokens_used", 0),
            "cost_per_1k": broker["sell_per_1k"],
            "available_models": [
                {"key": k, "name": v["name"], "price_per_1k": v["sell_per_1k"]}
                for k, v in AI_BROKER_CONFIG.items()
            ],
        },
        "storage": {
            "used_mb": storage_mb,
            "used_gb": round(storage_mb / 1024, 2),
            "rate_per_gb": STORAGE_RATE_PER_GB,
            "cost": round(storage_mb / 1024 * STORAGE_RATE_PER_GB, 2),
        },
        "recent_usage": usage_log,
    }


@router.get("/invoices")
async def list_invoices(
    venue_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """Get invoice history for the venue."""
    invoices = await db.billing_invoices.find(
        {"venue_id": venue_id}, {"_id": 0}
    ).sort("period_end", -1).limit(12).to_list(12)

    if not invoices:
        # Generate sample invoice for current month
        state = await _get_billing(db, venue_id)
        breakdown = _calculate_bill(state)
        now = datetime.now(timezone.utc)
        sample = {
            "id": str(uuid4()),
            "venue_id": venue_id,
            "period_start": now.replace(day=1).isoformat(),
            "period_end": now.isoformat(),
            "status": "draft",
            "breakdown": breakdown,
            "total": breakdown["total_estimated"],
            "currency": "€",
            "created_at": now.isoformat(),
        }
        await db.billing_invoices.insert_one(sample)
        sample.pop("_id", None)
        invoices = [sample]

    return invoices


@router.post("/ai-model")
async def set_ai_model(
    venue_id: str = Query(...),
    model: str = Query(...),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """Switch the AI model for the venue (affects billing)."""
    if model not in AI_BROKER_CONFIG:
        raise HTTPException(status_code=400, detail=f"Unknown model: {model}. Available: {list(AI_BROKER_CONFIG.keys())}")

    await db.billing.update_one(
        {"venue_id": venue_id},
        {"$set": {"ai_usage.model": model, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )

    broker = AI_BROKER_CONFIG[model]
    logger.info("Venue %s switched AI model to %s", venue_id, model)
    return {"status": "ok", "model": broker["name"], "price_per_1k": broker["sell_per_1k"]}


def create_billing_router():
    return router
