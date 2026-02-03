"""Supplier catalog model"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import date
from decimal import Decimal
from uuid import uuid4


class SupplierCatalogItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    supplier_id: str
    sku_id: str  # Links to inventory_items
    supplier_sku: str  # Supplier's product code
    pack_size: float  # e.g., 12 (12-pack)
    pack_uom: str  # CASE, KG, EA
    base_uom: str  # EA, G (matches inventory item)
    unit_price: float  # Price per pack
    vat_rate: float = 0.18  # Malta VAT 18%
    currency: str = "EUR"
    valid_from: str  # ISO date
    valid_to: Optional[str] = None  # ISO date
    created_at: str = Field(default_factory=lambda: date.today().isoformat())


class SupplierCatalogItemCreate(BaseModel):
    supplier_id: str
    sku_id: str
    supplier_sku: str
    pack_size: float
    pack_uom: str
    base_uom: str
    unit_price: float
    vat_rate: float = 0.18
    currency: str = "EUR"
    valid_from: str
    valid_to: Optional[str] = None
