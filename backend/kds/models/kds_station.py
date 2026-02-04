from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid

class KdsStation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str
    station_key: str  # Human readable: GRILL, COLD, FRY, etc.
    name: str
    enabled: bool = True
    routing_rules: List[Dict[str, Any]] = []  # [{type: "category", values: [...]}]
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    created_by: Optional[str] = None
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_by: Optional[str] = None

class KdsStationCreate(BaseModel):
    venue_id: str
    station_key: str
    name: str
    routing_rules: List[Dict[str, Any]] = []

class KdsStationUpdate(BaseModel):
    name: Optional[str] = None
    enabled: Optional[bool] = None
    routing_rules: Optional[List[Dict[str, Any]]] = None
