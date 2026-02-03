"""Events outbox for reliable event delivery"""
from datetime import datetime, timezone

def _iso():
    return datetime.now(timezone.utc).isoformat()

class Outbox:
    def __init__(self, db):
        self.col = db.outbox_events
    
    def emit(self, venue_id: str, topic: str, key: str, payload: dict, schema_version: int = 1):
        doc = {
            "venue_id": venue_id,
            "topic": topic,
            "key": key,
            "schema_version": schema_version,
            "payload": payload,
            "created_at": _iso(),
            "consumed_at": None
        }
        try:
            self.col.insert_one(doc)
        except Exception:
            return  # Idempotent; if duplicate key, skip
