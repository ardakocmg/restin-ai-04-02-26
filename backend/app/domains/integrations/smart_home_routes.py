"""
Smart Home IoT API Routes
Device discovery and control via Meross Cloud.
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

logger = logging.getLogger(__name__)
router = APIRouter()

# Credentials (later: from DB IntegrationConfig)
MEROSS_EMAIL = "arda@marvingauci.com"
MEROSS_PASSWORD = "Mg2026"
MEROSS_API_BASE = "https://iotx-eu.meross.com"


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


def categorize_device(dev_type: str, dev_name: str) -> str:
    """Categorize device based on type string."""
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


@router.get("/devices")
async def list_devices():
    """Discover all Meross devices and return their status."""
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

        all_devs = manager.find_devices()
        results = []

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
            })

        return {
            "total": len(results),
            "online": sum(1 for d in results if d["online"]),
            "offline": sum(1 for d in results if not d["online"]),
            "devices": results,
        }

    except Exception as e:
        logger.error(f"[SmartHome] Device discovery failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if manager:
            manager.close()
        if http_client:
            try:
                await http_client.async_logout()
            except Exception:
                pass


@router.post("/devices/{device_uuid}/control")
async def control_device(device_uuid: str, req: DeviceControlRequest):
    """Send a control command to a specific device."""
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
        cmd = req.command.upper()

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

        return {"status": "ok", "uuid": device_uuid, "command": cmd}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[SmartHome] Control failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if manager:
            manager.close()
        if http_client:
            try:
                await http_client.async_logout()
            except Exception:
                pass
