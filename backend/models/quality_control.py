"""Quality Control & Compliance Models"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid


class AuditType(str, Enum):
    HACCP = "haccp"
    QUALITY = "quality"
    SAFETY = "safety"
    ALLERGEN = "allergen"
    GENERAL = "general"
    FOOD_SAFETY = "food_safety"


class ChecklistItemStatus(str, Enum):
    PASS = "pass"
    FAIL = "fail"
    NA = "na"


class ChecklistItem(BaseModel):
    """Quality checklist item"""
    item: str
    status: ChecklistItemStatus
    notes: Optional[str] = None
    corrective_action: Optional[str] = None


class QualityAuditRequest(BaseModel):
    """Request to create audit"""
    audit_type: str
    audit_date: str
    checklist: List[Dict[str, Any]]
    findings: List[str] = []
    corrective_actions: List[str] = []
    follow_up_required: bool = False
    follow_up_date: Optional[str] = None


class QualityAudit(BaseModel):
    """Quality audit record"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str
    audit_type: AuditType
    audit_date: str
    auditor_id: str
    auditor_name: str
    checklist: List[ChecklistItem]
    overall_score: Optional[float] = None
    findings: List[str] = []
    corrective_actions: List[str] = []
    follow_up_required: bool = False
    follow_up_date: Optional[str] = None
    signed_off: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class AllergenInfo(BaseModel):
    """Allergen information"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    item_id: str
    item_name: str
    allergens: List[str]  # peanuts, dairy, gluten, etc.
    may_contain: List[str] = []
    allergen_free: List[str] = []
    cross_contamination_risk: bool = False
    verified_date: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ComplianceDocumentRequest(BaseModel):
    """Request to create compliance document"""
    document_type: str
    document_name: str
    issuing_authority: str
    issue_date: str
    expiry_date: Optional[str] = None
    document_url: Optional[str] = None


class ComplianceDocument(BaseModel):
    """Compliance document"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str
    document_type: str  # license, certificate, permit
    document_name: str
    issuing_authority: str
    issue_date: str
    expiry_date: Optional[str] = None
    document_url: Optional[str] = None
    status: str = "valid"  # valid, expiring_soon, expired
    reminder_sent: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
