"""Idempotency key management"""
from core.errors import bad_request

class Idempotency:
    def __init__(self, db):
        self.col = db.idempotency_keys
    
    def require_key(self, headers: dict):
        k = headers.get("Idempotency-Key") or headers.get("idempotency-key")
        if not k:
            raise bad_request("Missing Idempotency-Key")
        return str(k)
    
    def claim(self, venue_id: str, key: str) -> bool:
        try:
            self.col.insert_one({"venue_id": venue_id, "key": key})
            return True
        except Exception:
            return False
