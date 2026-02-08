"""POS Discount Models"""
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime, timezone
import uuid


class DiscountType(str, Enum):
    PERCENTAGE = "PERCENTAGE"  # 10% off
    FIXED = "FIXED"            # €5 off
    VOUCHER = "VOUCHER"        # Promo code


class DiscountScope(str, Enum):
    ORDER = "ORDER"            # Apply to entire order
    ITEM = "ITEM"              # Apply to specific item


class DiscountStatus(str, Enum):
    PENDING = "PENDING"        # Awaiting manager approval
    APPROVED = "APPROVED"      # Approved
    REJECTED = "REJECTED"      # Rejected
    APPLIED = "APPLIED"        # Applied to order


class PosDiscount(BaseModel):
    """Discount applied to order or item"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_id: str
    venue_id: str
    
    # Discount details
    discount_type: DiscountType
    scope: DiscountScope = DiscountScope.ORDER
    
    # Value
    value: float  # Percentage (0-100) or fixed amount in cents
    calculated_amount: float = 0  # Actual discount amount in cents
    
    # For item-level discounts
    item_id: Optional[str] = None
    
    # Reason & approval
    reason: str = ""
    requires_approval: bool = False
    status: DiscountStatus = DiscountStatus.APPLIED
    approved_by: Optional[str] = None
    approved_at: Optional[str] = None
    
    # Voucher/promo code
    voucher_code: Optional[str] = None
    
    # Audit
    created_by: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class DiscountCreateRequest(BaseModel):
    """Request to apply discount"""
    order_id: str
    venue_id: str
    discount_type: DiscountType
    scope: DiscountScope = DiscountScope.ORDER
    value: float  # % or cents
    item_id: Optional[str] = None
    reason: str = ""
    voucher_code: Optional[str] = None


class DiscountApprovalRequest(BaseModel):
    """Manager approval for high-value discounts"""
    discount_id: str
    approved: bool
    manager_note: Optional[str] = None
