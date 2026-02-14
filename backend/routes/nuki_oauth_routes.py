"""
Nuki OAuth2 Routes — Start, Callback, Status
Handles OAuth2 Authorization Code flow with Nuki Web API.
After authorization, the access token is saved to integration_configs.
"""
import httpx
import logging
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from datetime import datetime, timezone
from urllib.parse import urlencode

from core.dependencies import get_current_user, get_database
from core.config import NUKI_CLIENT_ID, NUKI_CLIENT_SECRET, NUKI_REDIRECT_URI

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/integrations/nuki", tags=["Nuki OAuth2"])

NUKI_AUTH_URL = "https://api.nuki.io/oauth/authorize"
NUKI_TOKEN_URL = "https://api.nuki.io/oauth/token"
NUKI_WEB_API = "https://api.nuki.io"


@router.get("/oauth/start")
async def nuki_oauth_start(
    current_user: dict = Depends(get_current_user),
):
    """
    Step 1: Redirect user to Nuki OAuth2 authorization page.
    The user logs in at Nuki and authorizes our app.
    """
    if not NUKI_CLIENT_ID:
        raise HTTPException(status_code=500, detail="NUKI_CLIENT_ID not configured")
    if not NUKI_REDIRECT_URI:
        raise HTTPException(status_code=500, detail="NUKI_REDIRECT_URI not configured")

    params = urlencode({
        "response_type": "code",
        "client_id": NUKI_CLIENT_ID,
        "redirect_uri": NUKI_REDIRECT_URI,
        "scope": "account notification smartlock smartlock.readOnly smartlock.action smartlock.auth smartlock.config smartlock.log",
    })

    redirect_url = f"{NUKI_AUTH_URL}?{params}"
    logger.info("[Nuki OAuth] Redirecting user to Nuki authorization page")
    return RedirectResponse(url=redirect_url)


@router.get("/oauth/callback")
async def nuki_oauth_callback(
    request: Request,
    db=Depends(get_database),
):
    """
    Step 2: Nuki redirects back here with ?code=XXX.
    We exchange the code for an access token and save it to DB.
    """
    code = request.query_params.get("code")
    error = request.query_params.get("error")

    if error:
        logger.error(f"[Nuki OAuth] Authorization denied: {error}")
        # Redirect to frontend with error
        return RedirectResponse(url="/admin/integrations?nuki_error=denied")

    if not code:
        logger.error("[Nuki OAuth] No code received in callback")
        return RedirectResponse(url="/admin/integrations?nuki_error=no_code")

    # Exchange authorization code for access token
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                NUKI_TOKEN_URL,
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "client_id": NUKI_CLIENT_ID,
                    "client_secret": NUKI_CLIENT_SECRET,
                    "redirect_uri": NUKI_REDIRECT_URI,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )

            if resp.status_code != 200:
                logger.error(f"[Nuki OAuth] Token exchange failed: {resp.status_code} {resp.text[:300]}")
                return RedirectResponse(url="/admin/integrations?nuki_error=token_exchange_failed")

            token_data = resp.json()
            access_token = token_data.get("access_token")
            refresh_token = token_data.get("refresh_token")
            expires_in = token_data.get("expires_in", 2592000)  # Default 30 days

            if not access_token:
                logger.error("[Nuki OAuth] No access_token in response")
                return RedirectResponse(url="/admin/integrations?nuki_error=no_token")

    except Exception as e:
        logger.error(f"[Nuki OAuth] Token exchange error: {e}")
        return RedirectResponse(url="/admin/integrations?nuki_error=exchange_error")

    # Save token to integration_configs (upsert)
    now = datetime.now(timezone.utc).isoformat()
    await db.integration_configs.update_one(
        {"provider": "NUKI"},
        {
            "$set": {
                "provider": "NUKI",
                "credentials": {
                    "api_token": access_token,
                    "refresh_token": refresh_token,
                    "oauth_expires_in": expires_in,
                    "oauth_connected_at": now,
                },
                "isEnabled": True,
                "status": "CONNECTED",
                "lastSync": now,
                "updatedAt": now,
            },
            "$setOnInsert": {
                "createdAt": now,
            },
        },
        upsert=True,
    )

    logger.info("[Nuki OAuth] Token saved successfully. Redirecting to integrations page.")
    return RedirectResponse(url="/admin/integrations?nuki_connected=true")


@router.get("/status")
async def nuki_status(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """
    Check Nuki connection status: connected/disconnected + device count.
    """
    config = await db.integration_configs.find_one(
        {"provider": "NUKI"},
        {"_id": 0},
    )

    if not config or not config.get("isEnabled"):
        return {
            "connected": False,
            "deviceCount": 0,
            "connectedAt": None,
        }

    # Try to fetch devices to verify token is valid
    token = config.get("credentials", {}).get("api_token")
    if not token:
        return {
            "connected": False,
            "deviceCount": 0,
            "connectedAt": None,
        }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"{NUKI_WEB_API}/smartlock",
                headers={"Authorization": f"Bearer {token}"},
            )
            if resp.status_code == 200:
                devices = resp.json()
                return {
                    "connected": True,
                    "deviceCount": len(devices),
                    "connectedAt": config.get("credentials", {}).get("oauth_connected_at"),
                    "devices": [
                        {"id": d.get("smartlockId"), "name": d.get("name")}
                        for d in devices
                    ],
                }
            else:
                return {
                    "connected": False,
                    "deviceCount": 0,
                    "connectedAt": None,
                    "error": f"API returned {resp.status_code}",
                }
    except Exception as e:
        logger.error(f"[Nuki Status] Error checking status: {e}")
        return {
            "connected": False,
            "deviceCount": 0,
            "error": str(e),
        }


def create_nuki_oauth_router():
    return router
