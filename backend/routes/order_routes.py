"""Order and KDS routes"""
from fastapi import APIRouter, HTTPException, Depends, Request
from typing import Optional
from datetime import datetime, timezone

from core.database import db
from core.dependencies import get_current_user, check_venue_access
from models import Order, OrderCreate, OrderItem, OrderItemCreate, SendOrderRequest
from services.id_service import ensure_ids
from services.audit_service import create_audit_log
from services.order_service import process_send_order, transfer_order_to_table, close_order
from services.kds_service import update_ticket_status, update_ticket_item_status, claim_ticket, release_ticket
from utils.helpers import _json_fail


def create_order_router():
    router = APIRouter(tags=["orders"])

    @router.get("/venues/{venue_id}/orders")
    async def list_orders(
        venue_id: str, 
        status: Optional[str] = None,
        table_id: Optional[str] = None,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        query = {"venue_id": venue_id}
        if status:
            query["status"] = status
        if table_id:
            query["table_id"] = table_id
        
        orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
        return orders

    @router.get("/orders/{order_id}")
    async def get_order(order_id: str, current_user: dict = Depends(get_current_user)):
        order = await db.orders.find_one({"id": order_id}, {"_id": 0})
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        await check_venue_access(current_user, order["venue_id"])
        return order

    @router.post("/orders")
    async def create_order(data: OrderCreate, current_user: dict = Depends(get_current_user)):
        await check_venue_access(current_user, data.venue_id)
        
        # Counter / takeaway orders don't need a physical table
        is_counter = data.table_id in ('counter', 'takeaway') or data.table_id.startswith('counter-')
        
        if is_counter:
            table = {"id": data.table_id, "name": f"Counter", "seats": 1}
        else:
            table = await db.tables.find_one({"id": data.table_id}, {"_id": 0})
            if not table:
                raise HTTPException(status_code=404, detail="Table not found")
        
        server = await db.users.find_one({"id": data.server_id}, {"_id": 0})
        if not server:
            raise HTTPException(status_code=404, detail="Server not found")
        
        order_type = data.order_type if hasattr(data, 'order_type') and data.order_type else ('counter' if is_counter else 'dine_in')
        
        order = Order(
            venue_id=data.venue_id,
            table_id=data.table_id,
            table_name=table["name"],
            server_id=data.server_id,
            server_name=server["name"],
            guest_count=table["seats"]
        )
        
        order_dict = order.model_dump()
        order_dict = await ensure_ids(db, "ORDER", order_dict, data.venue_id)
        
        # Create a copy before inserting to avoid MongoDB _id in response
        order_dict_copy = order_dict.copy()
        await db.orders.insert_one(order_dict_copy)
        if not is_counter:
            await db.tables.update_one(
                {"id": data.table_id},
                {"$set": {"status": "occupied", "current_order_id": order_dict["id"]}}
            )
        
        await create_audit_log(
            data.venue_id, current_user["id"], current_user["name"],
            "create", "order", order_dict["id"], {"table": table["name"]}
        )
        
        return order_dict

    @router.post("/orders/{order_id}/items")
    async def add_order_item(order_id: str, data: OrderItemCreate, current_user: dict = Depends(get_current_user)):
        order = await db.orders.find_one({"id": order_id}, {"_id": 0})
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        await check_venue_access(current_user, order["venue_id"])
        
        menu_item_id = data.get_menu_item_id()
        if not menu_item_id:
            raise HTTPException(status_code=400, detail="menu_item_id or item_id required")
        
        menu_item = await db.menu_items.find_one({"id": menu_item_id}, {"_id": 0})
        if not menu_item:
            raise HTTPException(status_code=404, detail="Menu item not found")
        
        order_item = OrderItem(
            menu_item_id=menu_item_id,
            menu_item_name=menu_item["name"],
            price=menu_item["price"],
            quantity=data.quantity,
            seat_number=data.seat_number,
            modifiers=data.modifiers,
            notes=data.notes,
            course=data.course
        )
        
        items = order.get("items", [])
        items.append(order_item.model_dump())
        subtotal = sum(i["price"] * i["quantity"] for i in items)
        tax = subtotal * 0.08
        total = subtotal + tax
        
        await db.orders.update_one(
            {"id": order_id},
            {"$set": {"items": items, "subtotal": subtotal, "tax": tax, "total": total}}
        )
        
        return order_item.model_dump()

    @router.post("/orders/{order_id}/send")
    async def send_order(
        order_id: str, 
        request: Request, 
        send_req: SendOrderRequest = SendOrderRequest(),
        current_user: dict = Depends(get_current_user)
    ):
        success, result = await process_send_order(
            db, order_id, request, 
            send_req.do_print, send_req.do_kds, send_req.do_stock,
            send_req.client_send_id, current_user
        )
        
        if not success:
            status_code = 404 if result.get("code") == "ORDER_NOT_FOUND" else 400
            return _json_fail(request, result.get("code", "ERROR"), result.get("message", "Error"), result, status_code)
        
        return result

    @router.post("/orders/{order_id}/transfer")
    async def transfer_order(order_id: str, new_table_id: str, current_user: dict = Depends(get_current_user)):
        success, result = await transfer_order_to_table(db, order_id, new_table_id, current_user)
        
        if not success:
            status_code = 404 if 'NOT_FOUND' in result.get('code', '') else 400
            raise HTTPException(status_code=status_code, detail=result.get('message', 'Error'))
        
        order = await db.orders.find_one({"id": order_id}, {"_id": 0})
        if order:
            await create_audit_log(
                order["venue_id"], current_user["id"], current_user["name"],
                "transfer", "order", order_id,
                {"to_table": result.get("new_table")}
            )
        
        return result

    @router.post("/orders/{order_id}/close")
    async def close_order_endpoint(order_id: str, current_user: dict = Depends(get_current_user)):
        success, result = await close_order(db, order_id, current_user)
        
        if not success:
            status_code = 404 if result.get('code') == 'ORDER_NOT_FOUND' else 400
            raise HTTPException(status_code=status_code, detail=result.get('message', 'Error'))
        
        return result

    @router.get("/orders/{order_id}/billing-eligibility")
    async def check_billing_eligibility(order_id: str, current_user: dict = Depends(get_current_user)):
        order = await db.orders.find_one({"id": order_id}, {"_id": 0})
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        await check_venue_access(current_user, order["venue_id"])
        
        # Simple eligibility check: has items and open status
        is_eligible = len(order.get("items", [])) > 0 and order.get("status") == "open"
        
        return {
            "eligible": is_eligible,
            "reason": None if is_eligible else "Order has no items or is already closed",
            "balance": order.get("total", 0.0)
        }

    # KDS ENDPOINTS
    @router.get("/venues/{venue_id}/kds/tickets")
    async def list_kds_tickets(venue_id: str, status: Optional[str] = None, current_user: dict = Depends(get_current_user)):
        await check_venue_access(current_user, venue_id)
        
        query = {"venue_id": venue_id}
        if status:
            query["status"] = status
        
        tickets = await db.kds_tickets.find(query, {"_id": 0}).sort("created_at", 1).to_list(100)
        return tickets

    @router.patch("/kds/tickets/{ticket_id}/status")
    async def update_kds_ticket_status(ticket_id: str, new_status: str, current_user: dict = Depends(get_current_user)):
        success, result = await update_ticket_status(db, ticket_id, new_status, current_user)
        
        if not success:
            raise HTTPException(status_code=404 if result.get('code') == 'NOT_FOUND' else 400, detail=result.get('message'))
        
        return result

    @router.patch("/kds/tickets/{ticket_id}/items/{item_id}/status")
    async def update_kds_item_status(ticket_id: str, item_id: str, new_status: str, current_user: dict = Depends(get_current_user)):
        success, result = await update_ticket_item_status(db, ticket_id, item_id, new_status, current_user)
        
        if not success:
            raise HTTPException(status_code=404, detail=result.get('message'))
        
        return result

    @router.post("/kds/tickets/{ticket_id}/claim")
    async def claim_kds_ticket(ticket_id: str, current_user: dict = Depends(get_current_user)):
        success, result = await claim_ticket(db, ticket_id, current_user)
        
        if not success:
            raise HTTPException(status_code=404 if result.get('code') == 'NOT_FOUND' else 400, detail=result.get('message'))
        
        return result

    @router.post("/kds/tickets/{ticket_id}/release")
    async def release_kds_ticket(ticket_id: str, current_user: dict = Depends(get_current_user)):
        success, result = await release_ticket(db, ticket_id, current_user)
        
        if not success:
            raise HTTPException(status_code=404, detail=result.get('message'))
        
        return result

    # KDS ACTION ENDPOINTS
    @router.post("/kds/tickets/{ticket_id}/items/{item_id}/start")
    async def start_kds_item(ticket_id: str, item_id: str, current_user: dict = Depends(get_current_user)):
        success, result = await update_ticket_item_status(db, ticket_id, item_id, "PREPARING", current_user)
        if not success:
            raise HTTPException(status_code=404, detail=result.get('message'))
        return result

    @router.post("/kds/tickets/{ticket_id}/items/{item_id}/ready")
    async def ready_kds_item(ticket_id: str, item_id: str, current_user: dict = Depends(get_current_user)):
        success, result = await update_ticket_item_status(db, ticket_id, item_id, "READY", current_user)
        if not success:
            raise HTTPException(status_code=404, detail=result.get('message'))
        return result

    @router.post("/venues/{venue_id}/kds/tickets/{ticket_id}/items/{item_id}/hold")
    async def hold_kds_item(venue_id: str, ticket_id: str, item_id: str, reason: Optional[str] = None, current_user: dict = Depends(get_current_user)):
        await check_venue_access(current_user, venue_id)
        success, result = await update_ticket_item_status(db, ticket_id, item_id, "HELD", current_user)
        if not success:
            raise HTTPException(status_code=404, detail=result.get('message'))
        return result

    @router.post("/venues/{venue_id}/kds/tickets/{ticket_id}/pass-approve")
    async def pass_approve_kds_ticket(venue_id: str, ticket_id: str, current_user: dict = Depends(get_current_user)):
        await check_venue_access(current_user, venue_id)
        # Update status while keeping it as READY but setting pass_approved True
        success, result = await update_ticket_status(db, ticket_id, "READY", current_user, {"pass_approved": True})
        if not success:
            raise HTTPException(status_code=404, detail=result.get('message'))
        return result

    @router.post("/venues/{venue_id}/kds/tickets/{ticket_id}/deliver")
    async def deliver_kds_ticket(venue_id: str, ticket_id: str, current_user: dict = Depends(get_current_user)):
        await check_venue_access(current_user, venue_id)
        success, result = await update_ticket_status(db, ticket_id, "DONE", current_user, {"delivered": True})
        if not success:
            raise HTTPException(status_code=404, detail=result.get('message'))
        return result

    return router
