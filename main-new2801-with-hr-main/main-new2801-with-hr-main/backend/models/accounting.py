"""Accounting Malta models"""
from pydantic import BaseModel, Field
from typing import List
from datetime import datetime, timezone
from uuid import uuid4

class JournalLine(BaseModel):
    account_id: str
    debit: float = 0.0
    credit: float = 0.0
    memo: str = ""
    cost_center: str = ""

class JournalEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    display_id: str = ""
    venue_id: str
    date: str
    lines: List[JournalLine] = []
    source_type: str = ""
    source_id: str = ""
    status: str = "POSTED"  # POSTED | REVERSED
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class Account(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    display_id: str = ""
    venue_id: str
    code: str
    name: str
    type: str  # ASSET | LIABILITY | EQUITY | REVENUE | EXPENSE
    is_active: bool = True
