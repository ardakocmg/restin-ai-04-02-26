"""POS Payment Service - Enhanced with Split Bill, Tips, and Stripe"""
import logging
from datetime import datetime, timezone
from typing import Optional, List

from core.database import db
from pos.models.pos_payment import (
    PosPayment, PosPaymentCreate, SeatPayment, 
    SplitBillRequest, PaymentStatus, TenderType
)

logger = logging.getLogger(__name__)


class PosPaymentService:
    """Service for handling POS payments including split bills and tips"""
    
    def __init__(self):
        self.col = db.pos_payments
        self.orders_col = db.pos_orders
        self.items_col = db.pos_order_items
        self.tips_col = db.pos_tips
    
    async def create_payment(
        self, 
        data: PosPaymentCreate, 
        user_id: str
    ) -> PosPayment:
        """Create a single payment"""
        payment = PosPayment(
            order_id=data.order_id,
            venue_id=data.venue_id,
            tender_type=data.tender_type,
            amount=data.amount,
            tip_amount=data.tip_amount,
            external_ref=data.external_ref,
            room_number=data.room_number,
            guest_name=data.guest_name,
            reservation_id=data.reservation_id,
            created_by=user_id
        )
        
        await self.col.insert_one(payment.model_dump())
        logger.info(f"💳 Payment created: {payment.id} for €{payment.amount/100:.2f}")
        return payment
    
    async def complete_payment(
        self, 
        payment_id: str, 
        venue_id: str,
        external_ref: Optional[str] = None
    ):
        """Mark payment as completed"""
        update = {
            "status": PaymentStatus.COMPLETED,
            "completed_at": datetime.now(timezone.utc).isoformat()
        }
        if external_ref:
            update["external_ref"] = external_ref
        
        await self.col.update_one(
            {"id": payment_id, "venue_id": venue_id},
            {"$set": update}
        )
        
        # Check if order is fully paid
        payment = await self.col.find_one({"id": payment_id}, {"_id": 0})
        if payment:
            await self._check_order_paid(payment["order_id"], venue_id)
        
        logger.info(f"✅ Payment completed: {payment_id}")
    
    async def void_payment(self, payment_id: str, venue_id: str, user_id: str):
        """Void a payment"""
        await self.col.update_one(
            {"id": payment_id, "venue_id": venue_id},
            {"$set": {
                "status": PaymentStatus.VOIDED,
                "voided_by": user_id,
                "voided_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        logger.info(f"🗑️ Payment voided: {payment_id}")
    
    async def split_bill_by_seat(
        self,
        request: SplitBillRequest,
        user_id: str
    ) -> List[PosPayment]:
        """
        Split bill by seat - each seat pays separately.
        Returns list of created payments.
        """
        payments = []
        
        for seat_payment in request.seat_payments:
            payment = PosPayment(
                order_id=request.order_id,
                venue_id=request.venue_id,
                tender_type=seat_payment.tender_type,
                amount=seat_payment.amount,
                is_split=True,
                seat_payments=[seat_payment],
                external_ref=seat_payment.external_ref,
                created_by=user_id
            )
            
            await self.col.insert_one(payment.model_dump())
            payments.append(payment)
        
        logger.info(f"💰 Split bill: {len(payments)} payments for order {request.order_id}")
        return payments
    
    async def split_bill_equal(
        self,
        order_id: str,
        venue_id: str,
        num_guests: int,
        tender_type: str,
        user_id: str
    ) -> List[PosPayment]:
        """
        Split bill equally among guests.
        """
        # Get order total
        order = await self.orders_col.find_one(
            {"id": order_id, "venue_id": venue_id},
            {"_id": 0}
        )
        
        if not order:
            raise ValueError("Order not found")
        
        grand_total = order.get("totals", {}).get("grand_total", 0)
        per_guest = grand_total / num_guests
        
        payments = []
        for i in range(num_guests):
            # Last guest gets any rounding difference
            amount = per_guest if i < num_guests - 1 else (grand_total - (per_guest * (num_guests - 1)))
            
            payment = PosPayment(
                order_id=order_id,
                venue_id=venue_id,
                tender_type=tender_type,
                amount=round(amount, 2),
                is_split=True,
                seat_payments=[SeatPayment(seat_no=i+1, amount=round(amount, 2))],
                created_by=user_id
            )
            
            await self.col.insert_one(payment.model_dump())
            payments.append(payment)
        
        logger.info(f"💰 Equal split: {num_guests} guests, €{per_guest/100:.2f} each")
        return payments
    
    async def add_tip(
        self,
        payment_id: str,
        venue_id: str,
        tip_amount: float,
        add_to_pool: bool = False,
        user_id: str = ""
    ):
        """Add tip to existing payment"""
        await self.col.update_one(
            {"id": payment_id, "venue_id": venue_id},
            {"$set": {
                "tip_amount": tip_amount,
                "tip_pool": add_to_pool
            }}
        )
        
        # Record tip for reporting
        tip_record = {
            "payment_id": payment_id,
            "venue_id": venue_id,
            "amount": tip_amount,
            "pooled": add_to_pool,
            "server_id": user_id,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await self.tips_col.insert_one(tip_record)
        
        logger.info(f"💵 Tip added: €{tip_amount/100:.2f} to payment {payment_id}")
    
    async def get_order_payments(
        self, 
        order_id: str, 
        venue_id: str
    ) -> List[PosPayment]:
        """Get all payments for an order"""
        cursor = self.col.find(
            {"order_id": order_id, "venue_id": venue_id},
            {"_id": 0}
        )
        docs = await cursor.to_list(100)
        return [PosPayment(**doc) for doc in docs]
    
    async def get_order_balance(
        self,
        order_id: str,
        venue_id: str
    ) -> dict:
        """Get payment balance for order"""
        order = await self.orders_col.find_one(
            {"id": order_id, "venue_id": venue_id},
            {"_id": 0}
        )
        
        if not order:
            return {"error": "Order not found"}
        
        grand_total = order.get("totals", {}).get("grand_total", 0)
        
        # Get completed payments
        payments = await self.get_order_payments(order_id, venue_id)
        paid = sum(
            p.amount for p in payments 
            if p.status in [PaymentStatus.COMPLETED, "COMPLETED"]
        )
        tips = sum(p.tip_amount for p in payments)
        
        return {
            "order_id": order_id,
            "grand_total": grand_total,
            "paid": paid,
            "remaining": grand_total - paid,
            "tips": tips,
            "is_fully_paid": paid >= grand_total
        }
    
    async def _check_order_paid(self, order_id: str, venue_id: str):
        """Check if order is fully paid and update status"""
        balance = await self.get_order_balance(order_id, venue_id)
        
        if balance.get("is_fully_paid"):
            await self.orders_col.update_one(
                {"id": order_id, "venue_id": venue_id},
                {"$set": {
                    "payment_status": "PAID",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            logger.info(f"✅ Order {order_id} fully paid")
    
    async def get_tip_pool_total(
        self,
        venue_id: str,
        date: Optional[str] = None
    ) -> dict:
        """Get tip pool total for venue"""
        query = {"venue_id": venue_id, "pooled": True}
        
        if date:
            query["created_at"] = {"$regex": f"^{date}"}
        
        cursor = self.tips_col.find(query, {"_id": 0})
        tips = await cursor.to_list(1000)
        
        total = sum(t.get("amount", 0) for t in tips)
        
        return {
            "venue_id": venue_id,
            "date": date or "all",
            "tip_count": len(tips),
            "total": total
        }


# Global instance
pos_payment_service = PosPaymentService()
