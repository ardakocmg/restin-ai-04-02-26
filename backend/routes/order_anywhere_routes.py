"""
Order Anywhere Routes — QR-based & Online Ordering (Lightspeed Parity Phase 2)
Guest scans QR → views live menu → places order → injected to KDS
No auth required for guest endpoints; admin endpoints require auth.
"""
from fastapi import APIRouter, Depends, HTTPException, Body, Query
from core.dependencies import get_current_user, get_database
from datetime import datetime, timezone
import logging
import uuid

logger = logging.getLogger(__name__)


def create_order_anywhere_router():
    router = APIRouter(prefix="/order-anywhere", tags=["order-anywhere"])

    # ═══════════════════════════════════════════════════════════════════════
    # ADMIN ENDPOINTS (require auth)
    # ═══════════════════════════════════════════════════════════════════════

    @router.get("/config/{venue_id}")
    async def get_config(
        venue_id: str,
        current_user: dict = Depends(get_current_user),
        db=Depends(get_database),
    ):
        """Get Order Anywhere configuration for a venue."""
        config = await db.order_anywhere_config.find_one(
            {"venue_id": venue_id}, {"_id": 0}
        )
        if not config:
            config = {
                "id": str(uuid.uuid4())[:12],
                "venue_id": venue_id,
                "enabled": False,
                "allow_dine_in": True,
                "allow_takeaway": True,
                "allow_delivery": False,
                "require_table_number": True,
                "accept_tips": True,
                "tip_presets_percent": [10, 15, 20],
                "auto_accept_orders": False,
                "estimated_prep_minutes": 20,
                "min_order_cents": 0,
                "max_order_cents": 0,  # 0 = no limit
                "operating_hours": {
                    "mon": {"open": "11:00", "close": "22:00"},
                    "tue": {"open": "11:00", "close": "22:00"},
                    "wed": {"open": "11:00", "close": "22:00"},
                    "thu": {"open": "11:00", "close": "22:00"},
                    "fri": {"open": "11:00", "close": "23:00"},
                    "sat": {"open": "11:00", "close": "23:00"},
                    "sun": {"open": "12:00", "close": "21:00"},
                },
                "custom_welcome_message": "Welcome! Scan to order.",
                "custom_theme": {
                    "primary_color": "#e53935",
                    "bg_color": "#09090b",
                    "font": "Inter",
                },
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            await db.order_anywhere_config.insert_one(config)

        return {"success": True, "data": config}

    @router.put("/config/{venue_id}")
    async def update_config(
        venue_id: str,
        payload: dict = Body(...),
        current_user: dict = Depends(get_current_user),
        db=Depends(get_database),
    ):
        """Update Order Anywhere configuration."""
        role = current_user.get("role", "")
        if role not in ["owner", "product_owner", "OWNER", "ADMIN", "admin", "MANAGER", "manager"]:
            raise HTTPException(status_code=403, detail="Manager or above required")

        allowed_fields = {
            "enabled", "allow_dine_in", "allow_takeaway", "allow_delivery",
            "require_table_number", "accept_tips", "tip_presets_percent",
            "auto_accept_orders", "estimated_prep_minutes", "min_order_cents",
            "max_order_cents", "operating_hours", "custom_welcome_message",
            "custom_theme",
        }
        update = {k: v for k, v in payload.items() if k in allowed_fields}
        update["updated_at"] = datetime.now(timezone.utc).isoformat()
        update["updated_by"] = current_user["id"]

        await db.order_anywhere_config.update_one(
            {"venue_id": venue_id}, {"$set": update}, upsert=True
        )
        config = await db.order_anywhere_config.find_one({"venue_id": venue_id}, {"_id": 0})
        return {"success": True, "data": config}

    @router.get("/orders/{venue_id}")
    async def list_orders(
        venue_id: str,
        status: str = Query(None),
        current_user: dict = Depends(get_current_user),
        db=Depends(get_database),
    ):
        """List online orders for venue (admin view)."""
        query = {"venue_id": venue_id}
        if status:
            query["status"] = status

        orders = await db.online_orders.find(
            query, {"_id": 0}
        ).sort("created_at", -1).to_list(200)
        return {"success": True, "data": orders, "count": len(orders)}

    @router.put("/orders/{order_id}/status")
    async def update_order_status(
        order_id: str,
        payload: dict = Body(...),
        current_user: dict = Depends(get_current_user),
        db=Depends(get_database),
    ):
        """Update order status (accept, preparing, ready, completed, cancelled)."""
        new_status = payload.get("status")
        valid_statuses = ["pending", "accepted", "preparing", "ready", "completed", "cancelled"]
        if new_status not in valid_statuses:
            raise HTTPException(status_code=400, detail=f"Status must be one of: {valid_statuses}")

        result = await db.online_orders.update_one(
            {"id": order_id},
            {"$set": {
                "status": new_status,
                "status_updated_at": datetime.now(timezone.utc).isoformat(),
                "status_updated_by": current_user["id"],
            }}
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Order not found")

        logger.info(f"Order {order_id} status -> {new_status} by {current_user['id']}")
        return {"success": True, "status": new_status}

    @router.get("/qr/{venue_id}")
    async def generate_qr_data(
        venue_id: str,
        table_name: str = Query(None),
        current_user: dict = Depends(get_current_user),
    ):
        """Generate QR code data for a venue/table."""
        base_url = f"/order/{venue_id}"
        if table_name:
            base_url += f"?table={table_name}"

        return {
            "success": True,
            "qr_url": base_url,
            "venue_id": venue_id,
            "table_name": table_name,
        }

    # ═══════════════════════════════════════════════════════════════════════
    # GUEST ENDPOINTS (no auth required — public facing)
    # ═══════════════════════════════════════════════════════════════════════

    @router.get("/guest/menu/{venue_id}")
    async def get_guest_menu(
        venue_id: str,
        db=Depends(get_database),
    ):
        """Get menu for guest ordering (no auth)."""
        # Check if order anywhere is enabled
        config = await db.order_anywhere_config.find_one(
            {"venue_id": venue_id}, {"_id": 0}
        )
        if not config or not config.get("enabled"):
            raise HTTPException(status_code=403, detail="Online ordering is not available")

        # Fetch menu categories
        categories = await db.inventory_categories.find(
            {"venue_id": venue_id, "deleted_at": None},
            {"_id": 0, "id": 1, "name": 1, "sort_order": 1}
        ).sort("sort_order", 1).to_list(100)

        # Fetch menu items (products)
        products = await db.inventory_products.find(
            {"venue_id": venue_id, "deleted_at": None, "is_active": {"$ne": False}},
            {"_id": 0, "id": 1, "name": 1, "category_id": 1, "price_cents": 1,
             "sell_price": 1, "description": 1, "image_url": 1, "allergens": 1,
             "tags": 1, "sort_order": 1}
        ).sort("sort_order", 1).to_list(500)

        # Fetch combos
        combos = await db.menu_combos.find(
            {"venue_id": venue_id, "deleted_at": None, "is_active": True},
            {"_id": 0}
        ).sort("sort_order", 1).to_list(50)

        return {
            "success": True,
            "venue_id": venue_id,
            "config": {
                "welcome_message": config.get("custom_welcome_message", ""),
                "theme": config.get("custom_theme", {}),
                "allow_dine_in": config.get("allow_dine_in", True),
                "allow_takeaway": config.get("allow_takeaway", True),
                "require_table_number": config.get("require_table_number", True),
                "accept_tips": config.get("accept_tips", True),
                "tip_presets_percent": config.get("tip_presets_percent", [10, 15, 20]),
                "estimated_prep_minutes": config.get("estimated_prep_minutes", 20),
            },
            "categories": categories,
            "products": products,
            "combos": combos,
        }

    @router.post("/guest/order")
    async def create_guest_order(
        payload: dict = Body(...),
        db=Depends(get_database),
    ):
        """Create a new guest order (no auth)."""
        venue_id = payload.get("venue_id")
        items = payload.get("items", [])
        order_type = payload.get("order_type", "dine_in")  # dine_in, takeaway
        table_name = payload.get("table_name")
        guest_name = payload.get("guest_name", "")
        guest_phone = payload.get("guest_phone", "")
        guest_notes = payload.get("guest_notes", "")
        tip_cents = payload.get("tip_cents", 0)

        if not venue_id or not items:
            raise HTTPException(status_code=400, detail="venue_id and items required")

        # Check config
        config = await db.order_anywhere_config.find_one({"venue_id": venue_id})
        if not config or not config.get("enabled"):
            raise HTTPException(status_code=403, detail="Online ordering is not available")

        if config.get("require_table_number") and order_type == "dine_in" and not table_name:
            raise HTTPException(status_code=400, detail="Table number is required for dine-in")

        # Calculate totals
        subtotal_cents = 0
        validated_items = []
        for item in items:
            price = item.get("price_cents", 0)
            quantity = item.get("quantity", 1)
            line_total = price * quantity
            subtotal_cents += line_total
            validated_items.append({
                "item_id": item.get("item_id"),
                "name": item.get("name", "Unknown"),
                "price_cents": price,
                "quantity": quantity,
                "line_total_cents": line_total,
                "modifiers": item.get("modifiers", []),
                "notes": item.get("notes", ""),
            })

        # Min order check
        min_order = config.get("min_order_cents", 0)
        if min_order and subtotal_cents < min_order:
            raise HTTPException(
                status_code=400,
                detail=f"Minimum order is €{min_order/100:.2f}"
            )

        order = {
            "id": f"OA-{uuid.uuid4().hex[:8].upper()}",
            "venue_id": venue_id,
            "order_type": order_type,
            "table_name": table_name,
            "guest_name": guest_name,
            "guest_phone": guest_phone,
            "guest_notes": guest_notes,
            "items": validated_items,
            "subtotal_cents": subtotal_cents,
            "tip_cents": tip_cents,
            "total_cents": subtotal_cents + tip_cents,
            "status": "accepted" if config.get("auto_accept_orders") else "pending",
            "source": "order_anywhere",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "status_updated_at": datetime.now(timezone.utc).isoformat(),
        }

        await db.online_orders.insert_one(order)
        logger.info(f"Guest order created: {order['id']} for venue {venue_id}")

        return {
            "success": True,
            "order": {
                "id": order["id"],
                "status": order["status"],
                "total_cents": order["total_cents"],
                "estimated_prep_minutes": config.get("estimated_prep_minutes", 20),
            },
        }

    @router.get("/guest/order/{order_id}")
    async def track_guest_order(
        order_id: str,
        db=Depends(get_database),
    ):
        """Track an order by ID (no auth — guest can poll)."""
        order = await db.online_orders.find_one(
            {"id": order_id}, {"_id": 0}
        )
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")

        return {
            "success": True,
            "order": {
                "id": order["id"],
                "status": order["status"],
                "total_cents": order.get("total_cents"),
                "items": order.get("items", []),
                "created_at": order.get("created_at"),
                "status_updated_at": order.get("status_updated_at"),
            },
        }

    # ═══════════════════════════════════════════════════════════════════════
    # STATS
    # ═══════════════════════════════════════════════════════════════════════

    @router.get("/stats/{venue_id}")
    async def get_stats(
        venue_id: str,
        current_user: dict = Depends(get_current_user),
        db=Depends(get_database),
    ):
        """Get Order Anywhere stats for dashboard."""
        total = await db.online_orders.count_documents({"venue_id": venue_id})
        pending = await db.online_orders.count_documents({"venue_id": venue_id, "status": "pending"})
        completed = await db.online_orders.count_documents({"venue_id": venue_id, "status": "completed"})
        cancelled = await db.online_orders.count_documents({"venue_id": venue_id, "status": "cancelled"})

        # Revenue from completed orders
        pipeline = [
            {"$match": {"venue_id": venue_id, "status": "completed"}},
            {"$group": {"_id": None, "total_revenue": {"$sum": "$total_cents"}, "total_tips": {"$sum": "$tip_cents"}}},
        ]
        agg = await db.online_orders.aggregate(pipeline).to_list(1)
        revenue = agg[0] if agg else {"total_revenue": 0, "total_tips": 0}

        return {
            "success": True,
            "data": {
                "total_orders": total,
                "pending": pending,
                "completed": completed,
                "cancelled": cancelled,
                "revenue_cents": revenue.get("total_revenue", 0),
                "tips_cents": revenue.get("total_tips", 0),
            },
        }

    return router
