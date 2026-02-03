from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from .common import UnitType, LedgerAction, DocumentStatus
import uuid

class InventoryItemCreate(BaseModel):
    venue_id: str
    name: str
    sku: str
    barcode: Optional[str] = None
    unit: str = "each"
    min_stock: int = 0

class InventoryItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str
    name: str
    sku: str
    barcode: Optional[str] = None
    unit: str = "each"
    current_stock: float = 0
    min_stock: int = 0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class BaseUnit(BaseModel):
    """Canonical base units: g, ml, pcs"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    code: str  # g, ml, pcs
    type: UnitType
    name: str
    is_canonical: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class UnitConversion(BaseModel):
    """Unit conversion rules"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    from_unit: str
    to_unit: str
    multiplier: float
    scope: str = "global"  # global, venue, ingredient
    scope_id: Optional[str] = None  # venue_id or ingredient_id
    verified: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class UnitAlias(BaseModel):
    """Unit aliases (e.g., 'etto' -> 'hg')"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    alias: str  # etto, litro, tablespoon
    canonical_unit: str  # hg, l, tbsp
    language: str = "en"  # en, it, es, etc.
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class RecipeIngredient(BaseModel):
    """Ingredient used in a recipe"""
    inventory_item_id: str
    quantity: float
    unit: str = "g"  # g, ml, each, etc.

class MenuItemRecipe(BaseModel):
    """Recipe/ingredient mapping for menu items"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    menu_item_id: str
    ingredients: List[RecipeIngredient] = []
    portion_size: float = 1.0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class StockLedgerEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str
    item_id: str
    action: LedgerAction
    quantity: float
    lot_number: Optional[str] = None
    expiry_date: Optional[str] = None
    reason: Optional[str] = None
    po_id: Optional[str] = None
    user_id: str
    prev_hash: str
    entry_hash: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class PurchaseOrderCreate(BaseModel):
    venue_id: str
    supplier_name: str
    items: List[dict]

class PurchaseOrder(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str
    supplier_name: str
    items: List[dict]  # [{item_id, name, quantity, received}]
    status: str = "pending"  # pending, partial, received, cancelled
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    received_at: Optional[str] = None

class SkillCreate(BaseModel):
    employee_id: str
    venue_id: str
    name: str
    level: Optional[str] = None

class Skill(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    display_id: Optional[str] = None  # SKL-00001
    employee_id: str
    venue_id: str
    name: str
    level: Optional[str] = None
    expiry_date: Optional[str] = None
    verified: bool = False
    verified_by: Optional[str] = None
    verified_at: Optional[str] = None
    document_id: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
