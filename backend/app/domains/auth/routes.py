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
