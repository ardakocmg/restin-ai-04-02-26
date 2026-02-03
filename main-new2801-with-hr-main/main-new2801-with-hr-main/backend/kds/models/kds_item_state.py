from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone
from enum import Enum
import uuid

class ItemStatus(str, Enum):
    PENDING = "PENDING"
    PREPARING = "PREPARING"
    READY = "READY"
    COMPLETED = "COMPLETED"

class KdsItemState(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    item_id: str  # OrderItem.id
    order_id: str
    station_key: str
    venue_id: str
    status: ItemStatus = ItemStatus.PENDING
    
    # Timestamps
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    preparing_at: Optional[str] = None
    ready_at: Optional[str] = None
    completed_at: Optional[str] = None
    
    # Actor tracking
    last_action_by: Optional[str] = None
    last_action_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class KdsItemStateCreate(BaseModel):
    item_id: str
    order_id: str
    station_key: str
    venue_id: str
