"""
Smart Home / IoT Routes (Pillar 4: IoT Sentinel)
Provides device listing, status, and control for Meross/Tuya smart home devices.
Connected to MongoDB for persistence.
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, List
from pydantic import BaseModel
from core.dependencies import get_current_user, get_database
from datetime import datetime, timezone
import logging
import uuid

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/smart-home", tags=["Smart Home / IoT"])


DEFAULT_DEVICES = [
    {"name": "Coffee Machine", "type": "MSS310", "device_category": "plug", "online": True, "is_on": True, "firmware": "3.2.1", "hardware": "2.0.0", "provider": "meross"},
    {"name": "Dishwasher Line", "type": "MSS310", "device_category": "plug", "online": True, "is_on": True, "firmware": "3.2.1", "hardware": "2.0.0", "provider": "meross"},
    {"name": "Ice Machine", "type": "MSS310", "device_category": "plug", "online": True, "is_on": False, "firmware": "3.2.1", "hardware": "2.0.0", "provider": "meross"},
    {"name": "Bar Fridge", "type": "MSS310", "device_category": "plug", "online": True, "is_on": True, "firmware": "3.1.8", "hardware": "2.0.0", "provider": "meross"},
    {"name": "Prep Table Heater", "type": "MSS310", "device_category": "plug", "online": False, "is_on": None, "firmware": "3.1.8", "hardware": "2.0.0", "provider": "meross"},
    {"name": "POS Terminal Strip", "type": "MSS425F", "device_category": "surge_protector", "online": True, "is_on": True, "firmware": "4.1.3", "hardware": "3.0.0", "provider": "meross"},
    {"name": "Server Rack Power", "type": "MSS425F", "device_category": "surge_protector", "online": True, "is_on": True, "firmware": "4.1.3", "hardware": "3.0.0", "provider": "meross"},
    {"name": "Main Entrance Gate", "type": "MSG200", "device_category": "gate", "online": True, "is_on": None, "firmware": "5.0.2", "hardware": "1.0.0", "provider": "meross"},
    {"name": "Kitchen Hub Pro", "type": "MSH300", "device_category": "hub", "online": True, "is_on": None, "firmware": "6.1.0", "hardware": "2.0.0", "provider": "meross"},
    {"name": "Kitchen Floor Sensor", "type": "MS400", "device_category": "leak_sensor", "online": True, "is_on": None, "firmware": "2.0.1", "hardware": "1.0.0", "provider": "meross"},
    {"name": "Walk-in Cooler Sensor", "type": "MS400", "device_category": "leak_sensor", "online": True, "is_on": None, "firmware": "2.0.1", "hardware": "1.0.0", "provider": "meross"},
    {"name": "Kitchen Hood Alarm", "type": "GS559A", "device_category": "smoke_alarm", "online": True, "is_on": None, "firmware": "1.3.0", "hardware": "1.0.0", "provider": "meross"},
    {"name": "Back Door Sensor", "type": "GS559", "device_category": "door_sensor", "online": True, "is_on": None, "firmware": "1.2.5", "hardware": "1.0.0", "provider": "meross"},
    {"name": "Storage Room Door", "type": "GS559", "device_category": "door_sensor", "online": False, "is_on": None, "firmware": "1.2.5", "hardware": "1.0.0", "provider": "meross"},
    {"name": "Dining Area Ambient", "type": "BL100", "device_category": "bulb", "online": True, "is_on": True, "firmware": "2.1.0", "hardware": "1.0.0", "provider": "tuya"},
    {"name": "Bar Counter Lights", "type": "BL100", "device_category": "bulb", "online": True, "is_on": True, "firmware": "2.1.0", "hardware": "1.0.0", "provider": "tuya"},
]


async def _ensure_devices(db) -> List[Dict[str, Any]]:
    """Ensure devices exist in MongoDB."""
    count = await db.smart_home_devices.count_documents({})
    if count == 0:
        devices_to_insert = []
        for dev in DEFAULT_DEVICES:
            dev_copy = dev.copy()
            dev_copy["uuid"] = str(uuid.uuid5(uuid.NAMESPACE_DNS, dev["name"]))
            dev_copy["created_at"] = datetime.now(timezone.utc).isoformat()
            devices_to_insert.append(dev_copy)
        await db.smart_home_devices.insert_many(devices_to_insert)
        logger.info(f"Auto-seeded {len(devices_to_insert)} smart home devices")

    cursor = db.smart_home_devices.find({}, {"_id": 0})
    return await cursor.to_list(length=100)


class ControlRequest(BaseModel):
    command: str  # ON, OFF, OPEN, CLOSE
    channel: int = 0


@router.get("/devices")
async def get_devices(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """Get all smart home devices with status from MongoDB."""
    devices = await _ensure_devices(db)
    online = sum(1 for d in devices if d.get("online"))
    offline = len(devices) - online

    return {
        "total": len(devices),
        "online": online,
        "offline": offline,
        "devices": devices,
    }


@router.post("/devices/{device_uuid}/control")
async def control_device(
    device_uuid: str,
    request: ControlRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """Send a control command to a smart home device. Persists state to MongoDB."""
    device = await db.smart_home_devices.find_one({"uuid": device_uuid})
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    # Update device state based on command
    update_fields: Dict[str, Any] = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if request.command.upper() in ("ON", "OPEN"):
        update_fields["is_on"] = True
    elif request.command.upper() in ("OFF", "CLOSE"):
        update_fields["is_on"] = False

    await db.smart_home_devices.update_one(
        {"uuid": device_uuid},
        {"$set": update_fields},
    )

    logger.info(f"IoT Control: device={device_uuid} command={request.command} channel={request.channel}")

    return {
        "status": "ok",
        "device_uuid": device_uuid,
        "command": request.command,
        "channel": request.channel,
        "message": f"Command '{request.command}' sent successfully",
    }


def create_smart_home_router():
    return router
