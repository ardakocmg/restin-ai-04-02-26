"""Malta Tax Tables (versioned, immutable)"""
from pydantic import BaseModel
from typing import List

class TaxBand(BaseModel):
    min: float
    max: float
    rate: float  # percentage

class MaltaTaxTable(BaseModel):
    version: str  # e.g., "2024"
    effective_from: str
    effective_to: str
    bands: List[TaxBand] = [
        TaxBand(min=0, max=9100, rate=0),
        TaxBand(min=9101, max=14500, rate=15),
        TaxBand(min=14501, max=19500, rate=25),
        TaxBand(min=19501, max=60000, rate=25),
        TaxBand(min=60001, max=999999, rate=35)
    ]
    created_at: str
