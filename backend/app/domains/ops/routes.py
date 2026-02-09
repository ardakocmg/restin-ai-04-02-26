"""
⚙️ Ops & Aggregator Routes (Pillar 7) — Delivery, Labor, Metrics

Endpoints:
  GET  /api/aggregators/status   — Aggregator connection status
  POST /api/aggregators/toggle   — Toggle aggregator on/off
  POST /api/aggregators/inject   — Inject external order from delivery platform
  GET  /api/ops/metrics          — Operational KPIs
  GET  /api/ops/logs             — Operational event logs
  GET  /api/ops/labor            — Labor cost breakdown
  POST /api/ops/seed             — Seed demo data
"""
from fastapi import APIRouter, Query
from typing import Optional
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel
from app.core.database import get_database
import uuid
import logging
import random

logger = logging.getLogger(__name__)

router = APIRouter(tags=["ops-aggregator"])


class InjectOrderRequest(BaseModel):
    platform: str  # wolt, uber_eats, bolt
    external_id: str
    items: list
    total_cents: int
    delivery_address: Optional[str] = None
    customer_name: Optional[str] = None

    class Config:
        extra = "allow"


# ==================== AGGREGATOR ====================

@router.get("/api/aggregators/status")
async def aggregator_status(venue_id: str = Query(...)):
    """Get aggregator connection status."""
    db = get_database()
    configs = await db.aggregator_configs.find({"venue_id": venue_id}).to_list(length=10)
    
    if configs:
        for c in configs:
            c["_id"] = str(c["_id"])
        return configs

    # Default status
    return [
        {"platform": "wolt", "venue_id": venue_id, "status": "disconnected", "orders_today": 0, "revenue_today_cents": 0},
        {"platform": "uber_eats", "venue_id": venue_id, "status": "disconnected", "orders_today": 0, "revenue_today_cents": 0},
        {"platform": "bolt_food", "venue_id": venue_id, "status": "disconnected", "orders_today": 0, "revenue_today_cents": 0},
    ]


@router.post("/api/aggregators/toggle")
async def toggle_aggregator(venue_id: str = Query(...), platform: str = Query(...), enabled: bool = True):
    """Toggle an aggregator platform on/off."""
    db = get_database()
    status = "online" if enabled else "paused"
    await db.aggregator_configs.update_one(
        {"venue_id": venue_id, "platform": platform},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    return {"platform": platform, "status": status, "venue_id": venue_id}


@router.post("/api/aggregators/inject")
async def inject_order(body: InjectOrderRequest, venue_id: str = Query(...)):
    """Inject an external delivery order into the POS/KDS system."""
    db = get_database()
    now = datetime.now(timezone.utc)

    # Create order in POS
    order = {
        "id": f"agg-{body.platform}-{body.external_id}",
        "venue_id": venue_id,
        "external_id": body.external_id,
        "platform": body.platform,
        "display_id": f"#{random.randint(800, 999)}",
        "type": "delivery",
        "status": "in_progress",
        "items": body.items,
        "total_cents": body.total_cents,
        "total": round(body.total_cents / 100, 2),
        "customer_name": body.customer_name or "Delivery Customer",
        "delivery_address": body.delivery_address,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
    }
    await db.orders.insert_one(order)
    order.pop("_id", None)

    # Create KDS ticket
    for item in body.items[:5]:
        await db.kds_tickets.insert_one({
            "id": f"kds-{order['id']}-{uuid.uuid4().hex[:4]}",
            "order_id": order["id"],
            "venue_id": venue_id,
            "item_name": item.get("name", "Unknown"),
            "quantity": item.get("quantity", 1),
            "station": "kitchen",
            "status": "new",
            "priority": "rush",
            "source": body.platform,
            "created_at": now.isoformat(),
        })

    return {"status": "injected", "order": order}


# ==================== OPS METRICS ====================

@router.get("/api/ops/metrics")
async def ops_metrics(venue_id: str = Query(...)):
    """Get operational KPIs."""
    db = get_database()
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0).isoformat()

    # Order metrics
    total_orders = await db.orders.count_documents({"venue_id": venue_id})
    orders_today = await db.orders.count_documents({
        "venue_id": venue_id,
        "created_at": {"$gte": today_start}
    })

    # Revenue
    pipeline = [
        {"$match": {"venue_id": venue_id}},
        {"$group": {"_id": None, "total": {"$sum": "$total_cents"}}}
    ]
    rev_result = await db.orders.aggregate(pipeline).to_list(length=1)
    total_revenue = rev_result[0]["total"] if rev_result else 0

    # Labor
    shifts = await db.shifts.find({"venue_id": venue_id}).to_list(length=100)
    total_labor_hours = sum(s.get("hours", 8) for s in shifts)
    avg_hourly_rate = 1200  # €12/hr in cents
    labor_cost_cents = total_labor_hours * avg_hourly_rate
    labor_pct = round((labor_cost_cents / max(total_revenue, 1)) * 100, 1)

    # KDS
    kds_pending = await db.kds_tickets.count_documents({"venue_id": venue_id, "status": "new"})
    kds_in_progress = await db.kds_tickets.count_documents({"venue_id": venue_id, "status": "in_progress"})

    # Waste
    waste_pipeline = [
        {"$match": {"venue_id": venue_id}},
        {"$group": {"_id": None, "total": {"$sum": "$cost_cents"}}}
    ]
    waste_result = await db.waste_logs.aggregate(waste_pipeline).to_list(length=1)
    waste_cost = waste_result[0]["total"] if waste_result else 0

    return {
        "venue_id": venue_id,
        "total_orders": total_orders,
        "orders_today": orders_today,
        "total_revenue_cents": total_revenue,
        "labor_cost_cents": labor_cost_cents,
        "labor_percentage": labor_pct,
        "total_labor_hours": total_labor_hours,
        "kds_pending": kds_pending,
        "kds_in_progress": kds_in_progress,
        "waste_cost_cents": waste_cost,
        "food_cost_percentage": 28.5,  # Typical target
    }


@router.get("/api/ops/logs")
async def ops_logs(venue_id: str = Query(...), limit: int = Query(50)):
    """Get operational event logs."""
    db = get_database()
    logs = await db.ops_logs.find({"venue_id": venue_id}).sort("created_at", -1).to_list(length=limit)
    for l in logs:
        l["_id"] = str(l["_id"])
    return logs


@router.get("/api/ops/labor")
async def labor_breakdown(venue_id: str = Query(...)):
    """Get labor cost breakdown by role."""
    db = get_database()
    users = await db.users.find({"venue_id": venue_id}).to_list(length=100)
    
    breakdown = {}
    for u in users:
        role = u.get("role", "staff")
        if role not in breakdown:
            breakdown[role] = {"count": 0, "estimated_cost_cents": 0}
        breakdown[role]["count"] += 1
        rate = {"manager": 1800, "chef": 1500, "waiter": 1200, "bartender": 1300}.get(role, 1200)
        breakdown[role]["estimated_cost_cents"] += rate * 8  # 8hr shift

    return {"venue_id": venue_id, "breakdown": breakdown, "total_staff": len(users)}


# ==================== SEED ====================

@router.post("/api/ops/seed")
async def seed_ops_data(venue_id: str = Query("venue-caviar-bull")):
    """Seed demo ops and aggregator data."""
    db = get_database()
    now = datetime.now(timezone.utc)

    # Aggregator configs
    agg_configs = [
        {"platform": "wolt", "venue_id": venue_id, "status": "online", "api_key": "wolt_***", "orders_today": 12, "revenue_today_cents": 48500, "commission_pct": 25, "updated_at": now.isoformat()},
        {"platform": "uber_eats", "venue_id": venue_id, "status": "online", "api_key": "uber_***", "orders_today": 8, "revenue_today_cents": 35200, "commission_pct": 30, "updated_at": now.isoformat()},
        {"platform": "bolt_food", "venue_id": venue_id, "status": "paused", "api_key": None, "orders_today": 0, "revenue_today_cents": 0, "commission_pct": 22, "updated_at": now.isoformat()},
    ]
    await db.aggregator_configs.delete_many({"venue_id": venue_id})
    await db.aggregator_configs.insert_many(agg_configs)

    # Ops logs
    events = [
        "Wolt order #W-482 received — 3 items — sent to Kitchen",
        "UberEats order #U-291 received — 2 items — sent to Kitchen",
        "Labor cost alert: 32% of revenue (target: 28%)",
        "KDS ticket #kds-142 completed in 8m 30s (target: 12m)",
        "Waste log: 1.5kg salmon expired — €45 cost",
        "Peak hour started — 6 pending KDS tickets",
        "Aggregator commission report generated — €245 total",
        "Shift change: 3 staff clocked out, 4 clocked in",
    ]
    logs = []
    for i, event in enumerate(events):
        logs.append({
            "id": f"opslog-{uuid.uuid4().hex[:8]}",
            "venue_id": venue_id,
            "event": event,
            "severity": random.choice(["info", "info", "warning", "info"]),
            "created_at": (now - timedelta(minutes=random.randint(5, 300))).isoformat(),
        })
    await db.ops_logs.delete_many({"venue_id": venue_id})
    await db.ops_logs.insert_many(logs)

    return {"status": "seeded", "aggregators": len(agg_configs), "logs": len(logs)}
