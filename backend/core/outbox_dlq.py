"""Outbox DLQ Management"""
from datetime import datetime, timezone

class OutboxDLQ:
    def __init__(self, db):
        self.col = db.outbox_dlq
    
    def dead_letter(self, event: dict, error: str):
        """Move event to dead letter queue"""
        dlq_event = event.copy()
        dlq_event["dead_lettered_at"] = datetime.now(timezone.utc).isoformat()
        dlq_event["final_error"] = error
        
        self.col.insert_one(dlq_event)
