from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid

class TicketStatus(str, Enum):
    NEW = "NEW"
    PREPARING = "PREPARING"
    READY = "READY"
    ON_HOLD = "ON_HOLD"
    COMPLETED = "COMPLETED"

class KdsTicketState(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_id: str
    station_key: str
    venue_id: str
    status: TicketStatus = TicketStatus.NEW
    
    # Timestamps
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    preparing_at: Optional[str] = None
    ready_at: Optional[str] = None
    on_hold_at: Optional[str] = None
    completed_at: Optional[str] = None
    
    # Undo window
    undo_until: Optional[str] = None
    
    # Actor tracking
    last_action_by: Optional[str] = None
    last_action_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    
    # Metadata
    metadata: Dict[str, Any] = {}  # table, server, covers, etc.

class KdsTicketStateCreate(BaseModel):
    order_id: str
    station_key: str
    venue_id: str
    metadata: Dict[str, Any] = {}
