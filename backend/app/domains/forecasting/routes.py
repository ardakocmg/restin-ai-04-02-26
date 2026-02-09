"""
📊 Forecasting Routes — AI-Driven Demand Prediction

Endpoints:
  GET  /api/forecasting/weekly    — Weekly sales forecast from real order data
  GET  /api/forecasting/summary   — Summary KPIs for forecasting dashboard
"""
from fastapi import APIRouter, Query
from datetime import datetime, timezone, timedelta
from app.core.database import get_database
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/forecasting", tags=["forecasting"])


@router.get("/weekly")
async def weekly_forecast(venue_id: str = Query(...)):
    """Generate weekly forecast based on actual order history."""
    db = get_database()

    now = datetime.now(timezone.utc)
    days_of_week = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

    # Get orders from last 4 weeks to build pattern
    four_weeks_ago = (now - timedelta(days=28)).isoformat()
    orders = await db.orders.find({
        "venue_id": venue_id,
        "created_at": {"$gte": four_weeks_ago}
    }).to_list(length=2000)

    # Group revenue by day of week
    day_totals: dict[int, list[int]] = {i: [] for i in range(7)}
    for o in orders:
        try:
            dt = datetime.fromisoformat(o.get("created_at", "").replace("Z", "+00:00"))
            day_idx = dt.weekday()  # 0=Mon, 6=Sun
            day_totals[day_idx].append(o.get("total_cents", 0))
        except Exception:
            continue

    # Build forecast: average of last weeks + 5% growth factor
    result = []
    for i in range(7):
        actuals = day_totals[i]
        avg_actual = sum(actuals) // max(len(actuals), 1) if actuals else 0
        # Forecast = weighted average with 5% growth
        forecast = int(avg_actual * 1.05) if avg_actual > 0 else 0
        result.append({
            "date": days_of_week[i],
            "actual": avg_actual,
            "forecast": forecast,
            "order_count": len(actuals),
        })

    return result


@router.get("/summary")
async def forecast_summary(venue_id: str = Query(...)):
    """Get weekly forecast summary KPIs."""
    db = get_database()
    now = datetime.now(timezone.utc)

    # Get this week's orders
    week_start = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0)
    this_week_orders = await db.orders.find({
        "venue_id": venue_id,
        "created_at": {"$gte": week_start.isoformat()}
    }).to_list(length=500)

    this_week_revenue = sum(o.get("total_cents", 0) for o in this_week_orders)

    # Get last week for comparison
    last_week_start = (week_start - timedelta(days=7)).isoformat()
    last_week_orders = await db.orders.find({
        "venue_id": venue_id,
        "created_at": {"$gte": last_week_start, "$lt": week_start.isoformat()}
    }).to_list(length=500)

    last_week_revenue = sum(o.get("total_cents", 0) for o in last_week_orders)

    # Predicted next 7 days = this week trend + 5%
    predicted_revenue = int(max(this_week_revenue, last_week_revenue) * 1.05)

    # Staffing recommendation based on average orders
    avg_daily_orders = len(this_week_orders) / max(now.weekday() + 1, 1)
    extra_staff = 0
    if avg_daily_orders > 30:
        extra_staff = 3
    elif avg_daily_orders > 20:
        extra_staff = 2
    elif avg_daily_orders > 10:
        extra_staff = 1

    # Revenue growth comparison
    growth_pct = 0
    if last_week_revenue > 0:
        growth_pct = round(((this_week_revenue - last_week_revenue) / last_week_revenue) * 100, 1)

    return {
        "venue_id": venue_id,
        "predicted_revenue_cents": predicted_revenue,
        "this_week_revenue_cents": this_week_revenue,
        "last_week_revenue_cents": last_week_revenue,
        "growth_pct": growth_pct,
        "staffing_recommendation": f"+{extra_staff} Servers (Fri/Sat)" if extra_staff > 0 else "Current staffing sufficient",
        "total_orders_this_week": len(this_week_orders),
        "avg_daily_orders": round(avg_daily_orders, 1),
    }
