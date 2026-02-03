"""Supplier Invoice model"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
from uuid import uuid4


class SupplierInvoice(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    display_id: str = ""  # INV-XXXXX
    venue_id: str
    supplier_id: str
    supplier_name: str = ""
    invoice_no: str  # Supplier's invoice number
    po_id: Optional[str] = None
    grn_ids: List[str] = []  # Linked GRNs
    subtotal: float = 0.0
    vat_amount: float = 0.0
    total_amount: float = 0.0
    status: str = "DRAFT"  # DRAFT → MATCHED → APPROVED → LOCKED
    matched_at: Optional[str] = None
    approved_by: Optional[str] = None
    approved_at: Optional[str] = None
    due_date: Optional[str] = None
    paid_at: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class SupplierInvoiceCreate(BaseModel):
    venue_id: str
    supplier_id: str
    invoice_no: str
    po_id: Optional[str] = None
    grn_ids: List[str] = []
    total_amount: float
    due_date: Optional[str] = None
