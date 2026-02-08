"""POS Split Bill Routes"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
import logging

from pos.models.pos_payment import SplitBillRequest, SeatPayment, AddTipRequest
from pos.service.pos_payment_service import pos_payment_service
from core.dependencies import get_current_user

logger = logging.getLogger(__name__)


class EqualSplitRequest(BaseModel):
    order_id: str
    venue_id: str
    num_guests: int
    tender_type: str = "CASH"


def create_pos_split_bill_router():
    router = APIRouter(prefix="/pos/split", tags=["pos-split-bill"])
    
    @router.post("/by-seat")
    async def split_by_seat(
        request: SplitBillRequest,
        current_user: dict = Depends(get_current_user)
    ):
        """
        Split bill by seat - each seat pays separately.
        Provide amount and tender type for each seat.
        """
        user_id = current_user.get("user_id") or current_user.get("id")
        
        payments = await pos_payment_service.split_bill_by_seat(
            request=request,
            user_id=user_id
        )
        
        return {
            "payments": [p.model_dump() for p in payments],
            "count": len(payments),
            "message": f"Bill split into {len(payments)} payments"
        }
    
    @router.post("/equal")
    async def split_equal(
        request: EqualSplitRequest,
        current_user: dict = Depends(get_current_user)
    ):
        """
        Split bill equally among guests.
        Each guest pays the same amount.
        """
        user_id = current_user.get("user_id") or current_user.get("id")
        
        if request.num_guests < 2:
            raise HTTPException(status_code=400, detail="Need at least 2 guests to split")
        
        payments = await pos_payment_service.split_bill_equal(
            order_id=request.order_id,
            venue_id=request.venue_id,
            num_guests=request.num_guests,
            tender_type=request.tender_type,
            user_id=user_id
        )
        
        return {
            "payments": [p.model_dump() for p in payments],
            "per_person": payments[0].amount if payments else 0,
            "message": f"Bill split equally among {request.num_guests} guests"
        }
    
    @router.get("/balance/{order_id}")
    async def get_balance(
        order_id: str,
        venue_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Get payment balance for order (total, paid, remaining)"""
        balance = await pos_payment_service.get_order_balance(order_id, venue_id)
        return balance
    
    @router.post("/tip")
    async def add_tip(
        request: AddTipRequest,
        current_user: dict = Depends(get_current_user)
    ):
        """Add tip to existing payment"""
        user_id = current_user.get("user_id") or current_user.get("id")
        
        await pos_payment_service.add_tip(
            payment_id=request.payment_id,
            venue_id=request.venue_id,
            tip_amount=request.tip_amount,
            add_to_pool=request.add_to_pool,
            user_id=user_id
        )
        
        return {"message": f"Tip of €{request.tip_amount/100:.2f} added"}
    
    @router.get("/tips/pool/{venue_id}")
    async def get_tip_pool(
        venue_id: str,
        date: Optional[str] = None,
        current_user: dict = Depends(get_current_user)
    ):
        """Get tip pool total for venue"""
        pool = await pos_payment_service.get_tip_pool_total(venue_id, date)
        return pool
    
    return router
