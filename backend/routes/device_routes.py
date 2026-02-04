"""Device routes - device binding, printer mapping, station management"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from datetime import datetime, timezone

from core.database import db
from core.dependencies import get_current_user, check_venue_access


def create_device_router():
    router = APIRouter(tags=["devices"])

    @router.post("/device-hub/devices")
    async def register_device(device_data: dict, current_user: dict = Depends(get_current_user)):
        """Register a new device"""
        venue_id = device_data.get("venue_id")
        if venue_id:
            await check_venue_access(current_user, venue_id)
        
        device_data["created_at"] = datetime.now(timezone.utc).isoformat()
        device_data["created_by"] = current_user["id"]
        
        await db.devices.insert_one(device_data)
        return {"message": "Device registered", "device_id": device_data.get("id")}

    @router.get("/venues/{venue_id}/devices")
    async def list_devices(venue_id: str, current_user: dict = Depends(get_current_user)):
        """List all devices for a venue"""
        await check_venue_access(current_user, venue_id)
        devices = await db.devices.find({"venue_id": venue_id}, {"_id": 0}).to_list(100)
        return devices

    @router.post("/device-hub/printer-mapping")
    async def create_printer_mapping(mapping: dict, current_user: dict = Depends(get_current_user)):
        """Map a device to printers"""
        venue_id = mapping.get("venue_id")
        if venue_id:
            await check_venue_access(current_user, venue_id)
        
        mapping["created_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.device_printer_mappings.insert_one(mapping)
        return {"message": "Printer mapping created"}

    @router.post("/devices/bind")
    async def bind_device(bind_req: dict, current_user: dict = Depends(get_current_user)):
        """Bind device to venue and station"""
        venue_id = bind_req.get("venue_id")
        device_id = bind_req.get("device_id")
        station = bind_req.get("station")
        station_name = bind_req.get("station_name")
        
        await check_venue_access(current_user, venue_id)
        
        device = await db.devices.find_one({"device_id": device_id}, {"_id": 0})
        
        if device:
            await db.devices.update_one(
                {"device_id": device_id},
                {"$set": {
                    "venue_id": venue_id,
                    "station": station,
                    "station_name": station_name,
                    "bound_at": datetime.now(timezone.utc).isoformat(),
                    "bound_by": current_user["id"]
                }}
            )
        else:
            new_device = {
                "device_id": device_id,
                "venue_id": venue_id,
                "station": station,
                "station_name": station_name,
                "bound_at": datetime.now(timezone.utc).isoformat(),
                "bound_by": current_user["id"]
            }
            await db.devices.insert_one(new_device)
        
        return {
            "message": "Device bound successfully",
            "device_id": device_id,
            "venue_id": venue_id,
            "station": station
        }

    @router.get("/devices/{device_id}/binding")
    async def get_device_binding(device_id: str):
        """Get device binding info"""
        device = await db.devices.find_one({"device_id": device_id}, {"_id": 0})
        
        if not device:
            return {
                "bound": False,
                "device_id": device_id,
                "message": "Device not bound"
            }
        
        return {
            "bound": True,
            "device_id": device_id,
            "venue_id": device.get("venue_id"),
            "station": device.get("station"),
            "station_name": device.get("station_name"),
            "bound_at": device.get("bound_at")
        }

    @router.patch("/devices/{device_id}/station")
    async def update_device_station(
        device_id: str,
        station: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Update device station"""
        device = await db.devices.find_one({"device_id": device_id}, {"_id": 0})
        if not device:
            raise HTTPException(status_code=404, detail="Device not found")
        
        if device.get("venue_id"):
            await check_venue_access(current_user, device["venue_id"])
        
        await db.devices.update_one(
            {"device_id": device_id},
            {"$set": {"station": station}}
        )
        
        return {"message": "Device station updated", "device_id": device_id, "station": station}

    @router.post("/device-hub/punch")
    async def receive_device_punch(punch_data: dict):
        """
        Receive raw punch data from physical terminals (FaceID, Fingerprint, Card Readers).
        Hardware terminals should POST to this endpoint.
        """
        # Logic to match card number to user and log attendance
        print(f"Received punch from device {punch_data.get('device_id')}: {punch_data}")
        
        # Save to raw logs
        punch_data["received_at"] = datetime.now(timezone.utc).isoformat()
        await db.device_logs.insert_one(punch_data)
        
        return {"status": "success", "message": "Punch recorded", "server_time": punch_data["received_at"]}

    return router
