import asyncio
import logging
from typing import Dict, Any, List
from datetime import datetime, timezone
import uuid

# Attempt to import meross_iot, handle if missing
try:
    from meross_iot.http_api import MerossHttpClient
    from meross_iot.manager import MerossManager
    from meross_iot.controller.mixins.light import LightMixin
    from meross_iot.controller.mixins.toggle import ToggleMixin
    MEROSS_AVAILABLE = True
except ImportError:
    MEROSS_AVAILABLE = False

from app.core.database import get_database
from app.domains.integrations.connectors.base import BaseConnector
from app.domains.integrations.models import IntegrationProvider

logger = logging.getLogger(__name__)

class MerossConnector(BaseConnector):
    """
    Meross Cloud Integration.
    Uses 'meross-iot' library (unofficial but standard).
    Requires 'email' and 'password' in credentials.
    """

    def get_provider(self) -> IntegrationProvider:
        return IntegrationProvider.MEROSS

    async def validate_credentials(self) -> bool:
        if not MEROSS_AVAILABLE:
            logger.error("meross-iot library not installed")
            return False
            
        email = self.credentials.get("email")
        password = self.credentials.get("password")
        if not email or not password:
            return False

        try:
            http_api_client = await MerossHttpClient.async_from_user_password(
                email=email, 
                password=password,
                api_base_url="https://iotx-eu.meross.com"
            )
            await http_api_client.async_logout()
            return True
        except Exception as e:
            logger.error(f"[Meross] Validation failed: {e}")
            return False

    async def discover(self) -> Dict[str, Any]:
        """
        List devices from Meross Cloud.
        """
        if not MEROSS_AVAILABLE:
            return {"error": "meross-iot library missing"}

        manager = None
        http_api_client = None
        try:
            email = self.credentials.get("email")
            password = self.credentials.get("password")
            
            http_api_client = await MerossHttpClient.async_from_user_password(
                email=email, 
                password=password,
                api_base_url="https://iotx-eu.meross.com"
            )
            
            manager = MerossManager(http_client=http_api_client)
            await manager.async_init()
            await manager.async_device_discovery()
            
            plugs = manager.find_devices()
            results = []
            
            for dev in plugs:
                # Basic info
                results.append({
                    "name": dev.name,
                    "type": dev.type,
                    "uuid": dev.uuid,
                    "online": dev.online_status,
                    # "lan_ip": getattr(dev, "lan_ip", None) # Some models expose this
                })
                
            return {"discovered_count": len(results), "devices": results}

        except Exception as e:
            return {"error": str(e)}
        finally:
            if manager:
                manager.close()
            if http_api_client:
                await http_api_client.async_logout()

    async def sync(self, window_days: int = 1) -> Dict[str, Any]:
        """
        Sync Meross devices to internal DB (e.g. 'devices' collection or generic 'iot_devices').
        For now, we will map them to the 'Device' table if possible, or just log them.
        """
        if not MEROSS_AVAILABLE:
            return {"processed": 0, "failed": 0, "error": "Library missing"}

        manager = None
        http_api_client = None
        processed = 0
        failed = 0
        
        try:
            email = self.credentials.get("email")
            password = self.credentials.get("password")
            
            http_api_client = await MerossHttpClient.async_from_user_password(
                email=email, 
                password=password,
                api_base_url="https://iotx-eu.meross.com"
            )
            manager = MerossManager(http_client=http_api_client)
            await manager.async_init()
            await manager.async_device_discovery()
            
            devices = manager.find_devices()
            db = get_database()
            now = datetime.now(timezone.utc).isoformat()

            # We reuse the "Device" model or a new "IoTDevice" collection?
            # Existing schema has 'Device' for POS/KDS. 
            # We should probably use 'IntegrationConfig' settings to map them or a new collection.
            # For simplicity in this task, let's assume we store them in a 'iot_devices' or just generic storage.
            # But the user rule says "Clone logic". Most systems like Apicbase don't have IoT. 
            # Restin.ai has 'Device' model. Let's map to that with type "OTHER" or "IOT".
            # The schema has: POS_TERMINAL, KITCHEN_DISPLAY, WAITER_TABLET, KIOSK.
            # We might need to extend the enum later. For now, we'll upsert to a generic collection 'iot_devices'.

            for dev in devices:
                try:
                    await dev.async_update() # Get latest state
                    
                    # Extract Data
                    data = {
                        "organization_id": self.organization_id,
                        "provider": "MEROSS",
                        "external_id": dev.uuid,
                        "name": dev.name,
                        "type": dev.type,
                        "is_online": dev.online_status,
                        "last_synced_at": now,
                        "raw_data": {
                            "fw": dev.firmware_version,
                            "hw": dev.hardware_version
                        }
                    }
                    
                    if isinstance(dev, ToggleMixin):
                        data["is_on"] = dev.is_on()
                        
                    # Upsert to 'iot_devices' (Dynamic collection)
                    await db.iot_devices.update_one(
                        {"organization_id": self.organization_id, "external_id": dev.uuid},
                        {"$set": data},
                        upsert=True
                    )
                    processed += 1
                except Exception as e:
                    logger.error(f"[Meross] Device sync failed {dev.name}: {e}")
                    failed += 1

            return {"processed": processed, "failed": failed}

        except Exception as e:
            return {"processed": processed, "failed": failed, "error": str(e)}
        finally:
            if manager:
                manager.close()
            if http_api_client:
                await http_api_client.async_logout()

    async def execute_command(self, command: str, payload: Dict[str, Any]) -> bool:
        """
        Execute command: TOGGLE, ON, OFF
        Payload: {"uuid": "..."}
        """
        if not MEROSS_AVAILABLE:
            return False

        manager = None
        http_api_client = None
        
        try:
            target_uuid = payload.get("uuid")
            if not target_uuid:
                return False

            email = self.credentials.get("email")
            password = self.credentials.get("password")
            
            http_api_client = await MerossHttpClient.async_from_user_password(
                email=email, 
                password=password,
                api_base_url="https://iotx-eu.meross.com"
            )
            manager = MerossManager(http_client=http_api_client)
            await manager.async_init()
            await manager.async_device_discovery()
            
            devs = manager.find_devices(device_uuids=[target_uuid])
            if not devs:
                return False
                
            dev = devs[0]
            
            if command == "ON":
                await dev.async_turn_on(channel=0)
            elif command == "OFF":
                await dev.async_turn_off(channel=0)
            elif command == "TOGGLE":
                await dev.async_toggle(channel=0)
            else:
                return False
                
            return True

        except Exception as e:
            logger.error(f"[Meross] Command failed: {e}")
            return False
        finally:
            if manager:
                manager.close()
            if http_api_client:
                await http_api_client.async_logout()
