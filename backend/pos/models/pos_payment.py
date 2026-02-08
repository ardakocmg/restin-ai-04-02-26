"""POS Payment Models - Enhanced with Split Bill and Tips"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
from enum import Enum
import uuid


class TenderType(str, Enum):
    CASH = "CASH"
    CARD = "CARD"
    SPLIT = "SPLIT"  # Multiple tender types
    VOUCHER = "VOUCHER"
    ACCOUNT = "ACCOUNT"  # House account
    OTHER = "OTHER"


class PaymentStatus(str, Enum):
    INITIATED = "INITIATED"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    VOIDED = "VOIDED"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"


class SeatPayment(BaseModel):
    """Payment for a specific seat/guest"""
    seat_no: int
    amount: float  # Amount in cents
    tender_type: TenderType = TenderType.CASH
    external_ref: Optional[str] = None


class PosPayment(BaseModel):
    """Payment record"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_id: str
    venue_id: str
    
    # Payment details
    tender_type: str  # CASH|CARD|SPLIT|OTHER
    amount: float  # Amount in cents
    
    # Tip
    tip_amount: float = 0
    tip_pool: bool = False  # Add to tip pool for distribution
    
    # Split bill details
    is_split: bool = False
    seat_payments: List[SeatPayment] = []
    
    # Status & refs
    status: str = "INITIATED"
    external_ref: Optional[str] = None  # Card terminal ref, Stripe payment_intent
    
    # Stripe specific
    stripe_payment_intent: Optional[str] = None
    stripe_charge_id: Optional[str] = None
    
    # Meta
    meta: Optional[Dict[str, Any]] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    created_by: str
    completed_at: Optional[str] = None


class PosPaymentCreate(BaseModel):
    """Basic payment creation"""
    order_id: str
    venue_id: str
    tender_type: str
    amount: float
    tip_amount: float = 0
    external_ref: Optional[str] = None


class SplitBillRequest(BaseModel):
    """Request to split bill by seat"""
    order_id: str
    venue_id: str
    seat_payments: List[SeatPayment]
    

class AddTipRequest(BaseModel):
    """Add tip to existing payment"""
    payment_id: str
    venue_id: str
    tip_amount: float
    add_to_pool: bool = False
