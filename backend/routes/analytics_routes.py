"""
Combined analytics endpoints for KDS, Inventory, Recruitment, and Accounting.
These endpoints aggregate data from existing MongoDB collections for dashboard/report pages.
"""
from fastapi import APIRouter, Depends, Query
from typing import Optional
from datetime import datetime, timezone, timedelta

from core.database import db
from core.dependencies import get_current_user


def create_analytics_routes():
    router = APIRouter(tags=["analytics"])

    # =========================================================================
    # KDS ANALYTICS
    # =========================================================================
    @router.get("/kds/analytics")
    async def kds_analytics(
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        """KDS performance metrics, hourly throughput, and station performance."""
        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

        # Count today's KDS tickets
        total_tickets = await db.kds_tickets.count_documents({
            "venue_id": venue_id,
            "created_at": {"$gte": today_start.isoformat()}
        })

        # Delayed tickets
        delayed = await db.kds_tickets.count_documents({
            "venue_id": venue_id,
            "created_at": {"$gte": today_start.isoformat()},
            "is_delayed": True
        })

        # Average prep time from completed tickets
        pipeline_avg = [
            {"$match": {
                "venue_id": venue_id,
                "created_at": {"$gte": today_start.isoformat()},
                "prep_time_seconds": {"$exists": True, "$gt": 0}
            }},
            {"$group": {"_id": None, "avg_prep": {"$avg": "$prep_time_seconds"}}}
        ]
        avg_result = await db.kds_tickets.aggregate(pipeline_avg).to_list(1)
        avg_prep_seconds = avg_result[0]["avg_prep"] if avg_result else 0
        avg_min = int(avg_prep_seconds // 60)
        avg_sec = int(avg_prep_seconds % 60)

        # Hourly throughput
        pipeline_hourly = [
            {"$match": {
                "venue_id": venue_id,
                "created_at": {"$gte": today_start.isoformat()}
            }},
            {"$addFields": {
                "hour": {"$substr": ["$created_at", 11, 2]}
            }},
            {"$group": {"_id": "$hour", "orders": {"$sum": 1}}},
            {"$sort": {"_id": 1}}
        ]
        hourly_cursor = db.kds_tickets.aggregate(pipeline_hourly)
        hourly_throughput = [{"time": f"{item['_id']}:00", "orders": item["orders"]} async for item in hourly_cursor]

        # Station performance
        pipeline_station = [
            {"$match": {
                "venue_id": venue_id,
                "created_at": {"$gte": today_start.isoformat()},
                "station": {"$exists": True}
            }},
            {"$group": {
                "_id": "$station",
                "tickets": {"$sum": 1},
                "avg_time": {"$avg": "$prep_time_seconds"}
            }},
            {"$sort": {"tickets": -1}}
        ]
        station_cursor = db.kds_tickets.aggregate(pipeline_station)
        station_performance = []
        async for item in station_cursor:
            station_performance.append({
                "name": item["_id"],
                "station": item["_id"],
                "tickets": item["tickets"],
                "avg_time": round((item["avg_time"] or 0) / 60, 1),
                "status": "warning" if (item["avg_time"] or 0) > 720 else "good"  # >12min = warning
            })

        # Find peak hour
        peak_hour = "N/A"
        peak_tickets = 0
        for h in hourly_throughput:
            if h["orders"] > peak_tickets:
                peak_tickets = h["orders"]
                peak_hour = h["time"]

        # Active stations count
        active_stations = len(station_performance)

        return {
            "metrics": {
                "avg_prep_time": f"{avg_min}m {avg_sec:02d}s" if avg_prep_seconds > 0 else "0m 00s",
                "throughput_per_hour": round(total_tickets / max(1, (now - today_start).seconds / 3600)),
                "active_stations": active_stations,
                "delayed_orders": delayed,
                "total_tickets": total_tickets,
                "peak_time": peak_hour,
                "peak_tickets": peak_tickets,
                "delay_rate": round((delayed / max(1, total_tickets)) * 100, 1)
            },
            "hourly_throughput": hourly_throughput,
            "station_performance": station_performance
        }

    # =========================================================================
    # INVENTORY ANALYTICS
    # =========================================================================
    @router.get("/inventory/analytics")
    async def inventory_analytics(
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        """Inventory metrics, waste distribution, low stock items, waste trend, cost variance."""
        # Total items
        total_items = await db.inventory_items.count_documents({"venue_id": venue_id})

        # Low stock items
        low_stock_pipeline = [
            {"$match": {
                "venue_id": venue_id,
                "$expr": {"$lt": ["$current_stock", "$reorder_level"]}
            }}
        ]
        low_stock_items = await db.inventory_items.aggregate(low_stock_pipeline).to_list(100)
        low_stock_count = len(low_stock_items)

        # Format low stock items for frontend
        low_stock_formatted = [{
            "name": item.get("name", "Unknown"),
            "current": item.get("current_stock", 0),
            "min": item.get("reorder_level", 0),
            "unit": item.get("base_unit", "unit"),
            "cost": item.get("cost_per_unit", 0) * item.get("current_stock", 0)
        } for item in low_stock_items]

        # Inventory total value
        value_pipeline = [
            {"$match": {"venue_id": venue_id}},
            {"$group": {"_id": None, "total": {"$sum": {"$multiply": ["$current_stock", "$cost_per_unit"]}}}}
        ]
        value_result = await db.inventory_items.aggregate(value_pipeline).to_list(1)
        inventory_value = round(value_result[0]["total"], 2) if value_result else 0

        # Waste data (this week)
        week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
        waste_pipeline = [
            {"$match": {"venue_id": venue_id, "created_at": {"$gte": week_ago}}},
            {"$group": {"_id": "$reason", "value": {"$sum": "$cost"}}}
        ]
        waste_cursor = db.waste_logs.aggregate(waste_pipeline)
        waste_distribution = [{"name": item["_id"] or "Other", "value": round(item["value"], 2)} async for item in waste_cursor]
        waste_cost_week = sum(w["value"] for w in waste_distribution)

        # Waste trend by day (last 7 days)
        waste_trend_pipeline = [
            {"$match": {"venue_id": venue_id, "created_at": {"$gte": week_ago}}},
            {"$addFields": {"day": {"$substr": ["$created_at", 0, 10]}}},
            {"$group": {"_id": "$day", "waste": {"$sum": "$quantity"}, "cost": {"$sum": "$cost"}}},
            {"$sort": {"_id": 1}}
        ]
        waste_trend_cursor = db.waste_logs.aggregate(waste_trend_pipeline)
        waste_trend = [{"date": item["_id"][-5:], "waste": item["waste"], "cost": round(item["cost"], 2)} async for item in waste_trend_cursor]

        # Cost variance (from stock adjustments)
        variance_pipeline = [
            {"$match": {"venue_id": venue_id}},
            {"$group": {"_id": "$item_name", "variance": {"$sum": "$qty_delta"}}},
            {"$sort": {"variance": 1}},
            {"$limit": 5}
        ]
        variance_cursor = db.stock_adjustments.aggregate(variance_pipeline)
        cost_variance = [{"item": item["_id"] or "Unknown", "variance": round(item["variance"], 1)} async for item in variance_cursor]

        return {
            "metrics": {
                "total_items": total_items,
                "low_stock_alerts": low_stock_count,
                "waste_cost_week": round(waste_cost_week, 2),
                "inventory_value": round(inventory_value, 2)
            },
            "waste_distribution": waste_distribution,
            "low_stock_items": low_stock_formatted,
            "waste_trend": waste_trend,
            "cost_variance": cost_variance,
            "stock_levels": [{
                "item": item.get("name", "Unknown"),
                "current": item.get("current_stock", 0),
                "min": item.get("reorder_level", 0),
                "status": "critical" if item.get("current_stock", 0) < item.get("reorder_level", 0) * 0.5 else "low" if item.get("current_stock", 0) < item.get("reorder_level", 0) else "good",
                "cost": round(item.get("cost_per_unit", 0) * item.get("current_stock", 0), 2)
            } for item in low_stock_items]
        }

    # =========================================================================
    # RECRUITMENT / APPLICANTS
    # =========================================================================
    @router.get("/hr/applicants")
    async def list_applicants(
        venue_id: str = Query(...),
        status: Optional[str] = None,
        current_user: dict = Depends(get_current_user)
    ):
        """List applicants with metrics for recruitment dashboard."""
        query = {"venue_id": venue_id}
        if status:
            query["status"] = status

        applicants = await db.applicants.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)

        # Metrics
        total = len(applicants)
        open_roles = len(set(a.get("role", "") for a in applicants if a.get("status") != "Hired"))
        interviewing_today = sum(1 for a in applicants if a.get("status") == "Interviewing")

        return {
            "applicants": applicants,
            "metrics": {
                "open_roles": open_roles,
                "total_applicants": total,
                "interviews_today": interviewing_today
            }
        }

    # =========================================================================
    # ACCOUNTING EXPORTS
    # =========================================================================
    @router.get("/accounting/exports")
    async def list_accounting_exports(
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        """List accounting export history."""
        exports = await db.accounting_exports.find(
            {"venue_id": venue_id},
            {"_id": 0}
        ).sort("created_at", -1).to_list(100)
        return {"exports": exports}

    @router.post("/accounting/exports")
    async def create_accounting_export(
        venue_id: str = Query(...),
        body: dict = {},
        current_user: dict = Depends(get_current_user)
    ):
        """Record an accounting export."""
        import uuid
        export_doc = {
            "id": str(uuid.uuid4()),
            "venue_id": venue_id,
            "date": datetime.now(timezone.utc).isoformat().replace("T", " ")[:16],
            "type": body.get("target", "xero").capitalize(),
            "period": body.get("range", "last_month").replace("_", " ").title(),
            "status": "Success",
            "user": current_user.get("name", "Admin"),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.accounting_exports.insert_one(export_doc)
        return {"ok": True, "export": {k: v for k, v in export_doc.items() if k != "_id"}}

    # =========================================================================
    # PROCUREMENT - RFQs
    # =========================================================================
    @router.get("/procurement/rfqs")
    async def list_rfqs(
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        """List Request for Quotation documents."""
        rfqs = await db.rfqs.find(
            {"venue_id": venue_id},
            {"_id": 0}
        ).sort("created_at", -1).to_list(100)
        return {"rfqs": rfqs}

    # =========================================================================
    # CENTRAL KITCHEN - INTERNAL ORDERS
    # =========================================================================
    @router.get("/central-kitchen/orders")
    async def list_internal_orders(
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        """List internal supply requisitions between branches and central kitchen."""
        orders = await db.internal_orders.find(
            {"venue_id": venue_id},
            {"_id": 0}
        ).sort("created_at", -1).to_list(100)

        total = len(orders)
        pending = sum(1 for o in orders if o.get("status") == "Pending")
        in_transit = sum(1 for o in orders if o.get("status") == "Shipped")

        return {
            "orders": orders,
            "summary": {
                "total_requests": total,
                "pending_approval": pending,
                "in_transit": in_transit
            }
        }

    # =========================================================================
    # SYSTEM DASHBOARD (Admin Control Tower)
    # =========================================================================
    @router.get("/admin/dashboard-stats")
    async def dashboard_stats(
        venue_id: str = Query(None),
        current_user: dict = Depends(get_current_user)
    ):
        """Aggregated system dashboard stats for control tower."""
        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

        # Today's revenue from orders
        revenue_pipeline = [
            {"$match": {
                "created_at": {"$gte": today_start.isoformat()},
                **({"venue_id": venue_id} if venue_id else {})
            }},
            {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}}
        ]
        rev_result = await db.orders.aggregate(revenue_pipeline).to_list(1)
        revenue = round(rev_result[0]["total"], 2) if rev_result else 0

        # Active KDS orders today
        active_orders = await db.kds_tickets.count_documents({
            **({"venue_id": venue_id} if venue_id else {}),
            "status": {"$in": ["pending", "in_progress", "PENDING", "IN_PROGRESS"]}
        })

        # Audit log stream (recent 20)
        logs = await db.audit_logs.find(
            {**({"venue_id": venue_id} if venue_id else {})},
            {"_id": 0}
        ).sort("created_at", -1).to_list(20)

        return {
            "stats": {
                "revenue": revenue,
                "activeOrders": active_orders,
                "onlineDevices": 0,
                "syncHealth": "100%"
            },
            "logs": logs
        }

    return router
