"""Order operations routes - split, merge, offline sync"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List

from core.database import db
from core.dependencies import get_current_user, check_venue_access
from models import Order, OrderStatus
from services.audit_service import create_audit_log


def create_order_ops_router():
    router = APIRouter(tags=["order_operations"])

    @router.post("/orders/{order_id}/split")
    async def split_order(order_id: str, seat_numbers: List[int], current_user: dict = Depends(get_current_user)):
        order = await db.orders.find_one({"id": order_id}, {"_id": 0})
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        await check_venue_access(current_user, order["venue_id"])
        
        items_to_move = [i for i in order["items"] if i["seat_number"] in seat_numbers]
        remaining_items = [i for i in order["items"] if i["seat_number"] not in seat_numbers]
        
        if not items_to_move:
            raise HTTPException(status_code=400, detail="No items to split")
        
        remaining_subtotal = sum(i["price"] * i["quantity"] for i in remaining_items)
        remaining_tax = remaining_subtotal * 0.08
        remaining_total = remaining_subtotal + remaining_tax
        
        await db.orders.update_one(
            {"id": order_id},
            {"$set": {
                "items": remaining_items,
                "subtotal": remaining_subtotal,
                "tax": remaining_tax,
                "total": remaining_total
            }}
        )
        
        new_subtotal = sum(i["price"] * i["quantity"] for i in items_to_move)
        new_tax = new_subtotal * 0.08
        new_total = new_subtotal + new_tax
        
        new_order = Order(
            venue_id=order["venue_id"],
            table_id=order["table_id"],
            table_name=order["table_name"],
            server_id=order["server_id"],
            server_name=order["server_name"],
            items=items_to_move,
            status=order["status"],
            subtotal=new_subtotal,
            tax=new_tax,
            total=new_total,
            guest_count=len(seat_numbers)
        )
        
        await db.orders.insert_one(new_order.model_dump())
        
        await create_audit_log(
            order["venue_id"], current_user["id"], current_user["name"],
            "split", "order", order_id,
            {"new_order_id": new_order.id, "seats": seat_numbers}
        )
        
        return {"original_order_id": order_id, "new_order_id": new_order.id}

    @router.post("/orders/{order_id}/merge")
    async def merge_orders(order_id: str, merge_order_id: str, current_user: dict = Depends(get_current_user)):
        order = await db.orders.find_one({"id": order_id}, {"_id": 0})
        merge_order = await db.orders.find_one({"id": merge_order_id}, {"_id": 0})
        
        if not order or not merge_order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        await check_venue_access(current_user, order["venue_id"])
        
        combined_items = order["items"] + merge_order["items"]
        subtotal = sum(i["price"] * i["quantity"] for i in combined_items)
        tax = subtotal * 0.08
        total = subtotal + tax
        
        await db.orders.update_one(
            {"id": order_id},
            {"$set": {
                "items": combined_items,
                "subtotal": subtotal,
                "tax": tax,
                "total": total,
                "guest_count": order["guest_count"] + merge_order["guest_count"]
            }}
        )
        
        await db.orders.update_one(
            {"id": merge_order_id},
            {"$set": {"status": OrderStatus.VOIDED}}
        )
        
        await create_audit_log(
            order["venue_id"], current_user["id"], current_user["name"],
            "merge", "order", order_id,
            {"merged_order_id": merge_order_id}
        )
        
        return {"message": "Orders merged"}

    @router.post("/orders/offline-sync")
    async def offline_sync(orders: List[dict], current_user: dict = Depends(get_current_user)):
        """Deterministic replay of offline orders"""
        results = []
        
        for order_data in orders:
            offline_id = order_data.get("offline_id")
            
            existing = await db.orders.find_one({"offline_id": offline_id}, {"_id": 0})
            if existing:
                results.append({"offline_id": offline_id, "status": "already_synced", "order_id": existing["id"]})
                continue
            
            order_data["offline_id"] = offline_id
            order = Order(**order_data)
            await db.orders.insert_one(order.model_dump())
            
            results.append({"offline_id": offline_id, "status": "synced", "order_id": order.id})
        
        return {"results": results, "total": len(orders), "synced": sum(1 for r in results if r["status"] == "synced")}

    return router
