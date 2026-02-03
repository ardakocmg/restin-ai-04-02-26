"""SFM Accounting Integration Models"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid


class GLAccount(BaseModel):
    """General Ledger account"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str
    account_code: str
    account_name: str
    account_type: str  # asset, liability, equity, revenue, expense
    parent_account: Optional[str] = None
    balance: float = 0
    active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class LedgerEntry(BaseModel):
    """Ledger entry"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str
    entry_date: str
    account_id: str
    account_code: str
    debit: float = 0
    credit: float = 0
    description: str
    reference: Optional[str] = None
    source: str  # payroll, invoice, expense
    source_id: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class BankReconciliation(BaseModel):
    """Bank reconciliation"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str
    bank_account_id: str
    statement_date: str
    statement_balance: float
    book_balance: float
    reconciled_balance: float
    outstanding_checks: List[Dict[str, Any]] = []
    deposits_in_transit: List[Dict[str, Any]] = []
    reconciled: bool = False
    reconciled_by: Optional[str] = None
    reconciled_at: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class VATReturn(BaseModel):
    """VAT return"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str
    period_start: str
    period_end: str
    total_sales: float
    vat_on_sales: float
    total_purchases: float
    vat_on_purchases: float
    vat_payable: float
    submitted: bool = False
    submitted_at: Optional[str] = None
    reference_number: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
