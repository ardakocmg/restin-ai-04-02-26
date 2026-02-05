from datetime import datetime, timezone
from typing import List, Optional
from devices.models import Device, DeviceCreate, DeviceUpdate
import hashlib
import uuid

class DeviceService:
    def __init__(self, db):
        self.db = db
        self.col = db.devices

    async def create_device(self, device_data: DeviceCreate, created_by: str, user_agent: Optional[str] = None) -> Device:
        device_dict = device_data.model_dump()
        device_dict["created_by"] = created_by
        device_dict["updated_by"] = created_by
        device_dict["last_seen_at"] = datetime.now(timezone.utc).isoformat()
        
        if user_agent:
            device_dict["user_agent_hash"] = hashlib.sha256(user_agent.encode()).hexdigest()[:16]
        
        device = Device(**device_dict)
        await self.col.insert_one(device.model_dump())
        return device

    async def get_device(self, device_id: str, venue_id: str) -> Optional[Device]:
        doc = await self.col.find_one({"id": device_id, "venue_id": venue_id}, {"_id": 0})
        return Device(**doc) if doc else None

    async def list_devices(self, venue_id: str, device_type: Optional[str] = None) -> List[Device]:
        query = {"venue_id": venue_id}
        if device_type:
            query["type"] = device_type
        
        cursor = self.col.find(query, {"_id": 0}).sort("created_at", -1)
        docs = await cursor.to_list(1000)
        return [Device(**doc) for doc in docs]

    async def update_device(self, device_id: str, venue_id: str, update_data: DeviceUpdate, updated_by: str) -> Optional[Device]:
        update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
        if not update_dict:
            return await self.get_device(device_id, venue_id)
        
        update_dict["updated_by"] = updated_by
        update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        result = await self.col.update_one(
            {"id": device_id, "venue_id": venue_id},
            {"$set": update_dict}
        )
        
        if result.modified_count:
            return await self.get_device(device_id, venue_id)
        return None

    async def update_last_seen(self, device_id: str, venue_id: str):
        await self.col.update_one(
            {"id": device_id, "venue_id": venue_id},
            {"$set": {"last_seen_at": datetime.now(timezone.utc).isoformat()}}
        )

    async def trust_device(self, device_id: str, venue_id: str, trusted: bool, updated_by: str):
        await self.col.update_one(
            {"id": device_id, "venue_id": venue_id},
            {"$set": {
                "trusted": trusted,
                "updated_by": updated_by,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )


    async def upsert_session_device(self, device_data: dict, ip: str, user_agent: str) -> str:
        """
        Auto-register or update a device from a session login.
        Matches by device_id if present, or creates new.
        """
        device_id = device_data.get("id") or str(uuid.uuid4())
        
        # Simple UA Parsing
        os = "Unknown OS"
        browser = "Unknown Browser"
        if "Windows" in user_agent: os = "Windows"
        elif "Mac" in user_agent: os = "macOS"
        elif "Linux" in user_agent: os = "Linux"
        elif "Android" in user_agent: os = "Android"
        elif "iPhone" in user_agent or "iPad" in user_agent: os = "iOS"
        
        if "Chrome" in user_agent: browser = "Chrome"
        elif "Firefox" in user_agent: browser = "Firefox"
        elif "Safari" in user_agent and "Chrome" not in user_agent: browser = "Safari"
        elif "Edge" in user_agent: browser = "Edge"

        # Prepare update data
        now = datetime.now(timezone.utc).isoformat()
        update_doc = {
            "$set": {
                "venue_id": device_data.get("venue_id", "gross-gargoyles"), # Default venue if missing
                "name": device_data.get("device_name") or f"{os} Device ({ip})",
                "type": "POS" if "POS" in (device_data.get("name") or "") else "KDS_SCREEN", # Default guesswork
                "ip_address": ip,
                "user_agent": user_agent,
                "model": device_data.get("model") or "Browser",
                "os": device_data.get("os") or os,
                "browser": device_data.get("browser") or browser,
                "screen_resolution": device_data.get("screen_resolution"),
                "last_seen_at": now,
                "updated_at": now
            },
            "$setOnInsert": {
                "id": device_id,
                "created_at": now,
                "trusted": False,
                "tags": ["session_auto_registered"]
            }
        }
        
        await self.col.update_one(
            {"id": device_id},
            update_doc,
            upsert=True
        )
        return device_id
