"""Advanced Procurement Models - RFQ, Approval Workflow, Auto-ordering"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid


class RFQStatus(str, Enum):
    DRAFT = "draft"
    SENT = "sent"
    QUOTED = "quoted"
    AWARDED = "awarded"
    CANCELLED = "cancelled"


class ApprovalStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    ESCALATED = "escalated"


class RFQItem(BaseModel):
    """Item in RFQ"""
    item_id: str
    item_name: str
    quantity: float
    unit: str
    specifications: Optional[str] = None


class SupplierQuote(BaseModel):
    """Supplier quote for RFQ"""
    supplier_id: str
    supplier_name: str
    items: List[Dict[str, Any]]  # [{item_id, unit_price, delivery_days, notes}]
    total_amount: float
    valid_until: str
    notes: Optional[str] = None
    submitted_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class RFQ(BaseModel):
    """Request for Quotation"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str
    rfq_number: str
    title: str
    description: Optional[str] = None
    items: List[RFQItem]
    suppliers: List[str]  # supplier_ids
    status: RFQStatus = RFQStatus.DRAFT
    quotes: List[SupplierQuote] = []
    awarded_supplier_id: Optional[str] = None
    created_by: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    sent_at: Optional[str] = None
    deadline: Optional[str] = None


class ApprovalRule(BaseModel):
    """Approval rule for procurement"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str
    rule_name: str
    condition: str  # "amount_gt", "supplier_new", "item_category"
    threshold: Optional[float] = None
    approvers: List[str]  # user_ids
    escalation_hours: Optional[int] = None
    active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ProcurementApproval(BaseModel):
    """Approval request for PO"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str
    po_id: str
    rfq_id: Optional[str] = None
    amount: float
    status: ApprovalStatus = ApprovalStatus.PENDING
    approvers: List[str]  # user_ids
    approved_by: List[str] = []
    rejected_by: List[str] = []
    rejection_reason: Optional[str] = None
    escalated: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class AutoOrderRule(BaseModel):
    """Automatic ordering rule"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str
    item_id: str
    supplier_id: str
    reorder_point: float
    order_quantity: float
    lead_time_days: int
    active: bool = True
    last_triggered: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
