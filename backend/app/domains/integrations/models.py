from enum import Enum
from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field

class IntegrationProvider(str, Enum):
    LIGHTSPEED = "LIGHTSPEED"
    SHIREBURN = "SHIREBURN"
    APICBASE = "APICBASE"
    GOOGLE = "GOOGLE"
    NUKI = "NUKI"
    TUYA = "TUYA"
    MEROSS = "MEROSS"
    QINGPING = "QINGPING"
    SPOTIFY = "SPOTIFY"

class SyncStatus(str, Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    PARTIAL = "PARTIAL"

class JobType(str, Enum):
    DISCOVER = "DISCOVER"
    SYNC = "SYNC"
    HISTORY = "HISTORY"
    WEBHOOK = "WEBHOOK"

# ====================
# API Models (Response/Request)
# ====================

class IntegrationConfigResponse(BaseModel):
    id: str
    organization_id: str
    provider: IntegrationProvider
    is_enabled: bool
    status: str  # CONNECTED, ERROR, DISABLED
    last_sync: Optional[datetime]
    settings: Dict[str, Any]

class UpdateIntegrationConfig(BaseModel):
    is_enabled: Optional[bool]
    credentials: Optional[Dict[str, Any]]  # Write-only, never returned in full
    settings: Optional[Dict[str, Any]]

class SyncRunResponse(BaseModel):
    id: str
    provider: IntegrationProvider
    job_type: JobType
    status: SyncStatus
    started_at: datetime
    finished_at: Optional[datetime]
    duration_ms: Optional[int]
    items_processed: int
    error_summary: Optional[str]

class SyncLogResponse(BaseModel):
    id: str
    sync_run_id: str
    level: str  # INFO, WARN, ERROR
    message: str
    details: Optional[Dict[str, Any]]
    timestamp: datetime
