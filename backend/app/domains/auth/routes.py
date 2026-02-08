from fastapi import APIRouter, HTTPException, Request, Query
from typing import Optional
from datetime import datetime, timezone

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/login/pin")
async def login_with_pin(
    req: Request,
    pin: str = Query(...),
    app: str = Query("admin"),
    deviceId: Optional[str] = Query(None)
):
    """PIN-based authentication endpoint."""
    # Extract request info
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
    
    # Mock Auth Logic - accept PIN 1111 or 1234
    if pin == "1111" or pin == "1234":
        allowed_venues = ["venue-caviar-bull", "venue_1"]
        return {
            "token": "mock-jwt-token-active-user",
            "accessToken": "mock-jwt-token-active-user",  # Frontend also checks this
            "allowedVenueIds": allowed_venues,  # Top level for frontend
            "defaultVenueId": allowed_venues[0],
            "user": {
                "id": "admin_user",
                "name": "Admin User",
                "role": "OWNER",
                "email": "admin@restin.com",
                "venueId": "venue-caviar-bull",  # camelCase for frontend
                "allowedVenueIds": allowed_venues  # Also in user object
            },
            "device_captured": device_data
        }
    
    raise HTTPException(status_code=401, detail="Invalid PIN")
