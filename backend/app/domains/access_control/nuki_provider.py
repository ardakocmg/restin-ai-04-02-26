"""
🔐 Nuki Provider — Vendor-Isolated API Client

Hybrid routing: Bridge (LAN) → Web API (Cloud) fallback.
This layer talks to Nuki. It does NOT make authorization decisions.
"""
import httpx
import logging
from typing import Optional, Any
from datetime import datetime, timezone

from app.core.database import get_database

logger = logging.getLogger(__name__)

NUKI_WEB_API = "https://api.nuki.io"


class NukiProvider:
    """
    Vendor-isolated Nuki API client.
    
    Routing priority:
    1. If venue has a healthy Bridge → LAN HTTP call
    2. Fallback → Nuki Web API (api.nuki.io)
    
    Routing is transparent to the caller.
    """

    # ==================== DEVICE DISCOVERY ====================

    @staticmethod
    async def discover_devices(venue_id: str, token: str) -> list[dict]:
        """
        Discover all smart locks from Nuki Web API.
        Returns raw device list from /smartlock endpoint.
        """
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(
                    f"{NUKI_WEB_API}/smartlock",
                    headers={"Authorization": f"Bearer {token}"},
                )
                if resp.status_code == 200:
                    devices = resp.json()
                    logger.info(f"[Nuki] Discovered {len(devices)} devices for venue {venue_id}")
                    return devices
                else:
                    logger.error(f"[Nuki] Device discovery failed: {resp.status_code} {resp.text[:200]}")
                    return []
        except Exception as e:
            logger.error(f"[Nuki] Device discovery error: {e}")
            return []

    # ==================== ACTIONS ====================

    @staticmethod
    async def execute_action(
        smartlock_id: int,
        action: str,
        token: str,
        venue_id: str,
    ) -> dict:
        """
        Execute a lock action with hybrid routing.
        
        Actions: 1=UNLOCK, 2=LOCK, 3=UNLATCH, 4=LOCK_N_GO, 5=LOCK_N_GO_UNLATCH
        
        Returns: {success: bool, provider_path: "WEB"|"BRIDGE", error: str|None, duration_ms: int}
        """
        action_map = {
            "UNLOCK": 1,
            "LOCK": 2,
            "UNLATCH": 3,
        }
        nuki_action = action_map.get(action)
        if nuki_action is None:
            return {"success": False, "provider_path": "WEB", "error": f"Unknown action: {action}", "duration_ms": 0}

        # 1. Try Bridge first (if configured and healthy)
        bridge_result = await NukiProvider._try_bridge_action(venue_id, smartlock_id, nuki_action)
        if bridge_result is not None:
            return bridge_result

        # 2. Fallback to Web API
        return await NukiProvider._web_api_action(smartlock_id, nuki_action, token)

    @staticmethod
    async def _try_bridge_action(venue_id: str, smartlock_id: int, action: int) -> Optional[dict]:
        """
        Attempt action via local Bridge HTTP API.
        Returns None if no bridge or bridge unavailable.
        """
        db = get_database()
        bridge = await db.bridge_configs.find_one({"venue_id": venue_id, "is_healthy": True})
        if not bridge:
            return None

        ip = bridge.get("ip_address")
        port = bridge.get("port", 8080)
        bridge_token = bridge.get("token", "")

        try:
            start = datetime.now(timezone.utc)
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    f"http://{ip}:{port}/lockAction",
                    json={
                        "nukiId": smartlock_id,
                        "action": action,
                        "token": bridge_token,
                    },
                )
            duration_ms = int((datetime.now(timezone.utc) - start).total_seconds() * 1000)

            if resp.status_code == 200:
                data = resp.json()
                success = data.get("success", False)
                return {
                    "success": success,
                    "provider_path": "BRIDGE",
                    "error": None if success else data.get("message", "Bridge action failed"),
                    "duration_ms": duration_ms,
                }
            else:
                logger.warning(f"[Nuki Bridge] Action failed: {resp.status_code}")
                # Mark bridge as unhealthy temporarily
                await db.bridge_configs.update_one(
                    {"venue_id": venue_id},
                    {"$set": {"is_healthy": False, "last_health_check": datetime.now(timezone.utc).isoformat()}}
                )
                return None  # Fall through to Web API

        except (httpx.ConnectError, httpx.TimeoutException) as e:
            logger.warning(f"[Nuki Bridge] Unreachable ({ip}:{port}): {e}")
            # Mark unhealthy
            await db.bridge_configs.update_one(
                {"venue_id": venue_id},
                {"$set": {"is_healthy": False, "last_health_check": datetime.now(timezone.utc).isoformat()}}
            )
            return None  # Fall through to Web API
        except Exception as e:
            logger.error(f"[Nuki Bridge] Unexpected error: {e}")
            return None

    @staticmethod
    async def _web_api_action(smartlock_id: int, action: int, token: str) -> dict:
        """Execute action via Nuki Web API (cloud)."""
        try:
            start = datetime.now(timezone.utc)
            async with httpx.AsyncClient(timeout=20.0) as client:
                resp = await client.post(
                    f"{NUKI_WEB_API}/smartlock/{smartlock_id}/action",
                    headers={"Authorization": f"Bearer {token}"},
                    json={"action": action},
                )
            duration_ms = int((datetime.now(timezone.utc) - start).total_seconds() * 1000)

            if resp.status_code in (200, 204):
                return {
                    "success": True,
                    "provider_path": "WEB",
                    "error": None,
                    "duration_ms": duration_ms,
                }
            else:
                error_detail = resp.text[:300] if resp.text else f"HTTP {resp.status_code}"
                logger.error(f"[Nuki Web] Action failed: {resp.status_code} {error_detail}")
                return {
                    "success": False,
                    "provider_path": "WEB",
                    "error": f"Nuki API error: {resp.status_code}",
                    "duration_ms": duration_ms,
                }

        except httpx.TimeoutException:
            return {"success": False, "provider_path": "WEB", "error": "Nuki API timeout", "duration_ms": 20000}
        except Exception as e:
            logger.error(f"[Nuki Web] Error: {e}")
            return {"success": False, "provider_path": "WEB", "error": str(e), "duration_ms": 0}

    # ==================== DEVICE STATUS ====================

    @staticmethod
    async def get_device_status(smartlock_id: int, token: str) -> Optional[dict]:
        """Get current device status (lock state, battery, firmware)."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    f"{NUKI_WEB_API}/smartlock/{smartlock_id}",
                    headers={"Authorization": f"Bearer {token}"},
                )
                if resp.status_code == 200:
                    return resp.json()
                logger.error(f"[Nuki] Device status failed: {resp.status_code}")
                return None
        except Exception as e:
            logger.error(f"[Nuki] Device status error: {e}")
            return None

    # ==================== ACTIVITY LOG ====================

    @staticmethod
    async def get_activity_log(
        smartlock_id: int,
        token: str,
        limit: int = 50,
    ) -> list[dict]:
        """Fetch activity log from Nuki Web API."""
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(
                    f"{NUKI_WEB_API}/smartlock/{smartlock_id}/log",
                    headers={"Authorization": f"Bearer {token}"},
                    params={"limit": limit},
                )
                if resp.status_code == 200:
                    return resp.json()
                logger.error(f"[Nuki] Activity log failed: {resp.status_code}")
                return []
        except Exception as e:
            logger.error(f"[Nuki] Activity log error: {e}")
            return []

    # ==================== BRIDGE HEALTH ====================

    @staticmethod
    async def check_bridge_health(ip: str, port: int = 8080) -> bool:
        """Ping Bridge HTTP API to verify connectivity."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(f"http://{ip}:{port}/info")
                return resp.status_code == 200
        except Exception:
            return False

    # ==================== KEYPAD (Phase 3) ====================

    @staticmethod
    async def create_keypad_pin(
        smartlock_id: int,
        name: str,
        code: int,
        token: str,
        valid_from: Optional[str] = None,
        valid_until: Optional[str] = None,
    ) -> Optional[dict]:
        """Create a Keypad 2 PIN authorization. Phase 3 — feature-flagged."""
        try:
            payload: dict[str, Any] = {
                "name": name,
                "type": 13,  # Keypad code
                "code": code,
            }
            if valid_from:
                payload["allowedFromDate"] = valid_from
            if valid_until:
                payload["allowedUntilDate"] = valid_until

            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.put(
                    f"{NUKI_WEB_API}/smartlock/{smartlock_id}/auth",
                    headers={"Authorization": f"Bearer {token}"},
                    json=payload,
                )
                if resp.status_code in (200, 204):
                    return resp.json() if resp.text else {"success": True}
                logger.error(f"[Nuki] Keypad PIN creation failed: {resp.status_code}")
                return None
        except Exception as e:
            logger.error(f"[Nuki] Keypad PIN error: {e}")
            return None

    @staticmethod
    async def revoke_keypad_pin(
        smartlock_id: int,
        auth_id: int,
        token: str,
    ) -> bool:
        """Revoke a Keypad 2 PIN authorization. Phase 3 — feature-flagged."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.delete(
                    f"{NUKI_WEB_API}/smartlock/{smartlock_id}/auth/{auth_id}",
                    headers={"Authorization": f"Bearer {token}"},
                )
                return resp.status_code in (200, 204)
        except Exception as e:
            logger.error(f"[Nuki] Keypad PIN revoke error: {e}")
            return False
