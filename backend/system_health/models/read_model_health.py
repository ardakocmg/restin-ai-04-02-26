"""Read Model Health"""
from pydantic import BaseModel

class ReadModelHealth(BaseModel):
    venue_id: str
    read_model: str
    last_event_ts: str
    lag_seconds: float
    status: str  # OK | WARN | CRIT
