"""
Spotify Routes — OAuth flow, playlists, and playback control.
Handles initial Spotify connection via OAuth and provides
playlist browsing for the Smart Home music player UI.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Dict, Any, Optional
from pydantic import BaseModel
from core.dependencies import get_current_user, get_database
import logging
import os

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/spotify", tags=["Spotify Music Control"])


# ─── Request Models ──────────────────────────────────────────────────────

class PlayPlaylistRequest(BaseModel):
    playlist_uri: str
    device_id: Optional[str] = None


class VolumeRequest(BaseModel):
    volume_percent: int  # 0-100
    device_id: Optional[str] = None


class PlaybackCommandRequest(BaseModel):
    command: str  # PLAY, PAUSE, NEXT, PREV
    device_id: Optional[str] = None


# ─── OAuth Flow ──────────────────────────────────────────────────────────

@router.get("/auth-url")
async def get_spotify_auth_url(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """
    Generate Spotify OAuth authorization URL.
    Frontend redirects user to this URL to authenticate.
    """
    try:
        import spotipy
        from spotipy.oauth2 import SpotifyOAuth
    except ImportError:
        raise HTTPException(status_code=500, detail="spotipy library not installed")

    # Read client_id + client_secret from integration_configs
    config = await db.integration_configs.find_one(
        {"provider": "SPOTIFY"},
        {"_id": 0}
    )

    if not config:
        raise HTTPException(
            status_code=400,
            detail="Spotify integration not configured. Add Client ID and Client Secret in Sync Dashboard first."
        )

    creds = config.get("credentials", {})
    client_id = creds.get("client_id")
    client_secret = creds.get("client_secret")

    if not client_id or not client_secret:
        raise HTTPException(status_code=400, detail="Missing Spotify Client ID or Client Secret")

    # Determine callback URL
    callback_url = os.getenv("SPOTIFY_CALLBACK_URL", "http://localhost:8000/api/spotify/callback")

    auth_manager = SpotifyOAuth(
        client_id=client_id,
        client_secret=client_secret,
        redirect_uri=callback_url,
        scope="user-read-playback-state user-modify-playback-state user-read-currently-playing playlist-read-private playlist-read-collaborative",
        show_dialog=True,
    )

    auth_url = auth_manager.get_authorize_url()
    return {"auth_url": auth_url}


@router.get("/callback")
async def spotify_callback(
    code: str = Query(...),
    db=Depends(get_database),
):
    """
    Handle Spotify OAuth callback.
    Exchanges authorization code for access/refresh tokens.
    Stores refresh_token in integration_configs for future use.
    """
    try:
        import spotipy
        from spotipy.oauth2 import SpotifyOAuth
    except ImportError:
        raise HTTPException(status_code=500, detail="spotipy library not installed")

    config = await db.integration_configs.find_one(
        {"provider": "SPOTIFY"},
        {"_id": 0, "credentials": 1}
    )

    if not config:
        raise HTTPException(status_code=400, detail="Spotify not configured")

    creds = config.get("credentials", {})
    client_id = creds.get("client_id")
    client_secret = creds.get("client_secret")
    callback_url = os.getenv("SPOTIFY_CALLBACK_URL", "http://localhost:8000/api/spotify/callback")

    auth_manager = SpotifyOAuth(
        client_id=client_id,
        client_secret=client_secret,
        redirect_uri=callback_url,
        scope="user-read-playback-state user-modify-playback-state user-read-currently-playing playlist-read-private playlist-read-collaborative",
    )

    try:
        token_info = auth_manager.get_access_token(code, as_dict=True)
    except Exception as e:
        logger.error("[Spotify] Token exchange failed: %s", e)
        raise HTTPException(status_code=400, detail=f"Token exchange failed: {str(e)}")

    refresh_token = token_info.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=400, detail="No refresh token received from Spotify")

    # Save refresh_token to integration_configs
    from datetime import datetime, timezone
    await db.integration_configs.update_one(
        {"provider": "SPOTIFY"},
        {"$set": {
            "credentials.refresh_token": refresh_token,
            "status": "CONNECTED",
            "isEnabled": True,
            "lastSync": datetime.now(timezone.utc).isoformat(),
        }},
    )

    # Get user info for audit
    sp = spotipy.Spotify(auth=token_info.get("access_token"))
    user_info = sp.current_user()

    logger.info("[Spotify] OAuth completed for user: %s", user_info.get("display_name"))

    # Redirect to Smart Home dashboard
    return {
        "success": True,
        "message": f"Spotify connected as {user_info.get('display_name', 'Unknown')}",
        "spotify_user": {
            "name": user_info.get("display_name"),
            "email": user_info.get("email"),
            "image": (user_info.get("images", [{}])[0].get("url") if user_info.get("images") else None),
        }
    }


# ─── Playlists ───────────────────────────────────────────────────────────

@router.get("/playlists")
async def get_playlists(
    limit: int = Query(default=50, le=50),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """List user's Spotify playlists for the playlist picker UI."""
    connector = await _get_connector(db)
    if not connector:
        raise HTTPException(status_code=400, detail="Spotify not connected")

    playlists = await connector.get_playlists(limit=limit)
    return {"playlists": playlists, "total": len(playlists)}


# ─── Playback Controls ──────────────────────────────────────────────────

@router.post("/play-playlist")
async def play_playlist(
    request: PlayPlaylistRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """Start a specific playlist on a specific (or active) device."""
    connector = await _get_connector(db)
    if not connector:
        raise HTTPException(status_code=400, detail="Spotify not connected")

    success = await connector.execute_command("PLAY_PLAYLIST", {
        "device_id": request.device_id,
        "playlist_uri": request.playlist_uri,
    })

    if not success:
        raise HTTPException(status_code=500, detail="Failed to start playlist")

    return {"status": "ok", "message": "Playlist started"}


@router.post("/volume")
async def set_volume(
    request: VolumeRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """Set volume on a Spotify device."""
    connector = await _get_connector(db)
    if not connector:
        raise HTTPException(status_code=400, detail="Spotify not connected")

    vol = max(0, min(100, request.volume_percent))
    success = await connector.execute_command("VOLUME", {
        "device_id": request.device_id,
        "volume_percent": vol,
    })

    if not success:
        raise HTTPException(status_code=500, detail="Failed to set volume")

    return {"status": "ok", "volume_percent": vol}


@router.post("/control")
async def playback_control(
    request: PlaybackCommandRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """Send a playback command (PLAY, PAUSE, NEXT, PREV)."""
    connector = await _get_connector(db)
    if not connector:
        raise HTTPException(status_code=400, detail="Spotify not connected")

    allowed_cmds = {"PLAY", "PAUSE", "NEXT", "PREV", "SHUFFLE", "REPEAT"}
    cmd = request.command.upper()
    if cmd not in allowed_cmds:
        raise HTTPException(status_code=400, detail=f"Unknown command: {cmd}")

    success = await connector.execute_command(cmd, {
        "device_id": request.device_id,
    })

    if not success:
        raise HTTPException(status_code=500, detail=f"Command '{cmd}' failed")

    return {"status": "ok", "command": cmd}


# ─── Helpers ─────────────────────────────────────────────────────────────

async def _get_connector(db):
    """Build a SpotifyConnector from stored integration_configs."""
    config = await db.integration_configs.find_one(
        {"provider": "SPOTIFY", "isEnabled": True},
        {"_id": 0}
    )
    if not config:
        return None

    creds = config.get("credentials", {})
    if not creds.get("refresh_token"):
        return None

    from app.domains.integrations.connectors.spotify import SpotifyConnector, SPOTIFY_AVAILABLE
    if not SPOTIFY_AVAILABLE:
        return None

    return SpotifyConnector(
        organization_id=config.get("organization_id", "default"),
        credentials=creds,
        settings=config.get("settings", {}),
    )


def create_spotify_router():
    return router
