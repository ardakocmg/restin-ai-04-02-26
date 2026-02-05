from fastapi import APIRouter, Depends, Query
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from core.database import get_database
from services.auth_service import get_current_user
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/admin/dashboard-stats")
async def get_dashboard_stats(
    venue_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get live system stats for the dashboard.
    REAL DATA ONLY.
    """
    db = get_database()
    effective_venue_id = venue_id or current_user.get("venue_id")
    
    # 1. Calculate Today's Revenue
    now = datetime.now(timezone.utc)
    start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
    
    pipeline = [
        {"$match": {
            "venue_id": effective_venue_id,
            "status": {"$in": ["closed", "paid"]}, # Only counted confirmed sales
            "created_at": {"$gte": start_of_day.isoformat()}
        }},
        {"$group": {
            "_id": None,
            "total_revenue": {"$sum": "$total_amount"},
            "count": {"$sum": 1}
        }}
    ]
    
    revenue_res = await db.orders.aggregate(pipeline).to_list(1)
    revenue = revenue_res[0]["total_revenue"] if revenue_res else 0.0
    
    # 2. Active Orders
    active_orders = await db.orders.count_documents({
        "venue_id": effective_venue_id,
        "status": {"$in": ["open", "sent", "printing", "kitchen"]}
    })
    
    # 3. Logs (Audit Stream)
    logs = await db.audit_logs.find(
        {"venue_id": effective_venue_id}
    ).sort("created_at", -1).limit(10).to_list(10)
    
    # Format logs for frontend
    formatted_logs = []
    for log in logs:
        formatted_logs.append({
            "id": log.get("id"),
            "action": log.get("action"),
            "user": log.get("user_name", "System"),
            "details": log.get("details", ""),
            "time": log.get("created_at")
        })

    return {
        "stats": {
            "revenue": revenue,
            "activeOrders": active_orders,
            "onlineDevices": 1, # Placeholder: Needs real websocket tracking
            "syncHealth": "Good" # Placeholder
        },
        "logs": formatted_logs
    }


@router.get("/analytics/pos-sales")
async def get_pos_sales_report(
    venue_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get detailed sales report.
    REAL DATA ONLY.
    """
    db = get_database()
    effective_venue_id = venue_id or current_user.get("venue_id")
    
    now = datetime.now(timezone.utc)
    start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Get all closed orders for today
    orders = await db.orders.find({
        "venue_id": effective_venue_id,
        "status": {"$in": ["closed", "paid"]},
        "created_at": {"$gte": start_of_day.isoformat()}
    }).to_list(1000)
    
    total_revenue = 0
    total_orders = len(orders)
    item_sales = {}
    
    # Process orders in memory (simpler than complex aggregation for now)
    for order in orders:
        total_revenue += order.get("total_amount", 0)
        for item in order.get("items", []):
            name = item.get("menu_item_name", "Unknown")
            qty = item.get("quantity", 1)
            price = item.get("final_price", 0) * qty # simplified
            
            if name not in item_sales:
                item_sales[name] = {"quantity": 0, "revenue": 0}
            
            item_sales[name]["quantity"] += qty
            item_sales[name]["revenue"] += price
            
    # Top Items
    top_items = [
        {"name": k, "quantity": v["quantity"], "revenue": v["revenue"]}
        for k, v in item_sales.items()
    ]
    top_items.sort(key=lambda x: x["revenue"], reverse=True)
    
    return {
        "metrics": {
            "total_revenue": total_revenue,
            "total_orders": total_orders,
            "avg_order_value": total_revenue / total_orders if total_orders > 0 else 0,
            "top_payment_method": "N/A" # Need payment transaction data
        },
        "revenue_trend": [], # Todo: Group by hour
        "top_items": top_items[:5]
    }
