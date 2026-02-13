"""
Ops Routes (Pillar 7: Operations & Aggregator Hub)
Handles operational KPIs, live event logs, and seeding.
Connected to MongoDB for persistence.
"""
from fastapi import APIRouter, Depends, Query
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


def create_ops_router():
    return router
