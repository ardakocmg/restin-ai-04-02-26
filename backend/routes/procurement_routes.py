"""Procurement routes - purchase orders, receiving"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime, timezone

from core.database import db
from core.dependencies import get_current_user, check_venue_access
from models import PurchaseOrder, PurchaseOrderCreate, LedgerAction
from services.audit_service import create_audit_log


def create_procurement_router():
    router = APIRouter(tags=["procurement"])

    @router.get("/venues/{venue_id}/purchase-orders")
    async def list_purchase_orders(venue_id: str, current_user: dict = Depends(get_current_user)):
        await check_venue_access(current_user, venue_id)
        orders = await db.purchase_orders.find({"venue_id": venue_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
        return orders

    @router.post("/purchase-orders", response_model=PurchaseOrder)
    async def create_purchase_order(data: PurchaseOrderCreate, current_user: dict = Depends(get_current_user)):
        await check_venue_access(current_user, data.venue_id)
        
        items = [{"item_id": i.get("item_id"), "name": i.get("name"), "quantity": i.get("quantity"), "received": 0} for i in data.items]
        
        po = PurchaseOrder(
            venue_id=data.venue_id,
            supplier_name=data.supplier_name,
            items=items
        )
        
        await db.purchase_orders.insert_one(po.model_dump())
        
        await create_audit_log(
            data.venue_id, current_user["id"], current_user["name"],
            "create", "purchase_order", po.id, {"supplier": po.supplier_name}
        )
        
        return po

    @router.post("/purchase-orders/{po_id}/receive")
    async def receive_delivery(
        po_id: str,
        received_items: List[dict],
        current_user: dict = Depends(get_current_user)
    ):
        po = await db.purchase_orders.find_one({"id": po_id}, {"_id": 0})
        if not po:
            raise HTTPException(status_code=404, detail="PO not found")
        
        await check_venue_access(current_user, po["venue_id"])
        
        items = po["items"]
        all_received = True
        
        for received in received_items:
            for item in items:
                if item["item_id"] == received["item_id"]:
                    item["received"] += received["quantity"]
                    if item["received"] < item["quantity"]:
                        all_received = False
        
        status = "received" if all_received else "partial"
        
        await db.purchase_orders.update_one(
            {"id": po_id},
            {"$set": {
                "items": items,
                "status": status,
                "received_at": datetime.now(timezone.utc).isoformat() if all_received else None
            }}
        )
        
        return {"message": "Delivery received", "status": status}

    return router
