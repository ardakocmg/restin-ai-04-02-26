"""POS Discount Routes"""
from fastapi import APIRouter, HTTPException, Depends
import logging

from pos.models.pos_discount import DiscountCreateRequest, DiscountApprovalRequest
from pos.service.pos_discount_service import pos_discount_service
from core.dependencies import get_current_user

logger = logging.getLogger(__name__)


def create_pos_discount_router():
    router = APIRouter(prefix="/pos/discounts", tags=["pos-discounts"])
    
    @router.post("")
    async def apply_discount(
        request: DiscountCreateRequest,
        current_user: dict = Depends(get_current_user)
    ):
        """
        Apply discount to order or item.
        High discounts (>20% or >€50) require manager approval.
        """
        user_id = current_user.get("user_id") or current_user.get("id")
        user_role = current_user.get("role", "staff")
        
        discount = await pos_discount_service.apply_discount(
            request=request,
            user_id=user_id,
            user_role=user_role
        )
        
        return {
            "discount": discount.model_dump(),
            "requires_approval": discount.requires_approval,
            "message": "Pending manager approval" if discount.requires_approval else "Discount applied"
        }
    
    @router.post("/approve")
    async def approve_discount(
        request: DiscountApprovalRequest,
        current_user: dict = Depends(get_current_user)
    ):
        """Manager approves or rejects pending discount"""
        user_role = current_user.get("role", "staff")
        
        if user_role not in ["manager", "admin", "owner"]:
            raise HTTPException(status_code=403, detail="Only managers can approve discounts")
        
        manager_id = current_user.get("user_id") or current_user.get("id")
        venue_id = current_user.get("venue_id", "")
        
        discount = await pos_discount_service.approve_discount(
            discount_id=request.discount_id,
            venue_id=venue_id,
            approved=request.approved,
            manager_id=manager_id,
            manager_note=request.manager_note or ""
        )
        
        return {
            "discount": discount.model_dump(),
            "message": "Discount approved" if request.approved else "Discount rejected"
        }
    
    @router.get("/pending/{venue_id}")
    async def get_pending_approvals(
        venue_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Get all pending discount approvals for venue"""
        discounts = await pos_discount_service.get_pending_approvals(venue_id)
        return {"pending": [d.model_dump() for d in discounts]}
    
    @router.get("/order/{order_id}")
    async def get_order_discounts(
        order_id: str,
        venue_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Get all discounts for an order"""
        discounts = await pos_discount_service.get_order_discounts(order_id, venue_id)
        return {"discounts": [d.model_dump() for d in discounts]}
    
    @router.delete("/{discount_id}")
    async def void_discount(
        discount_id: str,
        venue_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Void a discount"""
        user_id = current_user.get("user_id") or current_user.get("id")
        await pos_discount_service.void_discount(discount_id, venue_id, user_id)
        return {"message": "Discount voided"}
    
    return router
