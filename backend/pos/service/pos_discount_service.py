"""POS Discount Service - Apply discounts with manager approval"""
import logging
from typing import Optional, List
from datetime import datetime, timezone

from core.database import db
from pos.models.pos_discount import (
    PosDiscount, DiscountType, DiscountScope, DiscountStatus,
    DiscountCreateRequest
)

logger = logging.getLogger(__name__)

# Config: Discounts above this % require manager approval
APPROVAL_THRESHOLD_PERCENT = 20  # 20% or higher needs approval
APPROVAL_THRESHOLD_FIXED = 5000  # €50+ needs approval (in cents)


class PosDiscountService:
    """Service for managing POS discounts"""
    
    def __init__(self):
        self.discounts_col = db.pos_discounts
        self.orders_col = db.pos_orders
        self.items_col = db.pos_order_items
    
    async def apply_discount(
        self,
        request: DiscountCreateRequest,
        user_id: str,
        user_role: str = "staff"
    ) -> PosDiscount:
        """
        Apply discount to order or item.
        High-value discounts require manager approval.
        """
        # Calculate if approval needed
        requires_approval = self._requires_approval(
            request.discount_type, 
            request.value, 
            user_role
        )
        
        # Calculate discount amount
        calculated_amount = await self._calculate_discount_amount(
            request.order_id,
            request.venue_id,
            request.discount_type,
            request.scope,
            request.value,
            request.item_id
        )
        
        # Create discount record
        discount = PosDiscount(
            order_id=request.order_id,
            venue_id=request.venue_id,
            discount_type=request.discount_type,
            scope=request.scope,
            value=request.value,
            calculated_amount=calculated_amount,
            item_id=request.item_id,
            reason=request.reason,
            requires_approval=requires_approval,
            status=DiscountStatus.PENDING if requires_approval else DiscountStatus.APPLIED,
            voucher_code=request.voucher_code,
            created_by=user_id
        )
        
        await self.discounts_col.insert_one(discount.model_dump())
        
        # If no approval needed, apply immediately
        if not requires_approval:
            await self._apply_to_order(discount)
            logger.info(f"💰 Discount applied: {discount.discount_type} {discount.value} to order {request.order_id}")
        else:
            logger.info(f"⏳ Discount pending approval: {discount.id}")
        
        return discount
    
    def _requires_approval(
        self, 
        discount_type: DiscountType, 
        value: float,
        user_role: str
    ) -> bool:
        """Check if discount requires manager approval"""
        # Managers don't need approval
        if user_role in ["manager", "admin", "owner"]:
            return False
        
        if discount_type == DiscountType.PERCENTAGE:
            return value >= APPROVAL_THRESHOLD_PERCENT
        elif discount_type == DiscountType.FIXED:
            return value >= APPROVAL_THRESHOLD_FIXED
        
        return False
    
    async def _calculate_discount_amount(
        self,
        order_id: str,
        venue_id: str,
        discount_type: DiscountType,
        scope: DiscountScope,
        value: float,
        item_id: Optional[str] = None
    ) -> float:
        """Calculate actual discount amount in cents"""
        if scope == DiscountScope.ITEM and item_id:
            # Get item total
            item = await self.items_col.find_one(
                {"id": item_id, "venue_id": venue_id},
                {"_id": 0}
            )
            if not item:
                return 0
            base_amount = item.get("pricing", {}).get("line_total", 0)
        else:
            # Get order subtotal
            order = await self.orders_col.find_one(
                {"id": order_id, "venue_id": venue_id},
                {"_id": 0}
            )
            if not order:
                return 0
            base_amount = order.get("totals", {}).get("subtotal", 0)
        
        if discount_type == DiscountType.PERCENTAGE:
            return base_amount * (value / 100)
        else:
            return min(value, base_amount)  # Can't discount more than total
    
    async def _apply_to_order(self, discount: PosDiscount):
        """Apply discount to order totals"""
        order = await self.orders_col.find_one(
            {"id": discount.order_id, "venue_id": discount.venue_id},
            {"_id": 0}
        )
        
        if not order:
            return
        
        totals = order.get("totals", {})
        current_discount = totals.get("discount", 0)
        new_discount = current_discount + discount.calculated_amount
        
        # Recalculate totals
        subtotal = totals.get("subtotal", 0)
        tax_rate = 0.18  # 18% VAT
        taxable = subtotal - new_discount
        tax = taxable * tax_rate
        grand_total = taxable + tax
        
        await self.orders_col.update_one(
            {"id": discount.order_id, "venue_id": discount.venue_id},
            {"$set": {
                "totals.discount": new_discount,
                "totals.tax": tax,
                "totals.grand_total": grand_total,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
    
    async def approve_discount(
        self,
        discount_id: str,
        venue_id: str,
        approved: bool,
        manager_id: str,
        manager_note: str = ""
    ) -> PosDiscount:
        """Manager approves or rejects pending discount"""
        discount_doc = await self.discounts_col.find_one(
            {"id": discount_id, "venue_id": venue_id},
            {"_id": 0}
        )
        
        if not discount_doc:
            raise ValueError("Discount not found")
        
        discount = PosDiscount(**discount_doc)
        
        if discount.status != DiscountStatus.PENDING:
            raise ValueError("Discount is not pending approval")
        
        new_status = DiscountStatus.APPROVED if approved else DiscountStatus.REJECTED
        
        await self.discounts_col.update_one(
            {"id": discount_id},
            {"$set": {
                "status": new_status,
                "approved_by": manager_id,
                "approved_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        if approved:
            discount.status = DiscountStatus.APPROVED
            await self._apply_to_order(discount)
            
            # Update status to APPLIED
            await self.discounts_col.update_one(
                {"id": discount_id},
                {"$set": {"status": DiscountStatus.APPLIED}}
            )
            logger.info(f"✅ Discount {discount_id} approved by {manager_id}")
        else:
            logger.info(f"❌ Discount {discount_id} rejected by {manager_id}")
        
        return discount
    
    async def get_order_discounts(
        self,
        order_id: str,
        venue_id: str
    ) -> List[PosDiscount]:
        """Get all discounts for an order"""
        cursor = self.discounts_col.find(
            {"order_id": order_id, "venue_id": venue_id},
            {"_id": 0}
        )
        docs = await cursor.to_list(100)
        return [PosDiscount(**doc) for doc in docs]
    
    async def get_pending_approvals(
        self,
        venue_id: str
    ) -> List[PosDiscount]:
        """Get all pending discount approvals for venue"""
        cursor = self.discounts_col.find(
            {"venue_id": venue_id, "status": DiscountStatus.PENDING},
            {"_id": 0}
        )
        docs = await cursor.to_list(100)
        return [PosDiscount(**doc) for doc in docs]
    
    async def void_discount(
        self,
        discount_id: str,
        venue_id: str,
        user_id: str
    ):
        """Remove/void a discount"""
        discount_doc = await self.discounts_col.find_one(
            {"id": discount_id, "venue_id": venue_id},
            {"_id": 0}
        )
        
        if not discount_doc:
            raise ValueError("Discount not found")
        
        discount = PosDiscount(**discount_doc)
        
        # Reverse the discount from order
        order = await self.orders_col.find_one(
            {"id": discount.order_id, "venue_id": venue_id},
            {"_id": 0}
        )
        
        if order and discount.status == DiscountStatus.APPLIED:
            totals = order.get("totals", {})
            new_discount = max(0, totals.get("discount", 0) - discount.calculated_amount)
            
            # Recalculate
            subtotal = totals.get("subtotal", 0)
            tax_rate = 0.18
            taxable = subtotal - new_discount
            tax = taxable * tax_rate
            grand_total = taxable + tax
            
            await self.orders_col.update_one(
                {"id": discount.order_id, "venue_id": venue_id},
                {"$set": {
                    "totals.discount": new_discount,
                    "totals.tax": tax,
                    "totals.grand_total": grand_total,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
        
        # Mark discount as voided
        await self.discounts_col.update_one(
            {"id": discount_id},
            {"$set": {
                "status": "VOIDED",
                "voided_by": user_id,
                "voided_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        logger.info(f"🗑️ Discount {discount_id} voided by {user_id}")


# Global instance
pos_discount_service = PosDiscountService()
