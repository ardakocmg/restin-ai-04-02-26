from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone

router = APIRouter(prefix="/api/auth", tags=["auth"])

class PinLoginRequest(BaseModel):
    pin: str
    app: str = "admin"
    deviceId: Optional[str] = None

@router.post("/login/pin")
async def login_with_pin(request: PinLoginRequest, req: Request):
    # Extract request info
    client_ip = req.client.host
    user_agent = req.headers.get("user-agent", "Unknown")
    
    # Merge with provided device info if available
    device_data = {
        "ip": client_ip,
        "user_agent": user_agent,
        "login_at": datetime.now(timezone.utc).isoformat()
    }
    
    if request.device_info:
        device_data.update(request.device_info.dict(exclude_none=True))
        
    print(f"🔐 LOGIN ATTEMPT: PIN={request.pin} DEVICE={device_data}")
    
    # Mock Auth Logic matching the known PIN 1111 (or 1234 from logs)
    if request.pin == "1111" or request.pin == "1234":
        # Simulate saving to Audit Log (In real app, save to db.audit_logs)
        # db.audit_logs.insert_one({...})
        
        # Auto-register device session
        try:
            from core.database import db
            from devices.services import DeviceService
            device_service = DeviceService(db)
            
            # Use provided device info or header info
            await device_service.upsert_session_device(
                request.device_info.dict() if request.device_info else {}, 
                client_ip, 
                user_agent
            )
            print(f"✅ Device registered/updated for IP: {client_ip}")
        except Exception as e:
            print(f"⚠️ Failed to register device: {e}")
        
        return {
            "token": "mock-jwt-token-active-user",
            "user": {
                "id": "admin_user",
                "name": "Admin User",
                "role": "OWNER",
                "email": "admin@restin.com",
                "venue_id": "venue-caviar-bull",
                "allowed_venue_ids": ["venue-caviar-bull", "venue_1"]
            },
            "device_captured": device_data
        }
    raise HTTPException(status_code=401, detail="Invalid PIN")
