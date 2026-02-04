from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from .common import DeviceType, EntityType, GuideKind, AssetLabel, DocumentStatus, StationType
import uuid

class LogEvent(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    ts: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    level: str  # INFO, WARN, ERROR, AUDIT, SECURITY
    code: str
    message: str
    venue_id: Optional[str] = None
    user_id: Optional[str] = None
    user_display_id: Optional[str] = None
    role: Optional[str] = None
    station: Optional[str] = None
    table_id: Optional[str] = None
    table_display_id: Optional[str] = None
    order_id: Optional[str] = None
    order_display_id: Optional[str] = None
    ticket_id: Optional[str] = None
    ticket_display_id: Optional[str] = None
    endpoint: Optional[str] = None
    method: Optional[str] = None
    status_code: Optional[int] = None
    error_code: Optional[str] = None
    request_id: Optional[str] = None
    client_request_id: Optional[str] = None
    ip_hash: Optional[str] = None
    ua_hash: Optional[str] = None
    meta: Dict[str, Any] = {}
    printed_at: Optional[str] = None

class DocumentCreate(BaseModel):
    venue_id: str
    filename: str
    file_type: str
    content_type: str

class Document(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str
    filename: str
    file_type: str
    content_type: str
    file_path: str
    status: DocumentStatus = DocumentStatus.PENDING
    parsed_data: Optional[dict] = None
    ocr_confidence: Optional[float] = None
    quarantine_reason: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    processed_at: Optional[str] = None

class AuditLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str
    user_id: str
    user_name: str
    action: str
    resource_type: str
    resource_id: str
    details: dict = {}
    prev_hash: str
    log_hash: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class DeviceBinding(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    device_id: str
    venue_id: str
    station_type: StationType
    zone_id: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class Device(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str
    device_type: DeviceType
    name: str
    status: str = "offline"  # online, offline
    last_seen_at: Optional[str] = None
    enrollment_token: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class PrinterZoneMapping(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str
    printer_device_id: str
    zone_id: str
    prep_area: str  # kitchen, bar, pass
    is_primary: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class Incident(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str
    type: str  # printer_down, device_offline, kitchen_backlog, stock_low
    severity: str  # low, medium, high, critical
    title: str
    description: str
    device_id: Optional[str] = None
    resolved: bool = False
    resolved_at: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class VenueBackup(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str
    backup_type: str = "full"  # full, partial
    data: Dict[str, Any] = {}
    size_bytes: int = 0
    created_by: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class BackfillRequest(BaseModel):
    venue_id: Optional[str] = None
    dry_run: bool = False
    limit_per_collection: int = 5000
    fill_missing_fields: bool = True
    create_sample_data: bool = False

class GuidePhoto(BaseModel):
    asset_id: str
    label: AssetLabel
    url: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class GuideStep(BaseModel):
    step_no: int
    title: str
    description: str
    duration_seconds: Optional[int] = None
    critical: bool = False
    required_tools: List[str] = []
    station: Optional[str] = None  # KITCHEN, BAR, PASS, STORES

class GuideMeasure(BaseModel):
    line_type: str  # INGREDIENT, COMPONENT, PACK, PORTION
    ref_type: str  # INVENTORY_ITEM, FREE_TEXT
    ref_id: Optional[str] = None
    name: str
    qty_value: float
    qty_unit_input: str
    qty_unit_canonical: str  # g, ml, pcs
    qty_value_canonical: float
    unit_dimension: str  # mass, volume, count
    yield_pct: Optional[float] = None
    waste_pct: Optional[float] = None
    notes: Optional[str] = None

class GuideDocument(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str
    entity_type: EntityType
    entity_id: str
    guide_kind: GuideKind
    version: int = 1
    photos: List[GuidePhoto] = []
    steps: List[GuideStep] = []
    measures: List[GuideMeasure] = []
    tags: List[str] = []
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_by_user_id: Optional[str] = None

class Asset(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str
    type: str = "image"
    filename: str
    mime_type: str
    size_bytes: int
    storage_key: str
    url: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    created_by: str
