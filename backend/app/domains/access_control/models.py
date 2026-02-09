"""
🔐 Access Control Domain — Pydantic Models

Server-authoritative models for Nuki Smart Lock integration.
Nuki is an execution provider — all decisions are backend-only.
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime
from enum import Enum


# ==================== ENUMS ====================

class DoorAction(str, Enum):
    UNLOCK = "UNLOCK"
    LOCK = "LOCK"
    UNLATCH = "UNLATCH"


class ProviderPath(str, Enum):
    WEB = "WEB"        # Nuki Web API (api.nuki.io)
    BRIDGE = "BRIDGE"  # Local LAN via Nuki Bridge


class ConnectionMode(str, Enum):
    OAUTH2 = "OAUTH2"
    API_TOKEN = "API_TOKEN"


class ActionResult(str, Enum):
    SUCCESS = "SUCCESS"
    FAILURE = "FAILURE"
    TIMEOUT = "TIMEOUT"
    UNAUTHORIZED = "UNAUTHORIZED"
    PROVIDER_UNAVAILABLE = "PROVIDER_UNAVAILABLE"


class DeviceType(str, Enum):
    SMART_LOCK_PRO = "SMART_LOCK_PRO"
    SMART_LOCK_ULTRA = "SMART_LOCK_ULTRA"
    OPENER = "OPENER"
    SMART_DOOR = "SMART_DOOR"


class LockState(str, Enum):
    LOCKED = "LOCKED"
    UNLOCKED = "UNLOCKED"
    UNLATCHED = "UNLATCHED"
    UNKNOWN = "UNKNOWN"


# ==================== CREDENTIALS ====================

class NukiCredentialCreate(BaseModel):
    """Input model for connecting a venue — either OAuth2 or API token."""
    mode: ConnectionMode
    api_token: Optional[str] = None  # For API_TOKEN mode


class NukiCredential(BaseModel):
    """Stored credential record (tokens encrypted at rest)."""
    venue_id: str
    mode: ConnectionMode
    # Encrypted fields — never exposed to frontend
    encrypted_access_token: Optional[str] = None
    encrypted_refresh_token: Optional[str] = None
    encrypted_api_token: Optional[str] = None
    token_expires_at: Optional[str] = None
    connected_at: str
    last_refreshed_at: Optional[str] = None
    status: Literal["active", "expired", "revoked"] = "active"


# ==================== DOORS ====================

class Door(BaseModel):
    """Internal door record with stable ID."""
    id: str = Field(..., description="Stable internal door ID")
    venue_id: str
    nuki_smartlock_id: int = Field(..., description="Nuki device ID from API")
    display_name: str = Field(..., description="Human-readable name (editable)")
    device_type: DeviceType = DeviceType.SMART_LOCK_PRO
    firmware_version: Optional[str] = None
    battery_critical: bool = False
    battery_charge: Optional[int] = None
    lock_state: LockState = LockState.UNKNOWN
    last_synced_at: Optional[str] = None
    created_at: str = ""
    updated_at: Optional[str] = None


class DoorUpdate(BaseModel):
    """Input model for updating a door (rename)."""
    display_name: str = Field(..., min_length=1, max_length=100)


class DoorSyncResult(BaseModel):
    """Result of device discovery."""
    discovered: int = 0
    new: int = 0
    updated: int = 0
    doors: List[Door] = []


# ==================== PERMISSIONS ====================

class DoorPermission(BaseModel):
    """Maps a role or user to allowed actions on a door."""
    id: str
    venue_id: str
    door_id: str
    # Either role_id OR user_id (not both)
    role_id: Optional[str] = None
    user_id: Optional[str] = None
    # Independently assignable actions
    can_unlock: bool = False
    can_lock: bool = False
    can_unlatch: bool = False
    # Future: time-based constraints
    valid_from: Optional[str] = None
    valid_until: Optional[str] = None
    created_at: str = ""
    created_by: Optional[str] = None


class PermissionCreate(BaseModel):
    """Input model for creating/updating a permission."""
    door_id: str
    role_id: Optional[str] = None
    user_id: Optional[str] = None
    can_unlock: bool = False
    can_lock: bool = False
    can_unlatch: bool = False
    valid_from: Optional[str] = None
    valid_until: Optional[str] = None


# ==================== AUDIT ====================

class AccessAuditEntry(BaseModel):
    """Immutable audit record for every access action."""
    id: str
    venue_id: str
    user_id: str
    user_name: str  # Snapshot at time of action
    door_id: str
    door_display_name: str  # Snapshot at time of action
    nuki_smartlock_id: int
    action: DoorAction
    result: ActionResult
    provider_path: ProviderPath
    request_id: str  # Idempotency key
    error_message: Optional[str] = None
    duration_ms: Optional[int] = None
    timestamp: str = ""


# ==================== BRIDGE ====================

class BridgeConfig(BaseModel):
    """Optional Nuki Bridge for LAN execution."""
    venue_id: str
    bridge_id: Optional[int] = None
    ip_address: str
    port: int = 8080
    token: Optional[str] = None  # Bridge API token (encrypted)
    is_healthy: bool = False
    last_health_check: Optional[str] = None
    created_at: str = ""


class BridgeConfigCreate(BaseModel):
    """Input model for registering a bridge."""
    ip_address: str
    port: int = 8080
    token: Optional[str] = None


# ==================== DEVICE CONFIGURATION ====================

class DoorConfig(BaseModel):
    """Device configuration for Nuki Smart Lock."""
    name: str
    led_brightness: int = Field(..., ge=0, le=5, description="0=Off, 5=Max")
    single_lock: bool = Field(False, description="True=Single lock, False=Double lock")
    button_enabled: bool = True
    led_enabled: bool = True
    pairing_enabled: bool = True
    sound_level: int = Field(2, ge=0, le=5)  # 0=Silent/2=Normal/5=Loud

class DoorConfigUpdate(BaseModel):
    """Input model for updating device config."""
    name: Optional[str] = None
    led_brightness: Optional[int] = Field(None, ge=0, le=5)
    single_lock: Optional[bool] = None
    button_enabled: Optional[bool] = None
    led_enabled: Optional[bool] = None
    pairing_enabled: Optional[bool] = None
    sound_level: Optional[int] = Field(None, ge=0, le=5)

# ==================== NATIVE LOGS ====================

class NukiLogEntry(BaseModel):
    """Raw log entry from Nuki Web API."""
    id: str
    smartlock_id: int
    device_type: int
    account_user_id: Optional[int] = None
    auth_id: Optional[str] = None
    name: Optional[str] = None  # Who did it
    action: str
    trigger: str
    state: str
    auto_unlock: bool = False
    date: str

# ==================== ADVANCED AUTH (KEYPAD/FOB/USER) ====================

class AuthType(str, Enum):
    APP = "APP"
    BRIDGE = "BRIDGE"
    FOB = "FOB"
    KEYPAD = "KEYPAD"
    KEYPAD_V2 = "KEYPAD_V2"

class NukiAuthorization(BaseModel):
    """A credential/user on the Nuki device."""
    id: str
    smartlock_id: int
    type: AuthType
    name: str # e.g. "Cleaner Fob"
    enabled: bool = True
    remote_allowed: bool = False
    date_created: str
    last_active_date: Optional[str] = None
    lock_count: int = 0

class NukiAuthorizationCreate(BaseModel):
    """Input to create authorization."""
    name: str
    type: AuthType = AuthType.APP # Default to App User
    remote_allowed: bool = False # Safety default

# ==================== KEYPAD (Legacy / Specific) ====================

class KeypadPinConfig(BaseModel):
    """PIN lifecycle for Keypad 2 (Phase 3 — feature-flagged)."""
    id: str
    venue_id: str
    door_id: str
    nuki_auth_id: Optional[int] = None  # Nuki authorization ID
    name: str  # e.g. "Shift PIN - Morning Staff"
    # PIN is NEVER stored in plaintext after creation
    pin_hash: Optional[str] = None
    is_active: bool = True
    valid_from: Optional[str] = None
    valid_until: Optional[str] = None
    linked_reservation_id: Optional[str] = None
    linked_shift_id: Optional[str] = None
    created_at: str = ""
    revoked_at: Optional[str] = None
    created_by: Optional[str] = None


class KeypadPinCreate(BaseModel):
    """Input model for creating a keypad PIN."""
    door_id: str
    name: str = Field(..., min_length=1, max_length=50, description="PIN label, e.g. 'Morning Shift'")
    code: int = Field(..., ge=1000, le=999999, description="4-6 digit PIN code")
    valid_from: Optional[str] = None
    valid_until: Optional[str] = None
