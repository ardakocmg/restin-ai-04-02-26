"""Expense Management Models"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid


class ExpenseStatus(str, Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    APPROVED = "approved"
    REJECTED = "rejected"
    REIMBURSED = "reimbursed"


class ExpenseCategory(BaseModel):
    """Expense category"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str
    category_name: str
    requires_receipt: bool = True
    max_amount: Optional[float] = None
    approval_required: bool = True
    approvers: List[str] = []  # user_ids
    active: bool = True


class ExpenseReceipt(BaseModel):
    """Expense receipt"""
    receipt_number: Optional[str] = None
    image_base64: Optional[str] = None
    ocr_extracted_amount: Optional[float] = None
    ocr_extracted_date: Optional[str] = None
    ocr_extracted_vendor: Optional[str] = None


class ExpenseClaim(BaseModel):
    """Expense claim"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str
    employee_id: str
    employee_name: str
    claim_number: str
    expense_date: str
    category_id: str
    category_name: str
    amount: float
    currency: str = "USD"
    reason: str
    receipt: Optional[ExpenseReceipt] = None
    status: ExpenseStatus = ExpenseStatus.DRAFT
    submitted_at: Optional[str] = None
    approved_by: Optional[str] = None
    approved_at: Optional[str] = None
    rejected_by: Optional[str] = None
    rejection_reason: Optional[str] = None
    reimbursed_at: Optional[str] = None
    payment_reference: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ExpenseApprovalWorkflow(BaseModel):
    """Expense approval workflow"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str
    category_id: str
    approval_levels: List[Dict[str, Any]]  # [{level, approvers, amount_threshold}]
    auto_approve_under: Optional[float] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
