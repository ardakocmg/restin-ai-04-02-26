"""Goods Received Note (GRN) model"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
from uuid import uuid4


class GRNLine(BaseModel):
    sku_id: str
    sku_name: str
    qty_received: float
    base_uom: str
    lot_number: Optional[str] = None
    expiry_date: Optional[str] = None
    po_line_id: Optional[str] = None


class ReceivingGRN(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    display_id: str = ""  # GRN-XXXXX
    venue_id: str
    supplier_id: str
    supplier_name: str = ""
    po_id: Optional[str] = None
    po_display_id: Optional[str] = None
    lines: List[GRNLine] = []
    notes: Optional[str] = None
    posted_at: Optional[str] = None  # When posted to ledger
    created_by: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class GRNCreate(BaseModel):
    venue_id: str
    supplier_id: str
    po_id: Optional[str] = None
    lines: List[dict]
    notes: Optional[str] = None
