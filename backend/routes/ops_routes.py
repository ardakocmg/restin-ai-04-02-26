"""
Ops Routes (Pillar 7: Operations & Aggregator Hub)
Handles operational KPIs, live event logs, and seeding.
"""
from fastapi import APIRouter, Depends, Query
from typing import Dict, Any, List
from core.dependencies import get_current_user
from datetime import datetime, timezone, timedelta
import logging
import random
import uuid

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ops", tags=["Operations (Pillar 7)"])

# ─── In-memory ops state ──────────────────────────────────────────────────
_ops_state: Dict[str, Dict[str, Any]] = {}


def _ensure_ops(venue_id: str) -> Dict[str, Any]:
    """Get or initialize ops state for a venue."""
    if venue_id not in _ops_state:
        _seed_ops(venue_id)
    return _ops_state[venue_id]


def _seed_ops(venue_id: str):
    """Generate realistic ops demo data."""
    now = datetime.now(timezone.utc)

    _ops_state[venue_id] = {
        "metrics": {
            "total_orders": random.randint(120, 250),
            "orders_today": random.randint(35, 85),
            "total_revenue_cents": random.randint(450000, 1200000),
            "labor_cost_cents": random.randint(120000, 350000),
            "labor_percentage": round(random.uniform(24.0, 32.0), 1),
            "kds_pending": random.randint(0, 8),
            "kds_in_progress": random.randint(2, 12),
            "waste_cost_cents": random.randint(5000, 25000),
            "food_cost_percentage": round(random.uniform(28.0, 35.0), 1),
        },
        "logs": [
            {
                "id": str(uuid.uuid4()),
                "event": event,
                "severity": severity,
                "created_at": (now - timedelta(minutes=random.randint(1, 180))).isoformat()
            }
            for event, severity in [
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
        ]
    }

    # Sort logs by most recent
    _ops_state[venue_id]["logs"].sort(key=lambda x: x["created_at"], reverse=True)


@router.get("/metrics")
async def get_ops_metrics(
    venue_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
):
    """Get Real-time Operational KPIs."""
    state = _ensure_ops(venue_id)
    return state["metrics"]


@router.get("/logs")
async def get_ops_logs(
    venue_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
):
    """Get latest operational event logs."""
    state = _ensure_ops(venue_id)
    return state["logs"]


@router.post("/seed")
async def seed_ops_data(
    venue_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
):
    """Re-seed ops demo data."""
    _seed_ops(venue_id)
    return {"status": "ok", "metrics": _ops_state[venue_id]["metrics"]}


def create_ops_router():
    return router
