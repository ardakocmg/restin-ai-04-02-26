"""
Ops Routes (Pillar 7: Operations & Aggregator Hub)
Handles operational KPIs, live event logs, and seeding.
Connected to MongoDB for persistence.
"""
from fastapi import APIRouter, Depends, Query, Body, HTTPException
from typing import Dict, Any, List
from core.dependencies import get_current_user, get_database
from datetime import datetime, timezone, timedelta
import logging
import random
import uuid

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ops", tags=["Operations (Pillar 7)"])


def _generate_metrics(venue_id: str) -> Dict[str, Any]:
    """Generate realistic ops metrics."""
    return {
        "venue_id": venue_id,
        "total_orders": random.randint(120, 250),
        "orders_today": random.randint(35, 85),
        "total_revenue_cents": random.randint(450000, 1200000),
        "labor_cost_cents": random.randint(120000, 350000),
        "labor_percentage": round(random.uniform(24.0, 32.0), 1),
        "kds_pending": random.randint(0, 8),
        "kds_in_progress": random.randint(2, 12),
        "waste_cost_cents": random.randint(5000, 25000),
        "food_cost_percentage": round(random.uniform(28.0, 35.0), 1),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }


def _generate_logs(venue_id: str) -> List[Dict[str, Any]]:
    """Generate realistic ops event logs."""
    now = datetime.now(timezone.utc)
    events = [
        ("UberEats Order #422 injected to KDS", "info"),
        ("Labour cost spike detected (32%) — threshold alert", "warning"),
        ("Auto-sync with inventory completed successfully", "info"),
        ("Wolt Order #112 marked ready for pickup", "info"),
        ("KDS Station 2 cleared queue (avg 8m)", "info"),
        ("Bolt Food Order #89 cancelled by customer", "warning"),
        ("Daily revenue target reached at 18:42", "info"),
        ("Walk-in cooler temp deviation (+2°C) resolved", "warning"),
        ("Staff shift change completed — 6 clock-ins", "info"),
        ("POS Terminal 3 reconnected after timeout", "info"),
    ]

    logs = []
    for event, severity in events:
        logs.append({
            "id": str(uuid.uuid4()),
            "venue_id": venue_id,
            "event": event,
            "severity": severity,
            "created_at": (now - timedelta(minutes=random.randint(1, 180))).isoformat(),
        })

    logs.sort(key=lambda x: x["created_at"], reverse=True)
    return logs


@router.get("/metrics")
async def get_ops_metrics(
    venue_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """Get Real-time Operational KPIs from MongoDB."""
    doc = await db.ops_metrics.find_one({"venue_id": venue_id}, {"_id": 0})

    if not doc:
        doc = _generate_metrics(venue_id)
        await db.ops_metrics.insert_one(doc)
        doc = await db.ops_metrics.find_one({"venue_id": venue_id}, {"_id": 0})

    return doc


@router.get("/logs")
async def get_ops_logs(
    venue_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """Get latest operational event logs from MongoDB."""
    logs_cursor = db.ops_logs.find({"venue_id": venue_id}, {"_id": 0}).sort("created_at", -1).limit(20)
    logs = await logs_cursor.to_list(length=20)

    if not logs:
        logs = _generate_logs(venue_id)
        await db.ops_logs.insert_many(logs)
        logs_cursor = db.ops_logs.find({"venue_id": venue_id}, {"_id": 0}).sort("created_at", -1).limit(20)
        logs = await logs_cursor.to_list(length=20)

    return logs


@router.post("/seed")
async def seed_ops_data(
    venue_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """Re-seed ops demo data into MongoDB."""
    await db.ops_metrics.delete_many({"venue_id": venue_id})
    await db.ops_logs.delete_many({"venue_id": venue_id})

    metrics = _generate_metrics(venue_id)
    await db.ops_metrics.insert_one(metrics)

    logs = _generate_logs(venue_id)
    await db.ops_logs.insert_many(logs)

    return {"status": "ok", "metrics": {k: v for k, v in metrics.items() if k != "_id"}}


# === AGGREGATOR INJECTION ===

@router.post("/aggregator/inject")
async def inject_aggregator_order(
    venue_id: str = Query(...),
    payload: Dict[str, Any] = Body(...),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """
    Inject an external aggregator order (UberEats, Wolt, Bolt) into KDS.
    Creates an order and a KDS ticket for immediate preparation.
    """
    platform = payload.get("platform", "UberEats")
    external_id = payload.get("external_id", f"EXT-{str(uuid.uuid4())[:8].upper()}")
    items = payload.get("items", [])

    order = {
        "id": str(uuid.uuid4()),
        "venue_id": venue_id,
        "source": platform,
        "external_id": external_id,
        "items": items,
        "status": "pending",
        "type": "DELIVERY",
        "channel": platform.lower(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.orders.insert_one(order)

    # Log the injection event
    log_entry = {
        "id": str(uuid.uuid4()),
        "venue_id": venue_id,
        "event": f"{platform} Order #{external_id} injected to KDS",
        "severity": "info",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.ops_logs.insert_one(log_entry)

    logger.info("Aggregator order injected: %s from %s for venue %s", external_id, platform, venue_id)
    return {"status": "injected", "order_id": order["id"], "external_id": external_id, "platform": platform}


# === LABOR COST ALERTS ===

@router.get("/labor-alerts")
async def get_labor_alerts(
    venue_id: str = Query(...),
    db=Depends(get_database),
):
    """Get real-time labor cost alerts (% of revenue)."""
    metrics = await db.ops_metrics.find_one({"venue_id": venue_id}, {"_id": 0})
    if not metrics:
        metrics = _generate_metrics(venue_id)

    labor_pct = metrics.get("labor_percentage", 0)
    alerts = []

    if labor_pct > 30:
        alerts.append({"level": "critical", "message": f"Labor cost at {labor_pct}% — exceeded 30% threshold", "action": "Review staffing levels"})
    elif labor_pct > 28:
        alerts.append({"level": "warning", "message": f"Labor cost at {labor_pct}% — approaching threshold", "action": "Monitor closely"})
    else:
        alerts.append({"level": "ok", "message": f"Labor cost at {labor_pct}% — within target", "action": "None needed"})

    return {"labor_percentage": labor_pct, "alerts": alerts, "threshold": 30}


# === AGGREGATOR CONFIG ===

@router.get("/aggregator/config")
async def get_aggregator_config(
    venue_id: str = Query(...),
    db=Depends(get_database),
):
    """Get aggregator platform configurations."""
    configs = await db.aggregator_configs.find(
        {"venue_id": venue_id}, {"_id": 0}
    ).to_list(10)

    if not configs:
        return [
            {"venue_id": venue_id, "platform": "UberEats", "enabled": True, "api_key": "***", "auto_accept": True, "prep_time_mins": 20},
            {"venue_id": venue_id, "platform": "Wolt", "enabled": True, "api_key": "***", "auto_accept": False, "prep_time_mins": 25},
            {"venue_id": venue_id, "platform": "Bolt Food", "enabled": False, "api_key": None, "auto_accept": False, "prep_time_mins": 20},
        ]
    return configs


@router.post("/aggregator/config")
async def update_aggregator_config(
    venue_id: str = Query(...),
    payload: Dict[str, Any] = Body(...),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """Update aggregator platform configuration."""
    platform = payload.get("platform")
    if not platform:
        from fastapi import HTTPException
        raise HTTPException(400, "platform is required")

    payload["venue_id"] = venue_id
    payload["updated_at"] = datetime.now(timezone.utc).isoformat()

    await db.aggregator_configs.update_one(
        {"venue_id": venue_id, "platform": platform},
        {"$set": payload},
        upsert=True,
    )
    logger.info("Aggregator config updated: %s for venue %s", platform, venue_id)
    return {"status": "ok", "platform": platform}


def create_ops_router():
    return router
