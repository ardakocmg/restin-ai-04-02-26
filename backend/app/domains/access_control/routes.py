"""
🔐 Access Control Routes — 16 REST Endpoints

All door access decisions are server-authoritative.
Frontend is UI-only — no business logic allowed client-side.

Endpoints:
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
  GET  /api/access-control/audit                    — Filtered audit log
  POST /api/access-control/bridge/configure         — Register bridge
  GET  /api/access-control/bridge/health            — Check bridge health
"""
from fastapi import APIRouter, Query, HTTPException, Header
from typing import Optional
from pydantic import BaseModel
import os
import logging
import httpx

from app.domains.access_control.service import AccessControlService
from app.domains.access_control.models import (
    DoorAction, DoorUpdate, PermissionCreate, BridgeConfigCreate, NukiCredentialCreate,
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


@router.put("/doors/{door_id}")
async def update_door(door_id: str, body: DoorUpdate, venue_id: str = Query(...)):
    """Update door display name. Does NOT affect historical audit logs."""
    door = await AccessControlService.update_door(door_id, body.display_name)
    if not door:
        raise HTTPException(status_code=404, detail="Door not found")
    return door


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

@router.get("/audit")
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
