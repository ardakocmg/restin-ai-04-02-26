"""Legal Entity model"""
from pydantic import BaseModel, Field
from datetime import datetime, timezone
from uuid import uuid4

class LegalEntity(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    group_id: str
    name: str
    vat_no: str = ""
    company_no: str = ""
    currency: str = "EUR"
    fiscal_year_end: str = "12-31"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
