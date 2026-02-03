from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from .common import OrderStatus, KDSItemStatus
import uuid

class OrderItemCreate(BaseModel):
    # Accept both for backward compatibility
    menu_item_id: Optional[str] = None
    item_id: Optional[str] = None  # Legacy field
    quantity: int = 1
    seat_number: int = 1
    modifiers: List[Dict[str, Any]] = []  # [{group_id, option_id, name, price_adjustment}]
    notes: Optional[str] = None
    course: int = 1
    
    def get_menu_item_id(self):
        """Normalize to menu_item_id"""
        return self.menu_item_id or self.item_id

class OrderItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    menu_item_id: str
    menu_item_name: str
    price: float
    quantity: int = 1
    seat_number: int = 1
    modifiers: List[Dict[str, Any]] = []  # [{group_id, option_id, name, price_adjustment}]
    notes: Optional[str] = None
    course: int = 1
    status: str = "pending"  # pending, sent, in_progress, ready, served
    sent_at: Optional[str] = None
    ready_at: Optional[str] = None

class OrderCreate(BaseModel):
    venue_id: str
    table_id: str
    server_id: str

class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str
    table_id: str
    table_name: str
    server_id: str
    server_name: str
    items: List[OrderItem] = []
    status: OrderStatus = OrderStatus.OPEN
    subtotal: float = 0.0
    tax: float = 0.0
    total: float = 0.0
    guest_count: int = 1
    risk_score: int = 0
    risk_factors: List[str] = []
    idempotency_key: Optional[str] = None  # For offline duplicate prevention
    send_round_seq: int = 0  # Tracks number of sends
    send_rounds: List[Dict[str, Any]] = []  # [{round_no, sent_at, do_print, do_kds, do_stock, ticket_ids}]
    send_client_ids: List[str] = []  # Idempotency tracking for send actions
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    closed_at: Optional[str] = None
    offline_id: Optional[str] = None

class KDSTicket(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    display_id: Optional[str] = None  # KDS-00001
    venue_id: str
    order_id: str
    table_id: str
    table_name: Optional[str] = None
    station: str = "KITCHEN"
    prep_area: str
    items: List[dict]
    course: int = 1
    round_no: int = 1  # Which send round (1st, 2nd, 3rd...)
    round_label: str = "Round 1"  # Display label
    status: str = "NEW"
    
    # Ownership + Claim
    claimed_by: Optional[str] = None
    claimed_by_name: Optional[str] = None
    claimed_at: Optional[str] = None
    claim_lock: bool = True
    last_action_by: Optional[str] = None
    last_action_at: Optional[str] = None
    
    # PASS workflow
    pass_required: bool = True
    pass_approved: bool = False
    pass_approved_by: Optional[str] = None
    pass_approved_at: Optional[str] = None
    
    # Delivery
    delivered: bool = False
    delivered_by: Optional[str] = None
    delivered_at: Optional[str] = None
    
    # Order metadata
    order_type: str = "FOR_HERE"  # FOR_HERE, TOGO, CURBSIDE
    vip_flag: bool = False
    rush_flag: bool = False
    allergy_flag: bool = False
    expo_notes: Optional[str] = None
    
    # Priority + flags
    priority: str = "normal"  # normal, rush, vip
    allergies: List[str] = []
    special_notes: Optional[str] = None
    
    # Hold
    hold_reason: Optional[str] = None
    held_by: Optional[str] = None
    held_at: Optional[str] = None
    
    # Timestamps
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    started_at: Optional[str] = None
    ready_at: Optional[str] = None
    done_at: Optional[str] = None
    recalled_at: Optional[str] = None

class StationState(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str
    station: str  # KITCHEN, BAR, PASS, DESSERT
    paused: bool = False
    paused_by: Optional[str] = None
    paused_at: Optional[str] = None
    pause_reason: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class PrintJob(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str
    order_id: str
    printer_zone: str
    content: str
    status: str = "pending"  # pending, printed, failed
    idempotency_key: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class SendOrderRequest(BaseModel):
    do_print: bool = True
    do_kds: bool = False
    do_stock: bool = False
    client_send_id: Optional[str] = None  # Idempotency key

class BillingEligibilityResponse(BaseModel):
    eligible: bool
    blocking_items: List[Dict[str, Any]] = []
    message: Optional[str] = None
