from fastapi import APIRouter, HTTPException, Depends, Request
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta, timezone
from core.database import db
from core.dependencies import get_current_user, check_venue_access
from utils.helpers import _json_fail

def create_pos_report_router():
    router = APIRouter(tags=["reports"])

    @router.get("/api/reports/pos-sales")
    async def get_pos_sales_report(
        venue_id: Optional[str] = None,
        range: str = "today",
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        shift: Optional[str] = None, # breakfast, lunch, dinner
        type: str = "summary",
        current_user: dict = Depends(get_current_user)
    ):
        # Resolve venue_id
        target_venue_id = venue_id or current_user.get("venue_id")
        if not target_venue_id:
             target_venue_id = current_user.get("venue_id")
        
        if not target_venue_id:
             raise HTTPException(status_code=400, detail="Venue ID required")

        await check_venue_access(current_user, target_venue_id)

        # Calculate Date Range
        now = datetime.now(timezone.utc)
        
        if start_date and end_date:
            try:
                dt_start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                dt_end = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            except:
                dt_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
                dt_end = now
        else:
            if range == "today":
                dt_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
                dt_end = now
            elif range == "week":
                dt_start = (now - timedelta(days=7)).replace(hour=0, minute=0, second=0, microsecond=0)
                dt_end = now
            elif range == "month":
                dt_start = (now - timedelta(days=30)).replace(hour=0, minute=0, second=0, microsecond=0)
                dt_end = now
            else:
                dt_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
                dt_end = now
        
        # Base Query
        query = {
            "venue_id": target_venue_id,
            "created_at": {"$gte": dt_start.isoformat(), "$lte": dt_end.isoformat()},
            "status": {"$ne": "cancelled"}
        }

        # Shift filtering (Simplified logic: assumes orders have hour or we calculate from created_at)
        # For mock/simulation, we can use $regex or project hour
        if shift == "breakfast":
            # 9:00 - 12:00
            query["created_at"]["$regex"] = "T(09|10|11):"
        elif shift == "lunch":
            # 12:00 - 16:00
            query["created_at"]["$regex"] = "T(12|13|14|15):"
        elif shift == "dinner":
            # 19:00 - 23:00
            query["created_at"]["$regex"] = "T(19|20|21|22):"

        orders = await db.orders.find(query).to_list(1000)

        # Process Data based on Type
        result = {}

        if type == "summary" or type == "revenue":
            total_revenue = sum(o.get("total", 0) for o in orders)
            order_count = len(orders)
            guest_count = sum(o.get("guest_count", 1) for o in orders)
            avg_check = total_revenue / order_count if order_count > 0 else 0
            
            # --- Synthesize Rich Data for Legacy Tables ---
            
            # 1. Gross & Net (Mock Tax Logic for Report)
            # Assuming 18% VAT included in total for demo purposes if tax not explicit
            vat_rate = 0.18
            net_revenue = total_revenue / (1 + vat_rate)
            total_vat = total_revenue - net_revenue
            service_charges = 0.0 # Placeholder
            
            # 2. VAT Rows
            vat_rows = [{
                "rate": "18% VAT",
                "net": net_revenue,
                "vat": total_vat,
                "total": total_revenue
            }]
            
            # 3. Payment Rows (Mock distribution if payments not in order)
            # In a real system, we'd aggregate o['payments']
            cash_amount = total_revenue * 0.3
            card_amount = total_revenue * 0.7
            payment_rows = [
                {"type_name": "Cash", "kind": "parent", "amount": cash_amount, "tips": 0, "total": cash_amount},
                {"type_name": "Credit Card", "kind": "parent", "provider": "Visa/Master", "amount": card_amount, "tips": 0, "total": card_amount}
            ]
            
            # 4. Discount Rows
            total_discounts = 0.0
            discount_rows = [] # Populate if we had discount data

            # Group by Hour (for chart)
            hourly_data = {}
            for o in orders:
                created_at = o.get("created_at", "")
                if len(created_at) > 13:
                    hour = created_at[11:13] + ":00"
                    hourly_data[hour] = hourly_data.get(hour, 0) + o.get("total", 0)
            
            chart_data = [{"hour": k, "amount": v} for k, v in hourly_data.items()]
            chart_data.sort(key=lambda x: x["hour"])

            result = {
                # Legacy Table Data Fields
                "total_revenue": total_revenue,
                "gross_sales": total_revenue, # Assuming gross = total for now
                "restaurant_revenue": net_revenue,
                "service_charges": service_charges,
                "total_discounts": total_discounts,
                "net_sales": net_revenue,
                
                # Metric Cards
                "order_count": order_count,
                "guest_count": guest_count,
                "customers": guest_count,
                "customers_avg": total_revenue / guest_count if guest_count else 0,
                "tickets": order_count,
                "tickets_avg": avg_check,
                "tables_served": len(set(o.get("table_id") for o in orders if o.get("table_id"))),
                "voided_total": 0, # Placeholder
                
                # Tables
                "vat_rows": vat_rows,
                "payment_rows": payment_rows,
                "discount_rows": discount_rows,
                
                # Chart
                "chart_data": chart_data
            }

        elif type == "item":
            item_stats = {}
            for o in orders:
                for item in o.get("items", []):
                    name = item.get("menu_item_name", "Unknown")
                    qty = item.get("quantity", 1)
                    price = item.get("price", 0)
                    
                    if name not in item_stats:
                        item_stats[name] = {"name": name, "quantity": 0, "revenue": 0}
                    
                    item_stats[name]["quantity"] += qty
                    item_stats[name]["revenue"] += (price * qty)
            
            sorted_items = sorted(item_stats.values(), key=lambda x: x["revenue"], reverse=True)
            result = {
                "items": sorted_items,
                "top_5": sorted_items[:5]
            }

        elif type == "user":
            user_stats = {}
            for o in orders:
                server = o.get("server_name", "Unknown")
                total = o.get("total", 0)
                
                if server not in user_stats:
                    user_stats[server] = {"name": server, "orders": 0, "revenue": 0}
                
                user_stats[server]["orders"] += 1
                user_stats[server]["revenue"] += total
            
            result = {"users": list(user_stats.values())}

        elif type == "receipt":
            # Just return list of orders with summary info
            receipts = []
            for o in orders:
                receipts.append({
                    "id": o.get("id"),
                    "table": o.get("table_name"),
                    "server": o.get("server_name"),
                    "total": o.get("total"),
                    "time": o.get("created_at")
                })
            result = {"receipts": receipts}

        else:
             # Default/Fallback for unimplemented types
             result = {"message": f"Report type '{type}' not fully implemented yet", "data": []}

        return result

    return router
