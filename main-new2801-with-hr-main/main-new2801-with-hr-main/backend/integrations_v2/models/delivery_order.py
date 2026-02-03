"""Canonical Delivery Order model"""
from pydantic import BaseModel, Field
from typing import List
from datetime import datetime, timezone
from uuid import uuid4

class DeliveryOrderItem(BaseModel):
    sku_id: str = ""
    pos_id: str = ""
    name: str
    qty: int
    unit_price: float
    modifiers: List[dict] = []

class DeliveryOrder(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    venue_id: str
    display_id: str = ""  # ORD-
    source: dict = {}  # {"connector_key": "wolt", "external_order_id": "...", "external_store_id": "..."}
    customer: dict = {}  # {"name_redacted": "...", "phone_redacted": "...", "address_redacted": "..."}
    items: List[DeliveryOrderItem] = []
    totals: dict = {}  # {"subtotal": 0, "delivery_fee": 0, "total": 0, "currency": "EUR"}
    timing: dict = {}  # {"created_at": "...", "pickup_eta": "...", "delivery_eta": "..."}
    state: str = "NEW"  # NEW | ACCEPTED | REJECTED | IN_PREP | READY | PICKED_UP | DELIVERED | CANCELLED
    internal_links: dict = {}  # {"pos_order_id": "...", "kds_ticket_id": "...", "print_job_id": "...", "stock_txn_id": "..."}
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
