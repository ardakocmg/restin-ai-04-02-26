"""Audit logging"""
from datetime import datetime, timezone

def _iso():
    return datetime.now(timezone.utc).isoformat()

class Audit:
    def __init__(self, db):
        self.col = db.audit_log
    
    def write(self, venue_id, user_id, action, entity, entity_id, payload=None):
        self.col.insert_one({
            "venue_id": venue_id,
            "user_id": user_id,
            "action": action,
            "entity": entity,
            "entity_id": entity_id,
            "payload": payload or {},
            "ts": _iso()
        })
