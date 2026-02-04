"""Central Kitchen Production Models"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid


class BatchStatus(str, Enum):
    PLANNED = "planned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class DistributionStatus(str, Enum):
    PENDING = "pending"
    IN_TRANSIT = "in_transit"
    DELIVERED = "delivered"
    REJECTED = "rejected"


class InternalOrderItem(BaseModel):
    """Item in internal order from outlet"""
    item_id: str
    item_name: str
    quantity: float
    unit: str
    urgency: str = "normal"  # normal, high, critical


class InternalOrder(BaseModel):
    """Internal order from outlet to central kitchen"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_number: str
    from_venue_id: str  # outlet
    to_venue_id: str  # central kitchen
    items: List[InternalOrderItem]
    status: str = "pending"  # pending, fulfilled, partial, cancelled
    requested_delivery: str
    created_by: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    fulfilled_at: Optional[str] = None


class ProductionBatchItem(BaseModel):
    """Item in production batch"""
    item_id: str
    item_name: str
    target_quantity: float = Field(alias='quantity')
    produced_quantity: float = 0
    unit: str
    recipe_id: Optional[str] = None
    
    model_config = ConfigDict(populate_by_name=True)


class ProductionBatch(BaseModel):
    """Production batch"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str  # central kitchen
    batch_number: str
    batch_date: str
    items: List[ProductionBatchItem]
    status: BatchStatus = BatchStatus.PLANNED
    internal_orders: List[str] = []  # order_ids
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    produced_by: Optional[str] = None
    quality_checked: bool = False
    quality_notes: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ProductionBatchRequest(BaseModel):
    """Request to create production batch"""
    batch_date: str
    items: List[Dict[str, Any]]
    internal_orders: List[str] = []


class DistributionRecord(BaseModel):
    """Distribution tracking"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    batch_id: str
    from_venue_id: str  # central kitchen
    to_venue_id: str  # outlet
    items: List[Dict[str, Any]]  # [{item_id, quantity, unit}]
    status: DistributionStatus = DistributionStatus.PENDING
    shipped_at: Optional[str] = None
    delivered_at: Optional[str] = None
    received_by: Optional[str] = None
    delivery_notes: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
