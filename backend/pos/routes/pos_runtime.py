from fastapi import APIRouter, Depends, Header
from typing import Optional, List
from core.database import db
from core.dependencies import get_current_user
from core.venue_config import get_venue_config
from pos.service.feature_gate import require_pos_feature
from pos.service.pos_session_service import PosSessionService
from pos.service.pos_order_service import PosOrderService
from pos.service.pos_payment_service import pos_payment_service
from pos.service.pos_split_merge_service import PosSplitMergeService
from pos.service.pos_kds_integration import PosKdsIntegration
from pos.models import (
    PosSessionCreate, PosOrderCreate, PosOrderItemCreate, PosPaymentCreate
)

def create_pos_runtime_router():
    router = APIRouter(prefix="/pos", tags=["pos-runtime"])
    session_service = PosSessionService(db)
    order_service = PosOrderService(db)
    payment_service = pos_payment_service  # Use global instance
    split_merge_service = PosSplitMergeService(db)
    kds_integration = PosKdsIntegration(db)


    @router.post("/sessions/open")
    async def open_session(
        data: PosSessionCreate,
        idempotency_key: Optional[str] = Header(None),
        current_user: dict = Depends(get_current_user)
    ):
        cfg = await get_venue_config(data.venue_id)
        require_pos_feature(cfg, "POS_ENABLED")
        
        session = await session_service.open_session(data, current_user["id"])
        return {"ok": True, "session": session.model_dump()}

    @router.post("/sessions/close")
    async def close_session(
        session_id: str,
        venue_id: str,
        idempotency_key: Optional[str] = Header(None),
        current_user: dict = Depends(get_current_user)
    ):
        session = await session_service.close_session(session_id, venue_id, current_user["id"])
        return {"ok": True, "session": session.model_dump() if session else None}

    @router.post("/orders")
    async def create_order(
        data: PosOrderCreate,
        idempotency_key: Optional[str] = Header(None),
        current_user: dict = Depends(get_current_user)
    ):
        cfg = await get_venue_config(data.venue_id)
        require_pos_feature(cfg, "POS_ENABLED")
        
        order = await order_service.create_order(data, current_user["id"])
        return {"ok": True, "order": order.model_dump()}

    @router.get("/orders/{order_id}")
    async def get_order(
        order_id: str,
        venue_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        order = await order_service.get_order(order_id, venue_id)
        items = await order_service.get_order_items(order_id, venue_id)
        
        return {
            "ok": True,
            "order": order.model_dump() if order else None,
            "items": [item.model_dump() for item in items]
        }

    @router.post("/orders/{order_id}/items")
    async def add_item(
        order_id: str,
        data: PosOrderItemCreate,
        idempotency_key: Optional[str] = Header(None),
        current_user: dict = Depends(get_current_user)
    ):
        # Get session to resolve menu item from snapshot
        order = await order_service.get_order(order_id, data.venue_id)
        if not order:
            return {"ok": False, "error": {"code": "ORDER_NOT_FOUND"}}
        
        session = await session_service.get_session(order.session_id, data.venue_id)
        snapshot = await db.pos_menu_snapshots.find_one(
            {"snapshot_id": session.menu_snapshot.snapshot_id},
            {"_id": 0}
        )
        
        # Find menu item in snapshot
        menu_item = None
        for item in snapshot["payload"]["items"]:
            if item["id"] == data.menu_item_id:
                menu_item = item
                break
        
        if not menu_item:
            return {"ok": False, "error": {"code": "ITEM_NOT_IN_SNAPSHOT"}}
        
        item = await order_service.add_item(data, menu_item, current_user["id"])
        return {"ok": True, "item": item.model_dump()}

    @router.post("/orders/{order_id}/items/{item_id}/fire")
    async def fire_item(
        order_id: str,
        item_id: str,
        venue_id: str,
        idempotency_key: Optional[str] = Header(None),
        current_user: dict = Depends(get_current_user)
    ):
        await order_service.fire_item(item_id, venue_id, current_user["id"])
        return {"ok": True}

    @router.post("/orders/{order_id}/items/{item_id}/void")
    async def void_item(
        order_id: str,
        item_id: str,
        venue_id: str,
        idempotency_key: Optional[str] = Header(None),
        current_user: dict = Depends(get_current_user)
    ):
        await order_service.void_item(item_id, venue_id, current_user["id"])
        return {"ok": True}

    @router.post("/orders/{order_id}/send")
    async def send_order(
        order_id: str,
        venue_id: str,
        idempotency_key: Optional[str] = Header(None),
        current_user: dict = Depends(get_current_user)
    ):
        await order_service.send_order(order_id, venue_id, current_user["id"])
        
        # Also send to KDS
        try:
            await kds_integration.send_order_to_kds(order_id, venue_id, current_user["id"])
        except Exception as e:
            print(f"KDS integration error: {e}")
        
        return {"ok": True}

    @router.post("/orders/{order_id}/split")
    async def split_order(
        order_id: str,
        venue_id: str,
        item_ids: List[str],
        new_table_id: str,
        idempotency_key: Optional[str] = Header(None),
        current_user: dict = Depends(get_current_user)
    ):
        cfg = await get_venue_config(venue_id)
        require_pos_feature(cfg, "POS_SPLIT_MERGE_ENABLED")
        
        new_order = await split_merge_service.split_order(
            order_id, item_ids, new_table_id, venue_id, current_user["id"]
        )
        return {"ok": True, "new_order": new_order.model_dump()}

    @router.post("/orders/{order_id}/transfer")
    async def transfer_order(
        order_id: str,
        venue_id: str,
        new_table_id: str,
        idempotency_key: Optional[str] = Header(None),
        current_user: dict = Depends(get_current_user)
    ):
        await split_merge_service.transfer_order(order_id, new_table_id, venue_id, current_user["id"])
        return {"ok": True}

    @router.post("/orders/{order_id}/payments")
    async def create_payment(
        order_id: str,
        data: PosPaymentCreate,
        idempotency_key: Optional[str] = Header(None),
        current_user: dict = Depends(get_current_user)
    ):
        payment = await payment_service.create_payment(data, current_user["id"])
        await payment_service.complete_payment(payment.id, data.venue_id)
        return {"ok": True, "payment": payment.model_dump()}

    @router.post("/orders/{order_id}/close")
    async def close_order(
        order_id: str,
        venue_id: str,
        idempotency_key: Optional[str] = Header(None),
        current_user: dict = Depends(get_current_user)
    ):
        # Validate payments cover total
        order = await order_service.get_order(order_id, venue_id)
        payments = await payment_service.get_order_payments(order_id, venue_id)
        
        total_paid = sum(p.amount for p in payments if p.status == "COMPLETED")
        
        if total_paid < order.totals.grand_total:
            return {"ok": False, "error": {"code": "INSUFFICIENT_PAYMENT"}}
        
        await order_service.close_order(order_id, venue_id, current_user["id"])
        return {"ok": True}

    return router
