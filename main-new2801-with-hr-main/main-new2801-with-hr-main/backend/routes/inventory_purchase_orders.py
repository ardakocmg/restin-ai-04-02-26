"""Inventory Purchase Orders Routes"""
from fastapi import APIRouter, HTTPException, Depends

from core.database import db
from core.dependencies import get_current_user, check_venue_access
from models.purchase_order import PurchaseOrderCreate
from services.inventory_suppliers.purchase_service import purchase_service


def create_inventory_purchase_orders_router():
    router = APIRouter(tags=["inventory_purchase_orders"])

    @router.get("/inventory/purchase-orders")
    async def list_purchase_orders(
        venue_id: str,
        status: str = None,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        query = {"venue_id": venue_id}
        if status:
            query["status"] = status
        
        pos = await db.purchase_orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
        return pos

    @router.post("/inventory/purchase-orders")
    async def create_purchase_order(
        data: PurchaseOrderCreate,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, data.venue_id)
        success, result = await purchase_service.create_po(
            data.model_dump(),
            data.venue_id,
            current_user["id"]
        )
        
        if not success:
            raise HTTPException(status_code=400, detail=result.get("error"))
        
        return result

    @router.post("/inventory/purchase-orders/{po_id}/submit")
    async def submit_po(
        po_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        po = await db.purchase_orders.find_one({"id": po_id}, {"_id": 0})
        if not po:
            raise HTTPException(status_code=404, detail="PO not found")
        
        await check_venue_access(current_user, po["venue_id"])
        result = await purchase_service.submit_po(po_id)
        return result

    @router.post("/inventory/purchase-orders/{po_id}/approve")
    async def approve_po(
        po_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        po = await db.purchase_orders.find_one({"id": po_id}, {"_id": 0})
        if not po:
            raise HTTPException(status_code=404, detail="PO not found")
        
        await check_venue_access(current_user, po["venue_id"])
        result = await purchase_service.approve_po(po_id, current_user["id"])
        return result

    @router.post("/inventory/purchase-orders/{po_id}/send")
    async def send_po(
        po_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        po = await db.purchase_orders.find_one({"id": po_id}, {"_id": 0})
        if not po:
            raise HTTPException(status_code=404, detail="PO not found")
        
        await check_venue_access(current_user, po["venue_id"])
        result = await purchase_service.send_po(po_id)
        return result

    @router.post("/inventory/purchase-orders/{po_id}/cancel")
    async def cancel_po(
        po_id: str,
        reason: str,
        current_user: dict = Depends(get_current_user)
    ):
        po = await db.purchase_orders.find_one({"id": po_id}, {"_id": 0})
        if not po:
            raise HTTPException(status_code=404, detail="PO not found")
        
        await check_venue_access(current_user, po["venue_id"])
        result = await purchase_service.cancel_po(po_id, reason)
        return result

    return router
