"""Unified Approval Request Model"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Dict, Any, Literal
from datetime import datetime, timezone
import uuid


class ApprovalRequest(BaseModel):
    """Generic approval request — covers manual clocking, leave, expenses, etc."""
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str
    type: Literal["manual_clocking", "leave", "expense", "schedule_change", "other"] = "manual_clocking"

    # Requester
    requester_id: str
    requester_name: str
    department: Optional[str] = None

    # Assigned reviewer (manager / HR)
    assigned_to: Optional[str] = None       # User ID of approver
    assigned_to_name: Optional[str] = None  # Display name

    # Status lifecycle
    status: Literal["pending", "approved", "rejected", "cancelled"] = "pending"
    priority: Literal["low", "normal", "high", "urgent"] = "normal"

    # Type-specific payload
    # For manual_clocking: { date, time_in, time_out, work_area, cost_centre }
    # For leave: { leave_type, start_date, end_date, days }
    # For expense: { amount, description, receipt_url }
    payload: Dict[str, Any] = Field(default_factory=dict)

    # Reason / notes
    reason: Optional[str] = None

    # Device & Location forensics (for clocking requests)
    ip_address: Optional[str] = None
    device_info: Optional[Dict[str, Any]] = None
    geolocation: Optional[Dict[str, Any]] = None

    # Review info
    reviewed_by: Optional[str] = None
    reviewed_by_name: Optional[str] = None
    reviewed_at: Optional[str] = None
    rejection_reason: Optional[str] = None

    # Timestamps
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
