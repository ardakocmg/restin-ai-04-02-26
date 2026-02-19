"""
Auth routes - PIN login using MongoDB users collection.
"""
from fastapi import APIRouter, HTTPException, Request, Query
from typing import Optional
from datetime import datetime, timezone
import hashlib
import logging

logger = logging.getLogger("auth.routes")

from app.core.database import get_database
from core.security import verify_pin, hash_pin, compute_pin_index

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login/pin")
async def login_with_pin(
    req: Request,
    pin: str = Query(...),
    app: str = Query("admin"),
    deviceId: Optional[str] = Query(None)
):
    """PIN-based authentication - reads from MongoDB users collection."""
    client_ip = req.client.host if req.client else "unknown"
    user_agent = req.headers.get("user-agent", "Unknown")
    
    device_data = {
        "ip": client_ip,
        "user_agent": user_agent,
        "device_id": deviceId,
        "app": app,
        "login_at": datetime.now(timezone.utc).isoformat()
    }
    
    logger.info("[AUTH] LOGIN ATTEMPT: PIN=****%s DEVICE=%s", pin[-1] if pin else '?', device_data.get('ip', 'unknown'))
    
    db = get_database()
    
    _role_sort_map = {
        "product_owner": 0, "owner": 1, "OWNER": 1,
        "general_manager": 2, "GENERAL_MANAGER": 2,
        "manager": 3, "MANAGER": 3,
        "staff": 4, "STAFF": 4
    }
    
    # --- FAST PATH: use pin_index (SHA256) for O(1) DB lookup ---
    idx = compute_pin_index(pin)
    indexed_users = await db.users.find({"pin_index": idx}).to_list(length=10)
    
    # Verify bcrypt on the small candidate set (typically 1-2 users)
    candidates = [u for u in indexed_users if verify_pin(pin, u.get("pin_hash", ""))]
    
    # --- FALLBACK: if no pin_index matches, scan + backfill (one-time migration) ---
    if not candidates:
        all_users = await db.users.find(
            {"pin_hash": {"$exists": True, "$ne": ""}},
        ).to_list(length=200)
        
        candidates = []
        for u in all_users:
            if verify_pin(pin, u.get("pin_hash", "")):
                candidates.append(u)
                # Backfill pin_index for this user so future logins are instant
                stored = u.get("pin_hash", "")
                update_fields = {"pin_index": idx}
                unset_fields = {}
                # Also auto-upgrade legacy SHA256 hash to bcrypt
                if len(stored) == 64 and all(c in '0123456789abcdef' for c in stored):
                    update_fields["pin_hash"] = hash_pin(pin)
                    unset_fields["pin"] = ""
                update_op = {"$set": update_fields}
                if unset_fields:
                    update_op["$unset"] = unset_fields
                await db.users.update_one({"_id": u["_id"]}, update_op)
                logger.info("[AUTH] Backfilled pin_index for user_id=%s", u.get('id', '?'))
    
    if candidates:
        # Sort: product_owner first, then owner, etc.
        candidates.sort(key=lambda u: _role_sort_map.get(u.get("role", "staff"), 5))
        user = candidates[0]
        logger.info("[AUTH] PIN MATCH: Found %d candidates, selected user_id=%s (role=%s)", len(candidates), user.get('id', '?'), user.get('role', '?'))
    else:
        user = None
    
    if not user:
        logger.warning("[AUTH] LOGIN FAILED: No user found for PIN=****%s from IP=%s", pin[-1] if pin else '?', client_ip)
        raise HTTPException(status_code=401, detail="Invalid PIN")
    
    # Get all venues this user has access to
    user_venue_id = user.get("venue_id")
    
    # Get all venues for the allowed list
    all_venues = await db.venues.find({}).to_list(length=100)
    all_venue_ids = [v.get("id") for v in all_venues]
    
    # Owner/Admin gets all venues, others get their assigned venue
    role = user.get("role", "STAFF")
    if role in ["OWNER", "ADMIN", "product_owner", "owner"]:
        allowed_venues = all_venue_ids
    else:
        allowed_venues = [user_venue_id] if user_venue_id else all_venue_ids
    
    default_venue = allowed_venues[0] if allowed_venues else None
    
    user_id = user.get("id", str(user.get("_id", "")))
    
    user_response = {
        "id": user_id,
        "name": user.get("name", "Unknown"),
        "role": role,
        "email": user.get("email", ""),
        "venueId": user_venue_id,
        "allowedVenueIds": allowed_venues
    }
    
    # Update last_login so user shows as "online" in Hive staff list
    now_iso = datetime.now(timezone.utc).isoformat()
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"last_login": now_iso, "device_id": deviceId}}
    )
    
    # Create a REAL JWT token (not a fake string)
    from core.security import create_jwt_token
    real_token = create_jwt_token(user_id, user_venue_id or default_venue or "", role, deviceId)
    
    logger.info("[AUTH] LOGIN SUCCESS: user_id=%s role=%s venue=%s", user_id, role, user_venue_id or default_venue)
    
    return {
        "token": real_token,
        "accessToken": real_token,
        "allowedVenueIds": allowed_venues,
        "defaultVenueId": default_venue,
        "user": user_response,
        "device_captured": device_data
    }


# ==================== ROLES & PERMISSIONS ====================

DEFAULT_PERMISSION_GROUPS = [
    {
        "id": "orders", "title": "Orders & Service",
        "permissions": [
            {"key": "orders:create", "label": "Create Orders", "risk": "LOW"},
            {"key": "orders:void", "label": "Void Items/Orders", "risk": "HIGH", "gate": "manager_code"},
            {"key": "orders:discount", "label": "Apply Discounts", "risk": "MED"},
            {"key": "orders:transfer", "label": "Transfer Tables", "risk": "LOW"},
            {"key": "orders:split", "label": "Split Bills", "risk": "LOW"},
        ]
    },
    {
        "id": "payments", "title": "Payments & Cash",
        "permissions": [
            {"key": "payments:process", "label": "Process Payments", "risk": "LOW"},
            {"key": "payments:refund", "label": "Process Refunds", "risk": "HIGH"},
            {"key": "cash:open_drawer", "label": "Open Cash Drawer", "risk": "MED", "gate": "cashdesk"},
            {"key": "cash:shift_close", "label": "Close Cash Shift", "risk": "HIGH"},
        ]
    },
    {
        "id": "kitchen", "title": "Kitchen & Production",
        "permissions": [
            {"key": "kitchen:view", "label": "View KDS", "risk": "LOW"},
            {"key": "kitchen:bump", "label": "Bump Orders", "risk": "LOW"},
            {"key": "kitchen:recall", "label": "Recall Orders", "risk": "MED"},
            {"key": "stock:adjust", "label": "Adjust Stock", "risk": "MED"},
        ]
    },
    {
        "id": "admin", "title": "Administration",
        "permissions": [
            {"key": "admin:users", "label": "Manage Users", "risk": "CRITICAL"},
            {"key": "admin:roles", "label": "Manage Roles", "risk": "CRITICAL"},
            {"key": "reports:view", "label": "View Reports", "risk": "MED"},
            {"key": "settings:edit", "label": "Edit Settings", "risk": "HIGH"},
        ]
    },
]

DEFAULT_ROLES = [
    {"id": "owner", "label": "Owner", "category": "Management", "allowedStations": ["floor", "bar", "cashdesk", "kitchen", "office"]},
    {"id": "general_manager", "label": "General Manager", "category": "Management", "allowedStations": ["floor", "bar", "cashdesk", "kitchen", "office"]},
    {"id": "manager", "label": "Manager", "category": "Management", "allowedStations": ["floor", "bar", "cashdesk", "office"]},
    {"id": "supervisor", "label": "Supervisor", "category": "Management", "allowedStations": ["floor", "bar"]},
    {"id": "waiter", "label": "Waiter", "category": "Service", "allowedStations": ["floor", "bar"]},
    {"id": "bartender", "label": "Bartender", "category": "Service", "allowedStations": ["bar"]},
    {"id": "runner", "label": "Runner", "category": "Service", "allowedStations": ["floor", "kitchen"]},
    {"id": "head_chef", "label": "Head Chef", "category": "Kitchen", "allowedStations": ["kitchen", "office"]},
    {"id": "chef_de_partie", "label": "Chef de Partie", "category": "Kitchen", "allowedStations": ["kitchen"]},
    {"id": "cashier", "label": "Cashier", "category": "Other", "allowedStations": ["cashdesk"]},
    {"id": "it_admin", "label": "IT Admin", "category": "Other", "allowedStations": ["office"]},
]


# ... (Keep existing auth routes attached to 'router')

# Create a separate router for Admin endpoints to match /api/admin/...
admin_router = APIRouter(prefix="/api/admin", tags=["admin"])

@admin_router.get("/roles")
async def get_roles():
    """Get all roles from MongoDB. Seeds defaults if collection is empty."""
    db = get_database()
    roles = await db.roles.find({}).to_list(length=200)

    if not roles:
        # Seed default roles on first access
        for role in DEFAULT_ROLES:
            await db.roles.insert_one({**role})
        roles = await db.roles.find({}).to_list(length=200)

    for r in roles:
        r["_id"] = str(r["_id"])

    return {
        "roles": roles,
        "permissionGroups": DEFAULT_PERMISSION_GROUPS,
    }


@admin_router.post("/roles")
async def create_role(req: Request):
    """Create a new role."""
    db = get_database()
    body = await req.json()
    body["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.roles.insert_one(body)
    body.pop("_id", None)
    return body


@admin_router.put("/roles/{role_id}")
async def update_role(role_id: str, req: Request):
    """Update an existing role."""
    db = get_database()
    body = await req.json()
    body.pop("_id", None)
    body["updated_at"] = datetime.now(timezone.utc).isoformat()

    result = await db.roles.update_one(
        {"id": role_id},
        {"$set": body}
    )

    if result.modified_count == 0:
        raise HTTPException(404, "Role not found")

    updated = await db.roles.find_one({"id": role_id})
    if updated:
        updated["_id"] = str(updated["_id"])
    return updated


# ==================== OBSERVABILITY / LOGS ====================

ERROR_CODES = [
    {
        "code": "AUTH_LOGIN_FAILED",
        "title": "Login Failed",
        "description": "User attempted to login with invalid credentials.",
        "level": "warn",
        "likely_causes": ["Wrong PIN", "User disabled", "Network intercept"],
        "operator_action": ["Verify credentials", "Check user status"],
        "dev_action": ["Check auth logs", "Verify hash function"]
    },
    {
        "code": "SYNC_FAILED",
        "title": "Synchronization Failed",
        "description": "Failed to sync data with external provider (e.g., Lightspeed).",
        "level": "error",
        "likely_causes": ["API Limit Reached", "Invalid Credentials", "Timeout"],
        "operator_action": ["Retry sync manually", "Check internet connection"],
        "dev_action": ["Check integration connector logic", "Inspect payload"]
    },
    {
        "code": "ORDER_VOID_HIGH_VALUE",
        "title": "High Value Order Voided",
        "description": "An order exceeding the safety threshold was voided.",
        "level": "warn",
        "likely_causes": ["Customer changed mind", "Mistake in entry"],
        "operator_action": ["Manager approval required"],
        "dev_action": ["None if authorized"]
    },
    {
        "code": "DEVICE_OFFLINE",
        "title": "Device Went Offline",
        "description": "A critical device (POS/KDS) stopped sending heartbeats.",
        "level": "error",
        "likely_causes": ["Power loss", "Network cable unplugged", "WiFi interference"],
        "operator_action": ["Check device power", "Check network status"],
        "dev_action": ["Check WebSocket heartbeats"]
    },
    {
        "code": "INVENTORY_LOW_STOCK",
        "title": "Low Stock Alert",
        "description": "Item inventory dropped below reorder point.",
        "level": "info",
        "likely_causes": ["High sales volume", "Forgot to restock"],
        "operator_action": ["Create Purchase Order", "Restock from storage"],
        "dev_action": ["None"]
    }
]

@admin_router.get("/error-codes")
async def get_error_codes():
    """Get registry of system error codes."""
    return {"codes": ERROR_CODES}


@admin_router.get("/logs")
async def get_system_logs(
    venue_id: Optional[str] = Query(None),
    level: Optional[str] = Query(None),
    code: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    limit: int = Query(100)
):
    """Get system logs with filtering."""
    db = get_database()
    query = {}
    
    if venue_id:
        query["venue_id"] = venue_id
    if level and level != "ALL":
        query["level"] = level
    if code:
        query["code"] = code
    if q:
        query["$or"] = [
            {"message": {"$regex": q, "$options": "i"}},
            {"code": {"$regex": q, "$options": "i"}}
        ]
        
    logs = await db.logs.find(query).sort("ts", -1).to_list(length=limit)
    
    # If no logs, seed some sample data for demo
    if not logs and not query:
        from datetime import timedelta
        import random
        base_time = datetime.now(timezone.utc)
        
        sample_logs = []
        for i in range(15):
            err = random.choice(ERROR_CODES)
            sample_logs.append({
                "ts": (base_time - timedelta(minutes=i*10)).isoformat(),
                "level": err["level"].upper(),
                "code": err["code"],
                "message": f"Sample event: {err['description']}",
                "venue_id": "venue-caviar-bull",
                "endpoint": "/api/demo",
                "request_id": f"req-{random.randint(1000,9999)}",
                "acknowledged": False
            })
        
        if sample_logs:
            await db.logs.insert_many(sample_logs)
            logs = await db.logs.find({}).sort("ts", -1).to_list(length=limit)

    for l in logs:
        l["id"] = str(l["_id"])
        l["_id"] = str(l["_id"])
        
    return {"items": logs, "total": len(logs)}


@admin_router.post("/logs/{log_id}/ack")
async def acknowledge_log(log_id: str):
    """Acknowledge a log entry."""
    db = get_database()
    from bson import ObjectId
    
    try:
        oid = ObjectId(log_id)
        query = {"_id": oid}
    except:
        query = {"id": log_id}
        
    await db.logs.update_one(query, {"$set": {"acknowledged": True}})
    
    updated = await db.logs.find_one(query)
    if updated:
        updated["id"] = str(updated["_id"])
        updated["_id"] = str(updated["_id"])
        
    return updated or {"status": "success"}
