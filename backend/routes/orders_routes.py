"""Orders API Routes - Alias for frontend compatibility with /api/orders"""
from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import logging

from core.database import db
from core.dependencies import get_current_user
from pos.service.pos_order_service import PosOrderService
from pos.service.pos_payment_service import pos_payment_service
from pos.models import PosOrderCreate, PosOrderItemCreate, PosPaymentCreate

logger = logging.getLogger(__name__)


from pydantic import BaseModel, Field

class AddItemRequest(BaseModel):
    menu_item_id: str
    qty: int = Field(1, alias="quantity")
    venue_id: Optional[str] = None
    modifiers: Optional[List[Dict[str, Any]]] = []
    instructions: Optional[str] = Field(None, alias="notes")
    seat_number: Optional[int] = Field(1, alias="seat")
    course: Optional[int] = 1

    class Config:
        populate_by_name = True

# ... (CreateOrderRequest remains same)

def create_orders_router():
    """Main /api/orders routes for frontend compatibility"""
    router = APIRouter(prefix="/orders", tags=["orders"])
    order_service = PosOrderService(db)
    
    # ... (create_order remains same)
    
    # ... (get_order remains same)

    @router.post("/{order_id}/items")
    async def add_item_to_order(
        order_id: str,
        request: AddItemRequest,
        current_user: dict = Depends(get_current_user)
    ):
        """Add item to order"""
        user_id = current_user.get("user_id") or current_user.get("id")
        
        # Resolve Venue ID
        venue_id = request.venue_id
        if not venue_id:
             order = await db.pos_orders.find_one({"id": order_id}, {"venue_id": 1})
             if order:
                 venue_id = order.get("venue_id")
        
        if not venue_id:
             raise HTTPException(status_code=400, detail="Could not resolve venue_id")

        # Get menu item
        menu_item = await db.menu_items.find_one(
            {"id": request.menu_item_id},
            {"_id": 0}
        )
        
        if not menu_item:
            raise HTTPException(status_code=404, detail="Menu item not found")
        
        from pos.models import ItemModifier, PosOrderItemCreate
        
        # Transform modifiers
        modifiers_obj = []
        if request.modifiers:
            for m in request.modifiers:
                # Handle both dict and object/pydantic cases if needed, primarily dict here from JSON
                modifiers_obj.append(ItemModifier(**m))

        item_data = PosOrderItemCreate(
            order_id=order_id,
            venue_id=venue_id,
            menu_item_id=request.menu_item_id,
            qty=request.qty,
            modifiers=modifiers_obj,
            instructions=request.instructions,
            seat_number=request.seat_number,
            course=request.course
        )
        
        item = await order_service.add_item(item_data, menu_item, user_id)
        return {"ok": True, "item": item.model_dump()}
    
    # ... (send_order remains same)

    @router.get("/{order_id}/billing-eligibility")
    async def check_billing_eligibility(
        order_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Check if order can be billed"""
        # For MVP, mostly allow. Real logic checks if items are printed/kitchen'd.
        order = await order_service.get_order(order_id)
        if not order:
             raise HTTPException(status_code=404, detail="Order not found")
             
        # Example logic: If there are unsent items, maybe warn? 
        # For now, just return eligible.
        return {
            "eligible": True,
            "blocking_items": [],
            "message": "Ready for billing"
        }

    @router.post("/{order_id}/close")
    async def close_order(
        order_id: str,
        venue_id: Optional[str] = None,
        current_user: dict = Depends(get_current_user)
    ):
        """Close order"""
        user_id = current_user.get("user_id") or current_user.get("id")
        
        if not venue_id:
             order = await db.pos_orders.find_one({"id": order_id}, {"venue_id": 1})
             if order:
                 venue_id = order.get("venue_id")
                 
        if not venue_id:
             raise HTTPException(status_code=400, detail="venue_id required")

        await order_service.close_order(order_id, venue_id, user_id)
        return {"ok": True}
    
    @router.post("/{order_id}/payments")
    async def add_payment(
        order_id: str,
        data: PosPaymentCreate,
        current_user: dict = Depends(get_current_user)
    ):
        """Add payment to order"""
        user_id = current_user.get("user_id") or current_user.get("id")
        payment = await pos_payment_service.create_payment(data, user_id)
        await pos_payment_service.complete_payment(payment.id, data.venue_id)
        return {"ok": True, "payment": payment.model_dump()}
    
    @router.get("/{order_id}/payments")
    async def get_payments(
        order_id: str,
        venue_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Get payments for order"""
        payments = await pos_payment_service.get_order_payments(order_id, venue_id)
        return {"payments": [p.model_dump() for p in payments]}
    
    return router
