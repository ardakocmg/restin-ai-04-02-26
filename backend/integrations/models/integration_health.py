"""Integration Health model"""
from pydantic import BaseModel
from datetime import datetime, timezone

class IntegrationHealth(BaseModel):
    venue_id: str
    connector_key: str
    status: str  # OK | DEGRADED | DOWN
    last_inbound_at: str = ""
    last_outbound_at: str = ""
    last_error: str = ""
    inbound_count_24h: int = 0
    outbound_count_24h: int = 0
    error_count_24h: int = 0
    rate_limit_remaining: int = 0
    updated_at: str = datetime.now(timezone.utc).isoformat()
