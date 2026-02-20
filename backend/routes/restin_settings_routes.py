"""
Restin AI Module Settings Routes
=================================
CRUD for per-module AI configuration at system, org, and venue levels.
Tracks learning history, usage analytics, and module health.
"""

from fastapi import APIRouter, Depends, Body, Query, HTTPException
from typing import Dict, Any, Optional, List
from core.database import get_database
from core.dependencies import get_current_user
from datetime import datetime, timezone, timedelta
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai/settings", tags=["Restin AI Settings"])

VALID_MODULES = ["copilot", "voice", "studio", "radar", "crm", "theme_engine"]
VALID_LEVELS = ["system", "venue"]

# Default configs per module
DEFAULT_MODULE_CONFIGS: Dict[str, Dict] = {
    "copilot": {
        "enabled": True,
        "personality": "professional",
        "context_sources": ["orders", "inventory", "finance", "hr"],
        "action_permissions": {
            "can_refund": False,
            "can_void": False,
            "can_comp": False,
            "can_modify_menu": False,
            "read_only": True
        },
        "max_context_tokens": 4000,
        "temperature": 0.3,
        "greeting": "Hello! I'm your Restin AI assistant. How can I help you today?"
    },
    "voice": {
        "enabled": False,
        "persona": "receptionist",
        "language": "en",
        "voice_model": "alloy",
        "greeting_message": "Thank you for calling. How may I help you?",
        "knowledge_base_ids": [],
        "operating_hours": {"start": "09:00", "end": "23:00"},
        "max_call_duration_seconds": 300,
        "transfer_to_human_enabled": True,
        "tools_enabled": ["checkAvailability", "createReservation", "queryMenu"]
    },
    "studio": {
        "enabled": False,
        "brand_tone": "modern",
        "primary_color": "#3b82f6",
        "secondary_color": "#8b5cf6",
        "font_family": "Inter",
        "default_style": "food-photography",
        "auto_watermark": True,
        "reality_first": True,
        "max_generations_per_day": 20,
        "preferred_model": "imagen-3"
    },
    "radar": {
        "enabled": False,
        "competitors": [],
        "monitor_region": "",
        "price_alert_threshold_pct": 10,
        "scan_frequency_hours": 24,
        "allergen_guard_enabled": True,
        "yield_management_enabled": False,
        "dynamic_pricing_rules": []
    },
    "crm": {
        "enabled": False,
        "churn_threshold_days": 30,
        "high_risk_visit_drop_pct": 50,
        "sms_enabled": False,
        "sms_provider": "",
        "auto_campaign_enabled": False,
        "segments": ["vip", "regular", "at_risk", "lost"],
        "campaign_templates": [],
        "ltv_calculation_period_days": 365
    },
    "theme_engine": {
        "enabled": True,
        "active_theme": "theme-standard",
        "allowed_themes": ["theme-standard", "theme-tech"]
    }
}


@router.get("/defaults")
async def get_default_configs():
    """Return default configs for all modules."""
    return {"modules": DEFAULT_MODULE_CONFIGS}


@router.get("/{module}")
async def get_module_config(
    module: str,
    level: str = Query("system", description="Config level: system or venue"),
    venue_id: Optional[str] = Query(None),
    user: dict = Depends(get_current_user)
):
    """Get config for a specific module at a specific level."""
    if module not in VALID_MODULES:
        raise HTTPException(status_code=400, detail=f"Invalid module: {module}")
    if level not in VALID_LEVELS:
        raise HTTPException(status_code=400, detail=f"Invalid level: {level}")

    db = get_database()
    query: Dict[str, Any] = {"module": module, "level": level}
    if level == "venue" and venue_id:
        query["venue_id"] = venue_id

    config = await db.restin_module_configs.find_one(query, {"_id": 0})

    if not config:
        # Return default
        return {
            "module": module,
            "level": level,
            "venue_id": venue_id,
            "config": DEFAULT_MODULE_CONFIGS.get(module, {}),
            "is_default": True,
            "updated_at": None,
            "updated_by": None
        }

    config["is_default"] = False
    return config


@router.put("/{module}")
async def save_module_config(
    module: str,
    payload: dict = Body(...),
    user: dict = Depends(get_current_user)
):
    """Save config for a specific module. Body: {level, venue_id?, config}"""
    if module not in VALID_MODULES:
        raise HTTPException(status_code=400, detail=f"Invalid module: {module}")

    level = payload.get("level", "system")
    venue_id = payload.get("venue_id")
    config = payload.get("config", {})

    if level not in VALID_LEVELS:
        raise HTTPException(status_code=400, detail=f"Invalid level: {level}")

    # System level requires product_owner
    if level == "system" and user.get("role", "").upper() != "PRODUCT_OWNER":
        raise HTTPException(status_code=403, detail="System-level config requires PRODUCT_OWNER role")

    db = get_database()
    query: Dict[str, Any] = {"module": module, "level": level}
    if level == "venue" and venue_id:
        query["venue_id"] = venue_id

    doc = {
        **query,
        "config": config,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": user.get("name", "unknown")
    }

    await db.restin_module_configs.update_one(query, {"$set": doc}, upsert=True)

    # Log the change
    await db.restin_settings_audit.insert_one({
        "module": module,
        "level": level,
        "venue_id": venue_id,
        "changed_by": user.get("name", "unknown"),
        "changed_at": datetime.now(timezone.utc).isoformat(),
        "new_config": config
    })

    logger.info(f"Saved {module} config at {level} level by {user.get('name')}")
    return {"ok": True, "module": module, "level": level}


@router.get("/all/status")
async def get_all_modules_status(
    venue_id: Optional[str] = Query(None),
    user: dict = Depends(get_current_user)
):
    """Get status summary for all Restin AI modules."""
    db = get_database()
    result = {}

    for module in VALID_MODULES:
        # Get system config
        sys_config = await db.restin_module_configs.find_one(
            {"module": module, "level": "system"}, {"_id": 0}
        )
        # Get venue config if applicable
        venue_config = None
        if venue_id:
            venue_config = await db.restin_module_configs.find_one(
                {"module": module, "level": "venue", "venue_id": venue_id}, {"_id": 0}
            )

        # Resolve: venue overrides system
        effective = DEFAULT_MODULE_CONFIGS.get(module, {}).copy()
        if sys_config:
            effective.update(sys_config.get("config", {}))
        if venue_config:
            effective.update(venue_config.get("config", {}))

        result[module] = {
            "enabled": effective.get("enabled", False),
            "has_system_config": sys_config is not None,
            "has_venue_config": venue_config is not None,
            "last_updated": (venue_config or sys_config or {}).get("updated_at"),
            "updated_by": (venue_config or sys_config or {}).get("updated_by")
        }

    return {"modules": result}


@router.get("/analytics/overview")
async def get_ai_analytics_overview(
    days: int = Query(7, ge=1, le=90),
    venue_id: Optional[str] = Query(None),
    user: dict = Depends(get_current_user)
):
    """Get AI usage analytics across all modules."""
    db = get_database()
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    query: Dict[str, Any] = {"timestamp": {"$gte": cutoff}}
    if venue_id:
        query["venue_id"] = venue_id

    # Aggregate usage per module
    pipeline = [
        {"$match": query},
        {"$group": {
            "_id": "$module",
            "total_requests": {"$sum": 1},
            "total_tokens": {"$sum": {"$ifNull": ["$tokens_used", 0]}},
            "total_cost_usd": {"$sum": {"$ifNull": ["$cost_usd", 0]}},
            "avg_latency_ms": {"$avg": {"$ifNull": ["$latency_ms", 0]}},
            "errors": {"$sum": {"$cond": [{"$eq": ["$status", "error"]}, 1, 0]}},
            "successes": {"$sum": {"$cond": [{"$eq": ["$status", "success"]}, 1, 0]}}
        }},
        {"$sort": {"total_requests": -1}}
    ]

    usage_cursor = db.ai_usage_logs.aggregate(pipeline)
    usage_by_module = {}
    async for doc in usage_cursor:
        module_name = doc["_id"] or "unknown"
        usage_by_module[module_name] = {
            "total_requests": doc["total_requests"],
            "total_tokens": doc["total_tokens"],
            "total_cost_usd": round(doc["total_cost_usd"], 4),
            "avg_latency_ms": round(doc["avg_latency_ms"], 1),
            "error_rate": round(doc["errors"] / max(doc["total_requests"], 1) * 100, 1),
            "success_count": doc["successes"],
            "error_count": doc["errors"]
        }

    # Daily trend
    daily_pipeline = [
        {"$match": query},
        {"$group": {
            "_id": {
                "date": {"$substr": ["$timestamp", 0, 10]},
                "module": "$module"
            },
            "requests": {"$sum": 1},
            "tokens": {"$sum": {"$ifNull": ["$tokens_used", 0]}},
            "cost": {"$sum": {"$ifNull": ["$cost_usd", 0]}}
        }},
        {"$sort": {"_id.date": 1}}
    ]

    daily_cursor = db.ai_usage_logs.aggregate(daily_pipeline)
    daily_trend: List[Dict] = []
    async for doc in daily_cursor:
        daily_trend.append({
            "date": doc["_id"]["date"],
            "module": doc["_id"]["module"],
            "requests": doc["requests"],
            "tokens": doc["tokens"],
            "cost": round(doc["cost"], 4)
        })

    # Learning events (config changes, model upgrades)
    learning_cursor = db.restin_settings_audit.find(
        {"changed_at": {"$gte": cutoff}},
        {"_id": 0}
    ).sort("changed_at", -1).limit(50)
    learning_history = await learning_cursor.to_list(length=50)

    return {
        "period_days": days,
        "usage_by_module": usage_by_module,
        "daily_trend": daily_trend,
        "learning_history": learning_history,
        "total_modules": len(VALID_MODULES),
        "active_modules": sum(1 for m in usage_by_module.values() if m["total_requests"] > 0)
    }


@router.get("/audit/history")
async def get_settings_audit(
    module: Optional[str] = Query(None),
    limit: int = Query(25, ge=1, le=100),
    user: dict = Depends(get_current_user)
):
    """Get audit trail of configuration changes."""
    db = get_database()
    query: Dict[str, Any] = {}
    if module:
        query["module"] = module

    cursor = db.restin_settings_audit.find(
        query, {"_id": 0}
    ).sort("changed_at", -1).limit(limit)

    history = await cursor.to_list(length=limit)
    return {"history": history, "count": len(history)}
