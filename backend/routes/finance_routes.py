"""Finance routes - summaries, reports, open orders, closed checks"""
from fastapi import APIRouter, HTTPException, Depends, Body
from datetime import datetime, timezone

from core.database import db
from core.dependencies import get_current_user, check_venue_access
from services.permission_service import effective_permissions, get_allowed_schema, filter_row_by_schema


def create_finance_router():
    router = APIRouter(tags=["finance"])

    @router.get("/venues/{venue_id}/finance/summary")
    async def get_finance_summary(venue_id: str, current_user: dict = Depends(get_current_user)):
        """Get finance summary (widgets data)"""
        await check_venue_access(current_user, venue_id)
        
        venue = await db.venues.find_one({"id": venue_id}, {"_id": 0})
        venue_settings = venue.get("settings", {}) if venue else {}
        user_perms = effective_permissions(current_user["role"], venue_settings)
        
        if "FINANCE_VIEW" not in user_perms:
            raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "No finance access"})
        
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
        today_end = datetime.now(timezone.utc).isoformat()
        
        open_orders = await db.orders.count_documents({
            "venue_id": venue_id,
            "status": {"$nin": ["CLOSED", "PAID", "CANCELLED"]}
        })
        
        closed_checks = await db.orders.count_documents({
            "venue_id": venue_id,
            "status": {"$in": ["CLOSED", "PAID"]},
            "closed_at": {"$gte": today_start, "$lte": today_end}
        })
        
        gross_sales = 0.0
        avg_check = 0.0
        
        if "FINANCE_VIEW_MONEY" in user_perms:
            closed_orders = await db.orders.find({
                "venue_id": venue_id,
                "status": {"$in": ["CLOSED", "PAID"]},
                "closed_at": {"$gte": today_start, "$lte": today_end}
            }, {"_id": 0, "total": 1}).to_list(1000)
            
            gross_sales = sum(o.get("total", 0) for o in closed_orders)
            avg_check = gross_sales / closed_checks if closed_checks > 0 else 0.0
        
        summary = {
            "open_orders_count": open_orders,
            "closed_checks_count": closed_checks,
            "currency": venue.get("currency", "EUR") if venue else "EUR"
        }
        
        if "FINANCE_VIEW_MONEY" in user_perms:
            summary["gross_sales_today"] = gross_sales
            summary["avg_check_today"] = avg_check
        
        return summary

    @router.get("/venues/{venue_id}/finance/orders/open")
    async def get_open_orders(venue_id: str, current_user: dict = Depends(get_current_user)):
        """Get open orders with permission-filtered columns"""
        await check_venue_access(current_user, venue_id)
        
        venue = await db.venues.find_one({"id": venue_id}, {"_id": 0})
        venue_settings = venue.get("settings", {}) if venue else {}
        user_perms = effective_permissions(current_user["role"], venue_settings)
        currency = venue.get("currency", "EUR") if venue else "EUR"
        
        schema = get_allowed_schema("orders_open", user_perms, currency)
        if not schema:
            raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "No access to open orders"})
        
        orders = await db.orders.find({
            "venue_id": venue_id,
            "status": {"$nin": ["CLOSED", "PAID", "CANCELLED"]}
        }, {"_id": 0}).sort("created_at", -1).limit(200).to_list(200)
        
        rows = []
        for order in orders:
            row = {
                "order_display_id": order.get("display_id", order.get("id", "")[:8]),
                "table_display_id": order.get("table_name", ""),
                "server_display_id": order.get("server_id", "")[:8] if order.get("server_id") else "",
                "server_name": order.get("server_name", ""),
                "created_at": order.get("created_at", ""),
                "status": order.get("status", ""),
                "items_count": len(order.get("items", [])),
                "subtotal": order.get("subtotal", 0.0),
                "tax": order.get("tax", 0.0),
                "total": order.get("total", 0.0)
            }
            filtered_row = filter_row_by_schema(row, schema)
            rows.append(filtered_row)
        
        return {
            "schema": schema,
            "rows": rows,
            "meta": {"count": len(rows), "currency": currency}
        }

    @router.get("/venues/{venue_id}/finance/checks/closed")
    async def get_closed_checks(venue_id: str, current_user: dict = Depends(get_current_user)):
        """Get closed checks with permission-filtered columns"""
        await check_venue_access(current_user, venue_id)
        
        venue = await db.venues.find_one({"id": venue_id}, {"_id": 0})
        venue_settings = venue.get("settings", {}) if venue else {}
        user_perms = effective_permissions(current_user["role"], venue_settings)
        currency = venue.get("currency", "EUR") if venue else "EUR"
        
        schema = get_allowed_schema("checks_closed", user_perms, currency)
        if not schema:
            raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "No access to closed checks"})
        
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
        
        orders = await db.orders.find({
            "venue_id": venue_id,
            "status": {"$in": ["CLOSED", "PAID"]},
            "closed_at": {"$gte": today_start}
        }, {"_id": 0}).sort("closed_at", -1).limit(200).to_list(200)
        
        rows = []
        for order in orders:
            row = {
                "order_display_id": order.get("display_id", order.get("id", "")[:8]),
                "table_display_id": order.get("table_name", ""),
                "server_name": order.get("server_name", ""),
                "closed_at": order.get("closed_at", ""),
                "subtotal": order.get("subtotal", 0.0),
                "tax": order.get("tax", 0.0),
                "total": order.get("total", 0.0),
                "payment_method": order.get("payment_method", "")
            }
            filtered_row = filter_row_by_schema(row, schema)
            rows.append(filtered_row)
        
        return {
            "schema": schema,
            "rows": rows,
            "meta": {"count": len(rows), "currency": currency}
        }

    @router.post("/venues/{venue_id}/finance/orders/{order_id}/split")
    async def split_order(venue_id: str, order_id: str, payload: dict = Body(...), current_user: dict = Depends(get_current_user)):
        """
        Split an Order (Pillar 8).
        """
        # Logic would go here to update the order in DB
        return {"status": "success", "message": "Order split successfully", "new_orders": ["ORD-123-A", "ORD-123-B"]}

    @router.post("/venues/{venue_id}/finance/kiosk/toggle")
    async def toggle_kiosk(venue_id: str, payload: dict = Body(...), current_user: dict = Depends(get_current_user)):
        """
        Toggle Kiosk Mode for a Terminal (Pillar 8).
        """
        enabled = payload.get("enabled", False)
        # Logic to update Venue/Terminal Config in DB
        return {"status": "success", "kiosk_mode": enabled}

    return router
