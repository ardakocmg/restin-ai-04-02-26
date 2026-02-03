"""Advanced Document Management Models"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid


class DocumentType(str, Enum):
    CONTRACT = "contract"
    ID_DOCUMENT = "id_document"
    CERTIFICATE = "certificate"
    LICENSE = "license"
    VISA = "visa"
    WORK_PERMIT = "work_permit"
    OTHER = "other"


class DocumentStatus(str, Enum):
    VALID = "valid"
    EXPIRING_SOON = "expiring_soon"
    EXPIRED = "expired"
    PENDING_RENEWAL = "pending_renewal"


class EmployeeDocument(BaseModel):
    """Employee document"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str
    employee_id: str
    document_type: DocumentType
    document_name: str
    document_number: Optional[str] = None
    issue_date: Optional[str] = None
    expiry_date: Optional[str] = None
    issuing_authority: Optional[str] = None
    file_url: Optional[str] = None
    file_base64: Optional[str] = None
    status: DocumentStatus = DocumentStatus.VALID
    reminder_sent: bool = False
    reminder_days_before: int = 30
    notes: Optional[str] = None
    uploaded_by: str
    uploaded_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    verified: bool = False
    verified_by: Optional[str] = None
    verified_at: Optional[str] = None


class EmployeeDocumentRequest(BaseModel):
    """Request to upload employee document"""
    employee_id: str
    document_type: str
    document_name: str
    document_number: Optional[str] = None
    issue_date: Optional[str] = None
    expiry_date: Optional[str] = None
    issuing_authority: Optional[str] = None
    file_url: Optional[str] = None
    file_base64: Optional[str] = None
    reminder_days_before: int = 30
    notes: Optional[str] = None


class DocumentReminder(BaseModel):
    """Document expiry reminder"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    document_id: str
    employee_id: str
    reminder_date: str
    sent: bool = False
    sent_at: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class CertificateTraining(BaseModel):
    """Training certificate"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str
    employee_id: str
    training_name: str
    provider: str
    completion_date: str
    expiry_date: Optional[str] = None
    certificate_url: Optional[str] = None
    hours: Optional[float] = None
    score: Optional[float] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
