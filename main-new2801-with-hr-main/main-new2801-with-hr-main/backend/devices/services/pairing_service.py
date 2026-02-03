from datetime import datetime, timezone
from typing import Optional
from devices.models import DevicePairingCode, PairingCodeCreate, Device, DeviceCreate
from core.errors import http_error

class PairingService:
    def __init__(self, db):
        self.db = db
        self.col = db.device_pairing_codes

    async def generate_pairing_code(self, venue_id: str, created_by: str) -> DevicePairingCode:
        code = DevicePairingCode(
            venue_id=venue_id,
            code_4_digit=DevicePairingCode.generate_code(),
            expires_at=DevicePairingCode.generate_expiry(minutes=15),
            created_by=created_by
        )
        
        await self.col.insert_one(code.model_dump())
        return code

    async def validate_and_use_code(self, venue_id: str, code: str, device_id: str) -> bool:
        now = datetime.now(timezone.utc).isoformat()
        
        doc = await self.col.find_one({
            "venue_id": venue_id,
            "code_4_digit": code,
            "used_by_device_id": None,
            "expires_at": {"$gt": now}
        }, {"_id": 0})
        
        if not doc:
            return False
        
        await self.col.update_one(
            {"id": doc["id"]},
            {"$set": {
                "used_by_device_id": device_id,
                "used_at": now
            }}
        )
        
        return True

    async def list_active_codes(self, venue_id: str):
        now = datetime.now(timezone.utc).isoformat()
        cursor = self.col.find({
            "venue_id": venue_id,
            "used_by_device_id": None,
            "expires_at": {"$gt": now}
        }, {"_id": 0}).sort("created_at", -1)
        
        docs = await cursor.to_list(100)
        return [DevicePairingCode(**doc) for doc in docs]
