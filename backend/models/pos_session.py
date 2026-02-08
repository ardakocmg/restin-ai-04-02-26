from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum

class SessionStatus(str, Enum):
    OPEN = "OPEN"
    CLOSED = "CLOSED"

class POSSessionBase(BaseModel):
    venue_id: str
    station_id: Optional[str] = None
    station_name: Optional[str] = None
    opening_balance_cents: int = 0
    notes: Optional[str] = None

class POSSessionCreate(POSSessionBase):
    pass

class POSSessionClose(BaseModel):
    closing_balance_cents: int
    notes: Optional[str] = None

class POSSession(POSSessionBase):
    id: str
    opened_by: str
    closed_by: Optional[str] = None
    opening_time: datetime
    closing_time: Optional[datetime] = None
    status: SessionStatus
    
    cash_sales_cents: int = 0
    card_sales_cents: int = 0
    total_sales_cents: int = 0
    
    closing_balance_cents: Optional[int] = None
    cash_difference_cents: Optional[int] = None
    
    created_at: datetime
    updated_at: datetime
