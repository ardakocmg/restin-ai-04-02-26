from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid
import re

# Venue Group Models
class VenueGroupCreate(BaseModel):
    name: str
    slug: Optional[str] = None  # Auto-generated if not provided
    owner_id: str
    description: Optional[str] = None

class LegalInfo(BaseModel):
    registered_name: Optional[str] = None
    registered_address: Optional[str] = None
    pe_number: Optional[str] = None
    vat_number: Optional[str] = None
    registration_number: Optional[str] = None
    iban: Optional[str] = None
    bic: Optional[str] = None
    hr_manager_name: Optional[str] = "Jacqueline Portelli"
    hr_manager_position: Optional[str] = "HR Manager"
    principal_name: Optional[str] = None
    principal_position: Optional[str] = None

class Branding(BaseModel):
    logo_url: Optional[str] = None
    primary_color: Optional[str] = "#dc2626"
    secondary_color: Optional[str] = "#000000"
    email_header_url: Optional[str] = None

class VenueGroup(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    slug: str
    owner_id: str
    description: Optional[str] = None
    legal_info: Optional[LegalInfo] = Field(default_factory=LegalInfo)
    branding: Optional[Branding] = Field(default_factory=Branding)
    venue_ids: List[str] = Field(default_factory=list)
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class VenueCreate(BaseModel):
    name: str
    type: str  # fine_dining, casual, bar, steakhouse, mediterranean
    service_style: str = "casual"
    timezone: str = "Europe/Malta"
    pacing_enabled: bool = False
    pacing_interval_minutes: int = 15
    review_policy_low_threshold: int = 30
    review_policy_medium_threshold: int = 60
    group_id: Optional[str] = None
    slug: Optional[str] = None  # Auto-generated if not provided
    location: Optional[str] = None  # St Julians, Valletta, etc.

class Venue(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    type: Optional[str] = "casual"  # fine_dining, casual, bar, steakhouse, mediterranean
    service_style: str = "casual"
    timezone: str = "Europe/Malta"
    currency: str = "EUR"  # EUR, USD, GBP, TRY, etc.
    currency_symbol: str = "€"
    pacing_enabled: bool = False
    pacing_interval_minutes: int = 15
    review_policy_low_threshold: int = 30
    review_policy_medium_threshold: int = 60
    group_id: Optional[str] = None
    slug: Optional[str] = None
    location: Optional[str] = None  # St Julians, Valletta, etc.
    legal_info: Optional[LegalInfo] = Field(default_factory=LegalInfo)
    branding: Optional[Branding] = Field(default_factory=Branding)
    external_links: Optional[List[dict]] = None  # [{source: "apicbase", id: "123"}]
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

def generate_slug(name: str) -> str:
    """Generate URL-friendly slug from name"""
    slug = name.lower()
    slug = re.sub(r'[^a-z0-9]+', '-', slug)
    slug = slug.strip('-')
    return slug

class ZoneCreate(BaseModel):
    venue_id: str
    name: str
    type: str  # dining, bar, kitchen, prep, pass

class Zone(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str
    name: str
    type: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class TableCreate(BaseModel):
    venue_id: str
    zone_id: str
    name: str
    seats: int = 4

class Table(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    display_id: Optional[str] = None  # T-00001, T-00002, etc.
    venue_id: str
    zone_id: str
    name: str
    seats: int = 4
    status: str = "available"  # available, occupied, reserved
    current_order_id: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Floor Plan Models
class FloorPlanCreate(BaseModel):
    venue_id: str
    name: str
    background_image_url: Optional[str] = None
    width: int = 1920
    height: int = 1080

class FloorPlan(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str
    name: str
    is_active: bool = False
    background_image_url: Optional[str] = None
    width: int = 1920
    height: int = 1080
    base_width: int = 1920  # Original design size
    base_height: int = 1080  # Original design size
    version: int = 1  # For cache invalidation
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class FloorPlanObjectCreate(BaseModel):
    floor_plan_id: str
    type: str  # table, zone, decoration
    ref_id: Optional[str] = None  # tableId / zoneId / null
    label: str
    # Normalized coordinates (0..1)
    x_norm: Optional[float] = None
    y_norm: Optional[float] = None
    w_norm: Optional[float] = None
    h_norm: Optional[float] = None
    # Legacy absolute coordinates (backward compat)
    x: Optional[float] = None
    y: Optional[float] = None
    w: Optional[float] = None
    h: Optional[float] = None
    rotation: float = 0
    shape: str = "rectangle"  # rectangle, circle
    meta_json: Optional[Dict[str, Any]] = None

class FloorPlanObject(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    floor_plan_id: str
    type: str
    ref_id: Optional[str] = None
    label: str
    # Normalized coordinates
    x_norm: float = 0.0
    y_norm: float = 0.0
    w_norm: float = 0.05
    h_norm: float = 0.05
    # Legacy absolute (for backward compat)
    x: float = 0.0
    y: float = 0.0
    w: float = 100.0
    h: float = 100.0
    rotation: float = 0
    shape: str = "rectangle"
    meta_json: Optional[Dict[str, Any]] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class VenueSettingsModel(BaseModel):
    model_config = ConfigDict(extra="ignore")
    venue_id: str
    modules: Dict[str, Any] = {}
    ui: Dict[str, Any] = {}
    logs: Dict[str, Any] = {}
    security: Dict[str, Any] = {}
    integrations: Dict[str, Any] = {}
    pos: Dict[str, Any] = {}  # Backward compat
    kds: Dict[str, Any] = {}  # Backward compat
    ops: Dict[str, Any] = {}  # Backward compat
    updated_at: Optional[str] = None
    updated_by: Optional[str] = None
