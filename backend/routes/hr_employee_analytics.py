"""
HR Employee Analytics Routes - POS/KDS/System Usage per Employee
Provides deep performance analytics with date range filtering.
"""
from fastapi import APIRouter, Depends, Query
from typing import Optional
from datetime import datetime, timezone, timedelta

from core.database import db
from core.dependencies import get_current_user, check_venue_access


def create_hr_employee_analytics_router():
    router = APIRouter(tags=["hr_employee_analytics"])

    # ─── helpers ────────────────────────────────────────────────────
    def _parse_dates(from_date: Optional[str], to_date: Optional[str]):
        """Return (start_iso, end_iso) defaulting to last 30 days."""
        if to_date:
            end = datetime.fromisoformat(to_date.replace("Z", "+00:00"))
        else:
            end = datetime.now(timezone.utc)
        if from_date:
            start = datetime.fromisoformat(from_date.replace("Z", "+00:00"))
        else:
            start = end - timedelta(days=30)
        return start.isoformat(), end.isoformat()

    def _prev_period(start_iso: str, end_iso: str):
        """Calculate previous period of same length for comparison."""
        start = datetime.fromisoformat(start_iso)
        end = datetime.fromisoformat(end_iso)
        delta = end - start
        prev_end = start
        prev_start = prev_end - delta
        return prev_start.isoformat(), prev_end.isoformat()

    def _safe_div(a, b):
        return round(a / b, 2) if b else 0

    def _pct_change(current, previous):
        if previous == 0:
            return 100.0 if current > 0 else 0.0
        return round(((current - previous) / previous) * 100, 1)

    # ─── POS Analytics per Employee ─────────────────────────────────
    @router.get("/venues/{venue_id}/hr/employee-analytics/pos")
    async def get_pos_analytics(
        venue_id: str,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        employee_id: Optional[str] = None,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        start_iso, end_iso = _parse_dates(from_date, to_date)
        prev_start, prev_end = _prev_period(start_iso, end_iso)

        # Build base match
        match = {
            "venue_id": venue_id,
            "created_at": {"$gte": start_iso, "$lte": end_iso}
        }
        if employee_id:
            match["created_by"] = employee_id

        # Aggregate orders by employee
        pipeline = [
            {"$match": match},
            {"$group": {
                "_id": "$created_by",
                "total_orders": {"$sum": 1},
                "total_revenue": {"$sum": {"$ifNull": ["$total_cents", 0]}},
                "total_items": {"$sum": {"$size": {"$ifNull": ["$items", []]}}},
                "first_order": {"$min": "$created_at"},
                "last_order": {"$max": "$created_at"},
            }},
            {"$sort": {"total_orders": -1}}
        ]
        results = await db.orders.aggregate(pipeline).to_list(500)

        # Previous period for comparison
        prev_match = {
            "venue_id": venue_id,
            "created_at": {"$gte": prev_start, "$lte": prev_end}
        }
        prev_pipeline = [
            {"$match": prev_match},
            {"$group": {
                "_id": "$created_by",
                "total_orders": {"$sum": 1},
                "total_revenue": {"$sum": {"$ifNull": ["$total_cents", 0]}},
            }}
        ]
        prev_results = await db.orders.aggregate(prev_pipeline).to_list(500)
        prev_map = {r["_id"]: r for r in prev_results}

        # Enrich with employee names
        emp_ids = [r["_id"] for r in results if r["_id"]]
        employees = {}
        if emp_ids:
            emp_docs = await db.employees.find(
                {"id": {"$in": emp_ids}},
                {"_id": 0, "id": 1, "first_name": 1, "last_name": 1, "display_name": 1, "department": 1}
            ).to_list(500)
            employees = {e["id"]: e for e in emp_docs}

        # Team averages
        total_team_orders = sum(r["total_orders"] for r in results)
        total_team_revenue = sum(r["total_revenue"] for r in results)
        team_count = max(len(results), 1)

        employee_data = []
        for r in results:
            eid = r["_id"] or "unknown"
            emp = employees.get(eid, {})
            prev = prev_map.get(eid, {})
            avg_ticket = _safe_div(r["total_revenue"], r["total_orders"])
            employee_data.append({
                "employee_id": eid,
                "employee_name": emp.get("display_name") or f'{emp.get("first_name", "")} {emp.get("last_name", "")}'.strip() or eid,
                "department": emp.get("department", "—"),
                "total_orders": r["total_orders"],
                "total_revenue_cents": r["total_revenue"],
                "total_revenue": round(r["total_revenue"] / 100, 2),
                "avg_ticket_cents": int(avg_ticket),
                "avg_ticket": round(avg_ticket / 100, 2),
                "total_items_sold": r["total_items"],
                "orders_change_pct": _pct_change(r["total_orders"], prev.get("total_orders", 0)),
                "revenue_change_pct": _pct_change(r["total_revenue"], prev.get("total_revenue", 0)),
                "vs_team_avg_orders": _pct_change(r["total_orders"], _safe_div(total_team_orders, team_count)),
            })

        # Daily trend
        daily_pipeline = [
            {"$match": {"venue_id": venue_id, "created_at": {"$gte": start_iso, "$lte": end_iso}}},
            {"$group": {
                "_id": {"$substr": ["$created_at", 0, 10]},
                "orders": {"$sum": 1},
                "revenue": {"$sum": {"$ifNull": ["$total_cents", 0]}},
            }},
            {"$sort": {"_id": 1}}
        ]
        daily = await db.orders.aggregate(daily_pipeline).to_list(366)
        daily_trend = [{"date": d["_id"], "orders": d["orders"], "revenue": round(d["revenue"] / 100, 2)} for d in daily]

        return {
            "period": {"from": start_iso, "to": end_iso},
            "summary": {
                "total_orders": total_team_orders,
                "total_revenue": round(total_team_revenue / 100, 2),
                "avg_ticket": round(_safe_div(total_team_revenue, total_team_orders) / 100, 2),
                "active_staff": len(results),
                "avg_orders_per_staff": _safe_div(total_team_orders, team_count),
            },
            "employees": employee_data,
            "daily_trend": daily_trend,
        }

    # ─── KDS Analytics per Employee ─────────────────────────────────
    @router.get("/venues/{venue_id}/hr/employee-analytics/kds")
    async def get_kds_analytics(
        venue_id: str,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        employee_id: Optional[str] = None,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        start_iso, end_iso = _parse_dates(from_date, to_date)
        prev_start, prev_end = _prev_period(start_iso, end_iso)

        match = {
            "venue_id": venue_id,
            "created_at": {"$gte": start_iso, "$lte": end_iso}
        }
        if employee_id:
            match["claimed_by"] = employee_id

        pipeline = [
            {"$match": match},
            {"$group": {
                "_id": "$claimed_by",
                "tickets_total": {"$sum": 1},
                "tickets_completed": {
                    "$sum": {"$cond": [{"$in": ["$status", ["completed", "served", "delivered", "passed"]]}, 1, 0]}
                },
                "total_items": {"$sum": {"$size": {"$ifNull": ["$items", []]}}},
                "avg_completion_sec": {"$avg": {"$ifNull": ["$completion_time_sec", None]}},
                "on_time_count": {
                    "$sum": {"$cond": [{"$eq": ["$on_time", True]}, 1, 0]}
                },
            }},
            {"$sort": {"tickets_completed": -1}}
        ]
        results = await db.kds_tickets.aggregate(pipeline).to_list(500)

        # Previous period
        prev_match = {
            "venue_id": venue_id,
            "created_at": {"$gte": prev_start, "$lte": prev_end}
        }
        prev_pipeline = [
            {"$match": prev_match},
            {"$group": {
                "_id": "$claimed_by",
                "tickets_completed": {
                    "$sum": {"$cond": [{"$in": ["$status", ["completed", "served", "delivered", "passed"]]}, 1, 0]}
                },
                "avg_completion_sec": {"$avg": {"$ifNull": ["$completion_time_sec", None]}},
            }}
        ]
        prev_results = await db.kds_tickets.aggregate(prev_pipeline).to_list(500)
        prev_map = {r["_id"]: r for r in prev_results}

        # Employee names
        emp_ids = [r["_id"] for r in results if r["_id"]]
        employees = {}
        if emp_ids:
            emp_docs = await db.employees.find(
                {"id": {"$in": emp_ids}},
                {"_id": 0, "id": 1, "first_name": 1, "last_name": 1, "display_name": 1, "department": 1}
            ).to_list(500)
            employees = {e["id"]: e for e in emp_docs}

        total_tickets = sum(r["tickets_completed"] for r in results)
        all_avg_times = [r["avg_completion_sec"] for r in results if r.get("avg_completion_sec")]
        team_avg_time = _safe_div(sum(all_avg_times), len(all_avg_times)) if all_avg_times else 0
        team_count = max(len(results), 1)

        employee_data = []
        for r in results:
            eid = r["_id"] or "unknown"
            emp = employees.get(eid, {})
            prev = prev_map.get(eid, {})
            avg_time = r.get("avg_completion_sec") or 0
            items_per_hour = _safe_div(r["total_items"], max(r["tickets_completed"], 1)) * (3600 / max(avg_time, 1)) if avg_time else 0
            on_time_rate = _safe_div(r["on_time_count"] * 100, r["tickets_total"])

            employee_data.append({
                "employee_id": eid,
                "employee_name": emp.get("display_name") or f'{emp.get("first_name", "")} {emp.get("last_name", "")}'.strip() or eid,
                "department": emp.get("department", "—"),
                "tickets_total": r["tickets_total"],
                "tickets_completed": r["tickets_completed"],
                "total_items": r["total_items"],
                "avg_completion_sec": round(avg_time, 1),
                "avg_completion_min": round(avg_time / 60, 1) if avg_time else 0,
                "items_per_hour": round(items_per_hour, 1),
                "on_time_rate": round(on_time_rate, 1),
                "vs_team_avg_sec": round(avg_time - team_avg_time, 1) if avg_time else None,
                "speed_change_pct": _pct_change(
                    prev.get("avg_completion_sec", avg_time) or 1,
                    avg_time or 1
                ),
                "volume_change_pct": _pct_change(
                    r["tickets_completed"],
                    prev.get("tickets_completed", 0)
                ),
            })

        # Hourly distribution
        hourly_pipeline = [
            {"$match": {"venue_id": venue_id, "created_at": {"$gte": start_iso, "$lte": end_iso}}},
            {"$group": {
                "_id": {"$substr": ["$created_at", 11, 2]},
                "count": {"$sum": 1},
            }},
            {"$sort": {"_id": 1}}
        ]
        hourly = await db.kds_tickets.aggregate(hourly_pipeline).to_list(24)
        hourly_dist = [{"hour": h["_id"], "tickets": h["count"]} for h in hourly]

        return {
            "period": {"from": start_iso, "to": end_iso},
            "summary": {
                "total_tickets": total_tickets,
                "team_avg_completion_sec": round(team_avg_time, 1),
                "team_avg_completion_min": round(team_avg_time / 60, 1) if team_avg_time else 0,
                "active_kitchen_staff": len(results),
                "avg_tickets_per_staff": _safe_div(total_tickets, team_count),
            },
            "employees": employee_data,
            "hourly_distribution": hourly_dist,
        }

    # ─── System Usage Analytics per Employee ────────────────────────
    @router.get("/venues/{venue_id}/hr/employee-analytics/system")
    async def get_system_analytics(
        venue_id: str,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        employee_id: Optional[str] = None,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        start_iso, end_iso = _parse_dates(from_date, to_date)

        # Get all employees
        emp_query = {"venue_id": venue_id}
        if employee_id:
            emp_query["id"] = employee_id
        emp_docs = await db.employees.find(
            emp_query,
            {"_id": 0, "id": 1, "first_name": 1, "last_name": 1, "display_name": 1, "department": 1, "role": 1}
        ).to_list(500)
        emp_map = {e["id"]: e for e in emp_docs}
        emp_ids = list(emp_map.keys())

        # 1. Recipes created per employee
        recipe_match = {"venue_id": venue_id, "created_at": {"$gte": start_iso, "$lte": end_iso}}
        if employee_id:
            recipe_match["created_by"] = employee_id
        recipe_pipeline = [
            {"$match": recipe_match},
            {"$group": {
                "_id": "$created_by",
                "recipes_created": {"$sum": 1},
            }}
        ]
        recipe_results = await db.recipes_engineered.aggregate(recipe_pipeline).to_list(500)
        recipe_map = {r["_id"]: r["recipes_created"] for r in recipe_results}

        # 2. Clocking summary per employee
        clock_match = {"venue_id": venue_id, "clock_in": {"$gte": start_iso, "$lte": end_iso}}
        if employee_id:
            clock_match["employee_id"] = employee_id
        clock_pipeline = [
            {"$match": clock_match},
            {"$group": {
                "_id": "$employee_id",
                "total_shifts": {"$sum": 1},
                "total_hours": {"$sum": {"$ifNull": ["$total_hours", 0]}},
                "late_count": {"$sum": {"$cond": [{"$eq": ["$status", "late"]}, 1, 0]}},
                "on_time_count": {"$sum": {"$cond": [{"$in": ["$status", ["on_time", "approved", "completed"]]}, 1, 0]}},
            }}
        ]
        clock_results = await db["clocking_records"].aggregate(clock_pipeline).to_list(500)
        clock_map = {r["_id"]: r for r in clock_results}

        # 3. Audit log — logins / feature usage per employee
        audit_match = {"venue_id": venue_id, "created_at": {"$gte": start_iso, "$lte": end_iso}}
        if employee_id:
            audit_match["user_id"] = employee_id
        audit_pipeline = [
            {"$match": audit_match},
            {"$group": {
                "_id": "$user_id",
                "total_actions": {"$sum": 1},
                "unique_features": {"$addToSet": "$action"},
            }}
        ]
        audit_results = await db.audit_logs.aggregate(audit_pipeline).to_list(500)
        audit_map = {r["_id"]: r for r in audit_results}

        # 4. Orders taken per employee (POS usage count)
        order_match = {"venue_id": venue_id, "created_at": {"$gte": start_iso, "$lte": end_iso}}
        if employee_id:
            order_match["created_by"] = employee_id
        order_pipeline = [
            {"$match": order_match},
            {"$group": {
                "_id": "$created_by",
                "orders_taken": {"$sum": 1},
            }}
        ]
        order_results = await db.orders.aggregate(order_pipeline).to_list(500)
        order_map = {r["_id"]: r["orders_taken"] for r in order_results}

        # Compile per employee
        all_ids = set(emp_ids) | set(recipe_map.keys()) | set(clock_map.keys()) | set(audit_map.keys()) | set(order_map.keys())
        employee_data = []
        for eid in all_ids:
            if not eid:
                continue
            emp = emp_map.get(eid, {})
            clock = clock_map.get(eid, {})
            audit = audit_map.get(eid, {})
            employee_data.append({
                "employee_id": eid,
                "employee_name": emp.get("display_name") or f'{emp.get("first_name", "")} {emp.get("last_name", "")}'.strip() or eid,
                "department": emp.get("department", "—"),
                "role": emp.get("role", "—"),
                "recipes_created": recipe_map.get(eid, 0),
                "orders_taken": order_map.get(eid, 0),
                "total_shifts": clock.get("total_shifts", 0),
                "total_hours_worked": round(clock.get("total_hours", 0), 1),
                "late_arrivals": clock.get("late_count", 0),
                "on_time_arrivals": clock.get("on_time_count", 0),
                "attendance_rate": round(
                    _safe_div(clock.get("on_time_count", 0) * 100, clock.get("total_shifts", 0)), 1
                ) if clock.get("total_shifts") else 0,
                "total_system_actions": audit.get("total_actions", 0),
                "features_used_count": len(audit.get("unique_features", [])),
            })

        # Sort by total activity (orders + tickets + actions)
        employee_data.sort(key=lambda x: x["orders_taken"] + x["total_system_actions"], reverse=True)

        # Global summary
        total_recipes = sum(e["recipes_created"] for e in employee_data)
        total_orders = sum(e["orders_taken"] for e in employee_data)
        total_hours = sum(e["total_hours_worked"] for e in employee_data)
        total_actions = sum(e["total_system_actions"] for e in employee_data)

        return {
            "period": {"from": start_iso, "to": end_iso},
            "summary": {
                "total_recipes_created": total_recipes,
                "total_orders_taken": total_orders,
                "total_hours_worked": round(total_hours, 1),
                "total_system_actions": total_actions,
                "active_employees": len(employee_data),
            },
            "employees": employee_data,
        }

    # ─── Combined Dashboard Summary ─────────────────────────────────
    @router.get("/venues/{venue_id}/hr/employee-analytics/summary")
    async def get_combined_summary(
        venue_id: str,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        start_iso, end_iso = _parse_dates(from_date, to_date)
        prev_start, prev_end = _prev_period(start_iso, end_iso)

        # Current period counts
        order_count = await db.orders.count_documents({
            "venue_id": venue_id, "created_at": {"$gte": start_iso, "$lte": end_iso}
        })
        ticket_count = await db.kds_tickets.count_documents({
            "venue_id": venue_id, "created_at": {"$gte": start_iso, "$lte": end_iso}
        })
        recipe_count = await db.recipes_engineered.count_documents({
            "venue_id": venue_id, "created_at": {"$gte": start_iso, "$lte": end_iso}
        })
        clock_count = await db["clocking_records"].count_documents({
            "venue_id": venue_id, "clock_in": {"$gte": start_iso, "$lte": end_iso}
        })
        active_employees = await db.employees.count_documents({
            "venue_id": venue_id, "status": {"$in": ["active", "Active"]}
        })

        # Previous period counts
        prev_orders = await db.orders.count_documents({
            "venue_id": venue_id, "created_at": {"$gte": prev_start, "$lte": prev_end}
        })
        prev_tickets = await db.kds_tickets.count_documents({
            "venue_id": venue_id, "created_at": {"$gte": prev_start, "$lte": prev_end}
        })

        # Revenue
        rev_pipeline = [
            {"$match": {"venue_id": venue_id, "created_at": {"$gte": start_iso, "$lte": end_iso}}},
            {"$group": {"_id": None, "total": {"$sum": {"$ifNull": ["$total_cents", 0]}}}}
        ]
        rev_result = await db.orders.aggregate(rev_pipeline).to_list(1)
        total_revenue = rev_result[0]["total"] if rev_result else 0

        # KDS avg time
        avg_time_pipeline = [
            {"$match": {"venue_id": venue_id, "created_at": {"$gte": start_iso, "$lte": end_iso},
                        "completion_time_sec": {"$exists": True, "$gt": 0}}},
            {"$group": {"_id": None, "avg": {"$avg": "$completion_time_sec"}}}
        ]
        avg_result = await db.kds_tickets.aggregate(avg_time_pipeline).to_list(1)
        avg_kds_time = avg_result[0]["avg"] if avg_result else 0

        return {
            "period": {"from": start_iso, "to": end_iso},
            "kpis": [
                {"label": "POS Orders", "value": order_count, "change_pct": _pct_change(order_count, prev_orders), "icon": "shopping-cart"},
                {"label": "KDS Tickets", "value": ticket_count, "change_pct": _pct_change(ticket_count, prev_tickets), "icon": "flame"},
                {"label": "Avg KDS Time", "value": f"{round(avg_kds_time / 60, 1)}m", "change_pct": 0, "icon": "timer"},
                {"label": "Revenue", "value": f"€{round(total_revenue / 100, 2):,.2f}", "change_pct": 0, "icon": "euro"},
                {"label": "Recipes Created", "value": recipe_count, "change_pct": 0, "icon": "book-open"},
                {"label": "Active Employees", "value": active_employees, "change_pct": 0, "icon": "users"},
                {"label": "Clock-ins", "value": clock_count, "change_pct": 0, "icon": "clock"},
            ]
        }

    return router
