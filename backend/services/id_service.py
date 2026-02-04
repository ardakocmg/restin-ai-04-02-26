# Universal Numbering System (UNS) - Server Authoritative
from __future__ import annotations
from typing import Optional, Dict, Any
from uuid import uuid4

# Default entity prefixes
ENTITY_PREFIX = {
    "table": "T-",
    "order": "ORD-",
    "menu_item": "MI-",
    "inventory_item": "SKU-",
    "user": "EMP-",
    "EMPLOYEE": "EMP-",
    "floor_object": "FP-",
    "kds_ticket": "KDS-",
    "guest": "GST-",
    "reservation": "RSV-",
    "print_job": "PJ-",
    "incident": "INC-",
    "purchase_order": "PO-",
    "stock_ledger": "SL-",
    "SHIFT": "SFT-",
    "LEAVE_REQUEST": "LVE-",
    "HR_DOCUMENT": "DOC-",
    "CONTRACT": "CTR-",
    "TIMESHEET": "TSR-",
    "PAY_RUN": "PR-",
    "PAYSLIP": "PSL-",
    "TIPS_POOL": "TIP-",
    "TIPS_ALLOCATION": "TPA-",
    "APPROVAL": "APR-",
    "SKILL": "SKL-",
    "REPORT_DEF": "RPT-",
    "REPORT_RUN": "RPR-"
}

DEFAULT_CONFIG = {
    "separator": "-",
    "default_width": 5,
    "entities": {
        "table": {"prefix": "T", "width": 3},
        "order": {"prefix": "ORD", "width": 6},
        "kds_ticket": {"prefix": "KDS", "width": 6},
        "menu_item": {"prefix": "MI", "width": 5},
        "inventory_item": {"prefix": "SKU", "width": 6},
        "user": {"prefix": "EMP", "width": 5},
        "EMPLOYEE": {"prefix": "EMP", "width": 5},
        "guest": {"prefix": "GST", "width": 5},
        "reservation": {"prefix": "RSV", "width": 5},
        "floor_object": {"prefix": "FP", "width": 5},
        "print_job": {"prefix": "PJ", "width": 6},
        "incident": {"prefix": "INC", "width": 5},
        "purchase_order": {"prefix": "PO", "width": 5},
        "stock_ledger": {"prefix": "SL", "width": 9},
        "SHIFT": {"prefix": "SFT", "width": 5},
        "LEAVE_REQUEST": {"prefix": "LVE", "width": 5},
        "HR_DOCUMENT": {"prefix": "DOC", "width": 5},
        "CONTRACT": {"prefix": "CTR", "width": 5},
        "TIMESHEET": {"prefix": "TSR", "width": 5},
        "PAY_RUN": {"prefix": "PR", "width": 5},
        "PAYSLIP": {"prefix": "PSL", "width": 6},
        "TIPS_POOL": {"prefix": "TIP", "width": 5},
        "TIPS_ALLOCATION": {"prefix": "TPA", "width": 5},
        "APPROVAL": {"prefix": "APR", "width": 5},
        "SKILL": {"prefix": "SKL", "width": 5},
        "REPORT_DEF": {"prefix": "RPT", "width": 5},
        "REPORT_RUN": {"prefix": "RPR", "width": 6}
    }
}

async def get_numbering_config(db, venue_id: str, entity_type: str) -> Dict[str, Any]:
    """Get numbering configuration for entity type"""
    venue = await db.venues.find_one({"id": venue_id}, {"_id": 0, "settings": 1})
    
    numbering = venue.get("settings", {}).get("numbering", DEFAULT_CONFIG) if venue else DEFAULT_CONFIG
    entity_config = numbering.get("entities", {}).get(entity_type, {})
    
    return {
        "prefix": entity_config.get("prefix", ENTITY_PREFIX.get(entity_type, "ID").rstrip("-")),
        "separator": numbering.get("separator", "-"),
        "width": entity_config.get("width", numbering.get("default_width", 5))
    }

async def next_display_id(db, venue_id: str, entity_type: str) -> str:
    """Generate next display_id using venue configuration"""
    config = await get_numbering_config(db, venue_id, entity_type)
    
    # Atomic counter
    result = await db.counters.find_one_and_update(
        {"venue_id": venue_id, "entity_type": entity_type},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True,
        projection={"_id": 0, "seq": 1}
    )
    
    seq = int(result.get("seq", 1))
    width = config["width"]
    
    # Format: PREFIX-00001
    return f"{config['prefix']}{config['separator']}{str(seq).zfill(width)}"

async def ensure_ids(db, entity_type: str, doc: Dict[str, Any], venue_id: str) -> Dict[str, Any]:
    """Ensure entity has id and display_id (UNS)"""
    if not doc.get("id"):
        doc["id"] = str(uuid4())
    
    if not doc.get("display_id"):
        doc["display_id"] = await next_display_id(db, venue_id, entity_type)
    
    return doc
