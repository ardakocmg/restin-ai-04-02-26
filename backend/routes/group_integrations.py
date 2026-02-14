"""
Group-level Integration Overview
Returns integration status across all venues the current user has access to.
Product Owner → sees all venues & all integrations
Owner → sees their brand venues
Manager → sees assigned venues
"""
from fastapi import APIRouter, Depends
from typing import Optional
from core.dependencies import get_current_user
from core.database import db
import logging

logger = logging.getLogger("group_integrations")

SENSITIVE_KEYS = ['key', 'token', 'secret', 'password', 'auth_token', 'api_key',
                  'client_secret', 'access_key', 'access_secret', 'app_secret',
                  'service_account_key', 'webhook_secret']

def mask_value(value: str) -> str:
    if not value or len(value) < 6:
        return "••••"
    return value[:3] + "•" * min(8, len(value) - 3)

def mask_credentials(creds: dict) -> dict:
    masked = {}
    for k, v in creds.items():
        if any(s in k.lower() for s in SENSITIVE_KEYS) and isinstance(v, str):
            masked[k] = mask_value(v)
        else:
            masked[k] = v
    return masked


def create_group_integrations_router():
    router = APIRouter(prefix="/group", tags=["Group Integrations"])

    @router.get("/integrations")
    async def get_group_integrations(current_user: dict = Depends(get_current_user)):
        """
        Returns integration status for ALL venues the user has access to.
        Response:
        {
            venues: [{ id, name, brand }],
            matrix: { venue_id: { PROVIDER: { status, enabled, lastSync, configured_by } } },
            summary: { total_venues, total_connected, providers_used: [...] }
        }
        """
        user_role = (current_user.get("role") or "").upper()
        user_venue_id = current_user.get("venueId") or current_user.get("venue_id")
        allowed_venue_ids = current_user.get("allowedVenueIds") or current_user.get("allowed_venue_ids") or []

        # ── Determine which venues to show ──
        venues = []
        if user_role in ("PRODUCT_OWNER", "SUPER_ADMIN", "ADMIN"):
            # See ALL venues
            cursor = db.venues.find({}, {"_id": 0})
            async for v in cursor:
                venues.append({
                    "id": v.get("id", ""),
                    "name": v.get("name", "Unknown"),
                    "brand": v.get("brand", v.get("group", "")),
                })
        elif user_role == "OWNER":
            # See venues in their brand/group
            if allowed_venue_ids:
                cursor = db.venues.find({"id": {"$in": allowed_venue_ids}}, {"_id": 0})
            else:
                cursor = db.venues.find({"id": user_venue_id}, {"_id": 0})
            async for v in cursor:
                venues.append({
                    "id": v.get("id", ""),
                    "name": v.get("name", "Unknown"),
                    "brand": v.get("brand", v.get("group", "")),
                })
        else:
            # Manager / Staff → only their venue
            if user_venue_id:
                v = await db.venues.find_one({"id": user_venue_id}, {"_id": 0})
                if v:
                    venues.append({
                        "id": v.get("id", ""),
                        "name": v.get("name", "Unknown"),
                        "brand": v.get("brand", v.get("group", "")),
                    })

        # ── Load integrations for each venue ──
        # integration_configs is currently global (no venue_id), so it applies to all
        # But venue_settings.integrations can be per-venue
        
        # Global integration_configs (shared across venues)
        global_configs = {}
        try:
            async for doc in db.integration_configs.find({}, {"_id": 0}):
                provider = doc.get("provider", "UNKNOWN")
                last_sync = doc.get("lastSync") or doc.get("updatedAt")
                if hasattr(last_sync, 'isoformat'):
                    last_sync = last_sync.isoformat()
                configured_at = doc.get("createdAt") or doc.get("configured_at")
                if hasattr(configured_at, 'isoformat'):
                    configured_at = configured_at.isoformat()
                    
                global_configs[provider] = {
                    "status": doc.get("status", "DISABLED"),
                    "enabled": doc.get("isEnabled", False),
                    "lastSync": last_sync,
                    "configured_by": doc.get("configured_by"),
                    "configured_at": configured_at,
                    "venue_id": doc.get("venue_id"),  # If scoped
                }
        except Exception as e:
            logger.error("Failed to read integration_configs: %s", str(e))

        # Build per-venue matrix
        matrix = {}
        for venue in venues:
            vid = venue["id"]
            venue_integrations = {}

            # Start with global configs (apply to all venues)
            for provider, cfg in global_configs.items():
                cfg_venue = cfg.get("venue_id")
                # If config has a venue_id, only apply to that venue
                if cfg_venue and cfg_venue != vid:
                    continue
                venue_integrations[provider] = {
                    "status": cfg["status"],
                    "enabled": cfg["enabled"],
                    "lastSync": cfg["lastSync"],
                    "configured_by": cfg.get("configured_by"),
                    "configured_at": cfg.get("configured_at"),
                    "scope": "global" if not cfg_venue else "venue",
                }

            # Per-venue overrides from venue_settings
            try:
                vs = await db.venue_settings.find_one({"venue_id": vid}, {"_id": 0})
                if vs:
                    integrations = vs.get("integrations", {})
                    for key, data in integrations.items():
                        existing = venue_integrations.get(key, {})
                        last_sync_vs = data.get("lastSync") or data.get("updatedAt")
                        if hasattr(last_sync_vs, 'isoformat'):
                            last_sync_vs = last_sync_vs.isoformat()
                        venue_integrations[key] = {
                            "status": "CONNECTED" if data.get("enabled") else "DISABLED",
                            "enabled": data.get("enabled", False),
                            "lastSync": last_sync_vs or existing.get("lastSync"),
                            "configured_by": data.get("configured_by") or existing.get("configured_by"),
                            "configured_at": data.get("configured_at") or existing.get("configured_at"),
                            "scope": "venue",
                        }
            except Exception as e:
                logger.error("Failed to read venue_settings for %s: %s", vid, str(e))

            # Check doors for Nuki
            try:
                nuki_count = await db.doors.count_documents({
                    "venue_id": vid,
                    "nuki_smartlock_id": {"$exists": True}
                })
                if nuki_count > 0:
                    venue_integrations["NUKI"] = {
                        "status": "CONNECTED",
                        "enabled": True,
                        "lastSync": None,
                        "configured_by": None,
                        "scope": "venue",
                        "devices": nuki_count,
                    }
            except Exception:
                pass

            matrix[vid] = venue_integrations

        # Summary
        all_providers_used = set()
        total_connected = 0
        for vid, integs in matrix.items():
            for provider, cfg in integs.items():
                if cfg.get("status") == "CONNECTED" or cfg.get("enabled"):
                    all_providers_used.add(provider)
                    total_connected += 1

        return {
            "venues": venues,
            "matrix": matrix,
            "summary": {
                "total_venues": len(venues),
                "total_connected": total_connected,
                "providers_used": sorted(all_providers_used),
            }
        }

    return router
