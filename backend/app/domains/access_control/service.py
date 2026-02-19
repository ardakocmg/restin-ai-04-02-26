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
    DoorConfig, DoorConfigUpdate, NukiAuthorization, NukiLogEntry, AuthType
)

logger = logging.getLogger(__name__)


# ==================== ENCRYPTION HELPERS ====================
# Fernet (AES-128-CBC + HMAC) for at-rest credential protection.
# Backward compatible: reads legacy XOR tokens if Fernet decode fails.

from cryptography.fernet import Fernet, InvalidToken

def _get_fernet() -> Fernet:
    """Derive Fernet instance from JWT_SECRET."""
    secret = os.environ.get("JWT_SECRET", "fallback-not-for-prod")
    if secret == "fallback-not-for-prod":
        logger.warning("⚠️  JWT_SECRET not set — access control encryption using INSECURE fallback!")
    # Fernet needs 32 bytes urlsafe-b64 key
    raw_key = hashlib.sha256(secret.encode()).digest()
    fernet_key = base64.urlsafe_b64encode(raw_key)
    return Fernet(fernet_key)


def _legacy_xor_decrypt(ciphertext: str) -> str:
    """Legacy XOR decryption for backward compatibility with old tokens."""
    secret = os.environ.get("JWT_SECRET", "fallback-not-for-prod")
    key = hashlib.sha256(secret.encode()).digest()
    encrypted = base64.urlsafe_b64decode(ciphertext.encode())
    decrypted = bytes(b ^ key[i % len(key)] for i, b in enumerate(encrypted))
    return decrypted.decode()


def encrypt_value(plaintext: str) -> str:
    """Encrypt a value using Fernet (AES-128-CBC + HMAC-SHA256)."""
    f = _get_fernet()
    return f.encrypt(plaintext.encode()).decode()


def decrypt_value(ciphertext: str) -> str:
    """Decrypt a value. Tries Fernet first, falls back to legacy XOR."""
    f = _get_fernet()
    try:
        return f.decrypt(ciphertext.encode()).decode()
    except (InvalidToken, Exception):
        # Backward compat: try legacy XOR decode
        try:
            return _legacy_xor_decrypt(ciphertext)
        except Exception:
            logger.error("Failed to decrypt value with both Fernet and legacy XOR")
            raise


def _build_audit(
    venue_id: str,
    user_id: str,
    user_name: str,
    door_id: str,
    door_name: str,
    smartlock_id: int,
    action: DoorAction,
    result: ActionResult,
    provider: ProviderPath,
    request_id: str,
    error: Optional[str] = None,
    duration_ms: Optional[int] = None,
    timestamp: Optional[str] = None,
) -> dict:
    """Helper to construct audit entry."""
    return {
        "id": f"audit-{uuid.uuid4().hex[:12]}",
        "venue_id": venue_id,
        "user_id": user_id,
        "user_name": user_name,
        "door_id": door_id,
        "door_display_name": door_name,
        "nuki_smartlock_id": smartlock_id,
        "action": action,
        "result": result,
        "provider_path": provider,
        "request_id": request_id,
        "error_message": error,
        "duration_ms": duration_ms,
        "timestamp": timestamp or datetime.now(timezone.utc).isoformat(),
    }


def _action_allowed(permission: dict, action: DoorAction) -> bool:
    """Low-level permission check on DB object."""
    # Check date validity
    now = datetime.now(timezone.utc).isoformat()
    if permission.get("valid_from") and permission["valid_from"] > now:
        return False
    if permission.get("valid_until") and permission["valid_until"] < now:
        return False
    
    # Check action flag
    if action == DoorAction.UNLOCK:
        return permission.get("can_unlock", False)
    if action == DoorAction.LOCK:
        return permission.get("can_lock", False)
    if action == DoorAction.UNLATCH:
        return permission.get("can_unlatch", False)
    return False


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
        
        # 1. Try DB credentials
        if cred:
            if cred.get("mode") == "API_TOKEN" and cred.get("encrypted_api_token"):
                return decrypt_value(cred["encrypted_api_token"])
            elif cred.get("encrypted_access_token"):
                return decrypt_value(cred["encrypted_access_token"])

        # 2. Fallback to Environment Variable (Dev/Global)
        env_token = os.environ.get("NUKI_API_TOKEN")
        if env_token:
            return env_token

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

    # ==================== NEW FEATURES: CONFIG, AUTH, LOGS ====================

    @staticmethod
    async def get_door_config(venue_id: str, door_id: str) -> Optional[dict]:
        """Get trusted device configuration from Nuki."""
        token = await AccessControlService.get_token(venue_id)
        if not token:
            return None
        
        db = get_database()
        door = await db.doors.find_one({"id": door_id, "venue_id": venue_id})
        if not door:
            return None

        # Nuki API call
        raw_config = await NukiProvider.get_config(door["nuki_smartlock_id"], token)
        if not raw_config:
            return None

        # Transform to internal model (DoorConfig)
        # Nuki returns { "name": "...", "ledBrightness": 3, ... }
        return {
            "name": raw_config.get("name"),
            "led_brightness": raw_config.get("ledBrightness", 0),
            "single_lock": raw_config.get("singleLock", False),
            "button_enabled": raw_config.get("buttonEnabled", True),
            "led_enabled": raw_config.get("ledEnabled", True),
            "pairing_enabled": raw_config.get("pairingEnabled", True),
            # Map Nuki 'sound' (0-255?) to simplified 0-5 if possible, or just pass through
            # Assuming basic passthrough for now, Frontend can handle
            "sound_level": 2 # Dummy mapping as Nuki model is complex here
        }

    @staticmethod
    async def update_door_config(venue_id: str, door_id: str, config: dict) -> bool:
        """Update device configuration."""
        token = await AccessControlService.get_token(venue_id)
        if not token:
            return False
            
        db = get_database()
        door = await db.doors.find_one({"id": door_id, "venue_id": venue_id})
        if not door:
            return False
        
        # Transform flat config to Nuki format
        nuki_payload = {}
        if config.get("name"): nuki_payload["name"] = config["name"]
        if config.get("led_brightness") is not None: nuki_payload["ledBrightness"] = config["led_brightness"]
        if config.get("single_lock") is not None: nuki_payload["singleLock"] = config["single_lock"]
        if config.get("button_enabled") is not None: nuki_payload["buttonEnabled"] = config["button_enabled"]
        if config.get("led_enabled") is not None: nuki_payload["ledEnabled"] = config["led_enabled"]

        return await NukiProvider.update_config(door["nuki_smartlock_id"], token, nuki_payload)

    @staticmethod
    async def list_nuki_authorizations(venue_id: str, door_id: str) -> list[dict]:
        """List all Nuki auths."""
        token = await AccessControlService.get_token(venue_id)
        if not token:
            return []
            
        db = get_database()
        door = await db.doors.find_one({"id": door_id, "venue_id": venue_id})
        if not door:
            return []

        raw_auths = await NukiProvider.list_authorizations(door["nuki_smartlock_id"], token)
        
        auths = []
        auth_type_map = {0: "APP", 2: "FOB", 3: "KEYPAD", 13: "KEYPAD_V2", 1: "BRIDGE"}
        
        for a in raw_auths:
            type_id = a.get("type", 0)
            auth_type = auth_type_map.get(type_id, "APP")
            
            auths.append({
                "id": str(a.get("id")),
                "smartlock_id": a.get("smartlockId"),
                "type": auth_type,
                "name": a.get("name"),
                "enabled": a.get("enabled", True),
                "remote_allowed": a.get("remoteAllowed", False),
                "date_created": a.get("creationDate"),
                "last_active_date": a.get("lastActiveDate"),
                "lock_count": a.get("lockCount", 0),
            })
        return auths

    @staticmethod
    async def create_nuki_authorization(venue_id: str, door_id: str, name: str) -> bool:
        """Create a standard App User authorization."""
        token = await AccessControlService.get_token(venue_id)
        if not token:
            return False
            
        db = get_database()
        door = await db.doors.find_one({"id": door_id, "venue_id": venue_id})
        if not door:
            return False
            

        return await NukiProvider.create_authorization(door["nuki_smartlock_id"], token, name)

    @staticmethod
    async def delete_nuki_authorization(venue_id: str, door_id: str, auth_id: str) -> bool:
        """Revoke a generic Nuki authorization (App/Fob/Keypad)."""
        token = await AccessControlService.get_token(venue_id)
        if not token:
            return False
            
        db = get_database()
        door = await db.doors.find_one({"id": door_id, "venue_id": venue_id})
        if not door:
            return False
            
        return await NukiProvider.delete_authorization(door["nuki_smartlock_id"], token, auth_id)


    # ==================== LOG ARCHIVING & STAFF LINKING ====================

    @staticmethod
    async def get_native_logs(venue_id: str, door_id: str, limit: int = 50) -> list[dict]:
        """
        Get Nuki logs. Prefers local archived logs (with staff info), 
        falls back to live Nuki API if no local logs found (or force sync needed).
        """
        db = get_database()
        
        # 1. Try local DB first (archived logs)
        local_logs = await db.nuki_activity_logs.find({
            "door_id": door_id
        }).sort("timestamp", -1).to_list(length=limit)
        
        if local_logs:
            for log in local_logs:
                log["_id"] = str(log["_id"])
            return local_logs

        # 2. Fallback to Nuki Web API (Live)
        token = await AccessControlService.get_token(venue_id)
        if not token:
            return []
            
        door = await db.doors.find_one({"id": door_id, "venue_id": venue_id})
        if not door:
            return []
            
        return await NukiProvider.get_activity_log(door["nuki_smartlock_id"], token, limit)

    @staticmethod
    async def sync_door_logs(door_id: str) -> dict:
        """
        Fetch logs from Nuki -> Deduplicate -> Link Staff -> Archive to DB.
        """
        db = get_database()
        door = await db.doors.find_one({"id": door_id})
        if not door:
            return {"error": "Door not found"}
            
        venue_id = door["venue_id"]
        token = await AccessControlService.get_token(venue_id)
        if not token:
            return {"error": "No Nuki connection"}

        # 1. Fetch from Nuki
        raw_logs = await NukiProvider.get_activity_log(door["nuki_smartlock_id"], token, limit=100)
        if not raw_logs:
            return {"synced": 0}

        new_count = 0
        
        # 2. Process each log
        for log in raw_logs:
            # key: smartlockId + id (unique event id from Nuki)
            nuki_unique_id = log.get("id") 
            if not nuki_unique_id:
                continue
                
            exists = await db.nuki_activity_logs.find_one({"nuki_id": nuki_unique_id})
            if exists:
                continue

            # 3. Link Staff (Match Name)
            user_name = log.get("name", "")
            staff_id = None
            staff_name = None
            
            if user_name:
                # Simple loose matching - exact name or first name match
                # Ideally, we map Nuki Users to Staff IDs explicitly in a separate collection,
                # but for now we fuzzy link by name.
                staff = await db.users.find_one({
                    "venue_id": venue_id, 
                    "name": {"$regex": f"^{user_name}$", "$options": "i"}
                })
                if staff:
                    staff_id = staff["id"]
                    staff_name = staff["name"]

            # 4. Insert
            entry = {
                "venue_id": venue_id,
                "door_id": door_id,
                "nuki_id": nuki_unique_id,
                "smartlock_id": log.get("smartlockId"),
                "device_type": log.get("deviceType"),
                "auth_id": log.get("authId"),
                "auth_name": user_name,
                "action": log.get("action"),
                "action_type": log.get("actionType"),
                "timestamp": log.get("date"),
                "staff_id": staff_id,
                "staff_name": staff_name, # Enriched field
                "synced_at": datetime.now(timezone.utc).isoformat()
            }
            await db.nuki_activity_logs.insert_one(entry)
            new_count += 1

        return {"success": True, "synced": new_count}

    @staticmethod
    async def check_permission(user_id: str, door_id: str, action: DoorAction) -> bool:
        """
        Check if a user has permission for an action on a door.
        Checks: elevated role bypass first, then user-specific, then role-based.
        """
        db = get_database()

        # 0. Elevated role bypass — product_owner / admin have full door access
        ELEVATED_ROLES = {"product_owner", "admin", "owner", "super_admin"}
        user = await db.users.find_one({"id": user_id})
        if user and user.get("role", "") in ELEVATED_ROLES:
            logger.info("Door access granted via elevated role bypass: user=%s role=%s", user_id, user.get("role"))
            return True

        # 1. User-specific permission (highest priority)
        user_perm = await db.door_permissions.find_one({
            "door_id": door_id,
            "user_id": user_id,
        })
        if user_perm:
            return _action_allowed(user_perm, action)

        # 2. Role-based permission
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
        else:
             # Should be caught by route validator
             pass 

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

    # ==================== PHASE 2: REPORTING & ANALYTICS ====================

    @staticmethod
    async def get_access_summary(venue_id: str, days: int = 30) -> dict:
        """
        Dashboard summary: total actions, success rate, busiest door, most active user.
        Aggregates audit data over the specified number of days.
        """
        db = get_database()
        from datetime import timedelta
        cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

        entries = await db.access_audit.find({
            "venue_id": venue_id,
            "timestamp": {"$gte": cutoff},
        }).to_list(length=10000)

        if not entries:
            return {
                "total_actions": 0, "success_count": 0, "failure_count": 0,
                "unauthorized_count": 0, "success_rate": 0,
                "busiest_door": None, "most_active_user": None,
                "avg_response_ms": 0, "bridge_usage_pct": 0,
                "period_days": days,
            }

        total = len(entries)
        success = sum(1 for e in entries if e.get("result") == "SUCCESS")
        failures = sum(1 for e in entries if e.get("result") == "FAILURE")
        unauthorized = sum(1 for e in entries if e.get("result") == "UNAUTHORIZED")
        bridge_count = sum(1 for e in entries if e.get("provider_path") == "BRIDGE")

        # Duration stats (only successful actions)
        durations = [e["duration_ms"] for e in entries if e.get("duration_ms") and e.get("result") == "SUCCESS"]
        avg_ms = round(sum(durations) / len(durations)) if durations else 0

        # Busiest door
        door_counts: dict[str, int] = {}
        for e in entries:
            name = e.get("door_display_name", "Unknown")
            door_counts[name] = door_counts.get(name, 0) + 1
        busiest_door = max(door_counts, key=door_counts.get) if door_counts else None  # type: ignore[arg-type]

        # Most active user
        user_counts: dict[str, int] = {}
        for e in entries:
            name = e.get("user_name", "Unknown")
            user_counts[name] = user_counts.get(name, 0) + 1
        most_active_user = max(user_counts, key=user_counts.get) if user_counts else None  # type: ignore[arg-type]

        return {
            "total_actions": total,
            "success_count": success,
            "failure_count": failures,
            "unauthorized_count": unauthorized,
            "success_rate": round((success / total) * 100, 1) if total else 0,
            "busiest_door": {"name": busiest_door, "count": door_counts.get(busiest_door, 0)} if busiest_door else None,
            "most_active_user": {"name": most_active_user, "count": user_counts.get(most_active_user, 0)} if most_active_user else None,
            "avg_response_ms": avg_ms,
            "bridge_usage_pct": round((bridge_count / total) * 100, 1) if total else 0,
            "period_days": days,
        }

    @staticmethod
    async def get_door_history(venue_id: str, door_id: str, limit: int = 200) -> dict:
        """Per-door access history with stats."""
        db = get_database()
        door = await db.doors.find_one({"id": door_id, "venue_id": venue_id})
        if not door:
            return {"error": "Door not found"}

        entries = await db.access_audit.find({
            "venue_id": venue_id,
            "door_id": door_id,
        }).sort("timestamp", -1).to_list(length=limit)

        for e in entries:
            e["_id"] = str(e["_id"])

        total = len(entries)
        success = sum(1 for e in entries if e.get("result") == "SUCCESS")

        # Unique users who accessed this door
        unique_users = list({e.get("user_name", "") for e in entries if e.get("user_name")})

        return {
            "door_id": door_id,
            "door_name": door.get("display_name", door_id),
            "total_actions": total,
            "success_count": success,
            "failure_count": total - success,
            "unique_users": unique_users,
            "entries": entries,
        }

    @staticmethod
    async def get_user_history(venue_id: str, user_id: str, limit: int = 200) -> dict:
        """Per-user access history across all doors."""
        db = get_database()
        entries = await db.access_audit.find({
            "venue_id": venue_id,
            "user_id": user_id,
        }).sort("timestamp", -1).to_list(length=limit)

        for e in entries:
            e["_id"] = str(e["_id"])

        total = len(entries)
        success = sum(1 for e in entries if e.get("result") == "SUCCESS")
        unauthorized = sum(1 for e in entries if e.get("result") == "UNAUTHORIZED")

        # Doors accessed
        doors_accessed = list({e.get("door_display_name", "") for e in entries if e.get("door_display_name")})

        # User name from first entry
        user_name = entries[0].get("user_name", user_id) if entries else user_id

        return {
            "user_id": user_id,
            "user_name": user_name,
            "total_actions": total,
            "success_count": success,
            "unauthorized_count": unauthorized,
            "doors_accessed": doors_accessed,
            "entries": entries,
        }

    @staticmethod
    async def get_daily_heatmap(venue_id: str, days: int = 14) -> list[dict]:
        """
        Hourly access heatmap data for the last N days.
        Returns [{date, hour, count, action_breakdown}].
        """
        db = get_database()
        from datetime import timedelta
        cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

        entries = await db.access_audit.find({
            "venue_id": venue_id,
            "timestamp": {"$gte": cutoff},
        }).to_list(length=20000)

        heatmap: dict[str, dict] = {}

        for e in entries:
            ts = e.get("timestamp", "")
            if not ts:
                continue
            try:
                dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
            except (ValueError, AttributeError):
                continue

            date_str = dt.strftime("%Y-%m-%d")
            hour = dt.hour
            key = f"{date_str}-{hour:02d}"

            if key not in heatmap:
                heatmap[key] = {
                    "date": date_str,
                    "hour": hour,
                    "count": 0,
                    "unlock": 0,
                    "lock": 0,
                    "unlatch": 0,
                }

            heatmap[key]["count"] += 1
            action = e.get("action", "").lower()
            if action in heatmap[key]:
                heatmap[key][action] += 1

        # Sort by date+hour
        result = sorted(heatmap.values(), key=lambda x: (x["date"], x["hour"]))
        return result

    @staticmethod
    async def get_activity_timeline(venue_id: str, limit: int = 50) -> list[dict]:
        """
        Activity timeline — human-readable feed of recent access events.
        Groups events and enriches with context for frontend display.
        """
        db = get_database()
        entries = await db.access_audit.find({
            "venue_id": venue_id,
        }).sort("timestamp", -1).to_list(length=limit)

        timeline = []
        for e in entries:
            action = e.get("action", "UNKNOWN")
            result = e.get("result", "UNKNOWN")
            user = e.get("user_name", "Unknown")
            door = e.get("door_display_name", "Unknown")

            # Human-readable description
            action_verbs = {"UNLOCK": "unlocked", "LOCK": "locked", "UNLATCH": "unlatched"}
            verb = action_verbs.get(action, action.lower())

            if result == "SUCCESS":
                description = f"{user} {verb} {door}"
                severity = "info"
            elif result == "UNAUTHORIZED":
                description = f"{user} was denied access to {door}"
                severity = "warning"
            elif result == "FAILURE":
                description = f"Failed to {action.lower()} {door} for {user}"
                severity = "error"
            else:
                description = f"{user} attempted {action.lower()} on {door}"
                severity = "info"

            timeline.append({
                "id": e.get("id", ""),
                "timestamp": e.get("timestamp", ""),
                "description": description,
                "severity": severity,
                "action": action,
                "result": result,
                "user_name": user,
                "door_name": door,
                "provider_path": e.get("provider_path", "WEB"),
                "duration_ms": e.get("duration_ms"),
                "error_message": e.get("error_message"),
            })

        return timeline

    # ==================== PHASE 3: KEYPAD PIN MANAGEMENT ====================

    @staticmethod
    async def create_keypad_pin(
        venue_id: str,
        door_id: str,
        name: str,
        code: int,
        created_by: str,
        valid_from: Optional[str] = None,
        valid_until: Optional[str] = None,
    ) -> dict:
        """
        Create a Keypad 2 PIN for a door.
        Dispatches to Nuki Web API and stores locally for lifecycle management.
        """
        db = get_database()
        now = datetime.now(timezone.utc).isoformat()

        # Validate door
        door = await db.doors.find_one({"id": door_id, "venue_id": venue_id})
        if not door:
            return {"error": "Door not found"}

        # Get token
        token = await AccessControlService.get_token(venue_id)
        if not token:
            return {"error": "No active Nuki connection"}

        # Create PIN on Nuki
        nuki_result = await NukiProvider.create_keypad_pin(
            smartlock_id=door["nuki_smartlock_id"],
            name=name,
            code=code,
            token=token,
            valid_from=valid_from,
            valid_until=valid_until,
        )

        success = nuki_result is not None and nuki_result.get("success", True)
        # Handle Nuki API variations (some return empty body on 204 success)
        
        if not success:
             return {"error": "Nuki API failed to create PIN"}

        # Store locally
        pin_config = {
             "id": f"pin-{uuid.uuid4().hex[:8]}",
             "venue_id": venue_id,
             "door_id": door_id,
             "nuki_auth_id": nuki_result.get("id") if nuki_result else None, 
             "name": name,
             "pin_hash": "REDACTED", # Don't store actual PIN
             "is_active": True,
             "valid_from": valid_from,
             "valid_until": valid_until,
             "created_at": now,
             "created_by": created_by,
        }
        
        await db.keypad_pins.insert_one(pin_config)
        
        return pin_config

    @staticmethod
    async def list_keypad_pins(venue_id: str, door_id: Optional[str] = None) -> list[dict]:
        """List active keypad PINs."""
        db = get_database()
        query = {"venue_id": venue_id, "is_active": True}
        if door_id:
            query["door_id"] = door_id
            
        pins = await db.keypad_pins.find(query).to_list(length=100)
        for p in pins:
            p["_id"] = str(p["_id"])
        return pins

    @staticmethod
    async def revoke_keypad_pin(pin_id: str, revoked_by: str) -> dict:
        """Revoke a PIN."""
        db = get_database()
        pin = await db.keypad_pins.find_one({"id": pin_id})
        if not pin:
            return {"error": "PIN not found"}
            
        # 1. Revoke on Nuki
        door = await db.doors.find_one({"id": pin["door_id"]})
        if door and pin.get("nuki_auth_id"):
             token = await AccessControlService.get_token(pin["venue_id"])
             if token:
                 await NukiProvider.revoke_keypad_pin(door["nuki_smartlock_id"], pin["nuki_auth_id"], token)

        # 2. Update DB
        valid_until = datetime.now(timezone.utc).isoformat()
        await db.keypad_pins.update_one(
            {"id": pin_id},
            {"$set": {"is_active": False, "revoked_at": valid_until, "revoked_by": revoked_by}}
        )
        return {"success": True}

    @staticmethod
    async def auto_revoke_expired_pins(venue_id: str) -> dict:
        """Check for expired PINs and mark them as inactive."""
        # Simple implementation: just mark as inactive in DB if past valid_until
        # We assume Nuki handles the actual enforcement if allowedUntilDate was set
        
        db = get_database()
        now = datetime.now(timezone.utc).isoformat()
        
        result = await db.keypad_pins.update_many(
            {
                "venue_id": venue_id,
                "is_active": True,
                "valid_until": {"$lt": now}
            },
            {"$set": {"is_active": False, "revoked_reason": "expired"}}
        )
        
        return {"revoked_count": result.modified_count}
