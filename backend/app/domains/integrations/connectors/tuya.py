import logging
import json
from typing import Dict, Any, List
from datetime import datetime, timezone

# Attempt to import tuya-connector-python
try:
    from tuya_connector import TuyaOpenAPI, TUYA_LOGGER
    TUYA_AVAILABLE = True
except ImportError:
    TUYA_AVAILABLE = False

from app.core.database import get_database
from app.domains.integrations.connectors.base import BaseConnector
from app.domains.integrations.models import IntegrationProvider

logger = logging.getLogger(__name__)

class TuyaConnector(BaseConnector):
    """
    Tuya Cloud Integration.
    Uses 'tuya-iot-python-sdk' (Official).
    Requires 'access_id', 'access_secret', 'endpoint', 'username', 'password' in credentials.
    """

    def get_provider(self) -> IntegrationProvider:
        return IntegrationProvider.TUYA

    def _get_api(self):
        if not TUYA_AVAILABLE:
            return None
        
        access_id = self.credentials.get("access_id")
        access_secret = self.credentials.get("access_secret")
        endpoint = self.credentials.get("endpoint", "https://openapi.tuyau.com") # Default to EU
        
        # TuyaOpenAPI(endpoint, access_id, access_secret)
        openapi = TuyaOpenAPI(endpoint, access_id, access_secret)
        openapi.connect()
        return openapi

    async def validate_credentials(self) -> bool:
        if not TUYA_AVAILABLE:
            logger.error("tuya-iot-python-sdk library not installed")
            return False

        try:
            openapi = self._get_api()
            if not openapi:
                return False
                
            # Try to fetch token or simple device list to validate
            # The connect() method essentially gets the token
            return openapi.token_info is not None
            
        except Exception as e:
            logger.error(f"[Tuya] Validation failed: {e}")
            return False

    async def discover(self) -> Dict[str, Any]:
        """
        List devices from Tuya Cloud.
        """
        if not TUYA_AVAILABLE:
            return {"error": "tuya-iot-python-sdk library missing"}

        try:
            openapi = self._get_api()
            if not openapi:
                return {"error": "Failed to connect to Tuya Cloud"}

            # Get user's devices (assuming we are linked to a user or just project devices)
            # Typically /v1.0/iot-03/devices
            response = openapi.get("/v1.0/iot-03/devices")
            
            if not response.get("success"):
                return {"error": response.get("msg", "Unknown Tuya error")}
                
            devices = response.get("result", {}).get("list", [])
            results = []
            
            for dev in devices:
                results.append({
                    "name": dev.get("name"),
                    "id": dev.get("id"),
                    "category": dev.get("category"),
                    "online": dev.get("online"),
                    "product_name": dev.get("product_name")
                })
                
            return {"discovered_count": len(results), "devices": results}

        except Exception as e:
            return {"error": str(e)}

    async def sync(self, window_days: int = 1) -> Dict[str, Any]:
        """
        Sync Tuya devices to internal DB.
        """
        if not TUYA_AVAILABLE:
            return {"processed": 0, "failed": 0, "error": "Library missing"}

        processed = 0
        failed = 0
        
        try:
            openapi = self._get_api()
            if not openapi:
                return {"error": "Failed to connect"}

            response = openapi.get("/v1.0/iot-03/devices")
            if not response.get("success"):
                return {"processed": 0, "failed": 0, "error": response.get("msg")}

            devices = response.get("result", {}).get("list", [])
            db = get_database()
            now = datetime.now(timezone.utc).isoformat()

            for dev in devices:
                try:
                    # Upsert to 'iot_devices'
                    data = {
                        "organization_id": self.organization_id,
                        "provider": "TUYA",
                        "external_id": dev.get("id"),
                        "name": dev.get("name"),
                        "type": dev.get("category"), # e.g. 'cz' for plug, 'dj' for light
                        "is_online": dev.get("online"),
                        "last_synced_at": now,
                        "raw_data": dev
                    }
                    
                    status_resp = openapi.get(f"/v1.0/iot-03/devices/{dev.get('id')}/status")
                    if status_resp.get("success"):
                        data["status_details"] = status_resp.get("result")
                        # Try to determine 'is_on'
                        for item in status_resp.get("result", []):
                            if item.get("code") == "switch_1":
                                data["is_on"] = item.get("value")

                    await db.iot_devices.update_one(
                        {"organization_id": self.organization_id, "external_id": dev.get("id")},
                        {"$set": data},
                        upsert=True
                    )
                    processed += 1
                except Exception as e:
                    logger.error(f"[Tuya] Device sync failed {dev.get('name')}: {e}")
                    failed += 1

            return {"processed": processed, "failed": failed}

        except Exception as e:
            return {"processed": processed, "failed": failed, "error": str(e)}

    async def execute_command(self, command: str, payload: Dict[str, Any]) -> bool:
        """
        Execute command.
        Payload: {"device_id": "...", "commands": [{"code": "switch_1", "value": true}]}
        """
        if not TUYA_AVAILABLE:
            return False

        try:
            openapi = self._get_api()
            device_id = payload.get("device_id")
            commands = payload.get("commands")
            
            if not device_id or not commands:
                # Fallback simple command logic if raw commands not provided
                if command in ["ON", "OFF"] and device_id:
                   commands = [{"code": "switch_1", "value": (command == "ON")}]
                else:
                   return False

            response = openapi.post(
                f"/v1.0/iot-03/devices/{device_id}/commands", 
                {"commands": commands}
            )
            
            return response.get("success", False)

        except Exception as e:
            logger.error(f"[Tuya] Command failed: {e}")
            return False
