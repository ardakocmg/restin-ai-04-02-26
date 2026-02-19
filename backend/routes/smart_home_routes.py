"""
Smart Home / IoT Routes (Pillar 4: IoT Sentinel)
Provides device listing, status, and control for Meross/Tuya smart home devices.
Reads from iot_devices collection (real synced data). Background sync via connectors.
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from core.dependencies import get_current_user, get_database
from core.database import db as module_db
from datetime import datetime, timezone
import logging
import asyncio

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/smart-home", tags=["Smart Home / IoT"])

# ─── Meross device category mapping (type string → frontend category) ────
MEROSS_CATEGORY_MAP = {
    "mss310": "plug",
    "mss210": "plug",
    "mss110": "plug",
    "mss425f": "surge_protector",
    "mss425e": "surge_protector",
    "mss620": "plug",
    "msg200": "gate",
    "msg100": "gate",
    "msh300": "hub",
    "ms400": "leak_sensor",
    "gs559a": "smoke_alarm",
    "gs559": "door_sensor",
    "bl100": "bulb",
    "msl120": "bulb",
    "msl100": "bulb",
}

# ─── Tuya device category mapping (Tuya category code → frontend category) ────
TUYA_CATEGORY_MAP = {
    "cz": "plug",       # socket/plug
    "kg": "plug",       # switch
    "dj": "bulb",       # light
    "dd": "bulb",       # dimmer
    "fwd": "bulb",      # dimmer
    "cl": "gate",       # curtain/gate
    "mc": "gate",       # garage door
    "rqbj": "smoke_alarm",
    "ywbj": "smoke_alarm",
    "sj": "leak_sensor",
    "mcs": "door_sensor",
    "wk": "plug",       # thermostat
}

# ─── Spotify device category mapping ─────────────────────────────────────
SPOTIFY_CATEGORY_MAP = {
    "speaker": "music_player",
    "computer": "music_player",
    "smartphone": "music_player",
    "castgroup": "music_player",
    "castavideo": "music_player",
    "castaudio": "music_player",
    "automobile": "music_player",
}


def _map_iot_device(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Map an iot_devices document to the SmartDevice format expected by the frontend."""
    provider = (doc.get("provider") or "unknown").lower()
    dev_type = (doc.get("type") or "unknown").lower()
    raw = doc.get("raw_data") or {}

    # Determine device_category
    if provider == "meross":
        device_category = MEROSS_CATEGORY_MAP.get(dev_type, "unknown")
    elif provider == "tuya":
        device_category = TUYA_CATEGORY_MAP.get(dev_type, "unknown")
    elif provider == "spotify":
        device_category = SPOTIFY_CATEGORY_MAP.get(dev_type, "music_player")
    else:
        device_category = "unknown"

    result = {
        "name": doc.get("name", "Unknown Device"),
        "uuid": doc.get("external_id") or doc.get("uuid") or str(doc.get("_id", "")),
        "type": doc.get("type", "unknown").upper(),
        "online": doc.get("is_online", False),
        "is_on": doc.get("is_on"),
        "firmware": raw.get("fw") or raw.get("firmware"),
        "hardware": raw.get("hw") or raw.get("hardware"),
        "device_category": device_category,
        "provider": provider,
        "last_synced": doc.get("last_synced_at"),
    }

    # Attach Spotify playback metadata for music_player devices
    if provider == "spotify":
        playback = doc.get("playback", {})
        result["playback"] = {
            "is_playing": playback.get("is_playing", False),
            "track_name": playback.get("track_name", ""),
            "artist": playback.get("artist", ""),
            "album_name": playback.get("album_name", ""),
            "album_art": playback.get("album_art"),
            "duration_ms": playback.get("duration_ms", 0),
            "progress_ms": playback.get("progress_ms", 0),
            "volume_percent": doc.get("volume_percent", 0),
            "shuffle": playback.get("shuffle", False),
            "repeat": playback.get("repeat", "off"),
            "playlist_uri": playback.get("playlist_uri", ""),
        }

    return result


class ControlRequest(BaseModel):
    command: str  # ON, OFF, OPEN, CLOSE, TOGGLE
    channel: int = 0


class SyncResponse(BaseModel):
    syncing: bool
    message: str


# ─── Sync State (in-memory flag) ─────────────────────────────────────────
_sync_in_progress = False
_last_sync_error: Optional[str] = None
_sync_task = None  # Store reference to prevent GC


async def _run_background_sync():
    """Background task: sync devices from Meross + Tuya APIs into iot_devices collection."""
    global _sync_in_progress, _last_sync_error
    print("[SYNC] _run_background_sync STARTED")
    _sync_in_progress = True
    _last_sync_error = None
    db = module_db  # Use the module-level singleton
    print(f"[SYNC] db object: {type(db)}")

    try:
        # Read credentials from integration_configs
        configs = {}
        print("[SYNC] Looking for MEROSS/TUYA/SPOTIFY configs in integration_configs...")
        async for doc in db.integration_configs.find(
            {"provider": {"$in": ["MEROSS", "TUYA", "SPOTIFY"]}, "isEnabled": True},
            {"_id": 0}
        ):
            provider = doc["provider"]
            creds = doc.get("credentials", {})
            configs[provider] = creds
            print(f"[SYNC] Found {provider}: keys={list(creds.keys())}")

        print(f"[SYNC] Total configs found: {list(configs.keys())}")
        if not configs:
            print("[SYNC] WARNING: No enabled MEROSS/TUYA configs found!")
            # Debug: check what IS in the collection
            all_count = await db.integration_configs.count_documents({})
            print(f"[SYNC] Total docs in integration_configs: {all_count}")
            async for doc in db.integration_configs.find({}, {"_id": 0, "credentials": 0}):
                print(f"[SYNC]   - provider={doc.get('provider')}, isEnabled={doc.get('isEnabled')}, status={doc.get('status')}")

        total_processed = 0
        total_failed = 0

        # ── Meross Sync ──
        if "MEROSS" in configs:
            try:
                from app.domains.integrations.connectors.meross import MerossConnector, MEROSS_AVAILABLE
                if MEROSS_AVAILABLE:
                    connector = MerossConnector(
                        organization_id="default",
                        credentials=configs["MEROSS"],
                        settings={}
                    )
                    result = await connector.sync()
                    total_processed += result.get("processed", 0)
                    total_failed += result.get("failed", 0)
                    logger.info("[SmartHome] Meross sync: processed=%d, failed=%d", 
                               result.get("processed", 0), result.get("failed", 0))
                else:
                    logger.warning("[SmartHome] meross-iot library not installed, skipping Meross sync")
            except ImportError:
                logger.warning("[SmartHome] Meross connector import failed, skipping")
            except Exception as e:
                logger.error("[SmartHome] Meross sync error: %s", str(e))
                _last_sync_error = f"Meross: {str(e)}"

        # ── Tuya Sync ──
        if "TUYA" in configs:
            try:
                from app.domains.integrations.connectors.tuya import TuyaConnector, TUYA_AVAILABLE
                if TUYA_AVAILABLE:
                    connector = TuyaConnector(
                        organization_id="default",
                        credentials=configs["TUYA"],
                        settings={}
                    )
                    result = await connector.sync()
                    total_processed += result.get("processed", 0)
                    total_failed += result.get("failed", 0)
                    logger.info("[SmartHome] Tuya sync: processed=%d, failed=%d",
                               result.get("processed", 0), result.get("failed", 0))
                else:
                    logger.warning("[SmartHome] tuya-connector library not installed, skipping Tuya sync")
            except ImportError:
                logger.warning("[SmartHome] Tuya connector import failed, skipping")
            except Exception as e:
                logger.error("[SmartHome] Tuya sync error: %s", str(e))
                _last_sync_error = f"Tuya: {str(e)}"

        # ── Spotify Sync ──
        if "SPOTIFY" in configs:
            try:
                from app.domains.integrations.connectors.spotify import SpotifyConnector, SPOTIFY_AVAILABLE
                if SPOTIFY_AVAILABLE:
                    connector = SpotifyConnector(
                        organization_id="default",
                        credentials=configs["SPOTIFY"],
                        settings={}
                    )
                    result = await connector.sync()
                    total_processed += result.get("processed", 0)
                    total_failed += result.get("failed", 0)
                    logger.info("[SmartHome] Spotify sync: processed=%d, failed=%d",
                               result.get("processed", 0), result.get("failed", 0))
                else:
                    logger.warning("[SmartHome] spotipy library not installed, skipping Spotify sync")
            except ImportError:
                logger.warning("[SmartHome] Spotify connector import failed, skipping")
            except Exception as e:
                logger.error("[SmartHome] Spotify sync error: %s", str(e))
                _last_sync_error = f"Spotify: {str(e)}"

        # Update last sync timestamp on integration_configs
        now = datetime.now(timezone.utc)
        await db.integration_configs.update_many(
            {"provider": {"$in": ["MEROSS", "TUYA", "SPOTIFY"]}, "isEnabled": True},
            {"$set": {"lastSync": now.isoformat()}}
        )

        logger.info("[SmartHome] Background sync complete: %d processed, %d failed", total_processed, total_failed)

    except Exception as e:
        logger.error("[SmartHome] Background sync fatal error: %s", str(e))
        _last_sync_error = str(e)
    finally:
        _sync_in_progress = False


@router.get("/devices")
async def get_devices(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """
    Get all smart home devices from iot_devices collection (cached/synced data).
    Returns instantly from DB — no blocking API calls.
    """
    devices_raw = await db.iot_devices.find({}, {"_id": 0}).to_list(length=200)

    devices = [_map_iot_device(doc) for doc in devices_raw]
    online = sum(1 for d in devices if d.get("online"))
    offline = len(devices) - online

    return {
        "total": len(devices),
        "online": online,
        "offline": offline,
        "devices": devices,
        "syncing": _sync_in_progress,
        "last_sync_error": _last_sync_error,
    }


@router.post("/sync")
async def trigger_sync(
    current_user: dict = Depends(get_current_user),
):
    """
    Trigger a background sync from Meross + Tuya cloud APIs.
    Returns immediately — devices will update in DB asynchronously.
    """
    global _sync_in_progress, _sync_task
    if _sync_in_progress:
        return {"syncing": True, "message": "Sync already in progress"}

    print("[SYNC] Creating background sync task...")
    _sync_task = asyncio.create_task(_run_background_sync())
    print(f"[SYNC] Task created: {_sync_task}")
    return {"syncing": True, "message": "Sync started in background"}


@router.get("/sync/status")
async def get_sync_status(
    current_user: dict = Depends(get_current_user),
):
    """Check if a background sync is currently running."""
    return {
        "syncing": _sync_in_progress,
        "last_error": _last_sync_error,
    }


@router.post("/devices/{device_uuid}/control")
async def control_device(
    device_uuid: str,
    request: ControlRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """
    Send a control command to a smart home device.
    Tries real connector first, falls back to DB-only state update.
    """
    device = await db.iot_devices.find_one({"external_id": device_uuid})
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    provider = (device.get("provider") or "").upper()
    command_sent = False

    # Try real connector
    if provider == "MEROSS":
        try:
            from app.domains.integrations.connectors.meross import MerossConnector, MEROSS_AVAILABLE
            if MEROSS_AVAILABLE:
                creds_doc = await db.integration_configs.find_one({"provider": "MEROSS", "isEnabled": True})
                if creds_doc:
                    connector = MerossConnector(
                        organization_id=device.get("organization_id", "default"),
                        credentials=creds_doc.get("credentials", {}),
                        settings={}
                    )
                    command_sent = await connector.execute_command(
                        request.command.upper(),
                        {"uuid": device_uuid}
                    )
        except Exception as e:
            logger.error("[SmartHome] Meross control error: %s", str(e))

    elif provider == "TUYA":
        try:
            from app.domains.integrations.connectors.tuya import TuyaConnector, TUYA_AVAILABLE
            if TUYA_AVAILABLE:
                creds_doc = await db.integration_configs.find_one({"provider": "TUYA", "isEnabled": True})
                if creds_doc:
                    connector = TuyaConnector(
                        organization_id=device.get("organization_id", "default"),
                        credentials=creds_doc.get("credentials", {}),
                        settings={}
                    )
                    command_sent = await connector.execute_command(
                        request.command.upper(),
                        {"device_id": device_uuid}
                    )
        except Exception as e:
            logger.error("[SmartHome] Tuya control error: %s", str(e))

    elif provider == "SPOTIFY":
        try:
            from app.domains.integrations.connectors.spotify import SpotifyConnector, SPOTIFY_AVAILABLE
            if SPOTIFY_AVAILABLE:
                creds_doc = await db.integration_configs.find_one({"provider": "SPOTIFY", "isEnabled": True})
                if creds_doc:
                    connector = SpotifyConnector(
                        organization_id=device.get("organization_id", "default"),
                        credentials=creds_doc.get("credentials", {}),
                        settings={}
                    )
                    command_sent = await connector.execute_command(
                        request.command.upper(),
                        {"device_id": device_uuid}
                    )
        except Exception as e:
            logger.error("[SmartHome] Spotify control error: %s", str(e))

    # Always update local state (optimistic)
    update_fields: Dict[str, Any] = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if request.command.upper() in ("ON", "OPEN"):
        update_fields["is_on"] = True
    elif request.command.upper() in ("OFF", "CLOSE"):
        update_fields["is_on"] = False

    await db.iot_devices.update_one(
        {"external_id": device_uuid},
        {"$set": update_fields},
    )

    logger.info("[SmartHome] Control: device=%s command=%s sent_to_hw=%s",
                device_uuid, request.command, command_sent)

    return {
        "status": "ok",
        "device_uuid": device_uuid,
        "command": request.command,
        "channel": request.channel,
        "hardware_confirmed": command_sent,
        "message": f"Command '{request.command}' {'sent to device' if command_sent else 'saved locally'}",
    }


def create_smart_home_router():
    return router
