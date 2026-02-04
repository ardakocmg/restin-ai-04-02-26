"""Bank Statement Line model"""
from pydantic import BaseModel, Field
from datetime import datetime, timezone
from uuid import uuid4

class BankStatementLine(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    venue_id: str
    bank_account_id: str
    statement_id: str
    line_no: int
    date: str
    description: str
    debit: float = 0.0
    credit: float = 0.0
    balance: float = 0.0
    reference: str = ""
    dedupe_hash: str
    matched: bool = False
    match_id: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
