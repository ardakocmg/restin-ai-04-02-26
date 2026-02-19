"""
Pulse Analytics Routes — Mobile dashboard analytics endpoints
(Lightspeed Parity Phase 4)
"""
from fastapi import APIRouter, Depends, Query
from core.dependencies import get_current_user, get_database
from datetime import datetime, timezone, timedelta
import logging

logger = logging.getLogger(__name__)


def create_pulse_analytics_router():
    router = APIRouter(prefix="/pulse", tags=["pulse-analytics"])

    @router.get("/overview/{venue_id}")
    async def get_overview(
        venue_id: str,
        period: str = Query("today", enum=["today", "yesterday", "week", "month"]),
        current_user: dict = Depends(get_current_user),
        db=Depends(get_database),
    ):
        """Get quick overview stats for mobile dashboard."""
        now = datetime.now(timezone.utc)
        if period == "today":
            start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        elif period == "yesterday":
            start = (now - timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
            now = start + timedelta(hours=24)
        elif period == "week":
            start = now - timedelta(days=7)
        else:
            start = now - timedelta(days=30)

        start_iso = start.isoformat()
        end_iso = now.isoformat()

        # Orders
        orders = await db.orders.count_documents({
            "venue_id": venue_id,
            "created_at": {"$gte": start_iso, "$lte": end_iso}
        })

        # Revenue pipeline
        rev_pipeline = [
            {"$match": {"venue_id": venue_id, "created_at": {"$gte": start_iso, "$lte": end_iso}}},
            {"$group": {
                "_id": None,
                "total_revenue": {"$sum": "$total_cents"},
                "total_tax": {"$sum": "$tax_cents"},
                "total_tips": {"$sum": "$tip_cents"},
                "avg_order": {"$avg": "$total_cents"},
            }},
        ]
        rev_agg = await db.orders.aggregate(rev_pipeline).to_list(1)
        rev = rev_agg[0] if rev_agg else {"total_revenue": 0, "total_tax": 0, "total_tips": 0, "avg_order": 0}

        # Online orders
        online_orders = await db.online_orders.count_documents({
            "venue_id": venue_id,
            "created_at": {"$gte": start_iso, "$lte": end_iso}
        })

        online_rev_pipeline = [
            {"$match": {"venue_id": venue_id, "created_at": {"$gte": start_iso, "$lte": end_iso}}},
            {"$group": {"_id": None, "total": {"$sum": "$total_cents"}}},
        ]
        online_rev = await db.online_orders.aggregate(online_rev_pipeline).to_list(1)

        # Refunds
        refunds = await db.orders.count_documents({
            "venue_id": venue_id,
            "status": "refunded",
            "created_at": {"$gte": start_iso, "$lte": end_iso}
        })

        refund_pipeline = [
            {"$match": {"venue_id": venue_id, "status": "refunded", "created_at": {"$gte": start_iso, "$lte": end_iso}}},
            {"$group": {"_id": None, "total": {"$sum": "$refund_amount_cents"}}},
        ]
        refund_agg = await db.orders.aggregate(refund_pipeline).to_list(1)

        return {
            "success": True,
            "period": period,
            "data": {
                "total_orders": orders,
                "revenue_cents": rev.get("total_revenue", 0) or 0,
                "tax_cents": rev.get("total_tax", 0) or 0,
                "tips_cents": rev.get("total_tips", 0) or 0,
                "avg_order_cents": int(rev.get("avg_order", 0) or 0),
                "online_orders": online_orders,
                "online_revenue_cents": (online_rev[0]["total"] if online_rev else 0),
                "refunds": refunds,
                "refund_total_cents": (refund_agg[0]["total"] if refund_agg else 0),
            },
        }

    @router.get("/top-items/{venue_id}")
    async def get_top_items(
        venue_id: str,
        period: str = Query("today"),
        limit: int = Query(10),
        current_user: dict = Depends(get_current_user),
        db=Depends(get_database),
    ):
        """Get top-selling items."""
        now = datetime.now(timezone.utc)
        if period == "today":
            start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        elif period == "week":
            start = now - timedelta(days=7)
        else:
            start = now - timedelta(days=30)

        pipeline = [
            {"$match": {"venue_id": venue_id, "created_at": {"$gte": start.isoformat()}}},
            {"$unwind": "$items"},
            {"$group": {
                "_id": "$items.name",
                "total_qty": {"$sum": "$items.quantity"},
                "total_revenue": {"$sum": {"$multiply": ["$items.price_cents", "$items.quantity"]}},
            }},
            {"$sort": {"total_qty": -1}},
            {"$limit": limit},
        ]
        items = await db.orders.aggregate(pipeline).to_list(limit)
        return {
            "success": True,
            "data": [
                {"name": i["_id"], "quantity": i["total_qty"], "revenue_cents": i["total_revenue"]}
                for i in items
            ],
        }

    @router.get("/hourly/{venue_id}")
    async def get_hourly_breakdown(
        venue_id: str,
        period: str = Query("today"),
        current_user: dict = Depends(get_current_user),
        db=Depends(get_database),
    ):
        """Get hourly sales breakdown."""
        now = datetime.now(timezone.utc)
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)

        pipeline = [
            {"$match": {"venue_id": venue_id, "created_at": {"$gte": start.isoformat()}}},
            {"$addFields": {"hour": {"$substr": ["$created_at", 11, 2]}}},
            {"$group": {
                "_id": "$hour",
                "orders": {"$sum": 1},
                "revenue": {"$sum": "$total_cents"},
            }},
            {"$sort": {"_id": 1}},
        ]
        data = await db.orders.aggregate(pipeline).to_list(24)
        return {
            "success": True,
            "data": [{"hour": d["_id"], "orders": d["orders"], "revenue_cents": d["revenue"]} for d in data],
        }

    @router.get("/labor/{venue_id}")
    async def get_labor_stats(
        venue_id: str,
        current_user: dict = Depends(get_current_user),
        db=Depends(get_database),
    ):
        """Get labor cost percentage (sales vs clocked hours cost)."""
        now = datetime.now(timezone.utc)
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)

        # Revenue today
        rev_pipeline = [
            {"$match": {"venue_id": venue_id, "created_at": {"$gte": start.isoformat()}}},
            {"$group": {"_id": None, "total": {"$sum": "$total_cents"}}},
        ]
        rev = await db.orders.aggregate(rev_pipeline).to_list(1)
        revenue = rev[0]["total"] if rev else 0

        # Clocked hours today
        clockings = await db.clockings.find({
            "venue_id": venue_id,
            "clock_in": {"$gte": start.isoformat()},
        }).to_list(100)

        total_hours = 0.0
        for c in clockings:
            if c.get("clock_out"):
                try:
                    ci = datetime.fromisoformat(c["clock_in"].replace("Z", "+00:00"))
                    co = datetime.fromisoformat(c["clock_out"].replace("Z", "+00:00"))
                    total_hours += (co - ci).total_seconds() / 3600
                except (ValueError, TypeError):
                    pass

        # Assume avg €12/hr labor cost (configurable later)
        labor_cost_cents = int(total_hours * 12 * 100)
        labor_pct = (labor_cost_cents / revenue * 100) if revenue > 0 else 0

        return {
            "success": True,
            "data": {
                "revenue_cents": revenue,
                "clocked_hours": round(total_hours, 1),
                "labor_cost_cents": labor_cost_cents,
                "labor_percent": round(labor_pct, 1),
                "staff_on_clock": len([c for c in clockings if not c.get("clock_out")]),
            },
        }

    @router.get("/multi-location")
    async def get_multi_location(
        current_user: dict = Depends(get_current_user),
        db=Depends(get_database),
    ):
        """Multi-location comparison — all venues the user has access to."""
        org_id = current_user.get("organization_id") or current_user.get("org_id", "")
        venues = await db.venues.find(
            {"organization_id": org_id}, {"_id": 0, "id": 1, "name": 1}
        ).to_list(50)

        now = datetime.now(timezone.utc)
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)

        results = []
        for v in venues:
            pipeline = [
                {"$match": {"venue_id": v["id"], "created_at": {"$gte": start.isoformat()}}},
                {"$group": {
                    "_id": None,
                    "orders": {"$sum": 1},
                    "revenue": {"$sum": "$total_cents"},
                }},
            ]
            agg = await db.orders.aggregate(pipeline).to_list(1)
            d = agg[0] if agg else {"orders": 0, "revenue": 0}
            results.append({
                "venue_id": v["id"],
                "venue_name": v.get("name", v["id"]),
                "orders_today": d["orders"],
                "revenue_today_cents": d["revenue"],
            })

        results.sort(key=lambda x: x["revenue_today_cents"], reverse=True)
        return {"success": True, "data": results}

    return router
