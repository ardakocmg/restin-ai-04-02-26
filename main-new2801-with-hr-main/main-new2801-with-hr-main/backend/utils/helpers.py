# Utility functions for the application
import hashlib
import json
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from fastapi.responses import JSONResponse
from fastapi import Request

def _rid(request):
    """Get request ID from state"""
    return getattr(request.state, "request_id", None)

def _json_fail(request, code: str, message: str, detail: dict = None, status_code: int = 500):
    """Return standard JSON error with request_id"""
    return JSONResponse(
        status_code=status_code,
        content={
            "code": code,
            "message": message,
            "detail": detail or {},
            "request_id": _rid(request)
        }
    )

def _step_log(request, step: str, extra: dict = None):
    """Log pipeline step for debugging"""
    rid = _rid(request)
    print(f"[SEND_ORDER] rid={rid} step={step} extra={extra or {}}")

def _now_iso():
    return datetime.now(timezone.utc).isoformat()

def compute_hash(data: dict, prev_hash: str) -> str:
    content = json.dumps(data, sort_keys=True) + prev_hash
    return hashlib.sha256(content.encode()).hexdigest()

def calculate_risk_score(order: dict) -> tuple:
    """Calculate risk score 0-100 with explainable factors"""
    score = 0
    factors = []
    
    # Check for delays (items in progress > 15 min)
    for item in order.get("items", []):
        if item.get("sent_at"):
            sent_time = datetime.fromisoformat(item["sent_at"])
            elapsed = (datetime.now(timezone.utc) - sent_time).total_seconds() / 60
            if elapsed > 20:
                score += 20
                factors.append(f"Item delay: {item['menu_item_name']} ({int(elapsed)} min)")
            elif elapsed > 15:
                score += 10
                factors.append(f"Item warning: {item['menu_item_name']} ({int(elapsed)} min)")
    
    # Check for returns/voids
    void_count = len([i for i in order.get("items", []) if i.get("status") == "voided"])
    if void_count > 0:
        score += void_count * 15
        factors.append(f"Voided items: {void_count}")
    
    # Check for modifiers (special requests)
    mod_count = sum(len(i.get("modifiers", [])) for i in order.get("items", []))
    if mod_count > 5:
        score += 10
        factors.append(f"High modifications: {mod_count}")
    
    return min(score, 100), factors

def fill_min_fields(doc: Dict[str, Any], minimal: Dict[str, Any]) -> Dict[str, Any]:
    """Fill missing fields only"""
    for k, v in minimal.items():
        if k not in doc or doc.get(k) in (None, "", [], {}):
            doc[k] = v() if callable(v) else v
    
    # Common timestamps
    if "created_at" not in doc or not doc.get("created_at"):
        doc["created_at"] = _now_iso()
    if "updated_at" not in doc or not doc.get("updated_at"):
        doc["updated_at"] = _now_iso()
    
    return doc

async def log_event(
    db, 
    *, 
    level: str, 
    code: str, 
    message: str, 
    request: Request = None, 
    user: dict = None, 
    venue_id: str = None,
    table_id: str = None,
    order_id: str = None,
    ticket_id: str = None,
    error_code: str = None,
    status_code: int = None,
    meta: dict = None
):
    """
    Centralized logging helper - fail-safe (never raises)
    Usage: await log_event(db, level="AUDIT", code="ORDER_SENT", message="Order sent", request=request, user=current_user, order_id=order_id)
    """
    try:
        log_doc = {
            "id": str(uuid.uuid4()),
            "ts": datetime.now(timezone.utc).isoformat(),
            "level": level,
            "code": code,
            "message": message,
            "meta": meta or {}
        }
        
        # Request context
        if request:
            log_doc["request_id"] = getattr(request.state, "request_id", None)
            log_doc["client_request_id"] = getattr(request.state, "client_request_id", None)
            log_doc["endpoint"] = str(request.url.path) if hasattr(request, "url") else None
            log_doc["method"] = request.method if hasattr(request, "method") else None
            
            # Hash IP for privacy
            if hasattr(request, "client") and request.client:
                ip = request.client.host
                log_doc["ip_hash"] = hashlib.sha256(ip.encode()).hexdigest()[:16] if ip else None
        
        # User context
        if user:
            log_doc["user_id"] = user.get("id")
            log_doc["user_display_id"] = user.get("display_id")
            log_doc["role"] = user.get("role")
            if not venue_id:
                venue_id = user.get("venue_id")
        
        log_doc["venue_id"] = venue_id
        
        # Entity refs (fetch display_ids if available)
        if table_id:
            log_doc["table_id"] = table_id
            table = await db.tables.find_one({"id": table_id}, {"_id": 0, "display_id": 1})
            if table:
                log_doc["table_display_id"] = table.get("display_id")
        
        if order_id:
            log_doc["order_id"] = order_id
            order = await db.orders.find_one({"id": order_id}, {"_id": 0, "display_id": 1})
            if order:
                log_doc["order_display_id"] = order.get("display_id")
        
        if ticket_id:
            log_doc["ticket_id"] = ticket_id
            ticket = await db.kds_tickets.find_one({"id": ticket_id}, {"_id": 0, "display_id": 1})
            if ticket:
                log_doc["ticket_display_id"] = ticket.get("display_id")
        
        log_doc["error_code"] = error_code
        log_doc["status_code"] = status_code
        
        # Insert (fail-safe)
        await db.logs_events.insert_one(log_doc)
        
    except Exception as e:
        # Never fail the main request due to logging
        print(f"[LOG_EVENT_FAILED] {e}")
