"""Analytics Routes - Business Intelligence & KPIs"""
from fastapi import APIRouter, Depends, Query
from datetime import datetime, timezone, timedelta
from core.database import db
from core.dependencies import get_current_user

def create_analytics_router():
    router = APIRouter(tags=["Analytics"])

    @router.get("/analytics/dashboard")
    async def get_dashboard_analytics(
        venue_id: str = Query(...),
        period: str = Query("today"),
        current_user: dict = Depends(get_current_user)
    ):
        """Get dashboard analytics KPIs."""
        now = datetime.now(timezone.utc)
        
        if period == "today":
            start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        elif period == "week":
            start = now - timedelta(days=7)
        elif period == "month":
            start = now - timedelta(days=30)
        else:
            start = now.replace(hour=0, minute=0, second=0, microsecond=0)

        # Aggregate order stats
        orders = await db.orders.count_documents({
            "venue_id": venue_id,
            "created_at": {"$gte": start.isoformat()}
        })

        revenue_pipeline = [
            {"$match": {"venue_id": venue_id, "created_at": {"$gte": start.isoformat()}}},
            {"$group": {"_id": None, "total": {"$sum": "$total_cents"}}}
        ]
        revenue_result = await db.orders.aggregate(revenue_pipeline).to_list(1)
        total_revenue = revenue_result[0]["total"] if revenue_result else 0

        guests = await db.orders.count_documents({
            "venue_id": venue_id,
            "created_at": {"$gte": start.isoformat()},
            "guest_id": {"$exists": True, "$ne": None}
        })

        return {
            "period": period,
            "venueId": venue_id,
            "kpis": {
                "totalOrders": orders,
                "totalRevenueCents": total_revenue,
                "avgOrderCents": total_revenue // orders if orders > 0 else 0,
                "totalGuests": guests,
                "avgRevenuePerGuest": total_revenue // guests if guests > 0 else 0,
            }
        }

    @router.get("/analytics/revenue-trend")
    async def get_revenue_trend(
        venue_id: str = Query(...),
        days: int = Query(7),
        current_user: dict = Depends(get_current_user)
    ):
        """Get daily revenue trend."""
        now = datetime.now(timezone.utc)
        start = now - timedelta(days=days)

        pipeline = [
            {"$match": {"venue_id": venue_id, "created_at": {"$gte": start.isoformat()}}},
            {"$group": {
                "_id": {"$substr": ["$created_at", 0, 10]},
                "revenue": {"$sum": "$total_cents"},
                "orders": {"$sum": 1}
            }},
            {"$sort": {"_id": 1}}
        ]
        results = await db.orders.aggregate(pipeline).to_list(100)

        return {
            "venueId": venue_id,
            "days": days,
            "trend": [{"date": r["_id"], "revenueCents": r["revenue"], "orders": r["orders"]} for r in results]
        }

    return router
