"""
Unified Staff Routes — Shared data layer for POS + HR modules.

Returns enriched staff profiles with:
  - Core identity (name, email, role)
  - POS config (PIN, permissions, active register)
  - Shift history (current + upcoming + past)
  - POS transaction stats (orders, revenue, voids)
  - Clocking summary (hours this week/month)
"""
import logging
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
from datetime import datetime, timezone, timedelta

from core.database import db
from core.dependencies import get_current_user, check_venue_access

logger = logging.getLogger("staff_unified")


def create_staff_unified_router():
    router = APIRouter(tags=["staff-unified"])

    # ── GET /venues/{venue_id}/staff ─────────────────────────────────
    @router.get("/venues/{venue_id}/staff")
    async def get_staff(
        venue_id: str,
        include_pos: bool = True,
        include_shifts: bool = False,
        include_stats: bool = False,
        role: Optional[str] = None,
        search: Optional[str] = None,
        current_user: dict = Depends(get_current_user),
    ):
        """Get all staff for a venue, enriched with POS config + shift data."""
        await check_venue_access(current_user, venue_id)

        query: dict = {"venue_id": venue_id, "deleted_at": {"$exists": False}}
        if role:
            query["role"] = role.upper()
        if search:
            query["$or"] = [
                {"name": {"$regex": search, "$options": "i"}},
                {"email": {"$regex": search, "$options": "i"}},
            ]

        users = await db.users.find(query, {"_id": 0, "password": 0}).to_list(500)

        for user in users:
            uid = user.get("id", "")

            # POS config enrichment
            if include_pos:
                pos_cfg = await db.pos_user_config.find_one(
                    {"user_id": uid, "venue_id": venue_id}, {"_id": 0}
                )
                user["pos_config"] = pos_cfg or {
                    "pin": "",
                    "permissions": [],
                    "group": "",
                    "is_pos_active": False,
                }

            # Shift enrichment
            if include_shifts:
                now = datetime.now(timezone.utc).isoformat()
                upcoming = await db.shifts.find(
                    {"user_id": uid, "venue_id": venue_id, "start_time": {"$gte": now}},
                    {"_id": 0},
                ).sort("start_time", 1).to_list(5)

                current = await db.shifts.find(
                    {
                        "user_id": uid,
                        "venue_id": venue_id,
                        "start_time": {"$lte": now},
                        "end_time": {"$gte": now},
                    },
                    {"_id": 0},
                ).to_list(1)

                user["shifts"] = {
                    "current": current[0] if current else None,
                    "upcoming": upcoming,
                }

            # POS transaction stats
            if include_stats:
                user["stats"] = await _get_staff_stats(uid, venue_id)

        return {"staff": users, "total": len(users)}

    # ── GET /venues/{venue_id}/staff/{user_id} ───────────────────────
    @router.get("/venues/{venue_id}/staff/{user_id}")
    async def get_staff_detail(
        venue_id: str,
        user_id: str,
        current_user: dict = Depends(get_current_user),
    ):
        """Get detailed staff profile with full POS + HR data."""
        await check_venue_access(current_user, venue_id)

        user = await db.users.find_one(
            {"id": user_id, "venue_id": venue_id}, {"_id": 0, "password": 0}
        )
        if not user:
            raise HTTPException(status_code=404, detail="Staff member not found")

        # POS config
        pos_cfg = await db.pos_user_config.find_one(
            {"user_id": user_id, "venue_id": venue_id}, {"_id": 0}
        )
        user["pos_config"] = pos_cfg or {
            "pin": "",
            "permissions": [],
            "group": "",
            "is_pos_active": False,
        }

        # Shifts (current week)
        now = datetime.now(timezone.utc)
        week_start = (now - timedelta(days=now.weekday())).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        week_end = week_start + timedelta(days=7)

        shifts = await db.shifts.find(
            {
                "user_id": user_id,
                "venue_id": venue_id,
                "start_time": {"$gte": week_start.isoformat(), "$lte": week_end.isoformat()},
            },
            {"_id": 0},
        ).sort("start_time", 1).to_list(50)
        user["shifts_this_week"] = shifts

        # Clocking records (current week)
        clockings = await db.clocking_records.find(
            {
                "identity_id": user_id,
                "venue_id": venue_id,
                "clock_in": {"$gte": week_start.isoformat()},
            },
            {"_id": 0},
        ).to_list(50)
        user["clockings_this_week"] = clockings

        # POS stats
        user["stats"] = await _get_staff_stats(user_id, venue_id)

        return user

    # ── PUT /venues/{venue_id}/staff/{user_id}/pos-config ────────────
    @router.put("/venues/{venue_id}/staff/{user_id}/pos-config")
    async def update_pos_config(
        venue_id: str,
        user_id: str,
        config: dict,
        current_user: dict = Depends(get_current_user),
    ):
        """Update POS-specific config for a staff member (PIN, permissions, group)."""
        if current_user["role"] not in ["OWNER", "MANAGER"]:
            raise HTTPException(status_code=403, detail="Manager permission required")

        await check_venue_access(current_user, venue_id)

        # Validate user exists
        user = await db.users.find_one({"id": user_id, "venue_id": venue_id})
        if not user:
            raise HTTPException(status_code=404, detail="Staff member not found")

        # Upsert POS config
        pos_data = {
            "user_id": user_id,
            "venue_id": venue_id,
            "pin": config.get("pin", ""),
            "permissions": config.get("permissions", []),
            "group": config.get("group", ""),
            "is_pos_active": config.get("is_pos_active", True),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": current_user["id"],
        }

        await db.pos_user_config.update_one(
            {"user_id": user_id, "venue_id": venue_id},
            {"$set": pos_data},
            upsert=True,
        )

        return {"message": "POS config updated", "config": pos_data}

    # ── GET /venues/{venue_id}/shifts/weekly ─────────────────────────
    @router.get("/venues/{venue_id}/shifts/weekly")
    async def get_weekly_shifts(
        venue_id: str,
        week_offset: int = Query(0, description="0=current, -1=last, 1=next"),
        current_user: dict = Depends(get_current_user),
    ):
        """Get shifts for the week in a grid format (staff × day)."""
        await check_venue_access(current_user, venue_id)

        now = datetime.now(timezone.utc)
        week_start = (now - timedelta(days=now.weekday()) + timedelta(weeks=week_offset)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        week_end = week_start + timedelta(days=7)

        shifts = await db.shifts.find(
            {
                "venue_id": venue_id,
                "start_time": {"$gte": week_start.isoformat(), "$lte": week_end.isoformat()},
            },
            {"_id": 0},
        ).to_list(500)

        # Enrich with user names
        user_ids = list(set(s.get("user_id", "") for s in shifts))
        users = await db.users.find(
            {"id": {"$in": user_ids}},
            {"_id": 0, "id": 1, "name": 1, "role": 1},
        ).to_list(500)
        user_map = {u["id"]: u for u in users}

        for shift in shifts:
            uid = shift.get("user_id", "")
            u = user_map.get(uid, {})
            shift["user_name"] = u.get("name", "Unknown")
            shift["user_role"] = u.get("role", "")

        # Get all staff for the venue (to show empty rows too)
        all_staff = await db.users.find(
            {"venue_id": venue_id, "deleted_at": {"$exists": False}},
            {"_id": 0, "id": 1, "name": 1, "role": 1},
        ).to_list(200)

        return {
            "week_start": week_start.isoformat(),
            "week_end": week_end.isoformat(),
            "shifts": shifts,
            "staff": all_staff,
        }

    # ── GET /venues/{venue_id}/staff/{user_id}/activity ──────────────
    @router.get("/venues/{venue_id}/staff/{user_id}/activity")
    async def get_staff_activity(
        venue_id: str,
        user_id: str,
        days: int = Query(30, description="Lookback days"),
        current_user: dict = Depends(get_current_user),
    ):
        """Get complete activity log for a staff member: orders, voids, discounts, clocking."""
        await check_venue_access(current_user, venue_id)

        since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

        # POS orders by this user
        orders = await db.orders.find(
            {"venue_id": venue_id, "created_by": user_id, "created_at": {"$gte": since}},
            {"_id": 0, "id": 1, "total": 1, "status": 1, "created_at": 1, "items_count": 1},
        ).sort("created_at", -1).to_list(200)

        # Voids by this user
        voids = await db.voids.find(
            {"venue_id": venue_id, "voided_by": user_id, "created_at": {"$gte": since}},
            {"_id": 0},
        ).to_list(100)

        # Discounts applied by this user
        discounts = await db.discount_logs.find(
            {"venue_id": venue_id, "applied_by": user_id, "created_at": {"$gte": since}},
            {"_id": 0},
        ).to_list(100)

        # Shifts
        shifts = await db.shifts.find(
            {"venue_id": venue_id, "user_id": user_id, "start_time": {"$gte": since}},
            {"_id": 0},
        ).sort("start_time", -1).to_list(100)

        # Clocking
        clockings = await db.clocking_records.find(
            {"venue_id": venue_id, "identity_id": user_id, "clock_in": {"$gte": since}},
            {"_id": 0},
        ).to_list(100)

        return {
            "user_id": user_id,
            "period_days": days,
            "orders": orders,
            "order_count": len(orders),
            "total_revenue": sum(o.get("total", 0) for o in orders),
            "voids": voids,
            "void_count": len(voids),
            "discounts": discounts,
            "discount_count": len(discounts),
            "shifts": shifts,
            "shift_count": len(shifts),
            "clockings": clockings,
            "total_hours": _calc_hours(clockings),
        }

    # ── Internal helpers ─────────────────────────────────────────────

    async def _get_staff_stats(user_id: str, venue_id: str) -> dict:
        """Get POS transaction stats for a staff member (last 30 days)."""
        since = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()

        pipeline = [
            {"$match": {"venue_id": venue_id, "created_by": user_id, "created_at": {"$gte": since}}},
            {"$group": {
                "_id": None,
                "order_count": {"$sum": 1},
                "total_revenue": {"$sum": {"$toDouble": {"$ifNull": ["$total", 0]}}},
                "avg_order": {"$avg": {"$toDouble": {"$ifNull": ["$total", 0]}}},
            }},
        ]

        try:
            result = await db.orders.aggregate(pipeline).to_list(1)
            stats = result[0] if result else {}
        except Exception:
            stats = {}

        void_count = await db.voids.count_documents(
            {"venue_id": venue_id, "voided_by": user_id, "created_at": {"$gte": since}}
        )

        return {
            "orders_30d": stats.get("order_count", 0),
            "revenue_30d": round(stats.get("total_revenue", 0), 2),
            "avg_order_30d": round(stats.get("avg_order", 0), 2),
            "voids_30d": void_count,
        }

    def _calc_hours(clockings: list) -> float:
        """Calculate total hours from clocking records."""
        total = 0.0
        for c in clockings:
            try:
                cin = datetime.fromisoformat(c.get("clock_in", ""))
                cout_str = c.get("clock_out")
                if cout_str:
                    cout = datetime.fromisoformat(cout_str)
                    total += (cout - cin).total_seconds() / 3600
            except (ValueError, TypeError):
                continue
        return round(total, 1)

    return router
