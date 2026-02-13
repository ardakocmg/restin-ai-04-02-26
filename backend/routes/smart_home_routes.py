"""
Smart Home / IoT Routes (Pillar 4: IoT Sentinel)
Provides device listing, status, and control for Meross/Tuya smart home devices.
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from core.dependencies import get_current_user
import logging
import random
import uuid

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/smart-home", tags=["Smart Home / IoT"])


# ─── Mock Device Data ────────────────────────────────────────────────────
def _generate_devices() -> List[Dict[str, Any]]:
    """Generate realistic smart home device inventory."""
    devices = [
        # Smart Plugs (Kitchen Equipment)
        {"name": "Coffee Machine", "type": "MSS310", "device_category": "plug", "online": True, "is_on": True, "firmware": "3.2.1", "hardware": "2.0.0", "provider": "meross"},
        {"name": "Dishwasher Line", "type": "MSS310", "device_category": "plug", "online": True, "is_on": True, "firmware": "3.2.1", "hardware": "2.0.0", "provider": "meross"},
        {"name": "Ice Machine", "type": "MSS310", "device_category": "plug", "online": True, "is_on": False, "firmware": "3.2.1", "hardware": "2.0.0", "provider": "meross"},
        {"name": "Bar Fridge", "type": "MSS310", "device_category": "plug", "online": True, "is_on": True, "firmware": "3.1.8", "hardware": "2.0.0", "provider": "meross"},
        {"name": "Prep Table Heater", "type": "MSS310", "device_category": "plug", "online": False, "is_on": None, "firmware": "3.1.8", "hardware": "2.0.0", "provider": "meross"},
        # Surge Protectors
        {"name": "POS Terminal Strip", "type": "MSS425F", "device_category": "surge_protector", "online": True, "is_on": True, "firmware": "4.1.3", "hardware": "3.0.0", "provider": "meross"},
        {"name": "Server Rack Power", "type": "MSS425F", "device_category": "surge_protector", "online": True, "is_on": True, "firmware": "4.1.3", "hardware": "3.0.0", "provider": "meross"},
        # Smart Gate
        {"name": "Main Entrance Gate", "type": "MSG200", "device_category": "gate", "online": True, "is_on": None, "firmware": "5.0.2", "hardware": "1.0.0", "provider": "meross"},
        # Hub
        {"name": "Kitchen Hub Pro", "type": "MSH300", "device_category": "hub", "online": True, "is_on": None, "firmware": "6.1.0", "hardware": "2.0.0", "provider": "meross"},
        # Sensors
        {"name": "Kitchen Floor Sensor", "type": "MS400", "device_category": "leak_sensor", "online": True, "is_on": None, "firmware": "2.0.1", "hardware": "1.0.0", "provider": "meross"},
        {"name": "Walk-in Cooler Sensor", "type": "MS400", "device_category": "leak_sensor", "online": True, "is_on": None, "firmware": "2.0.1", "hardware": "1.0.0", "provider": "meross"},
        {"name": "Kitchen Hood Alarm", "type": "GS559A", "device_category": "smoke_alarm", "online": True, "is_on": None, "firmware": "1.3.0", "hardware": "1.0.0", "provider": "meross"},
        {"name": "Back Door Sensor", "type": "GS559", "device_category": "door_sensor", "online": True, "is_on": None, "firmware": "1.2.5", "hardware": "1.0.0", "provider": "meross"},
        {"name": "Storage Room Door", "type": "GS559", "device_category": "door_sensor", "online": False, "is_on": None, "firmware": "1.2.5", "hardware": "1.0.0", "provider": "meross"},
        # Tuya Smart Bulbs
        {"name": "Dining Area Ambient", "type": "BL100", "device_category": "bulb", "online": True, "is_on": True, "firmware": "2.1.0", "hardware": "1.0.0", "provider": "tuya"},
        {"name": "Bar Counter Lights", "type": "BL100", "device_category": "bulb", "online": True, "is_on": True, "firmware": "2.1.0", "hardware": "1.0.0", "provider": "tuya"},
    ]

    # Assign UUIDs
    for dev in devices:
        dev["uuid"] = str(uuid.uuid5(uuid.NAMESPACE_DNS, dev["name"]))

    return devices


class ControlRequest(BaseModel):
    command: str  # ON, OFF, OPEN, CLOSE
    channel: int = 0


@router.get("/devices")
async def get_devices(
    current_user: dict = Depends(get_current_user),
):
    """Get all smart home devices with status."""
    devices = _generate_devices()
    online = sum(1 for d in devices if d["online"])
    offline = len(devices) - online

    return {
        "total": len(devices),
        "online": online,
        "offline": offline,
        "devices": devices
    }


@router.post("/devices/{device_uuid}/control")
async def control_device(
    device_uuid: str,
    request: ControlRequest,
    current_user: dict = Depends(get_current_user),
):
    """Send a control command to a smart home device."""
    logger.info(f"IoT Control: device={device_uuid} command={request.command} channel={request.channel}")

    # In production, this would interface with Meross/Tuya cloud APIs
    # For now, acknowledge the command
    return {
        "status": "ok",
        "device_uuid": device_uuid,
        "command": request.command,
        "channel": request.channel,
        "message": f"Command '{request.command}' sent successfully"
    }


def create_smart_home_router():
    return router
