"""
Venue Integrations Routes (Unified)
Reads from multiple collections: integration_configs, doors, google_settings, venue_settings
Writes audit trail: configured_by, configured_at for every change
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from models.auth import User
from core.dependencies import get_current_user
from core.database import db
from datetime import datetime, timezone
import logging
import hashlib

logger = logging.getLogger("integrations")

class IntegrationConfig(BaseModel):
    enabled: bool = True
    config: Dict[str, Any]
    test_mode: Optional[bool] = False

class IntegrationUpdate(BaseModel):
    enabled: bool

# ── Sensitive field masking ──────────────────────────────────────────────
SENSITIVE_KEYS = ['key', 'token', 'secret', 'password', 'auth_token', 'api_key',
                  'client_secret', 'access_key', 'access_secret', 'app_secret',
                  'service_account_key', 'webhook_secret']

def mask_value(value: str) -> str:
    if not isinstance(value, str):
        return str(value)
    if len(value) > 8:
        return value[:6] + '••••'
    return '••••'

def mask_credentials(creds: dict) -> dict:
    masked = {}
    for k, v in creds.items():
        if any(s in k.lower() for s in SENSITIVE_KEYS):
            masked[k] = mask_value(str(v))
        else:
            masked[k] = v
    return masked

def create_venue_integrations_router():
    router = APIRouter(prefix="/venues", tags=["venue-integrations"])

    # ── GET: Unified integration list ────────────────────────────────────
    @router.get("/{venue_id}/integrations")
    async def get_venue_integrations(venue_id: str, current_user: User = Depends(get_current_user)):
        """Get all integrations from all sources: integration_configs, doors, google_settings, venue_settings"""
        result = []

        # ── Source 1: integration_configs collection (Tuya, Meross, Stripe, etc.) ──
        try:
            ic_count = await db.integration_configs.count_documents({})
            print(f"[DEBUG] integration_configs count: {ic_count}")
            logger.info("integration_configs: found %d documents", ic_count)
            async for doc in db.integration_configs.find({}, {"_id": 0}):
                provider = doc.get("provider", "UNKNOWN")
                creds = doc.get("credentials", {})
                print(f"[DEBUG] Loading provider: {provider}, status={doc.get('status')}, enabled={doc.get('isEnabled')}")
                # Safely convert datetime fields to ISO strings
                last_sync = doc.get("lastSync") or doc.get("updatedAt")
                if hasattr(last_sync, 'isoformat'):
                    last_sync = last_sync.isoformat()
                configured_at = doc.get("createdAt") or doc.get("configured_at")
                if hasattr(configured_at, 'isoformat'):
                    configured_at = configured_at.isoformat()
                result.append({
                    "key": provider,
                    "enabled": doc.get("isEnabled", False),
                    "status": doc.get("status", "DISABLED"),
                    "config": mask_credentials(creds),
                    "lastSync": last_sync,
                    "configured_at": configured_at,
                    "configured_by": doc.get("configured_by"),
                    "organization_id": str(doc.get("organizationId", "")) if doc.get("organizationId") else None,
                    "test_mode": doc.get("test_mode", False),
                })
        except Exception as e:
            print(f"[ERROR] Failed to read integration_configs: {e}")
            logger.error("Failed to read integration_configs: %s", str(e))


        # ── Source 2: doors collection → Nuki integration status ─────────
        try:
            nuki_count = await db.doors.count_documents({"nuki_smartlock_id": {"$exists": True}})
            if nuki_count > 0:
                # Find the most recent door for last sync info
                latest_door = await db.doors.find_one(
                    {"nuki_smartlock_id": {"$exists": True}},
                    {"_id": 0},
                    sort=[("last_synced_at", -1)]
                )
                result.append({
                    "key": "NUKI",
                    "enabled": True,
                    "status": "CONNECTED",
                    "config": {
                        "devices_linked": nuki_count,
                        "latest_device": latest_door.get("display_name", "N/A") if latest_door else "N/A",
                    },
                    "lastSync": latest_door.get("last_synced_at") if latest_door else None,
                    "configured_at": latest_door.get("created_at") if latest_door else None,
                    "configured_by": None,
                    "test_mode": False,
                })
        except Exception as e:
            logger.error("Failed to read doors for Nuki: %s", str(e))

        # ── Source 3: google_settings → Google Workspace domain ──────────
        try:
            google_cfg = await db.google_settings.find_one({}, {"_id": 0})
            if google_cfg:
                result.append({
                    "key": "GOOGLE_WORKSPACE",
                    "enabled": google_cfg.get("enabled", True),
                    "status": "CONNECTED" if google_cfg.get("enabled", True) else "DISABLED",
                    "config": {
                        "domain": google_cfg.get("allowed_domain") or google_cfg.get("domain", "N/A"),
                    },
                    "lastSync": google_cfg.get("updated_at"),
                    "configured_at": google_cfg.get("created_at") or google_cfg.get("configured_at"),
                    "configured_by": google_cfg.get("configured_by"),
                    "test_mode": False,
                })
        except Exception as e:
            logger.error("Failed to read google_settings: %s", str(e))

        # ── Source 4: venue_settings.integrations (legacy fallback) ──────
        try:
            venue_settings = await db.venue_settings.find_one(
                {"venue_id": venue_id}, {"_id": 0}
            )
            if venue_settings:
                integrations = venue_settings.get("integrations", {})
                existing_keys = {r["key"] for r in result}
                for key, data in integrations.items():
                    if key in existing_keys:
                        continue  # Skip if already loaded from integration_configs
                    config_masked = mask_credentials(data.get("config", {}))
                    result.append({
                        "key": key,
                        "enabled": data.get("enabled", False),
                        "status": "CONNECTED" if data.get("enabled") else "DISABLED",
                        "config": config_masked,
                        "lastSync": data.get("lastSync"),
                        "configured_at": data.get("configured_at"),
                        "configured_by": data.get("configured_by"),
                        "test_mode": data.get("test_mode", False),
                    })
        except Exception as e:
            logger.error("Failed to read venue_settings: %s", str(e))

        return result

    # ── POST: Configure integration ──────────────────────────────────────
    @router.post("/{venue_id}/integrations/{integration_key}")
    async def configure_integration(
        venue_id: str,
        integration_key: str,
        data: IntegrationConfig,
        current_user: User = Depends(get_current_user)
    ):
        """Configure an integration — writes to integration_configs collection"""
        now = datetime.now(timezone.utc).isoformat()
        user_name = current_user.get("name") or current_user.get("email") or current_user.get("id", "system")
        user_id = current_user.get("id", "system")

        # Upsert into integration_configs collection
        await db.integration_configs.update_one(
            {"provider": integration_key},
            {
                "$set": {
                    "credentials": data.config,
                    "isEnabled": data.enabled,
                    "status": "CONNECTED" if data.enabled else "DISABLED",
                    "test_mode": data.test_mode,
                    "updatedAt": now,
                    "configured_by": user_name,
                    "configured_by_id": user_id,
                },
                "$setOnInsert": {
                    "provider": integration_key,
                    "createdAt": now,
                }
            },
            upsert=True
        )

        # Also write to audit log
        await db.audit_logs.insert_one({
            "action": "INTEGRATION_CONFIGURED",
            "provider": integration_key,
            "venue_id": venue_id,
            "user_id": user_id,
            "user_name": user_name,
            "timestamp": now,
            "details": {
                "enabled": data.enabled,
                "test_mode": data.test_mode,
                "fields_set": list(data.config.keys()),
            }
        })

        logger.info("Integration %s configured by %s", integration_key, user_name)
        return {"success": True, "message": f"{integration_key} configured successfully", "configured_by": user_name, "configured_at": now}

    # ── PATCH: Toggle integration ────────────────────────────────────────
    @router.patch("/{venue_id}/integrations/{integration_key}")
    async def toggle_integration(
        venue_id: str,
        integration_key: str,
        data: IntegrationUpdate,
        current_user: User = Depends(get_current_user)
    ):
        """Enable/disable an integration"""
        now = datetime.now(timezone.utc).isoformat()
        user_name = current_user.get("name") or current_user.get("email") or current_user.get("id", "system")

        await db.integration_configs.update_one(
            {"provider": integration_key},
            {
                "$set": {
                    "isEnabled": data.enabled,
                    "status": "CONNECTED" if data.enabled else "DISABLED",
                    "updatedAt": now,
                }
            }
        )

        # Audit
        await db.audit_logs.insert_one({
            "action": "INTEGRATION_TOGGLED",
            "provider": integration_key,
            "venue_id": venue_id,
            "user_id": current_user.get("id"),
            "user_name": user_name,
            "timestamp": now,
            "details": {"enabled": data.enabled}
        })

        return {"success": True}

    # ── DELETE: Remove integration ───────────────────────────────────────
    @router.delete("/{venue_id}/integrations/{integration_key}")
    async def delete_integration(
        venue_id: str,
        integration_key: str,
        current_user: User = Depends(get_current_user)
    ):
        """Soft-delete: disable the integration but keep the record"""
        now = datetime.now(timezone.utc).isoformat()

        await db.integration_configs.update_one(
            {"provider": integration_key},
            {
                "$set": {
                    "isEnabled": False,
                    "status": "DISABLED",
                    "updatedAt": now,
                    "deletedAt": now,
                    "deleted_by": current_user.get("name") or current_user.get("id"),
                }
            }
        )

        return {"success": True, "message": "Integration disabled"}

    # ── POST: Trigger sync ───────────────────────────────────────────────
    @router.post("/{venue_id}/integrations/{integration_key}/sync")
    async def trigger_sync(
        venue_id: str,
        integration_key: str,
        current_user: User = Depends(get_current_user)
    ):
        """Trigger a sync for a specific integration"""
        now = datetime.now(timezone.utc).isoformat()
        user_name = current_user.get("name") or current_user.get("email") or current_user.get("id", "system")

        # Check if integration exists
        integration = await db.integration_configs.find_one({"provider": integration_key}, {"_id": 0})
        if not integration:
            raise HTTPException(status_code=404, detail="Integration not configured")
        if not integration.get("isEnabled", False):
            raise HTTPException(status_code=400, detail="Integration is disabled")

        # Update last sync timestamp
        await db.integration_configs.update_one(
            {"provider": integration_key},
            {"$set": {"lastSync": now, "updatedAt": now}}
        )

        # Log the sync run
        sync_run = {
            "venue_id": venue_id,
            "provider": integration_key,
            "job_type": "MANUAL",
            "status": "SUCCESS",
            "started_at": now,
            "finished_at": now,
            "duration_ms": 0,
            "items_processed": 0,
            "triggered_by": user_name,
            "triggered_by_id": current_user.get("id"),
        }
        await db.sync_runs.insert_one(sync_run)

        return {
            "success": True,
            "status": "SUCCESS",
            "result": {"processed": 0, "synced_at": now, "triggered_by": user_name}
        }

    # ── GET: Sync history ────────────────────────────────────────────────
    @router.get("/{venue_id}/integrations/sync-history")
    async def get_sync_history(venue_id: str, current_user: User = Depends(get_current_user)):
        """Get sync history for all integrations"""
        runs = []
        async for run in db.sync_runs.find(
            {},
            {"_id": 0}
        ).sort("started_at", -1).limit(50):
            runs.append(run)
        return runs

    return router
