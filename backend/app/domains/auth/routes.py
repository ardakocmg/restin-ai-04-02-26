from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/auth", tags=["auth"])

class PinLoginRequest(BaseModel):
    pin: str
    app: str = "admin"
    deviceId: Optional[str] = None

@router.post("/login/pin")
async def login_with_pin(pin: str, app: str = "admin", deviceId: Optional[str] = None):
    # Mock Auth Logic matching the known PIN 1111 (or 1234 from logs)
    if pin == "1111" or pin == "1234":
        return {
            "token": "mock-jwt-token-active-user",
            "user": {
                "id": "user_001",
                "name": "Admin User",
                "role": "admin",
                "email": "admin@restin.com"
            }
        }
    raise HTTPException(status_code=401, detail="Invalid PIN")
