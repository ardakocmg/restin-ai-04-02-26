"""
Auth routes - PIN login using MongoDB users collection.
"""
from fastapi import APIRouter, HTTPException, Request, Query
from typing import Optional
from datetime import datetime, timezone
import hashlib

from app.core.database import get_database

router = APIRouter(prefix="/api/auth", tags=["auth"])


def hash_pin(pin: str) -> str:
    """Hash PIN for comparison with stored hash."""
    return hashlib.sha256(pin.encode()).hexdigest()


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
    
    print(f"[AUTH] LOGIN ATTEMPT: PIN={pin} DEVICE={device_data}")
    
    db = get_database()
    
    # Try both plain PIN and hashed PIN lookup
    pin_hash = hash_pin(pin)
    user = await db.users.find_one({
        "$or": [
            {"pin": pin},
            {"pin_hash": pin_hash}
        ]
    })
    
    if not user:
        print(f"[AUTH] LOGIN FAILED: No user found for PIN={pin}")
        raise HTTPException(status_code=401, detail="Invalid PIN")
    
    # Get all venues this user has access to
    user_venue_id = user.get("venue_id")
    
    # Get all venues for the allowed list
    all_venues = await db.venues.find({}).to_list(length=100)
    all_venue_ids = [v.get("id") for v in all_venues]
    
    # Owner/Admin gets all venues, others get their assigned venue
    role = user.get("role", "STAFF")
    if role in ["OWNER", "ADMIN"]:
        allowed_venues = all_venue_ids
    else:
        allowed_venues = [user_venue_id] if user_venue_id else all_venue_ids
    
    default_venue = allowed_venues[0] if allowed_venues else None
    
    user_response = {
        "id": user.get("id", str(user.get("_id", ""))),
        "name": user.get("name", "Unknown"),
        "role": role,
        "email": user.get("email", ""),
        "venueId": user_venue_id,
        "allowedVenueIds": allowed_venues
    }
    
    print(f"[AUTH] LOGIN SUCCESS: {user_response['name']} ({role})")
    
    return {
        "token": f"jwt-{user_response['id']}-{datetime.now(timezone.utc).timestamp()}",
        "accessToken": f"jwt-{user_response['id']}-{datetime.now(timezone.utc).timestamp()}",
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


@router.get("/admin/roles")
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


@router.post("/admin/roles")
async def create_role(req: Request):
    """Create a new role."""
    db = get_database()
    body = await req.json()
    body["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.roles.insert_one(body)
    body.pop("_id", None)
    return body


@router.put("/admin/roles/{role_id}")
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
