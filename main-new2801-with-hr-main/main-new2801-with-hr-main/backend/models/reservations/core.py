from enum import Enum
from typing import List, Optional, Dict, Any
from datetime import datetime, time
from pydantic import BaseModel, Field, EmailStr

# --- Enums ---

class ReservationStatus(str, Enum):
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    CANCELLED = "CANCELLED"
    NO_SHOW = "NO_SHOW"
    SEATED = "SEATED"
    COMPLETED = "COMPLETED"
    WAITLIST = "WAITLIST"

class ReservationChannel(str, Enum):
    INTERNAL = "INTERNAL"         # Walk-in, Phone
    WEB_DIRECT = "WEB_DIRECT"     # Own website widget
    GOOGLE_REDIRECT = "GOOGLE_REDIRECT"
    OPENTABLE = "OPENTABLE"
    RESDIARY = "RESDIARY"
    SEVENROOMS = "SEVENROOMS"
    TABLEIN = "TABLEIN"

# --- Sub-Models ---

class OpeningHoursDay(BaseModel):
    day_of_week: str # Monday, Tuesday...
    open_time: str # "18:00"
    close_time: str # "23:00"
    is_closed: bool = False

class RestaurantPolicy(BaseModel):
    turn_time_minutes: int = 120
    max_party_size: int = 10
    min_party_size: int = 1
    deposit_required_pax: int = 8 # Deposit required if pax >= 8
    deposit_amount_per_pax: float = 20.00
    allow_requests: bool = True

class ChannelConfig(BaseModel):
    web_direct: bool = True
    google_redirect: bool = False
    opentable: bool = False
    resdiary: bool = False
    # Add partner specific configs here (e.g. API Keys) if needed

class AuditLogEntry(BaseModel):
    timestamp: datetime
    action: str # CREATE, MODIFY, CANCEL, STATUS_CHANGE
    actor: str # System, User:John, Channel:Google
    details: str
    metadata: Optional[Dict[str, Any]] = None

class ContactInfo(BaseModel):
    phone: str
    email: Optional[EmailStr] = None
    social_handle: Optional[str] = None

class LoyaltyAccount(BaseModel):
    points_balance: float = 0.0
    tier: str = "BRONZE" # BRONZE, SILVER, GOLD, PLATINUM
    lifetime_spend: float = 0.0
    last_accrued: Optional[datetime] = None

class GuestPreferences(BaseModel):
    allergies: List[str] = []
    favorite_tables: List[str] = []
    preferred_language: str = "en"
    marketing_opt_in: bool = False
    custom_notes: Optional[str] = None

class VisitSummary(BaseModel):
    total_visits: int = 0
    total_spend: float = 0.0
    last_visit: Optional[datetime] = None
    no_show_count: int = 0
    average_party_size: float = 0.0

# --- Core Entities ---

class GuestProfile(BaseModel):
    id: str = Field(..., description="Unique Guest ID (UUID)")
    venue_id: str # Added for Phase XI isolation
    first_name: str
    last_name: str
    contact_info: ContactInfo
    
    # CRM & Loyalty Expansion (Phase XI)
    visit_summary: VisitSummary = Field(default_factory=VisitSummary)
    loyalty: LoyaltyAccount = Field(default_factory=LoyaltyAccount)
    preferences: GuestPreferences = Field(default_factory=GuestPreferences)
    
    tags: List[str] = [] # VIP, Allergy, High Spender, Blacklist
    internal_notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

class Section(BaseModel):
    id: str
    restaurant_id: str
    name: str # Main Dining, Terrace, Bar
    priority: int = 1 # 1 = Highest fill priority
    min_pax_allowance: int = 1
    max_pax_allowance: int = 20
    is_active: bool = True
    metadata: Dict[str, Any] = {}

class Table(BaseModel):
    id: str
    section_id: str
    restaurant_id: str
    table_number: str
    capacity: int
    min_capacity: int = 1 # Flexible seating
    is_combinable: bool = False
    combinable_with: List[str] = [] # List of Table IDs
    blocked_slots: List[datetime] = [] # Specific blocked times
    shape: str = "rect" # rect, round
    metadata: Dict[str, Any] = {}

class Restaurant(BaseModel):
    id: str
    name: str
    timezone: str = "Europe/Malta"
    currency: str = "EUR"
    opening_hours: List[OpeningHoursDay] = []
    default_policies: RestaurantPolicy
    channel_control: ChannelConfig
    
    # Simple list of section IDs for quick ref? (Optional, relying on query usually)

class Reservation(BaseModel):
    id: str = Field(..., description="Unique Reservation ID (UUID)")
    venue_id: str # Maps to Restaurant.id
    
    # Booking Details
    guest_profile_id: str
    guest_name: str # Denormalized for quick access
    guest_count: int
    datetime_start: datetime
    datetime_end: datetime # Calculated based on Turn Time Policy
    
    # Inventory Assignment
    table_ids: List[str] = [] # Assigned tables (can be multiple if combined)
    section_id: Optional[str] = None
    
    # Meta
    channel: ReservationChannel
    status: ReservationStatus = ReservationStatus.PENDING
    
    # Financials
    deposit_amount: float = 0.0
    deposit_status: str = "NONE" # NONE, PENDING, PAID, REFUNDED
    
    # Audit
    notes: Optional[str] = None
    tags: List[str] = []
    audit_log: List[AuditLogEntry] = []
    
    created_at: datetime
    updated_at: datetime
