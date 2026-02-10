import httpx
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timezone
import uuid

from app.core.database import get_database
from app.domains.integrations.connectors.base import BaseConnector
from app.domains.integrations.models import IntegrationProvider

logger = logging.getLogger(__name__)

NUKI_WEB_API = "https://api.nuki.io"

class NukiConnector(BaseConnector):
    """
    Nuki Integration Connector.
    Adapts logic from app.domains.access_control.nuki_provider.
    Writes to 'doors' collection (Motor/MongoDB) for compatibility with AccessControlService.
    """

    def get_provider(self) -> IntegrationProvider:
        return IntegrationProvider.NUKI

    async def validate_credentials(self) -> bool:
        """
        Validate API token by fetching account info or list of smartlocks.
        """
        token = self._get_token()
        if not token:
            return False
            
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    f"{NUKI_WEB_API}/smartlock",
                    headers={"Authorization": f"Bearer {token}"},
                )
                return resp.status_code == 200
        except Exception as e:
            logger.error(f"[NukiConnector] Validation error: {e}")
            return False

    async def discover(self) -> Dict[str, Any]:
        """
        Discover Nuki devices and return metadata.
        Does NOT write to DB (Sync does that).
        """
        token = self._get_token()
        if not token:
            return {"error": "No token provided"}

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(
                    f"{NUKI_WEB_API}/smartlock",
                    headers={"Authorization": f"Bearer {token}"},
                )
                if resp.status_code == 200:
                    devices = resp.json()
                    return {"discovered_count": len(devices), "devices": devices}
                else:
                    return {"error": f"Nuki API error: {resp.status_code}"}
        except Exception as e:
            return {"error": str(e)}

    async def sync(self, window_days: int = 1) -> Dict[str, Any]:
        """
        Sync devices and their status to the 'doors' collection.
        This ensures AccessControlService sees the latest devices.
        """
        token = self._get_token()
        if not token:
            return {"processed": 0, "failed": 0, "error": "No token"}

        try:
            # 1. Fetch Devices
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(
                    f"{NUKI_WEB_API}/smartlock",
                    headers={"Authorization": f"Bearer {token}"},
                )
                if resp.status_code != 200:
                    return {"processed": 0, "failed": 0, "error": f"API {resp.status_code}"}
                
                devices = resp.json()

            # 2. Update DB (Motor)
            db = get_database()
            now = datetime.now(timezone.utc).isoformat()
            processed = 0
            failed = 0
            new_count = 0
            updated_count = 0

            for device in devices:
                try:
                    smartlock_id = device.get("smartlockId")
                    if not smartlock_id:
                        continue

                    # Determine device type
                    device_type_id = device.get("type", 0)
                    device_type_map = {0: "SMART_LOCK_PRO", 2: "OPENER", 3: "SMART_DOOR", 4: "SMART_LOCK_ULTRA"}
                    device_type = device_type_map.get(device_type_id, "SMART_LOCK_PRO")

                    # Extract state
                    state = device.get("state", {})
                    lock_state_id = state.get("state", 0)
                    lock_state_map = {1: "LOCKED", 3: "UNLOCKED", 5: "UNLATCHED"}
                    lock_state = lock_state_map.get(lock_state_id, "UNKNOWN")

                    # Check existence
                    existing = await db.doors.find_one({
                        "venue_id": self.organization_id, # Using organization_id as venue_id
                        "nuki_smartlock_id": smartlock_id,
                    })

                    door_data = {
                        "venue_id": self.organization_id,
                        "nuki_smartlock_id": smartlock_id,
                        "device_type": device_type,
                        "firmware_version": device.get("firmwareVersion"),
                        "battery_critical": state.get("batteryCritical", False),
                        "battery_charge": state.get("batteryCharge"),
                        "lock_state": lock_state,
                        "last_synced_at": now,
                        "updated_at": now,
                    }

                    if existing:
                        await db.doors.update_one(
                            {"_id": existing["_id"]},
                            {"$set": door_data},
                        )
                        updated_count += 1
                    else:
                        door_data["id"] = f"door-{uuid.uuid4().hex[:8]}"
                        door_data["display_name"] = device.get("name", f"Door {smartlock_id}")
                        door_data["created_at"] = now
                        await db.doors.insert_one(door_data)
                        new_count += 1
                    
                    processed += 1

                except Exception as e:
                    logger.error(f"[NukiConnector] Device sync failed: {e}")
                    failed += 1

            return {
                "processed": processed,
                "failed": failed,
                "details": {
                    "new_devices": new_count,
                    "updated_devices": updated_count,
                    "total_found": len(devices)
                }
            }

        except Exception as e:
            logger.error(f"[NukiConnector] Sync critical error: {e}")
            return {"processed": 0, "failed": 0, "error": str(e)}

    def _get_token(self) -> Optional[str]:
        """Extract token from credentials."""
        # Config UI should save {"api_token": "..."}
        return self.credentials.get("api_token")
