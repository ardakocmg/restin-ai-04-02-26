"""Reporting Models"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid


class EmployeeDetailReport(BaseModel):
    """Employee detail report"""
    employee_id: str
    name: str
    occupation: str
    department: str
    employment_date: str
    status: str


class TrainingCertification(BaseModel):
    """Training & Certification record"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str
    employee_id: str
    employee_name: str
    certification_name: str
    expiry_date: Optional[str] = None
    start_date: Optional[str] = None
    status: str  # "expiring_soon", "expired", "starting_soon", "ongoing"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class BirthdayAnniversary(BaseModel):
    """Birthday & Anniversary record"""
    employee_id: str
    employee_name: str
    event_type: str  # "birthday", "work_anniversary"
    date: str
    years: Optional[int] = None  # for anniversaries


class GenericReport(BaseModel):
    """Generic report container for various analytics"""
    model_config = ConfigDict(extra="ignore")
    title: str
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    data: List[Dict[str, Any]]
    columns: List[Dict[str, str]]
