from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any, Literal
from datetime import datetime, timezone
import uuid
from .common import UserRole, StationType

# Types
EventType = Literal['ALLOW', 'DENY', 'FAIL', 'INFO', 'WARNING', 'CRITICAL']
RiskLevel = Literal['LOW', 'MED', 'HIGH', 'CRITICAL']
ResultType = Literal['ALLOW', 'DENY', 'FAIL']
UnitType = Literal['branch', 'vendor']

class RoleAssignment(BaseModel):
    """
    Assigns a role to a user within a specific unit (branch/vendor).
    Allows stacking multiple roles.
    """
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    principal_id: str  # User ID
    unit_type: UnitType
    unit_id: str
    roles: List[str]  # e.g., ["waiter", "cashier"]
    constraints: Optional[Dict[str, Any]] = None  # e.g., {"only_night_shift": true}
    valid_from: Optional[str] = None
    valid_to: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ActiveContext(BaseModel):
    """
    Represents the current working context of a logged-in user.
    Critically important for determining permissions at runtime.
    """
    model_config = ConfigDict(extra="ignore")
    principal_id: str
    active_unit_type: UnitType
    active_unit_id: str
    active_role: str  # Must be one of the assigned roles
    active_station: Optional[str] = None  # e.g., 'floor', 'bar', 'cashdesk'
    active_section: Optional[str] = None  # e.g., 'hot', 'cold', 'pass'
    active_shift_id: Optional[str] = None
    last_updated: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class RolePermission(BaseModel):
    """
    Defines what a role can do.
    Includes scoping and gating rules.
    """
    model_config = ConfigDict(extra="ignore")
    role: str
    permission_key: str  # e.g., 'orders:create', 'reports:view'
    scope: str = 'own_branch'  # own_shift, own_tables, own_branch, all_branches
    risk_level: RiskLevel = 'LOW'
    allowed_stations: List[str] = Field(default_factory=list)  # Gating: only allowed at these stations
    allowed_roles: List[str] = Field(default_factory=list)     # Gating: only allowed if active_role is in this list
    description: Optional[str] = None

class AuditEvent(BaseModel):
    """
    Append-only ledger for all critical system actions and permission checks.
    """
    model_config = ConfigDict(extra="ignore")
    event_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    ts_utc: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    
    # Event Classification
    event_type: str  # e.g., 'rbac.check', 'order.void', 'auth.login'
    severity: RiskLevel
    result: ResultType
    reason: Optional[str] = None
    policy_version: Optional[str] = None

    # Request Context (Tracing)
    request_id: Optional[str] = None
    session_id: Optional[str] = None
    
    # Principal Context (Who)
    principal_id: str
    principal_type: str = 'staff'  # staff, vendor_user, system
    
    # Operational Context (Where/How)
    unit_type: Optional[UnitType] = None
    unit_id: Optional[str] = None
    active_role: Optional[str] = None
    active_station: Optional[str] = None
    active_section: Optional[str] = None
    
    # Resource Context (What)
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    scope: Optional[str] = None
    
    # Data Snapshots (Before/After)
    before: Optional[Dict[str, Any]] = None  # PII redacted
    after: Optional[Dict[str, Any]] = None   # PII redacted
    
    # Meta
    meta: Optional[Dict[str, Any]] = None  # ip, device_id, app_version, method, path
