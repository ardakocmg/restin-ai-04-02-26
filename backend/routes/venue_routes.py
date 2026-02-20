"""Venue routes - venues, zones, tables, users"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional

from core.database import db
from core.dependencies import get_current_user, check_venue_access
from core.security import hash_pin
from models import Venue, VenueCreate, Zone, ZoneCreate, Table, TableCreate, User, UserCreate, UserRole
from services.audit_service import create_audit_log
from services.settings_service import DEFAULT_VENUE_SETTINGS


def create_venue_router():
    router = APIRouter(tags=["venues"])

    # ==================== VENUE ENDPOINTS ====================
    @router.get("/venues", response_model=List[Venue])
    async def list_venues():
        venues = await db.venues.find({}, {"_id": 0}).to_list(100)
        return venues

    @router.get("/venues/{venue_id}")
    async def get_venue(venue_id: str):
        venue = await db.venues.find_one({"id": venue_id}, {"_id": 0})
        if not venue:
            raise HTTPException(status_code=404, detail="Venue not found")
        return venue

    @router.get("/venues/{venue_id}/orders")
    async def list_venue_orders(
        venue_id: str,
        status: Optional[str] = None,
        table_id: Optional[str] = None,
        current_user: dict = Depends(get_current_user)
    ):
        """List orders for a venue, optionally filtered by status and table_id"""
        query = {"venue_id": venue_id}
        if status:
            query["status"] = status.upper()
        if table_id:
            query["table_id"] = table_id
        
        orders = await db.pos_orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
        return orders

    @router.post("/venues", response_model=Venue)
    async def create_venue(data: VenueCreate, current_user: dict = Depends(get_current_user)):
        if current_user["role"] != UserRole.OWNER:
            raise HTTPException(status_code=403, detail="Only owners can create venues")
        
        venue = Venue(**data.model_dump())
        await db.venues.insert_one(venue.model_dump())
        
        await create_audit_log(
            venue.id, current_user["id"], current_user["name"],
            "create", "venue", venue.id, {"name": venue.name}
        )
        
        return venue

    @router.put("/venues/{venue_id}")
    async def update_venue(venue_id: str, data: dict, current_user: dict = Depends(get_current_user)):
        if current_user["role"] not in [UserRole.OWNER, UserRole.MANAGER]:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        result = await db.venues.update_one({"id": venue_id}, {"$set": data})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Venue not found")
        
        await create_audit_log(
            venue_id, current_user["id"], current_user["name"],
            "update", "venue", venue_id, data
        )
        
        return {"message": "Venue updated"}

    @router.patch("/venues/{venue_id}/settings")
    async def update_venue_settings(venue_id: str, settings_update: dict, current_user: dict = Depends(get_current_user)):
        """Update venue settings (MEGA PATCH: Merge settings)"""
        if current_user["role"] not in [UserRole.OWNER, UserRole.GENERAL_MANAGER, UserRole.MANAGER]:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        venue = await db.venues.find_one({"id": venue_id}, {"_id": 0})
        if not venue:
            raise HTTPException(status_code=404, detail="Venue not found")
        
        # Deep merge with defaults
        current_settings = venue.get("settings", DEFAULT_VENUE_SETTINGS.copy())
        
        def deep_merge(base, update):
            """Recursively merge update into base"""
            for key, value in update.items():
                if key in base and isinstance(base[key], dict) and isinstance(value, dict):
                    deep_merge(base[key], value)
                else:
                    base[key] = value
            return base
        
        merged_settings = deep_merge(current_settings, settings_update)
        
        await db.venues.update_one(
            {"id": venue_id},
            {"$set": {"settings": merged_settings}}
        )
        
        await create_audit_log(
            venue_id, current_user["id"], current_user["name"],
            "update_settings", "venue", venue_id, settings_update
        )
        
        return {"message": "Settings updated", "settings": merged_settings}

    @router.get("/venues/{venue_id}/settings")
    async def get_venue_settings(venue_id: str, current_user: dict = Depends(get_current_user)):
        """Get venue settings with defaults (MEGA PATCH)"""
        venue = await db.venues.find_one({"id": venue_id}, {"_id": 0})
        if not venue:
            raise HTTPException(status_code=404, detail="Venue not found")
        
        await check_venue_access(current_user, venue_id)
        
        # Return settings merged with defaults
        settings = venue.get("settings", {})
        
        # Deep merge defaults
        def deep_merge(base, update):
            result = base.copy()
            for key, value in update.items():
                if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                    result[key] = deep_merge(result[key], value)
                elif key not in result:
                    result[key] = value
            return result
        
        merged = deep_merge(DEFAULT_VENUE_SETTINGS, settings)
        return {"settings": merged}

    @router.get("/venues/{venue_id}/active-floor-plan")
    async def get_active_floor_plan(venue_id: str):
        """Get active floor plan for a venue (used by POS)"""
        floor_plan = await db.floor_plans.find_one(
            {"venue_id": venue_id, "is_active": True},
            {"_id": 0}
        )
        if not floor_plan:
            # Return empty floor plan structure instead of 404
            return {
                "venue_id": venue_id,
                "zones": [],
                "tables": [],
                "is_active": False
            }
        return floor_plan

    @router.get("/venues/{venue_id}/active-config-version")
    async def get_active_config_version(venue_id: str):
        """Get current config version for cache invalidation"""
        venue = await db.venues.find_one({"id": venue_id}, {"_id": 0})
        if not venue:
            raise HTTPException(status_code=404, detail="Venue not found")
        return {
            "menu_version": venue.get("menu_version", 0),
            "config_version": venue.get("config_version", 0)
        }

    @router.get("/venues/{venue_id}/metrics")
    async def get_venue_metrics(venue_id: str):
        """Get venue metrics for observability dashboard"""
        venue = await db.venues.find_one({"id": venue_id}, {"_id": 0})
        if not venue:
            raise HTTPException(status_code=404, detail="Venue not found")
        
        # Get basic counts
        orders_count = await db.orders.count_documents({"venue_id": venue_id})
        tables_count = await db.tables.count_documents({"venue_id": venue_id})
        users_count = await db.users.count_documents({"venue_id": venue_id})
        
        return {
            "venue_id": venue_id,
            "orders_total": orders_count,
            "tables_total": tables_count,
            "users_total": users_count,
            "uptime_seconds": 0,
            "requests_today": 0,
            "errors_today": 0
        }

    # ==================== AUDIT LOG ENDPOINTS ====================
    @router.get("/venues/{venue_id}/audit-logs")
    async def get_venue_audit_logs(
        venue_id: str,
        limit: int = 50,
        action: Optional[str] = None,
    ):
        """Get audit logs for a venue."""
        query = {"venue_id": venue_id}
        if action:
            query["action"] = action
        logs = await db.audit_logs.find(query, {"_id": 0}).sort("timestamp", -1).to_list(length=limit)
        return logs

    @router.post("/venues/{venue_id}/audit-logs")
    async def create_venue_audit_log(venue_id: str, entry: dict):
        """Create a new audit log entry from the frontend useAuditLog hook."""
        from datetime import datetime, timezone
        data = {
            **entry,
            "venue_id": venue_id,
            "timestamp": entry.get("timestamp", datetime.now(timezone.utc).isoformat()),
        }
        await db.audit_logs.insert_one(data)
        return {"status": "ok"}

    @router.get("/venues/{venue_id}/audit-logs/export")
    async def export_venue_audit_logs(venue_id: str):
        """Export audit logs for a venue."""
        logs = await db.audit_logs.find({"venue_id": venue_id}, {"_id": 0}).sort("timestamp", -1).to_list(length=50)
        return {"venue_id": venue_id, "logs": logs, "count": len(logs)}

    # ==================== ZONE ENDPOINTS ====================
    @router.get("/venues/{venue_id}/zones", response_model=List[Zone])
    async def list_zones(venue_id: str):
        zones = await db.zones.find({"venue_id": venue_id}, {"_id": 0}).to_list(100)
        return zones

    @router.post("/zones", response_model=Zone)
    async def create_zone(data: ZoneCreate, current_user: dict = Depends(get_current_user)):
        await check_venue_access(current_user, data.venue_id)
        
        zone = Zone(**data.model_dump())
        await db.zones.insert_one(zone.model_dump())
        
        await create_audit_log(
            data.venue_id, current_user["id"], current_user["name"],
            "create", "zone", zone.id, {"name": zone.name}
        )
        
        return zone

    # ==================== TABLE ENDPOINTS ====================
    @router.get("/venues/{venue_id}/tables", response_model=List[Table])
    async def list_tables(venue_id: str):
        tables = await db.tables.find({"venue_id": venue_id}, {"_id": 0}).to_list(200)
        return tables

    @router.post("/tables", response_model=Table)
    async def create_table(data: TableCreate, current_user: dict = Depends(get_current_user)):
        await check_venue_access(current_user, data.venue_id)
        
        table = Table(**data.model_dump())
        await db.tables.insert_one(table.model_dump())
        
        await create_audit_log(
            data.venue_id, current_user["id"], current_user["name"],
            "create", "table", table.id, {"name": table.name}
        )
        
        return table

    @router.put("/tables/{table_id}")
    async def update_table(table_id: str, data: dict, current_user: dict = Depends(get_current_user)):
        table = await db.tables.find_one({"id": table_id}, {"_id": 0})
        if not table:
            raise HTTPException(status_code=404, detail="Table not found")
        
        await check_venue_access(current_user, table["venue_id"])
        
        await db.tables.update_one({"id": table_id}, {"$set": data})
        
        await create_audit_log(
            table["venue_id"], current_user["id"], current_user["name"],
            "update", "table", table_id, data
        )
        
        return {"message": "Table updated"}

    # ==================== USER ENDPOINTS ====================
    @router.get("/venues/{venue_id}/users")
    async def list_users(venue_id: str, current_user: dict = Depends(get_current_user)):
        await check_venue_access(current_user, venue_id)
        users = await db.users.find(
            {"venue_id": venue_id}, 
            {"_id": 0, "pin_hash": 0, "mfa_secret": 0}
        ).to_list(200)
        return users

    @router.post("/users")
    async def create_user(data: UserCreate, current_user: dict = Depends(get_current_user)):
        await check_venue_access(current_user, data.venue_id)
        
        if current_user["role"] not in [UserRole.OWNER, UserRole.MANAGER]:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        user_dict = data.model_dump()
        user_dict["pin_hash"] = hash_pin(user_dict.pop("pin"))
        user = User(**user_dict)
        
        await db.users.insert_one(user.model_dump())
        
        await create_audit_log(
            data.venue_id, current_user["id"], current_user["name"],
            "create", "user", user.id, {"name": user.name, "role": user.role}
        )
        
        return {"id": user.id, "name": user.name, "role": user.role}

    return router
