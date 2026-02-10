"""
Smart Home IoT API Routes
Multi-provider device discovery and control (Meross Cloud + Tuya DB).
"""
import asyncio
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

# DNS Fix: Patch aiohttp to use ThreadedResolver (OS DNS) instead of AsyncResolver (pycares)
# pycares fails on Windows. This MUST happen before meross_iot is imported.
import aiohttp
import aiohttp.resolver
aiohttp.resolver.AsyncResolver = aiohttp.resolver.ThreadedResolver
aiohttp.DefaultResolver = aiohttp.resolver.ThreadedResolver

from meross_iot.http_api import MerossHttpClient
from meross_iot.manager import MerossManager
from meross_iot.controller.mixins.toggle import ToggleMixin
from meross_iot.controller.mixins.light import LightMixin
from meross_iot.controller.mixins.garage import GarageOpenerMixin

from app.core.database import get_database

logger = logging.getLogger(__name__)
router = APIRouter()

# Credentials (later: from DB IntegrationConfig)
MEROSS_EMAIL = "arda@marvingauci.com"
MEROSS_PASSWORD = "Mg2026"
MEROSS_API_BASE = "https://iotx-eu.meross.com"


# ─── Tuya Category Mapping (Tuya uses short codes) ─────────────────────
TUYA_CATEGORY_MAP = {
    "cz": "plug",          # Socket / Plug
    "pc": "plug",          # Power strip
    "kg": "plug",          # Switch
    "dj": "bulb",          # Light
    "dd": "bulb",          # Strip light
    "dc": "bulb",          # String light
    "ckmkz": "gate",       # Garage door opener
    "clkg": "plug",        # Curtain switch
    "wsdcg": "leak_sensor",# Temp & Humidity sensor
    "ywbj": "smoke_alarm", # Smoke alarm
    "rqbj": "smoke_alarm", # Gas alarm
    "mcs": "door_sensor",  # Door / window sensor
    "sj": "leak_sensor",   # Water leak sensor
    "wk": "plug",          # Thermostat
}


class DeviceControlRequest(BaseModel):
    command: str  # ON, OFF, TOGGLE, OPEN, CLOSE
    channel: int = 0


class DeviceResponse(BaseModel):
    name: str
    uuid: str
    type: str
    online: bool
    is_on: Optional[bool] = None
    firmware: Optional[str] = None
    hardware: Optional[str] = None
    device_category: str = "unknown"  # plug, gate, hub, sensor, bulb, surge
    provider: str = "meross"  # meross | tuya


def categorize_device(dev_type: str, dev_name: str) -> str:
    """Categorize Meross device based on type string."""
    t = dev_type.lower() if dev_type else ""
    n = dev_name.lower() if dev_name else ""
    if "msg" in t or "gate" in n or "garage" in n:
        return "gate"
    if "msh" in t or "hub" in n:
        return "hub"
    if "ms200" in t:
        return "door_sensor"
    if "ms400" in t or "leak" in n:
        return "leak_sensor"
    if "gs559" in t or "smoke" in n:
        return "smoke_alarm"
    if "mss425" in t or "surge" in n or "protector" in n:
        return "surge_protector"
    if "mss" in t or "plug" in n:
        return "plug"
    if "msl" in t or "bulb" in n or "led" in n:
        return "bulb"
    return "unknown"


def categorize_tuya(category_code: str, name: str) -> str:
    """Categorize Tuya device using official Tuya category codes."""
    if category_code and category_code in TUYA_CATEGORY_MAP:
        return TUYA_CATEGORY_MAP[category_code]
    # Fallback: name-based
    n = (name or "").lower()
    if "light" in n or "bulb" in n or "lamp" in n:
        return "bulb"
    if "plug" in n or "socket" in n:
        return "plug"
    if "gate" in n or "garage" in n or "door" in n:
        return "gate"
    if "leak" in n or "water" in n:
        return "leak_sensor"
    if "smoke" in n:
        return "smoke_alarm"
    return "plug"


async def load_tuya_devices() -> list:
    """Load Tuya devices from the iot_devices collection (synced by TuyaConnector)."""
    try:
        db = get_database()
        cursor = db.iot_devices.find({"provider": "TUYA"})
        devices = await cursor.to_list(length=200)

        results = []
        for doc in devices:
            name = doc.get("name", "Tuya Device")
            ext_id = doc.get("external_id", "")
            dev_type = doc.get("type", "unknown")
            is_online = doc.get("is_online", False)
            is_on = doc.get("is_on", None)
            category = categorize_tuya(dev_type, name)

            results.append({
                "name": name,
                "uuid": f"tuya_{ext_id}",
                "type": dev_type,
                "online": bool(is_online),
                "is_on": is_on,
                "firmware": None,
                "hardware": None,
                "device_category": category,
                "provider": "tuya",
            })
        return results
    except Exception as e:
        logger.error(f"[SmartHome] Tuya DB load failed: {e}")
        return []


@router.get("/devices")
async def list_devices():
    """Discover all Smart Home devices from Meross Cloud + Tuya DB."""
    manager = None
    http_client = None
    results = []

    # 1) Load Tuya devices from DB (fast, non-blocking)
    tuya_devices = await load_tuya_devices()
    results.extend(tuya_devices)

    # 2) Load Meross devices live from Cloud
    try:
        http_client = await MerossHttpClient.async_from_user_password(
            email=MEROSS_EMAIL,
            password=MEROSS_PASSWORD,
            api_base_url=MEROSS_API_BASE,
        )
        manager = MerossManager(http_client=http_client)
        await manager.async_init()
        await manager.async_device_discovery()

        all_devs = manager.find_devices()

        for dev in all_devs:
            name = dev.name
            uuid_str = dev.uuid
            dev_type = dev.type or "unknown"
            online = bool(dev.online_status)
            fw = getattr(dev, "firmware_version", None)
            hw = getattr(dev, "hardware_version", None)
            category = categorize_device(dev_type, name)

            is_on = None
            if isinstance(dev, ToggleMixin) and online:
                try:
                    await dev.async_update()
                    is_on = dev.is_on()
                except Exception:
                    pass

            results.append({
                "name": name,
                "uuid": uuid_str,
                "type": dev_type,
                "online": online,
                "is_on": is_on,
                "firmware": fw,
                "hardware": hw,
                "device_category": category,
                "provider": "meross",
            })

    except Exception as e:
        logger.error(f"[SmartHome] Meross discovery failed: {e}")
        # Non-fatal: Tuya devices still returned even if Meross cloud fails
    finally:
        if manager:
            manager.close()
        if http_client:
            try:
                await http_client.async_logout()
            except Exception:
                pass

    # 3) Return combined results
    return {
        "total": len(results),
        "online": sum(1 for d in results if d["online"]),
        "offline": sum(1 for d in results if not d["online"]),
        "devices": results,
    }

@router.post("/devices/{device_uuid}/control")
async def control_device(device_uuid: str, req: DeviceControlRequest):
    """Send a control command to a specific device (Meross or Tuya)."""
    cmd = req.command.upper()

    # ─── Tuya Devices (uuid starts with "tuya_") ────────────────
    if device_uuid.startswith("tuya_"):
        real_id = device_uuid[5:]  # Strip "tuya_" prefix
        try:
            from app.domains.integrations.connectors.tuya import TuyaConnector
            db = get_database()
            # Find the integration config for Tuya
            config = await db.integration_configs.find_one({"provider": "TUYA"})
            if not config:
                raise HTTPException(status_code=400, detail="Tuya integration not configured")
            
            connector = TuyaConnector(
                organization_id=config.get("organization_id", ""),
                credentials=config.get("credentials", {})
            )
            
            payload = {"device_id": real_id}
            if cmd in ["ON", "OFF"]:
                payload["commands"] = [{"code": "switch_1", "value": cmd == "ON"}]
            else:
                raise HTTPException(status_code=400, detail=f"Command '{cmd}' not supported for Tuya devices")

            success = await connector.execute_command(cmd, payload)
            if not success:
                raise HTTPException(status_code=500, detail="Tuya command execution failed")
            
            return {"status": "ok", "uuid": device_uuid, "command": cmd, "provider": "tuya"}
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"[SmartHome] Tuya control failed: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    # ─── Meross Devices ─────────────────────────────────────────
    manager = None
    http_client = None
    try:
        http_client = await MerossHttpClient.async_from_user_password(
            email=MEROSS_EMAIL,
            password=MEROSS_PASSWORD,
            api_base_url=MEROSS_API_BASE,
        )
        manager = MerossManager(http_client=http_client)
        await manager.async_init()
        await manager.async_device_discovery()

        devs = manager.find_devices(device_uuids=[device_uuid])
        if not devs:
            raise HTTPException(status_code=404, detail="Device not found")

        dev = devs[0]

        if cmd == "ON" and isinstance(dev, ToggleMixin):
            await dev.async_turn_on(channel=req.channel)
        elif cmd == "OFF" and isinstance(dev, ToggleMixin):
            await dev.async_turn_off(channel=req.channel)
        elif cmd == "TOGGLE" and isinstance(dev, ToggleMixin):
            await dev.async_toggle(channel=req.channel)
        elif cmd == "OPEN" and isinstance(dev, GarageOpenerMixin):
            await dev.async_open(channel=req.channel)
        elif cmd == "CLOSE" and isinstance(dev, GarageOpenerMixin):
            await dev.async_close(channel=req.channel)
        else:
            raise HTTPException(status_code=400, detail=f"Command '{cmd}' not supported for this device type")

        return {"status": "ok", "uuid": device_uuid, "command": cmd, "provider": "meross"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[SmartHome] Meross control failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if manager:
            manager.close()
        if http_client:
            try:
                await http_client.async_logout()
            except Exception:
                pass

