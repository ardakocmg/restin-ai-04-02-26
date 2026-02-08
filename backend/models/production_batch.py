from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class ProductionStatus(str, Enum):
    PLANNED = "PLANNED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"

class ProductionBatchBase(BaseModel):
    venue_id: str
    recipe_id: str
    batch_number: str
    status: ProductionStatus = ProductionStatus.PLANNED
    planned_quantity: float
    actual_quantity: Optional[float] = None
    unit: str
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    notes: Optional[str] = None

class ProductionBatchCreate(ProductionBatchBase):
    pass

class ProductionBatchUpdate(BaseModel):
    status: Optional[ProductionStatus] = None
    actual_quantity: Optional[float] = None
    notes: Optional[str] = None
    end_date: Optional[datetime] = None

class ProductionBatch(ProductionBatchBase):
    id: str
    produced_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime
