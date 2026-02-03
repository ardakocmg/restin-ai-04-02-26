"""
Log Service - Centralized system logging
Server-authoritative, fail-safe, fingerprinted for grouping
"""
import hashlib
from datetime import datetime, timezone
from typing import Optional
import uuid

def fingerprint(code: str, endpoint: str, stage: str, message: str) -> str:
    """Generate fingerprint for log grouping"""
    raw = f"{code}:{endpoint}:{stage}:{message}"
    return hashlib.sha256(raw.encode()).hexdigest()[:16]

async def log_system_event(
    db,
    *,
    level: str,  # ERROR, WARN, INFO
    code: str,
    message: str,
    details: dict = None,
    request_id: str = None,
    client_request_id: str = None,
    build_id: str = None,
    venue_id: str = None,
    user_id: str = None,
    table_id: str = None,
    order_id: str = None,
    ticket_id: str = None,
    station: str = None,
    endpoint: str = None,
    method: str = None
):
    """
    Log system event to system_logs collection
    Fail-safe: never raises exceptions
    """
    try:
        stage = details.get("stage", "") if details else ""
        fp = fingerprint(code, endpoint or "", stage, message)
        
        log_doc = {
            "id": str(uuid.uuid4()),
            "ts": datetime.now(timezone.utc).isoformat(),
            "level": level,
            "code": code,
            "message": message,
            "details": details or {},
            "endpoint": endpoint,
            "method": method,
            "request_id": request_id,
            "client_request_id": client_request_id,
            "build_id": build_id,
            "venue_id": venue_id,
            "user_id": user_id,
            "table_id": table_id,
            "order_id": order_id,
            "ticket_id": ticket_id,
            "station": station,
            "fingerprint": fp,
            "acknowledged": False,
            "acknowledged_by": None,
            "acknowledged_at": None
        }
        
        await db.system_logs.insert_one(log_doc)
        
    except Exception as e:
        # Fail-safe: logging failure should not crash the app
        print(f"[LOG_SERVICE_FAILED] {e}")
