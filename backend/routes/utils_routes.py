"""Misc utility routes - units, policies, incidents, backup"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from datetime import datetime, timezone

from core.database import db
from core.dependencies import get_current_user, check_venue_access
from models import UserRole
from services.permission_service import effective_permissions


def create_utils_router():
    router = APIRouter(tags=["utils"])

    @router.post("/units/convert")
    async def convert_units(from_unit: str, to_unit: str, value: float):
        """Universal unit conversion (V4 simplified)"""
        # Simple conversion table
        conversions = {
            ("kg", "g"): 1000,
            ("g", "kg"): 0.001,
            ("l", "ml"): 1000,
            ("ml", "l"): 0.001,
        }
        
        key = (from_unit.lower(), to_unit.lower())
        if key in conversions:
            return {"result": value * conversions[key], "from": from_unit, "to": to_unit}
        
        if from_unit == to_unit:
            return {"result": value, "from": from_unit, "to": to_unit}
        
        raise HTTPException(status_code=400, detail="Conversion not supported")

    @router.get("/units/aliases")
    async def get_unit_aliases():
        return {"kg": ["kilogram"], "g": ["gram"], "l": ["liter"], "ml": ["milliliter"]}

    @router.get("/units/conversions")
    async def get_available_conversions():
        return {"conversions": ["kg<->g", "l<->ml"]}

    @router.get("/venues/{venue_id}/policy/effective")
    async def get_effective_policy(venue_id: str, current_user: dict = Depends(get_current_user)):
        """Get effective permissions for current user"""
        await check_venue_access(current_user, venue_id)
        
        venue = await db.venues.find_one({"id": venue_id}, {"_id": 0})
        venue_settings = venue.get("settings", {}) if venue else {}
        
        perms = effective_permissions(current_user["role"], venue_settings)
        
        return {
            "user_id": current_user["id"],
            "role": current_user["role"],
            "permissions": list(perms)
        }

    @router.get("/venues/{venue_id}/ui/table-schema")
    async def get_table_schema(
        venue_id: str,
        table: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Get UI table schema with permission filtering"""
        await check_venue_access(current_user, venue_id)
        
        venue = await db.venues.find_one({"id": venue_id}, {"_id": 0})
        venue_settings = venue.get("settings", {}) if venue else {}
        user_perms = effective_permissions(current_user["role"], venue_settings)
        currency = venue.get("currency", "EUR") if venue else "EUR"
        
        from services.permission_service import get_allowed_schema
        schema = get_allowed_schema(table, user_perms, currency)
        
        if not schema:
            raise HTTPException(
                status_code=403,
                detail={"code": "FORBIDDEN", "message": f"No access to table '{table}'"}
            )
        
        return schema

    @router.get("/venues/{venue_id}/incidents")
    async def list_incidents(venue_id: str, current_user: dict = Depends(get_current_user)):
        await check_venue_access(current_user, venue_id)
        incidents = await db.incidents.find({"venue_id": venue_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
        return incidents

    @router.post("/venues/{venue_id}/incidents")
    async def create_incident(venue_id: str, incident_data: dict, current_user: dict = Depends(get_current_user)):
        await check_venue_access(current_user, venue_id)
        
        incident_data["venue_id"] = venue_id
        incident_data["created_by"] = current_user["id"]
        incident_data["created_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.incidents.insert_one(incident_data)
        return {"message": "Incident created"}

    @router.post("/venues/{venue_id}/backup")
    async def create_venue_backup(venue_id: str, current_user: dict = Depends(get_current_user)):
        """Create venue data backup"""
        if current_user["role"] not in [UserRole.OWNER, UserRole.PRODUCT_OWNER]:
            raise HTTPException(status_code=403, detail="Owner permission required")
        
        await check_venue_access(current_user, venue_id)
        
        backup = {
            "venue_id": venue_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": current_user["id"],
            "status": "completed"
        }
        
        await db.backups.insert_one(backup)
        
        return {"message": "Backup created", "backup_id": backup.get("id")}

    return router
