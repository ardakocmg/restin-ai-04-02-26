"""
🔐 Access Control Service — The Brain

Server-authoritative logic for door access control.
This is where ALL decisions are made — the frontend is UI-only.
"""
import logging
import uuid
import hashlib
import os
import base64
from typing import Optional, Any
from datetime import datetime, timezone

from app.core.database import get_database
from app.domains.access_control.nuki_provider import NukiProvider
from app.domains.access_control.models import (
    DoorAction, ActionResult, ProviderPath, DeviceType, LockState,
)

logger = logging.getLogger(__name__)


# ==================== ENCRYPTION HELPERS ====================
# Simple symmetric encryption for at-rest credential protection.
# In production, replace with EnvelopeCrypto / KMS.

def _get_encryption_key() -> bytes:
    """Derive encryption key from JWT_SECRET (available at boot)."""
    secret = os.environ.get("JWT_SECRET", "fallback-not-for-prod")
    return hashlib.sha256(secret.encode()).digest()


def encrypt_value(plaintext: str) -> str:
    """XOR-based obfuscation + base64. Replace with AES/KMS in production."""
    key = _get_encryption_key()
    encrypted = bytes(b ^ key[i % len(key)] for i, b in enumerate(plaintext.encode()))
    return base64.urlsafe_b64encode(encrypted).decode()


def decrypt_value(ciphertext: str) -> str:
    """Reverse the encryption."""
    key = _get_encryption_key()
    encrypted = base64.urlsafe_b64decode(ciphertext.encode())
    decrypted = bytes(b ^ key[i % len(key)] for i, b in enumerate(encrypted))
    return decrypted.decode()


class AccessControlService:
    """
    Server-authoritative access control service.
    
    All decisions about who can open which door are made here.
    Nuki is strictly an execution provider.
    """

    # ==================== CREDENTIALS ====================

    @staticmethod
    async def store_api_token(venue_id: str, api_token: str) -> dict:
        """Store an API token (fast onboarding). Token is encrypted at rest."""
        db = get_database()
        now = datetime.now(timezone.utc).isoformat()

        credential = {
            "venue_id": venue_id,
            "mode": "API_TOKEN",
            "encrypted_api_token": encrypt_value(api_token),
            "encrypted_access_token": None,
            "encrypted_refresh_token": None,
            "token_expires_at": None,
            "connected_at": now,
            "last_refreshed_at": None,
            "status": "active",
        }

        await db.nuki_credentials.update_one(
            {"venue_id": venue_id},
            {"$set": credential},
            upsert=True,
        )

        return {"status": "connected", "mode": "API_TOKEN", "venue_id": venue_id}

    @staticmethod
    async def store_oauth_tokens(
        venue_id: str,
        access_token: str,
        refresh_token: str,
        expires_at: str,
    ) -> dict:
        """Store OAuth2 tokens (enterprise onboarding). Tokens encrypted at rest."""
        db = get_database()
        now = datetime.now(timezone.utc).isoformat()

        credential = {
            "venue_id": venue_id,
            "mode": "OAUTH2",
            "encrypted_access_token": encrypt_value(access_token),
            "encrypted_refresh_token": encrypt_value(refresh_token),
            "encrypted_api_token": None,
            "token_expires_at": expires_at,
            "connected_at": now,
            "last_refreshed_at": now,
            "status": "active",
        }

        await db.nuki_credentials.update_one(
            {"venue_id": venue_id},
            {"$set": credential},
            upsert=True,
        )

        return {"status": "connected", "mode": "OAUTH2", "venue_id": venue_id}

    @staticmethod
    async def get_token(venue_id: str) -> Optional[str]:
        """Retrieve decrypted token for API calls. Never expose to frontend."""
        db = get_database()
        cred = await db.nuki_credentials.find_one({"venue_id": venue_id, "status": "active"})
        if not cred:
            return None

        if cred.get("mode") == "API_TOKEN" and cred.get("encrypted_api_token"):
            return decrypt_value(cred["encrypted_api_token"])
        elif cred.get("encrypted_access_token"):
            return decrypt_value(cred["encrypted_access_token"])

        return None

    @staticmethod
    async def get_connection_status(venue_id: str) -> dict:
        """Check connection health without exposing secrets."""
        db = get_database()
        cred = await db.nuki_credentials.find_one({"venue_id": venue_id})
        if not cred:
            return {"connected": False, "mode": None, "status": "not_connected"}

        return {
            "connected": cred.get("status") == "active",
            "mode": cred.get("mode"),
            "status": cred.get("status"),
            "connected_at": cred.get("connected_at"),
            "last_refreshed_at": cred.get("last_refreshed_at"),
        }

    # ==================== DOOR MANAGEMENT ====================

    @staticmethod
    async def sync_devices(venue_id: str) -> dict:
        """Discover devices from Nuki and sync to internal door registry."""
        token = await AccessControlService.get_token(venue_id)
        if not token:
            return {"error": "No active Nuki connection", "discovered": 0}

        devices = await NukiProvider.discover_devices(venue_id, token)
        if not devices:
            return {"discovered": 0, "new": 0, "updated": 0, "doors": []}

        db = get_database()
        now = datetime.now(timezone.utc).isoformat()
        new_count = 0
        updated_count = 0
        result_doors = []

        for device in devices:
            smartlock_id = device.get("smartlockId")
            if not smartlock_id:
                continue

            # Determine device type
            device_type_id = device.get("type", 0)
            device_type_map = {0: "SMART_LOCK_PRO", 2: "OPENER", 3: "SMART_DOOR", 4: "SMART_LOCK_ULTRA"}
            device_type = device_type_map.get(device_type_id, "SMART_LOCK_PRO")

            # Extract state
            state = device.get("state", {})
            lock_state_id = state.get("state", 0)
            lock_state_map = {1: "LOCKED", 3: "UNLOCKED", 5: "UNLATCHED"}
            lock_state = lock_state_map.get(lock_state_id, "UNKNOWN")

            # Check if door already exists
            existing = await db.doors.find_one({
                "venue_id": venue_id,
                "nuki_smartlock_id": smartlock_id,
            })

            door_data = {
                "venue_id": venue_id,
                "nuki_smartlock_id": smartlock_id,
                "device_type": device_type,
                "firmware_version": device.get("firmwareVersion"),
                "battery_critical": state.get("batteryCritical", False),
                "battery_charge": state.get("batteryCharge"),
                "lock_state": lock_state,
                "last_synced_at": now,
                "updated_at": now,
            }

            if existing:
                # Update — preserve display_name
                await db.doors.update_one(
                    {"_id": existing["_id"]},
                    {"$set": door_data},
                )
                door_data["id"] = existing["id"]
                door_data["display_name"] = existing["display_name"]
                updated_count += 1
            else:
                # New door — auto-name from Nuki
                door_data["id"] = f"door-{uuid.uuid4().hex[:8]}"
                door_data["display_name"] = device.get("name", f"Door {smartlock_id}")
                door_data["created_at"] = now
                await db.doors.insert_one(door_data)
                new_count += 1

            result_doors.append({
                "id": door_data.get("id"),
                "display_name": door_data.get("display_name"),
                "device_type": device_type,
                "lock_state": lock_state,
                "battery_charge": state.get("batteryCharge"),
                "battery_critical": state.get("batteryCritical", False),
            })

        return {
            "discovered": len(devices),
            "new": new_count,
            "updated": updated_count,
            "doors": result_doors,
        }

    @staticmethod
    async def get_doors(venue_id: str) -> list[dict]:
        """List all doors for a venue."""
        db = get_database()
        doors = await db.doors.find({"venue_id": venue_id}).to_list(length=100)
        for d in doors:
            d["_id"] = str(d["_id"])
        return doors

    @staticmethod
    async def update_door(door_id: str, display_name: str) -> Optional[dict]:
        """Rename a door. Does NOT affect audit logs (they snapshot the name)."""
        db = get_database()
        now = datetime.now(timezone.utc).isoformat()
        result = await db.doors.find_one_and_update(
            {"id": door_id},
            {"$set": {"display_name": display_name, "updated_at": now}},
            return_document=True,
        )
        if result:
            result["_id"] = str(result["_id"])
        return result

    # ==================== PERMISSION ENFORCEMENT ====================

    @staticmethod
    async def check_permission(user_id: str, door_id: str, action: DoorAction) -> bool:
        """
        Check if a user has permission for an action on a door.
        Checks: user-specific overrides first, then role-based.
        """
        db = get_database()

        # 1. User-specific permission (highest priority)
        user_perm = await db.door_permissions.find_one({
            "door_id": door_id,
            "user_id": user_id,
        })
        if user_perm:
            return _action_allowed(user_perm, action)

        # 2. Role-based permission — get user's role(s)
        user = await db.users.find_one({"id": user_id})
        if not user:
            return False

        user_role = user.get("role", "")
        if user_role:
            role_perm = await db.door_permissions.find_one({
                "door_id": door_id,
                "role_id": user_role,
            })
            if role_perm:
                return _action_allowed(role_perm, action)

        return False

    @staticmethod
    async def create_permission(venue_id: str, data: dict, created_by: str) -> dict:
        """Create or update a door permission."""
        db = get_database()
        now = datetime.now(timezone.utc).isoformat()

        perm = {
            "id": f"perm-{uuid.uuid4().hex[:8]}",
            "venue_id": venue_id,
            "door_id": data["door_id"],
            "role_id": data.get("role_id"),
            "user_id": data.get("user_id"),
            "can_unlock": data.get("can_unlock", False),
            "can_lock": data.get("can_lock", False),
            "can_unlatch": data.get("can_unlatch", False),
            "valid_from": data.get("valid_from"),
            "valid_until": data.get("valid_until"),
            "created_at": now,
            "created_by": created_by,
        }

        # Upsert by door_id + (role_id or user_id)
        filter_query: dict[str, Any] = {"door_id": data["door_id"], "venue_id": venue_id}
        if data.get("user_id"):
            filter_query["user_id"] = data["user_id"]
        elif data.get("role_id"):
            filter_query["role_id"] = data["role_id"]

        existing = await db.door_permissions.find_one(filter_query)
        if existing:
            perm["id"] = existing["id"]
            perm["created_at"] = existing.get("created_at", now)
            await db.door_permissions.update_one({"_id": existing["_id"]}, {"$set": perm})
        else:
            await db.door_permissions.insert_one(perm)

        perm.pop("_id", None)
        return perm

    @staticmethod
    async def get_permissions(venue_id: str) -> list[dict]:
        """List all permissions for a venue."""
        db = get_database()
        perms = await db.door_permissions.find({"venue_id": venue_id}).to_list(length=500)
        for p in perms:
            p["_id"] = str(p["_id"])
        return perms

    @staticmethod
    async def delete_permission(perm_id: str) -> bool:
        """Revoke a permission."""
        db = get_database()
        result = await db.door_permissions.delete_one({"id": perm_id})
        return result.deleted_count > 0

    # ==================== EXECUTE ACTION (THE CORE) ====================

    @staticmethod
    async def execute_door_action(
        venue_id: str,
        user_id: str,
        door_id: str,
        action: DoorAction,
        request_id: Optional[str] = None,
    ) -> dict:
        """
        THE CORE METHOD — Execute a door action with full permission check and audit.
        
        Flow:
        1. Validate door exists
        2. Check user permissions
        3. Execute via NukiProvider (Bridge → Web API)
        4. Write immutable audit log
        5. Return result
        """
        db = get_database()
        now = datetime.now(timezone.utc).isoformat()
        req_id = request_id or f"req-{uuid.uuid4().hex[:12]}"

        # 1. Load door
        door = await db.doors.find_one({"id": door_id, "venue_id": venue_id})
        if not door:
            audit = _build_audit(
                venue_id=venue_id, user_id=user_id, user_name="",
                door_id=door_id, door_name="UNKNOWN", smartlock_id=0,
                action=action, result=ActionResult.FAILURE,
                provider=ProviderPath.WEB, request_id=req_id,
                error="Door not found", timestamp=now,
            )
            await db.access_audit.insert_one(audit)
            return {"success": False, "error": "Door not found", "audit_id": audit["id"]}

        # 2. Get user info for audit
        user = await db.users.find_one({"id": user_id})
        user_name = user.get("name", user_id) if user else user_id

        # 3. Check permissions
        has_permission = await AccessControlService.check_permission(user_id, door_id, action)
        if not has_permission:
            audit = _build_audit(
                venue_id=venue_id, user_id=user_id, user_name=user_name,
                door_id=door_id, door_name=door["display_name"],
                smartlock_id=door["nuki_smartlock_id"],
                action=action, result=ActionResult.UNAUTHORIZED,
                provider=ProviderPath.WEB, request_id=req_id,
                error="Permission denied", timestamp=now,
            )
            await db.access_audit.insert_one(audit)
            return {"success": False, "error": "Permission denied", "audit_id": audit["id"]}

        # 4. Get token
        token = await AccessControlService.get_token(venue_id)
        if not token:
            audit = _build_audit(
                venue_id=venue_id, user_id=user_id, user_name=user_name,
                door_id=door_id, door_name=door["display_name"],
                smartlock_id=door["nuki_smartlock_id"],
                action=action, result=ActionResult.PROVIDER_UNAVAILABLE,
                provider=ProviderPath.WEB, request_id=req_id,
                error="No active Nuki connection", timestamp=now,
            )
            await db.access_audit.insert_one(audit)
            return {"success": False, "error": "No active Nuki connection", "audit_id": audit["id"]}

        # 5. Execute via NukiProvider
        nuki_result = await NukiProvider.execute_action(
            smartlock_id=door["nuki_smartlock_id"],
            action=action.value,
            token=token,
            venue_id=venue_id,
        )

        # 6. Write audit
        audit_result = ActionResult.SUCCESS if nuki_result["success"] else ActionResult.FAILURE
        provider = ProviderPath.BRIDGE if nuki_result["provider_path"] == "BRIDGE" else ProviderPath.WEB

        audit = _build_audit(
            venue_id=venue_id, user_id=user_id, user_name=user_name,
            door_id=door_id, door_name=door["display_name"],
            smartlock_id=door["nuki_smartlock_id"],
            action=action, result=audit_result,
            provider=provider, request_id=req_id,
            error=nuki_result.get("error"),
            duration_ms=nuki_result.get("duration_ms"),
            timestamp=now,
        )
        await db.access_audit.insert_one(audit)

        return {
            "success": nuki_result["success"],
            "action": action.value,
            "door": door["display_name"],
            "provider_path": nuki_result["provider_path"],
            "duration_ms": nuki_result.get("duration_ms"),
            "audit_id": audit["id"],
            "error": nuki_result.get("error"),
        }

    # ==================== AUDIT LOG ====================

    @staticmethod
    async def get_audit_log(
        venue_id: str,
        door_id: Optional[str] = None,
        user_id: Optional[str] = None,
        action: Optional[str] = None,
        limit: int = 100,
    ) -> list[dict]:
        """Retrieve filtered audit log. Entries are immutable."""
        db = get_database()
        query: dict[str, Any] = {"venue_id": venue_id}
        if door_id:
            query["door_id"] = door_id
        if user_id:
            query["user_id"] = user_id
        if action:
            query["action"] = action

        entries = await db.access_audit.find(query).sort("timestamp", -1).to_list(length=limit)
        for e in entries:
            e["_id"] = str(e["_id"])
        return entries

    # ==================== BRIDGE ====================

    @staticmethod
    async def configure_bridge(venue_id: str, ip: str, port: int, token: Optional[str]) -> dict:
        """Register a Nuki Bridge for LAN execution."""
        db = get_database()
        now = datetime.now(timezone.utc).isoformat()

        # Health check
        is_healthy = await NukiProvider.check_bridge_health(ip, port)

        bridge = {
            "venue_id": venue_id,
            "ip_address": ip,
            "port": port,
            "token": encrypt_value(token) if token else None,
            "is_healthy": is_healthy,
            "last_health_check": now,
            "created_at": now,
        }

        await db.bridge_configs.update_one(
            {"venue_id": venue_id},
            {"$set": bridge},
            upsert=True,
        )

        return {
            "status": "configured",
            "is_healthy": is_healthy,
            "ip_address": ip,
            "port": port,
        }

    @staticmethod
    async def get_bridge_health(venue_id: str) -> dict:
        """Check bridge connectivity."""
        db = get_database()
        bridge = await db.bridge_configs.find_one({"venue_id": venue_id})
        if not bridge:
            return {"configured": False, "is_healthy": False}

        # Re-check health
        is_healthy = await NukiProvider.check_bridge_health(
            bridge["ip_address"], bridge.get("port", 8080)
        )
        now = datetime.now(timezone.utc).isoformat()
        await db.bridge_configs.update_one(
            {"venue_id": venue_id},
            {"$set": {"is_healthy": is_healthy, "last_health_check": now}},
        )

        return {
            "configured": True,
            "is_healthy": is_healthy,
            "ip_address": bridge["ip_address"],
            "port": bridge.get("port", 8080),
            "last_health_check": now,
        }


# ==================== HELPERS ====================

def _action_allowed(perm: dict, action: DoorAction) -> bool:
    """Check if a permission record allows the given action."""
    action_map = {
        DoorAction.UNLOCK: "can_unlock",
        DoorAction.LOCK: "can_lock",
        DoorAction.UNLATCH: "can_unlatch",
    }
    field = action_map.get(action)
    return bool(perm.get(field, False)) if field else False


def _build_audit(
    venue_id: str, user_id: str, user_name: str,
    door_id: str, door_name: str, smartlock_id: int,
    action: DoorAction, result: ActionResult,
    provider: ProviderPath, request_id: str,
    error: Optional[str] = None,
    duration_ms: Optional[int] = None,
    timestamp: str = "",
) -> dict:
    """Build an immutable audit entry."""
    return {
        "id": f"audit-{uuid.uuid4().hex[:12]}",
        "venue_id": venue_id,
        "user_id": user_id,
        "user_name": user_name,
        "door_id": door_id,
        "door_display_name": door_name,
        "nuki_smartlock_id": smartlock_id,
        "action": action.value,
        "result": result.value,
        "provider_path": provider.value,
        "request_id": request_id,
        "error_message": error,
        "duration_ms": duration_ms,
        "timestamp": timestamp,
    }
