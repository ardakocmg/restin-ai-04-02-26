from pydantic import BaseModel
from typing import Optional, List
from enum import Enum

class TicketView(str, Enum):
    FULL = "FULL"
    CONDENSED = "CONDENSED"

class ThemeMode(str, Enum):
    LIGHT = "LIGHT"
    DARK = "DARK"

class LayoutMode(str, Enum):
    DIRECT_LINE = "DIRECT_LINE"
    EQUAL = "EQUAL"

class TimeFormat(str, Enum):
    H24 = "24H"
    AMPM = "AMPM"

class CoursingMode(str, Enum):
    SINGLE = "SINGLE"
    SEPARATE = "SEPARATE"

class TicketSummarySettings(BaseModel):
    customer: bool = True
    order_id: bool = True
    covers: bool = True
    server: bool = True
    type: bool = True
    floor: bool = False
    order_source: bool = True
    pickup_time: bool = False
    view: TicketView = TicketView.FULL

class OrderStatusSettings(BaseModel):
    new: bool = True
    preparing: bool = True  # Always true, not configurable
    ready_to_collect: bool = True
    on_hold: bool = True  # Always true, not configurable
    completed: bool = True  # Always true, not configurable

class WaitTimeSettings(BaseModel):
    enabled: bool = True
    delayed_after_min: int = 10
    late_after_min: int = 20

class KdsStationSettings(BaseModel):
    station_key: str
    ticket_summary: TicketSummarySettings = TicketSummarySettings()
    order_status_enabled: OrderStatusSettings = OrderStatusSettings()
    theme: ThemeMode = ThemeMode.LIGHT
    layout: LayoutMode = LayoutMode.EQUAL
    language: str = "en"
    time_format: TimeFormat = TimeFormat.H24
    wait_times: WaitTimeSettings = WaitTimeSettings()
    coursing: CoursingMode = CoursingMode.SINGLE

class KdsStationSettingsUpdate(BaseModel):
    ticket_summary: Optional[TicketSummarySettings] = None
    order_status_enabled: Optional[OrderStatusSettings] = None
    theme: Optional[ThemeMode] = None
    layout: Optional[LayoutMode] = None
    language: Optional[str] = None
    time_format: Optional[TimeFormat] = None
    wait_times: Optional[WaitTimeSettings] = None
    coursing: Optional[CoursingMode] = None
