"""Device model (POS, KDS, Printer, IoT)"""
from pydantic import BaseModel, Field
from datetime import datetime, timezone
from uuid import uuid4

class Device(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    venue_id: str
    device_type: str  # POS | KDS | PRINTER | ROUTER | TABLET | SENSOR | GATEWAY
    name: str
    ip_address: str = ""
    mac_address: str = ""
    firmware_version: str = ""
    status: str = "ACTIVE"  # ACTIVE | OFFLINE | ALERT | MAINTENANCE
    last_heartbeat_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    metrics: dict = {}  # {"cpu": 0, "mem": 0, "temp": 0}
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
