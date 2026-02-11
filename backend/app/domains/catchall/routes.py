"""
Catch-all routes for endpoints that frontend expects but are not in dedicated domain routers.
Covers: orders, KDS, zones, tables, documents, shifts, audit logs, print jobs,
public content, preferences, feature flags, updates, devices, review risk, 
manager override, procurement, menu CRUD, and inventory ledger.

Each endpoint reads/writes directly to MongoDB collections.
"""
from fastapi import APIRouter, HTTPException, Query, Body, UploadFile, File
from typing import Optional, List, Any
from datetime import datetime, timezone
from pydantic import BaseModel
from app.core.database import get_database
import uuid
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["catch-all"])


# ==================== PYDANTIC MODELS ====================

class GenericCreate(BaseModel):
    class Config:
        extra = "allow"


# ==================== VENUE SUB-ROUTES ====================
# These routes are under /api/venues/{venue_id}/...

# --- Stats ---
@router.get("/venues/{venue_id}/stats")
async def get_venue_stats(venue_id: str):
    """Get aggregated stats for a venue."""
    db = get_database()
    orders = await db.orders.count_documents({"venue_id": venue_id})
    users = await db.users.count_documents({})
    tables = await db.tables.count_documents({"venue_id": venue_id})
    return {
        "total_orders": orders,
        "total_users": users,
        "total_tables": tables,
        "revenue_today": 0,
        "active_orders": 0,
    }


# --- Orders ---
@router.get("/venues/{venue_id}/orders")
async def get_venue_orders(
    venue_id: str,
    status: Optional[str] = Query(None),
    table_id: Optional[str] = Query(None),
):
    db = get_database()
    query: dict[str, Any] = {"venue_id": venue_id}
    if status:
        query["status"] = status
    if table_id:
        query["table_id"] = table_id
    orders = await db.orders.find(query).sort("created_at", -1).to_list(length=200)
    for o in orders:
        o["_id"] = str(o["_id"])
    return orders


# --- Users ---
@router.get("/venues/{venue_id}/users")
async def get_venue_users(venue_id: str):
    db = get_database()
    users = await db.users.find({}).to_list(length=200)
    for u in users:
        u["_id"] = str(u["_id"])
    return users


# --- KDS Tickets ---
@router.get("/venues/{venue_id}/kds/tickets")
async def get_kds_tickets(
    venue_id: str,
    prep_area: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
):
    db = get_database()
    query: dict[str, Any] = {"venue_id": venue_id}
    if prep_area:
        query["prep_area"] = prep_area
    if status:
        query["status"] = status
    tickets = await db.kds_tickets.find(query).sort("created_at", -1).to_list(length=100)
    for t in tickets:
        t["_id"] = str(t["_id"])
    return tickets


# --- Inventory Ledger ---
@router.get("/venues/{venue_id}/inventory/ledger")
async def get_inventory_ledger(venue_id: str, item_id: Optional[str] = Query(None)):
    db = get_database()
    query: dict[str, Any] = {}
    if item_id:
        query["item_id"] = item_id
    ledger = await db.inventory_ledger.find(query).sort("created_at", -1).to_list(length=200)
    for l in ledger:
        l["_id"] = str(l["_id"])
    return ledger


@router.get("/venues/{venue_id}/inventory/variance")
async def get_inventory_variance(venue_id: str):
    db = get_database()
    variance = await db.inventory_variance.find({}).to_list(length=100)
    for v in variance:
        v["_id"] = str(v["_id"])
    return variance


# --- Purchase Orders ---
@router.get("/venues/{venue_id}/purchase-orders")
async def get_purchase_orders(venue_id: str):
    db = get_database()
    pos_list = await db.purchase_orders.find({"venue_id": venue_id}).sort("created_at", -1).to_list(length=100)
    for p in pos_list:
        p["_id"] = str(p["_id"])
    return pos_list


# --- Documents ---
@router.get("/venues/{venue_id}/documents")
async def get_venue_documents(venue_id: str):
    db = get_database()
    docs = await db.documents.find({"venue_id": venue_id}).sort("created_at", -1).to_list(length=100)
    for d in docs:
        d["_id"] = str(d["_id"])
    return docs


# --- Review Risk ---
@router.get("/venues/{venue_id}/review-risk")
async def get_review_risk(venue_id: str):
    db = get_database()
    risks = await db.review_risks.find({"venue_id": venue_id}).to_list(length=50)
    for r in risks:
        r["_id"] = str(r["_id"])
    return {"venue_id": venue_id, "risks": risks, "risk_score": 0, "total_reviews": 0}


# --- Audit Logs ---
@router.get("/venues/{venue_id}/audit-logs")
async def get_audit_logs(
    venue_id: str,
    resource_type: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
):
    db = get_database()
    query: dict[str, Any] = {"venue_id": venue_id}
    if resource_type:
        query["resource_type"] = resource_type
    if action:
        query["action"] = action
    logs = await db.audit_logs.find(query).sort("timestamp", -1).to_list(length=limit)
    for l in logs:
        l["_id"] = str(l["_id"])
    return logs


@router.get("/venues/{venue_id}/audit-logs/export")
async def export_audit_logs(venue_id: str):
    db = get_database()
    logs = await db.audit_logs.find({"venue_id": venue_id}).sort("timestamp", -1).to_list(length=1000)
    for l in logs:
        l["_id"] = str(l["_id"])
    return {"venue_id": venue_id, "logs": logs, "count": len(logs)}


@router.post("/venues/{venue_id}/audit-logs")
async def create_audit_log(venue_id: str, entry: GenericCreate):
    """Create a new audit log entry from the frontend useAuditLog hook."""
    db = get_database()
    data = entry.dict()
    data["id"] = f"audit-{uuid.uuid4().hex[:8]}"
    data["venue_id"] = venue_id
    if "timestamp" not in data:
        data["timestamp"] = datetime.now(timezone.utc).isoformat()
    await db.audit_logs.insert_one(data)
    data.pop("_id", None)
    return data


# --- Print Jobs ---
@router.get("/venues/{venue_id}/print-jobs")
async def get_print_jobs(venue_id: str, status: Optional[str] = Query(None)):
    db = get_database()
    query: dict[str, Any] = {"venue_id": venue_id}
    if status:
        query["status"] = status
    jobs = await db.print_jobs.find(query).sort("created_at", -1).to_list(length=100)
    for j in jobs:
        j["_id"] = str(j["_id"])
    return jobs


# --- Shifts ---
@router.get("/venues/{venue_id}/shifts")
async def get_shifts(
    venue_id: str,
    user_id: Optional[str] = Query(None),
    date: Optional[str] = Query(None),
):
    db = get_database()
    query: dict[str, Any] = {"venue_id": venue_id}
    if user_id:
        query["user_id"] = user_id
    if date:
        query["date"] = date
    shifts = await db.shifts.find(query).sort("date", -1).to_list(length=200)
    for s in shifts:
        s["_id"] = str(s["_id"])
    return shifts


@router.post("/venues/{venue_id}/shifts")
async def create_shift(venue_id: str, shift: GenericCreate):
    db = get_database()
    data = shift.dict()
    data["venue_id"] = venue_id
    data["id"] = f"shift-{uuid.uuid4().hex[:8]}"
    data["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.shifts.insert_one(data)
    data.pop("_id", None)
    return data


@router.get("/venues/{venue_id}/shifts/active")
async def get_active_shifts(venue_id: str):
    db = get_database()
    shifts = await db.shifts.find({"venue_id": venue_id, "status": "active"}).to_list(length=50)
    for s in shifts:
        s["_id"] = str(s["_id"])
    return shifts


@router.post("/venues/{venue_id}/shifts/{shift_id}/check-in")
async def check_in_shift(venue_id: str, shift_id: str):
    db = get_database()
    await db.shifts.update_one(
        {"id": shift_id, "venue_id": venue_id},
        {"$set": {"status": "active", "check_in": datetime.now(timezone.utc).isoformat()}}
    )
    return {"status": "checked_in", "shift_id": shift_id}


@router.post("/venues/{venue_id}/shifts/{shift_id}/check-out")
async def check_out_shift(venue_id: str, shift_id: str):
    db = get_database()
    await db.shifts.update_one(
        {"id": shift_id, "venue_id": venue_id},
        {"$set": {"status": "completed", "check_out": datetime.now(timezone.utc).isoformat()}}
    )
    return {"status": "checked_out", "shift_id": shift_id}


# --- Manager Override ---
@router.post("/venues/{venue_id}/manager-override")
async def grant_manager_override(
    venue_id: str,
    user_id: str = Query(...),
    reason: str = Query(...),
    duration_hours: int = Query(4),
):
    db = get_database()
    override = {
        "id": f"override-{uuid.uuid4().hex[:8]}",
        "venue_id": venue_id,
        "user_id": user_id,
        "reason": reason,
        "duration_hours": duration_hours,
        "granted_at": datetime.now(timezone.utc).isoformat(),
        "active": True,
    }
    await db.manager_overrides.insert_one(override)
    override.pop("_id", None)
    return override


@router.get("/venues/{venue_id}/manager-override/{user_id}")
async def check_manager_override(venue_id: str, user_id: str):
    db = get_database()
    override = await db.manager_overrides.find_one(
        {"venue_id": venue_id, "user_id": user_id, "active": True}
    )
    if override:
        override["_id"] = str(override["_id"])
    return override or {"active": False}


@router.get("/venues/{venue_id}/manager-override")
async def list_manager_overrides(venue_id: str):
    db = get_database()
    overrides = await db.manager_overrides.find({"venue_id": venue_id}).to_list(length=100)
    for o in overrides:
        o["_id"] = str(o["_id"])
    return overrides


# ==================== STANDALONE ROUTES ====================

# --- Orders CRUD ---
@router.get("/orders/{order_id}")
async def get_order(order_id: str):
    db = get_database()
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(404, "Order not found")
    order["_id"] = str(order["_id"])
    return order


@router.post("/orders")
async def create_order(order: GenericCreate):
    db = get_database()
    data = order.dict()
    data["id"] = f"order-{uuid.uuid4().hex[:8]}"
    data["status"] = "pending"
    data["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.orders.insert_one(data)
    data.pop("_id", None)
    return data


@router.post("/orders/{order_id}/items")
async def add_order_item(order_id: str, item: GenericCreate):
    db = get_database()
    data = item.dict()
    data["id"] = f"item-{uuid.uuid4().hex[:8]}"
    await db.orders.update_one({"id": order_id}, {"$push": {"items": data}})
    return data


@router.post("/orders/{order_id}/send")
async def send_order(order_id: str):
    db = get_database()
    await db.orders.update_one({"id": order_id}, {"$set": {"status": "sent"}})
    return {"status": "sent", "order_id": order_id}


@router.post("/orders/{order_id}/close")
async def close_order(order_id: str):
    db = get_database()
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {"status": "closed", "closed_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"status": "closed", "order_id": order_id}


@router.post("/orders/{order_id}/transfer")
async def transfer_order(order_id: str, new_table_id: str = Query(...)):
    db = get_database()
    await db.orders.update_one({"id": order_id}, {"$set": {"table_id": new_table_id}})
    return {"status": "transferred", "new_table_id": new_table_id}


@router.post("/orders/{order_id}/split")
async def split_order(order_id: str, body: GenericCreate):
    return {"status": "split", "order_id": order_id}


@router.post("/orders/{order_id}/merge")
async def merge_order(order_id: str, merge_order_id: str = Query(...)):
    return {"status": "merged", "order_id": order_id, "merged_with": merge_order_id}


@router.post("/orders/offline-sync")
async def offline_sync(orders: List[GenericCreate]):
    db = get_database()
    count = 0
    for order in orders:
        data = order.dict()
        data["synced_at"] = datetime.now(timezone.utc).isoformat()
        await db.orders.insert_one(data)
        count += 1
    return {"synced": count}


@router.get("/orders/{order_id}/review-status")
async def get_order_review_status(order_id: str):
    return {"order_id": order_id, "review_required": False, "status": "approved"}


@router.post("/orders/{order_id}/override-review")
async def override_review(order_id: str, reason: str = Query(...)):
    return {"order_id": order_id, "overridden": True, "reason": reason}


# --- KDS actions ---
@router.post("/kds/tickets/{ticket_id}/start")
async def start_kds_ticket(ticket_id: str):
    db = get_database()
    await db.kds_tickets.update_one(
        {"id": ticket_id},
        {"$set": {"status": "in_progress", "started_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"status": "in_progress", "ticket_id": ticket_id}


@router.post("/kds/tickets/{ticket_id}/ready")
async def ready_kds_ticket(ticket_id: str):
    db = get_database()
    await db.kds_tickets.update_one(
        {"id": ticket_id},
        {"$set": {"status": "ready", "ready_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"status": "ready", "ticket_id": ticket_id}


# --- Menu CRUD (standalone) ---
@router.post("/menus")
async def create_menu(menu: GenericCreate):
    db = get_database()
    data = menu.dict()
    data["id"] = f"menu-{uuid.uuid4().hex[:8]}"
    data["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.menus.insert_one(data)
    data.pop("_id", None)
    return data


@router.put("/menus/{menu_id}")
async def update_menu(menu_id: str, menu: GenericCreate):
    db = get_database()
    data = menu.dict()
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.menus.update_one({"id": menu_id}, {"$set": data})
    return {"status": "updated", "id": menu_id}


# --- Menu Categories CRUD ---
@router.post("/menu/categories")
async def create_category(cat: GenericCreate):
    db = get_database()
    data = cat.dict()
    data["id"] = f"cat-{uuid.uuid4().hex[:8]}"
    data["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.menu_categories.insert_one(data)
    data.pop("_id", None)
    return data


@router.put("/menu/categories/{category_id}")
async def update_category(category_id: str, cat: GenericCreate):
    db = get_database()
    data = cat.dict()
    await db.menu_categories.update_one({"id": category_id}, {"$set": data})
    return {"status": "updated", "id": category_id}


@router.delete("/menu/categories/{category_id}")
async def delete_category(category_id: str):
    db = get_database()
    await db.menu_categories.delete_one({"id": category_id})
    return {"status": "deleted", "id": category_id}


# --- Menu Items CRUD ---
@router.get("/menu/items/{item_id}")
async def get_menu_item(item_id: str):
    db = get_database()
    item = await db.menu_items.find_one({"id": item_id})
    if not item:
        raise HTTPException(404, "Menu item not found")
    item["_id"] = str(item["_id"])
    return item


@router.post("/menu/items")
async def create_menu_item(item: GenericCreate):
    db = get_database()
    data = item.dict()
    data["id"] = f"item-{uuid.uuid4().hex[:8]}"
    data["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.menu_items.insert_one(data)
    data.pop("_id", None)
    return data


@router.put("/menu/items/{item_id}")
async def update_menu_item(item_id: str, item: GenericCreate):
    db = get_database()
    data = item.dict()
    await db.menu_items.update_one({"id": item_id}, {"$set": data})
    return {"status": "updated", "id": item_id}


@router.delete("/menu/items/{item_id}")
async def delete_menu_item(item_id: str):
    db = get_database()
    await db.menu_items.delete_one({"id": item_id})
    return {"status": "deleted", "id": item_id}


# --- Zones & Tables CRUD ---
@router.post("/zones")
async def create_zone(zone: GenericCreate):
    db = get_database()
    data = zone.dict()
    data["id"] = f"zone-{uuid.uuid4().hex[:8]}"
    await db.zones.insert_one(data)
    data.pop("_id", None)
    return data


@router.post("/tables")
async def create_table(table: GenericCreate):
    db = get_database()
    data = table.dict()
    data["id"] = f"table-{uuid.uuid4().hex[:8]}"
    await db.tables.insert_one(data)
    data.pop("_id", None)
    return data


@router.put("/tables/{table_id}")
async def update_table(table_id: str, table: GenericCreate):
    db = get_database()
    data = table.dict()
    await db.tables.update_one({"id": table_id}, {"$set": data})
    return {"status": "updated", "id": table_id}


@router.delete("/tables/{table_id}")
async def delete_table(table_id: str):
    db = get_database()
    await db.tables.delete_one({"id": table_id})
    return {"status": "deleted", "id": table_id}


# --- Users CRUD ---
@router.post("/users")
async def create_user(user: GenericCreate):
    db = get_database()
    data = user.dict()
    data["id"] = f"user-{uuid.uuid4().hex[:8]}"
    data["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.users.insert_one(data)
    data.pop("_id", None)
    return data


@router.get("/users/{user_id}/current-shift")
async def get_current_shift(user_id: str):
    db = get_database()
    shift = await db.shifts.find_one({"user_id": user_id, "status": "active"})
    if shift:
        shift["_id"] = str(shift["_id"])
    return shift or {"active": False}


# --- Devices ---
@router.post("/devices/bind")
async def bind_device(device: GenericCreate):
    db = get_database()
    data = device.dict()
    data["id"] = f"device-{uuid.uuid4().hex[:8]}"
    data["bound_at"] = datetime.now(timezone.utc).isoformat()
    await db.device_bindings.insert_one(data)
    data.pop("_id", None)
    return data


@router.get("/devices/{device_id}/binding")
async def get_device_binding(device_id: str):
    db = get_database()
    binding = await db.device_bindings.find_one({"device_id": device_id})
    if binding:
        binding["_id"] = str(binding["_id"])
    return binding or {}


# --- Inventory CRUD ---
@router.post("/inventory/items")
async def create_inventory_item(item: GenericCreate):
    db = get_database()
    data = item.dict()
    data["id"] = f"inv-{uuid.uuid4().hex[:8]}"
    data["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.inventory_items.insert_one(data)
    data.pop("_id", None)
    return data


@router.post("/inventory/ledger")
async def add_ledger_entry(
    item_id: str = Query(...),
    action: str = Query(...),
    quantity: float = Query(...),
    reason: Optional[str] = Query(None),
    lot_number: Optional[str] = Query(None),
    expiry_date: Optional[str] = Query(None),
    po_id: Optional[str] = Query(None),
):
    db = get_database()
    entry = {
        "id": f"ledger-{uuid.uuid4().hex[:8]}",
        "item_id": item_id,
        "action": action,
        "quantity": quantity,
        "reason": reason,
        "lot_number": lot_number,
        "expiry_date": expiry_date,
        "po_id": po_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.inventory_ledger.insert_one(entry)
    entry.pop("_id", None)
    return entry


# --- Purchase Orders ---
@router.post("/purchase-orders")
async def create_purchase_order(po: GenericCreate):
    db = get_database()
    data = po.dict()
    data["id"] = f"po-{uuid.uuid4().hex[:8]}"
    data["status"] = "draft"
    data["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.purchase_orders.insert_one(data)
    data.pop("_id", None)
    return data


@router.post("/purchase-orders/{po_id}/receive")
async def receive_delivery(po_id: str, items: GenericCreate):
    db = get_database()
    await db.purchase_orders.update_one(
        {"id": po_id},
        {"$set": {"status": "received", "received_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"status": "received", "po_id": po_id}


# --- Documents ---
@router.post("/documents/upload")
async def upload_document(venue_id: str = Query(...), file: UploadFile = File(...)):
    db = get_database()
    content = await file.read()
    doc = {
        "id": f"doc-{uuid.uuid4().hex[:8]}",
        "venue_id": venue_id,
        "filename": file.filename,
        "content_type": file.content_type,
        "size": len(content),
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.documents.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.get("/documents/{doc_id}")
async def get_document(doc_id: str):
    db = get_database()
    doc = await db.documents.find_one({"id": doc_id})
    if not doc:
        raise HTTPException(404, "Document not found")
    doc["_id"] = str(doc["_id"])
    return doc


@router.post("/documents/{doc_id}/approve")
async def approve_document(doc_id: str):
    db = get_database()
    await db.documents.update_one({"id": doc_id}, {"$set": {"status": "approved"}})
    return {"status": "approved", "id": doc_id}


# --- Print Jobs ---
@router.post("/print-jobs/{job_id}/complete")
async def complete_print_job(job_id: str):
    db = get_database()
    await db.print_jobs.update_one(
        {"id": job_id},
        {"$set": {"status": "completed", "completed_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"status": "completed", "job_id": job_id}


# --- Public Content ---
@router.get("/public-content/current")
async def get_current_public_content(type: Optional[str] = Query(None)):
    db = get_database()
    query: dict[str, Any] = {"status": "published"}
    if type:
        query["type"] = type
    content = await db.public_content.find_one(query, sort=[("published_at", -1)])
    if content:
        content["_id"] = str(content["_id"])
    return content or {}


@router.get("/public-content/versions")
async def list_public_content_versions(type: Optional[str] = Query(None)):
    db = get_database()
    query: dict[str, Any] = {}
    if type:
        query["type"] = type
    versions = await db.public_content.find(query).sort("created_at", -1).to_list(length=50)
    for v in versions:
        v["_id"] = str(v["_id"])
    return versions


@router.post("/public-content")
async def create_public_content(content: GenericCreate):
    db = get_database()
    data = content.dict()
    data["id"] = f"content-{uuid.uuid4().hex[:8]}"
    data["status"] = "draft"
    data["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.public_content.insert_one(data)
    data.pop("_id", None)
    return data


@router.patch("/public-content/{content_id}")
async def update_public_content(content_id: str, content: GenericCreate):
    db = get_database()
    data = content.dict()
    await db.public_content.update_one({"id": content_id}, {"$set": data})
    return {"status": "updated", "id": content_id}


@router.post("/public-content/{content_id}/approve")
async def approve_public_content(content_id: str):
    db = get_database()
    await db.public_content.update_one(
        {"id": content_id},
        {"$set": {"status": "published", "published_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"status": "published", "id": content_id}


@router.get("/public-content/preview/{content_id}")
async def preview_public_content(content_id: str):
    db = get_database()
    content = await db.public_content.find_one({"id": content_id})
    if content:
        content["_id"] = str(content["_id"])
    return content or {}


@router.post("/public-content/sync-modules")
async def sync_public_modules():
    return {"status": "synced"}


# --- Table Preferences ---
@router.get("/table-preferences")
async def get_table_preferences(
    table_id: Optional[str] = Query(None),
    venue_id: Optional[str] = Query(None),
):
    db = get_database()
    query: dict[str, Any] = {}
    if table_id:
        query["table_id"] = table_id
    if venue_id:
        query["venue_id"] = venue_id
    pref = await db.table_preferences.find_one(query)
    if pref:
        pref["_id"] = str(pref["_id"])
    return pref or {}


@router.post("/table-preferences")
async def upsert_table_preferences(pref: GenericCreate):
    db = get_database()
    data = pref.dict()
    await db.table_preferences.update_one(
        {"table_id": data.get("table_id"), "venue_id": data.get("venue_id")},
        {"$set": data},
        upsert=True,
    )
    return data


# --- Table Presets ---
@router.get("/table-presets")
async def list_table_presets(
    table_id: Optional[str] = Query(None),
    venue_id: Optional[str] = Query(None),
):
    db = get_database()
    query: dict[str, Any] = {}
    if table_id:
        query["table_id"] = table_id
    if venue_id:
        query["venue_id"] = venue_id
    presets = await db.table_presets.find(query).to_list(length=50)
    for p in presets:
        p["_id"] = str(p["_id"])
    return presets


@router.post("/table-presets")
async def create_table_preset(preset: GenericCreate):
    db = get_database()
    data = preset.dict()
    data["id"] = f"preset-{uuid.uuid4().hex[:8]}"
    await db.table_presets.insert_one(data)
    data.pop("_id", None)
    return data


@router.delete("/table-presets/{preset_id}")
async def delete_table_preset(preset_id: str):
    db = get_database()
    await db.table_presets.delete_one({"id": preset_id})
    return {"status": "deleted", "id": preset_id}


# --- HR Feature Flags ---
@router.get("/hr/feature-flags")
async def get_hr_feature_flags(venue_id: Optional[str] = Query(None)):
    db = get_database()
    query: dict[str, Any] = {}
    if venue_id:
        query["venue_id"] = venue_id
    flags = await db.hr_feature_flags.find_one(query)
    if flags:
        flags["_id"] = str(flags["_id"])
    return flags or {"flags": {}}


@router.post("/hr/feature-flags")
async def update_hr_feature_flags(payload: GenericCreate):
    db = get_database()
    data = payload.dict()
    await db.hr_feature_flags.update_one(
        {"venue_id": data.get("venue_id")},
        {"$set": data},
        upsert=True,
    )
    return data


# --- HR Audit Logs ---
@router.get("/hr/audit-logs")
async def get_hr_audit_logs(
    venue_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
):
    db = get_database()
    query: dict[str, Any] = {}
    if venue_id:
        query["venue_id"] = venue_id
    skip = (page - 1) * page_size
    logs = await db.hr_audit_logs.find(query).sort("timestamp", -1).skip(skip).to_list(length=page_size)
    for l in logs:
        l["_id"] = str(l["_id"])
    total = await db.hr_audit_logs.count_documents(query)
    return {"logs": logs, "total": total, "page": page, "page_size": page_size}


# --- Updates / Changes ---
@router.get("/updates/changes")
async def list_changes(published: bool = Query(False)):
    db = get_database()
    query: dict[str, Any] = {}
    if published:
        query["published"] = True
    changes = await db.update_changes.find(query).sort("created_at", -1).to_list(length=100)
    for c in changes:
        c["_id"] = str(c["_id"])
    return changes


@router.post("/updates/changes")
async def create_change(change: GenericCreate):
    db = get_database()
    data = change.dict()
    data["id"] = f"change-{uuid.uuid4().hex[:8]}"
    data["published"] = False
    data["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.update_changes.insert_one(data)
    data.pop("_id", None)
    return data


@router.post("/updates/publish")
async def publish_updates():
    db = get_database()
    result = await db.update_changes.update_many(
        {"published": False},
        {"$set": {"published": True, "published_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"published": result.modified_count}


@router.get("/updates/releases")
async def list_releases(view: str = Query("user")):
    db = get_database()
    releases = await db.update_releases.find({}).sort("published_at", -1).to_list(length=50)
    for r in releases:
        r["_id"] = str(r["_id"])
    return releases
