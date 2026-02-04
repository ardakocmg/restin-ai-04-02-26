"""Waste profile model"""
from pydantic import BaseModel
from typing import Optional

class WasteProfile(BaseModel):
    sku_id: str
    venue_id: str
    trim_loss: float = 0.0  # percentage
    cook_loss: float = 0.0  # percentage
    spoilage: float = 0.0  # percentage
    trash: float = 0.0  # percentage
    effective_from: str
    notes: Optional[str] = None
