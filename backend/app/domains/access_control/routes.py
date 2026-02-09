"""
🔐 Access Control Routes — 25 REST Endpoints

All door access decisions are server-authoritative.
Frontend is UI-only — no business logic allowed client-side.

Phase 1 — Core:
  POST /api/access-control/connect/oauth          — Start OAuth2 flow
  GET  /api/access-control/connect/oauth/callback  — OAuth2 callback
  POST /api/access-control/connect/token           — Connect via API token
  GET  /api/access-control/connection/status        — Check connection health
  GET  /api/access-control/doors                    — List all doors
  POST /api/access-control/doors/sync               — Discover & sync devices
  PUT  /api/access-control/doors/{door_id}          — Update door display name
  POST /api/access-control/doors/{door_id}/unlock   — Unlock door
  POST /api/access-control/doors/{door_id}/lock     — Lock door
  POST /api/access-control/doors/{door_id}/unlatch  — Unlatch door
  GET  /api/access-control/permissions              — List permissions
  POST /api/access-control/permissions              — Create/update permission
  DELETE /api/access-control/permissions/{perm_id}  — Revoke permission
  GET  /api/access-control/audit-logs                       — Filtered audit log
  POST /api/access-control/bridge/configure         — Register bridge
  GET  /api/access-control/bridge/health            — Check bridge health

Phase 1.5 — Extended Nuki Features (New):
  GET  /api/access-control/doors/{door_id}/config   — Get device config
  POST /api/access-control/doors/{door_id}/config   — Update device config
  GET  /api/access-control/doors/{door_id}/native-logs — Get Nuki native logs
  GET  /api/access-control/doors/{door_id}/auths    — List Nuki auths
  POST /api/access-control/doors/{door_id}/auths    — Create Nuki auth

Phase 2 — Reporting:
  GET /api/access-control/reports/summary           — Dashboard analytics
  GET /api/access-control/reports/door/{door_id}    — Per-door access history
  GET /api/access-control/reports/user/{user_id}    — Per-user access history
  GET /api/access-control/reports/heatmap           — Daily hourly heatmap
  GET /api/access-control/reports/timeline          — Activity timeline feed

Phase 3 — Keypad PINs:
  GET  /api/access-control/keypad/pins              — List PINs
  POST /api/access-control/keypad/pins              — Create PIN
  DELETE /api/access-control/keypad/pins/{pin_id}   — Revoke PIN
"""
from fastapi import APIRouter, Query, HTTPException
from typing import Optional, List
from pydantic import BaseModel
import os
import logging
import httpx

from app.domains.access_control.service import AccessControlService
from app.domains.access_control.models import (
    DoorAction, DoorUpdate, PermissionCreate, BridgeConfigCreate, NukiCredentialCreate,
    KeypadPinCreate, DoorConfig, DoorConfigUpdate, NukiAuthorization, NukiLogEntry, NukiAuthorizationCreate
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/access-control", tags=["access-control"])


# ==================== ONBOARDING ====================

class TokenConnectBody(BaseModel):
    api_token: str


class OAuthStartResponse(BaseModel):
    redirect_url: str


@router.post("/connect/oauth")
async def start_oauth_flow(
    venue_id: str = Query(...),
):
    """
    Start OAuth2 Authorization Code flow.
    Returns the Nuki authorization URL to redirect the user to.
    """
    client_id = os.environ.get("NUKI_CLIENT_ID", "")
    redirect_uri = os.environ.get("NUKI_REDIRECT_URI", "")

    if not client_id:
        raise HTTPException(status_code=500, detail="NUKI_CLIENT_ID not configured")

    auth_url = (
        f"https://api.nuki.io/oauth/authorize"
        f"?response_type=code"
        f"&client_id={client_id}"
        f"&redirect_uri={redirect_uri}"
        f"&scope=account%20notification%20smartlock%20smartlock.readOnly%20smartlock.action%20smartlock.auth%20smartlock.config%20smartlock.log"
        f"&state={venue_id}"
    )

    return {"redirect_url": auth_url, "venue_id": venue_id}


@router.get("/connect/oauth/callback")
async def oauth_callback(
    code: str = Query(...),
    state: str = Query(""),  # venue_id passed via state param
):
    """
    OAuth2 callback — exchanges authorization code for tokens.
    Tokens are encrypted and stored. NEVER exposed to frontend.
    """
    client_id = os.environ.get("NUKI_CLIENT_ID", "")
    client_secret = os.environ.get("NUKI_CLIENT_SECRET", "")
    redirect_uri = os.environ.get("NUKI_REDIRECT_URI", "")

    if not client_id or not client_secret:
        raise HTTPException(status_code=500, detail="Nuki OAuth2 not configured")

    venue_id = state
    if not venue_id:
        raise HTTPException(status_code=400, detail="Missing venue_id in state parameter")

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                "https://api.nuki.io/oauth/token",
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "redirect_uri": redirect_uri,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )

            if resp.status_code != 200:
                logger.error(f"OAuth2 token exchange failed: {resp.status_code} {resp.text[:300]}")
                raise HTTPException(status_code=502, detail="OAuth2 token exchange failed")

            token_data = resp.json()

        result = await AccessControlService.store_oauth_tokens(
            venue_id=venue_id,
            access_token=token_data["access_token"],
            refresh_token=token_data.get("refresh_token", ""),
            expires_at=str(token_data.get("expires_in", 3600)),
        )

        return {**result, "message": "OAuth2 connected successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OAuth2 callback error: {e}")
        raise HTTPException(status_code=500, detail="OAuth2 connection failed")


@router.post("/connect/token")
async def connect_api_token(
    body: TokenConnectBody,
    venue_id: str = Query(...),
):
    """
    Connect using an API token (fast onboarding).
    Token is encrypted at rest and NEVER shown again.
    """
    if not body.api_token or len(body.api_token) < 10:
        raise HTTPException(status_code=400, detail="Invalid API token")

    result = await AccessControlService.store_api_token(venue_id, body.api_token)
    return result


@router.get("/connection/status")
async def get_connection_status(venue_id: str = Query(...)):
    """Check Nuki connection health without exposing secrets."""
    return await AccessControlService.get_connection_status(venue_id)


# ==================== DOOR MANAGEMENT ====================

@router.get("/doors")
async def list_doors(venue_id: str = Query(...)):
    """List all doors for a venue."""
    return await AccessControlService.get_doors(venue_id)


@router.post("/doors/sync")
async def sync_devices(venue_id: str = Query(...)):
    """Discover and sync devices from Nuki."""
    result = await AccessControlService.sync_devices(venue_id)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.post("/doors/{door_id}/rename")
async def rename_door_post(door_id: str, body: DoorUpdate, venue_id: str = Query(...)):
    """Rename door (Action alias for PUT)."""
    door = await AccessControlService.update_door(door_id, body.display_name)
    if not door:
        raise HTTPException(status_code=404, detail="Door not found")
    return door


@router.put("/doors/{door_id}")
async def update_door(door_id: str, body: DoorUpdate, venue_id: str = Query(...)):
    """Update door display name."""
    door = await AccessControlService.update_door(door_id, body.display_name)
    if not door:
        raise HTTPException(status_code=404, detail="Door not found")
    return door


# ==================== EXTENDED NUKI FEATURES ====================

@router.get("/doors/{door_id}/config", response_model=DoorConfig)
async def get_door_config(door_id: str, venue_id: str = Query(...)):
    """Get device configuration (LED, Button, etc)."""
    config = await AccessControlService.get_door_config(venue_id, door_id)
    if not config:
        raise HTTPException(status_code=404, detail="Door or config not found")
    return config


@router.post("/doors/{door_id}/config")
async def update_door_config(
    door_id: str,
    body: DoorConfigUpdate,
    venue_id: str = Query(...),
):
    """Update device configuration."""
    success = await AccessControlService.update_door_config(venue_id, door_id, body.dict(exclude_unset=True))
    if not success:
        raise HTTPException(status_code=400, detail="Failed to update configuration")
    return {"success": True}


@router.get("/doors/{door_id}/native-logs", response_model=List[NukiLogEntry])
async def get_native_logs(
    door_id: str,
    venue_id: str = Query(...),
    limit: int = 50,
):
    """Fetch raw Nuki logs (redundancy)."""
    return await AccessControlService.get_native_logs(venue_id, door_id, limit)


@router.get("/doors/{door_id}/auths", response_model=List[NukiAuthorization])
async def list_nuki_auths(door_id: str, venue_id: str = Query(...)):
    """List all Nuki authorizations (Keypad, App, Fob)."""
    return await AccessControlService.list_nuki_authorizations(venue_id, door_id)


@router.post("/doors/{door_id}/auths")
async def create_nuki_auth(
    door_id: str,
    body: NukiAuthorizationCreate,
    venue_id: str = Query(...),
):
    """Create a new Nuki authorization (App User)."""
    success = await AccessControlService.create_nuki_authorization(venue_id, door_id, body.name)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to create authorization")
    return {"success": True}


# ==================== ACTIONS ====================

@router.post("/doors/{door_id}/unlock")
async def unlock_door(
    door_id: str,
    venue_id: str = Query(...),
    user_id: str = Query(..., description="Authenticated user ID"),
    request_id: Optional[str] = Query(None, description="Idempotency key"),
):
    """Unlock a door. Permission-checked + audited."""
    result = await AccessControlService.execute_door_action(
        venue_id=venue_id, user_id=user_id,
        door_id=door_id, action=DoorAction.UNLOCK,
        request_id=request_id,
    )
    if not result["success"]:
        status = 403 if result.get("error") == "Permission denied" else 502
        raise HTTPException(status_code=status, detail=result["error"])
    return result


@router.post("/doors/{door_id}/lock")
async def lock_door(
    door_id: str,
    venue_id: str = Query(...),
    user_id: str = Query(...),
    request_id: Optional[str] = Query(None),
):
    """Lock a door. Permission-checked + audited."""
    result = await AccessControlService.execute_door_action(
        venue_id=venue_id, user_id=user_id,
        door_id=door_id, action=DoorAction.LOCK,
        request_id=request_id,
    )
    if not result["success"]:
        status = 403 if result.get("error") == "Permission denied" else 502
        raise HTTPException(status_code=status, detail=result["error"])
    return result


@router.post("/doors/{door_id}/unlatch")
async def unlatch_door(
    door_id: str,
    venue_id: str = Query(...),
    user_id: str = Query(...),
    request_id: Optional[str] = Query(None),
):
    """Unlatch a door. Permission-checked + audited."""
    result = await AccessControlService.execute_door_action(
        venue_id=venue_id, user_id=user_id,
        door_id=door_id, action=DoorAction.UNLATCH,
        request_id=request_id,
    )
    if not result["success"]:
        status = 403 if result.get("error") == "Permission denied" else 502
        raise HTTPException(status_code=status, detail=result["error"])
    return result


# ==================== PERMISSIONS ====================

@router.get("/permissions")
async def list_permissions(venue_id: str = Query(...)):
    """List all door permissions for a venue."""
    return await AccessControlService.get_permissions(venue_id)


@router.post("/permissions")
async def create_permission(
    body: PermissionCreate,
    venue_id: str = Query(...),
    user_id: str = Query("system", description="Who is creating this permission"),
):
    """Create or update a door permission (role or user-specific)."""
    if not body.role_id and not body.user_id:
        raise HTTPException(status_code=400, detail="Must specify either role_id or user_id")

    result = await AccessControlService.create_permission(
        venue_id=venue_id,
        data=body.dict(),
        created_by=user_id,
    )
    return result


@router.delete("/permissions/{perm_id}")
async def delete_permission(perm_id: str):
    """Revoke a door permission."""
    deleted = await AccessControlService.delete_permission(perm_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Permission not found")
    return {"status": "revoked", "id": perm_id}


# ==================== AUDIT ====================

@router.get("/audit-logs")
async def get_audit_log(
    venue_id: str = Query(...),
    door_id: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
):
    """
    Retrieve filtered audit log.
    Entries are IMMUTABLE — door names are snapshots at time of action.
    """
    return await AccessControlService.get_audit_log(
        venue_id=venue_id, door_id=door_id,
        user_id=user_id, action=action, limit=limit,
    )


# ==================== BRIDGE ====================

@router.post("/bridge/configure")
async def configure_bridge(
    body: BridgeConfigCreate,
    venue_id: str = Query(...),
):
    """Register a Nuki Bridge for local LAN execution."""
    return await AccessControlService.configure_bridge(
        venue_id=venue_id,
        ip=body.ip_address,
        port=body.port,
        token=body.token,
    )


@router.get("/bridge/health")
async def get_bridge_health(venue_id: str = Query(...)):
    """Check Nuki Bridge connectivity and health."""
    return await AccessControlService.get_bridge_health(venue_id)


# ==================== PHASE 2: REPORTING ====================

@router.get("/reports/summary")
async def get_access_summary(
    venue_id: str = Query(...),
    days: int = Query(30, ge=1, le=365, description="Analysis period in days"),
):
    """Dashboard analytics: success rate, busiest door, most active user."""
    return await AccessControlService.get_access_summary(venue_id, days)


@router.get("/reports/door/{door_id}")
async def get_door_history(
    door_id: str,
    venue_id: str = Query(...),
    limit: int = Query(200, ge=1, le=1000),
):
    """Per-door access history with aggregated stats."""
    result = await AccessControlService.get_door_history(venue_id, door_id, limit)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@router.get("/reports/user/{user_id}")
async def get_user_history(
    user_id: str,
    venue_id: str = Query(...),
    limit: int = Query(200, ge=1, le=1000),
):
    """Per-user access history across all doors."""
    return await AccessControlService.get_user_history(venue_id, user_id, limit)


@router.get("/reports/heatmap")
async def get_daily_heatmap(
    venue_id: str = Query(...),
    days: int = Query(14, ge=1, le=90, description="Heatmap period in days"),
):
    """Hourly access heatmap for visualization (date × hour grid)."""
    return await AccessControlService.get_daily_heatmap(venue_id, days)


@router.get("/reports/timeline")
async def get_activity_timeline(
    venue_id: str = Query(...),
    limit: int = Query(50, ge=1, le=200),
):
    """Human-readable activity feed with severity levels and descriptions."""
    return await AccessControlService.get_activity_timeline(venue_id, limit)


# ==================== PHASE 3: KEYPAD PINs ====================

@router.get("/keypad/pins")
async def list_keypad_pins(
    venue_id: str = Query(...),
    door_id: Optional[str] = Query(None, description="Filter by door"),
):
    """List all keypad PINs for a venue. Optionally filter by door."""
    # Auto-revoke expired PINs on each list request
    await AccessControlService.auto_revoke_expired_pins(venue_id)
    return await AccessControlService.list_keypad_pins(venue_id, door_id)


@router.post("/keypad/pins")
async def create_keypad_pin(
    body: KeypadPinCreate,
    venue_id: str = Query(...),
    created_by: str = Query("admin", description="Who is creating this PIN"),
):
    """Create a time-limited Keypad PIN. Dispatched to Nuki device and tracked locally."""
    result = await AccessControlService.create_keypad_pin(
        venue_id=venue_id,
        door_id=body.door_id,
        name=body.name,
        code=body.code,
        created_by=created_by,
        valid_from=body.valid_from,
        valid_until=body.valid_until,
    )
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.delete("/keypad/pins/{pin_id}")
async def revoke_keypad_pin(
    pin_id: str,
    revoked_by: str = Query("admin", description="Who is revoking this PIN"),
):
    """Revoke a keypad PIN. Removes from Nuki device and marks locally as revoked."""
    result = await AccessControlService.revoke_keypad_pin(pin_id, revoked_by)
    if "error" in result:
        raise HTTPException(
            status_code=404 if "not found" in result["error"] else 400,
            detail=result["error"],
        )
    return result


@router.post("/keypad/auto-revoke")
async def auto_revoke_expired_pins(venue_id: str = Query(...)):
    """Manually trigger auto-revocation of expired PINs."""
    return await AccessControlService.auto_revoke_expired_pins(venue_id)
