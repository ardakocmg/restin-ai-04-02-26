"""System routes - health, version, modules, search, logs"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from datetime import datetime, timezone
import os

from core.database import db
from core.dependencies import get_current_user
from models import UserRole
from services.settings_service import MODULE_REGISTRY
from utils.helpers import log_event


def create_system_router():
    router = APIRouter(tags=["system"])

    @router.get("/")
    async def root():
        return {"message": "restin.ai API v1.0.0"}

    @router.get("/health")
    async def health():
        return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

    @router.get("/health/diagnostic-error")
    async def diagnostic_error(current_user: dict = Depends(get_current_user)):
        raise HTTPException(
            status_code=404,
            detail={"code": "DIAGNOSTIC_NOT_FOUND", "message": "Diagnostic error for observability testing"}
        )

    @router.get("/system/version")
    async def get_system_version():
        """Get resolved system version (server-authoritative)"""
        # Try system_meta collection
        system_meta = await db.system_meta.find_one({"key": "system_version"}, {"_id": 0})
        
        if system_meta:
            return {
                "version_name": system_meta.get("version_name", "restin.ai v1.0.0"),
                "version_code": system_meta.get("version_code", "1.0.0"),
                "release_channel": system_meta.get("release_channel", "prod"),
                "build_id": system_meta.get("build_id", os.getenv("BUILD_ID", "dev")),
                "git_sha": system_meta.get("git_sha", os.getenv("GIT_SHA", "local")),
                "built_at": system_meta.get("built_at", datetime.now(timezone.utc).isoformat()),
                "source": "system_meta"
            }
        
        # Fallback to env defaults
        return {
            "version_name": os.getenv("VERSION_NAME", "restin.ai v1.0.0"),
            "version_code": os.getenv("VERSION_CODE", "1.0.0"),
            "release_channel": os.getenv("RELEASE_CHANNEL", "dev"),
            "build_id": os.getenv("BUILD_ID", "local"),
            "git_sha": os.getenv("GIT_SHA", "uncommitted"),
            "built_at": datetime.now(timezone.utc).isoformat(),
            "source": "env_defaults"
        }

    @router.patch("/system/version")
    async def update_system_version(payload: dict, current_user: dict = Depends(get_current_user)):
        """Update system version (OWNER/PRODUCT_OWNER only)"""
        if current_user["role"] not in [UserRole.OWNER, UserRole.PRODUCT_OWNER]:
            raise HTTPException(status_code=403, detail="OWNER or PRODUCT_OWNER required")
        
        # Validate
        version_name = payload.get("version_name")
        version_code = payload.get("version_code")
        release_channel = payload.get("release_channel", "prod")
        
        if not version_name or not version_code:
            raise HTTPException(status_code=400, detail="version_name and version_code required")
        
        # Update or create
        now = datetime.now(timezone.utc).isoformat()
        
        await db.system_meta.update_one(
            {"key": "system_version"},
            {"$set": {
                "version_name": version_name,
                "version_code": version_code,
                "release_channel": release_channel,
                "build_id": os.getenv("BUILD_ID", "dev"),
                "git_sha": os.getenv("GIT_SHA", "local"),
                "built_at": now,
                "updated_at": now,
                "updated_by": current_user["id"]
            }},
            upsert=True
        )
        
        return {"message": "Version updated", "version_code": version_code}

    @router.get("/system/modules")
    async def get_system_modules(current_user: dict = Depends(get_current_user)):
        """Get module registry (server-side feature flags)"""
        return {"modules": MODULE_REGISTRY}

    @router.get("/search")
    async def unified_search(
        q: str = Query(..., min_length=2),
        venue_id: Optional[str] = Query(None),
        scope: Optional[str] = Query(None),  # menu, users, orders, guests
        limit: int = Query(10, le=50),
        current_user: dict = Depends(get_current_user)
    ):
        """Unified fuzzy search across multiple entities"""
        results = {}
        query_lower = q.lower()
        
        # Determine venue
        target_venue = venue_id or current_user.get("venue_id")
        
        # Menu items search
        if not scope or scope == "menu":
            menu_items = await db.menu_items.find(
                {
                    "venue_id": target_venue,
                    "name": {"$regex": q, "$options": "i"}
                },
                {"_id": 0}
            ).limit(limit).to_list(limit)
            results["menu_items"] = menu_items
        
        # Users search
        if not scope or scope == "users":
            users = await db.users.find(
                {
                    "venue_id": target_venue,
                    "$or": [
                        {"name": {"$regex": q, "$options": "i"}},
                        {"email": {"$regex": q, "$options": "i"}}
                    ]
                },
                {"_id": 0, "pin_hash": 0, "mfa_secret": 0}
            ).limit(limit).to_list(limit)
            results["users"] = users
        
        # Guests search
        if not scope or scope == "guests":
            guests = await db.guests.find(
                {
                    "venue_id": target_venue,
                    "$or": [
                        {"name": {"$regex": q, "$options": "i"}},
                        {"phone": {"$regex": q, "$options": "i"}},
                        {"email": {"$regex": q, "$options": "i"}}
                    ]
                },
                {"_id": 0}
            ).limit(limit).to_list(limit)
            results["guests"] = guests
        
        # Orders search (by table name or order ID)
        if not scope or scope == "orders":
            orders = await db.orders.find(
                {
                    "venue_id": target_venue,
                    "$or": [
                        {"order_id": {"$regex": q, "$options": "i"}},
                        {"table_name": {"$regex": q, "$options": "i"}}
                    ]
                },
                {"_id": 0}
            ).limit(limit).to_list(limit)
            results["orders"] = orders
        
        # Count total results
        total = sum(len(v) for v in results.values())
        
        return {
            "query": q,
            "venue_id": target_venue,
            "scope": scope or "all",
            "total_results": total,
            "results": results
        }

    return router
