"""Reporting Hooks - Capture events for reporting"""
from datetime import datetime, timezone

from core.database import db
from services.event_bus import event_handler


@event_handler("inventory.grn.posted")
async def capture_grn_posted(event: dict):
    """Capture GRN posting for reporting"""
    data = event["data"]
    
    await db.inventory_events.insert_one({
        "event_type": "grn_posted",
        "grn_id": data.get("grn_id"),
        "venue_id": data.get("venue_id"),
        "supplier_id": data.get("supplier_id"),
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    print(f"📊 ReportingHooks: GRN posted event captured")


@event_handler("inventory.po.approved")
async def capture_po_approved(event: dict):
    """Capture PO approval for reporting"""
    data = event["data"]
    
    await db.inventory_events.insert_one({
        "event_type": "po_approved",
        "po_id": data.get("po_id"),
        "approved_by": data.get("approved_by"),
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    print(f"📊 ReportingHooks: PO approved event captured")


@event_handler("inventory.supplier.created")
async def capture_supplier_created(event: dict):
    """Capture supplier creation for reporting"""
    data = event["data"]
    
    await db.inventory_events.insert_one({
        "event_type": "supplier_created",
        "supplier_id": data.get("supplier_id"),
        "venue_id": data.get("venue_id"),
        "name": data.get("name"),
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    print(f"📊 ReportingHooks: Supplier created event captured")
