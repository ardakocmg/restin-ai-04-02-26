"""
Spotify Web API Connector — Restaurant Music Control.
Uses spotipy library for OAuth + playback control.
Extends BaseConnector to integrate with Smart Home IoT system.
"""
import logging
from typing import Dict, Any
from datetime import datetime, timezone

try:
    import spotipy
    from spotipy.oauth2 import SpotifyOAuth
    SPOTIFY_AVAILABLE = True
except ImportError:
    SPOTIFY_AVAILABLE = False

from app.core.database import get_database
from app.domains.integrations.connectors.base import BaseConnector
from app.domains.integrations.models import IntegrationProvider

logger = logging.getLogger(__name__)


class SpotifyConnector(BaseConnector):
    """
    Spotify Web API Integration.
    Requires 'client_id', 'client_secret', 'refresh_token' in credentials.
    Used for restaurant ambient music control via Smart Home dashboard.
    """

    def get_provider(self) -> IntegrationProvider:
        return IntegrationProvider.SPOTIFY

    def _get_client(self) -> "spotipy.Spotify | None":
        """Build an authenticated Spotify client from stored refresh_token."""
        if not SPOTIFY_AVAILABLE:
            return None

        client_id = self.credentials.get("client_id")
        client_secret = self.credentials.get("client_secret")
        refresh_token = self.credentials.get("refresh_token")

        if not all([client_id, client_secret, refresh_token]):
            logger.error("[Spotify] Missing credentials (client_id, client_secret, or refresh_token)")
            return None

        try:
            auth_manager = SpotifyOAuth(
                client_id=client_id,
                client_secret=client_secret,
                redirect_uri="https://restin.ai/api/spotify/callback",
                scope="user-read-playback-state user-modify-playback-state user-read-currently-playing playlist-read-private playlist-read-collaborative",
            )
            # Inject the refresh token directly
            auth_manager.refresh_access_token(refresh_token)
            return spotipy.Spotify(auth_manager=auth_manager)
        except Exception as e:
            logger.error("[Spotify] Failed to create client: %s", e)
            return None

    async def validate_credentials(self) -> bool:
        if not SPOTIFY_AVAILABLE:
            logger.error("[Spotify] spotipy library not installed")
            return False

        try:
            sp = self._get_client()
            if not sp:
                return False
            user = sp.current_user()
            return user is not None and "id" in user
        except Exception as e:
            logger.error("[Spotify] Validation failed: %s", e)
            return False

    async def discover(self) -> Dict[str, Any]:
        """List available Spotify Connect devices (speakers, chromecast, etc.)."""
        if not SPOTIFY_AVAILABLE:
            return {"error": "spotipy library missing"}

        try:
            sp = self._get_client()
            if not sp:
                return {"error": "Failed to authenticate with Spotify"}

            devices_resp = sp.devices()
            devices = devices_resp.get("devices", [])
            results = []

            for dev in devices:
                results.append({
                    "name": dev.get("name"),
                    "id": dev.get("id"),
                    "type": dev.get("type", "Speaker").lower(),
                    "is_active": dev.get("is_active", False),
                    "volume_percent": dev.get("volume_percent", 0),
                })

            return {"discovered_count": len(results), "devices": results}
        except Exception as e:
            return {"error": str(e)}

    async def sync(self, window_days: int = 1) -> Dict[str, Any]:
        """
        Sync Spotify devices + current playback into iot_devices collection.
        Each Spotify Connect device becomes a 'music_player' in Smart Home.
        """
        if not SPOTIFY_AVAILABLE:
            return {"processed": 0, "failed": 0, "error": "spotipy library missing"}

        processed = 0
        failed = 0

        try:
            sp = self._get_client()
            if not sp:
                return {"processed": 0, "failed": 0, "error": "Auth failed"}

            # Get devices
            devices_resp = sp.devices()
            devices = devices_resp.get("devices", [])

            # Get current playback
            playback = None
            try:
                playback = sp.current_playback()
            except Exception:
                pass

            db = get_database()
            now = datetime.now(timezone.utc).isoformat()

            for dev in devices:
                try:
                    device_id = dev.get("id", "")
                    is_active = dev.get("is_active", False)

                    data: Dict[str, Any] = {
                        "organization_id": self.organization_id,
                        "provider": "SPOTIFY",
                        "external_id": device_id,
                        "name": dev.get("name", "Spotify Speaker"),
                        "type": "speaker",
                        "is_online": True,  # If device appears, it's online
                        "is_on": is_active,
                        "last_synced_at": now,
                        "raw_data": dev,
                        "volume_percent": dev.get("volume_percent", 0),
                    }

                    # Attach playback info to the active device
                    if is_active and playback and playback.get("is_playing") is not None:
                        track = playback.get("item") or {}
                        artists = track.get("artists", [])
                        album = track.get("album", {})
                        images = album.get("images", [])

                        data["playback"] = {
                            "is_playing": playback.get("is_playing", False),
                            "track_name": track.get("name", ""),
                            "artist": ", ".join(a.get("name", "") for a in artists),
                            "album_name": album.get("name", ""),
                            "album_art": images[0]["url"] if images else None,
                            "duration_ms": track.get("duration_ms", 0),
                            "progress_ms": playback.get("progress_ms", 0),
                            "volume_percent": playback.get("device", {}).get("volume_percent", 0),
                            "shuffle": playback.get("shuffle_state", False),
                            "repeat": playback.get("repeat_state", "off"),
                        }

                        # Also put current context (playlist) info
                        context = playback.get("context")
                        if context and context.get("type") == "playlist":
                            data["playback"]["playlist_uri"] = context.get("uri", "")

                    await db.iot_devices.update_one(
                        {"organization_id": self.organization_id, "provider": "SPOTIFY", "external_id": device_id},
                        {"$set": data},
                        upsert=True,
                    )
                    processed += 1
                except Exception as e:
                    logger.error("[Spotify] Device sync failed %s: %s", dev.get("name"), e)
                    failed += 1

            return {"processed": processed, "failed": failed}

        except Exception as e:
            return {"processed": processed, "failed": failed, "error": str(e)}

    async def execute_command(self, command: str, payload: Dict[str, Any]) -> bool:
        """
        Execute playback commands.
        Commands: PLAY, PAUSE, NEXT, PREV, VOLUME, SHUFFLE, REPEAT, PLAY_PLAYLIST
        Payload can include: device_id, volume_percent, playlist_uri
        """
        if not SPOTIFY_AVAILABLE:
            return False

        try:
            sp = self._get_client()
            if not sp:
                return False

            device_id = payload.get("device_id")
            cmd = command.upper()

            if cmd == "PLAY":
                sp.start_playback(device_id=device_id)
            elif cmd == "PAUSE":
                sp.pause_playback(device_id=device_id)
            elif cmd == "NEXT":
                sp.next_track(device_id=device_id)
            elif cmd == "PREV":
                sp.previous_track(device_id=device_id)
            elif cmd == "VOLUME":
                vol = int(payload.get("volume_percent", 50))
                sp.volume(vol, device_id=device_id)
            elif cmd == "SHUFFLE":
                state = payload.get("state", True)
                sp.shuffle(state, device_id=device_id)
            elif cmd == "REPEAT":
                # "off", "track", "context"
                mode = payload.get("mode", "off")
                sp.repeat(mode, device_id=device_id)
            elif cmd == "PLAY_PLAYLIST":
                playlist_uri = payload.get("playlist_uri")
                if playlist_uri:
                    sp.start_playback(device_id=device_id, context_uri=playlist_uri)
                else:
                    return False
            elif cmd in ("ON", "OFF"):
                # Transfer playback to device (ON) or pause (OFF)
                if cmd == "ON" and device_id:
                    sp.transfer_playback(device_id=device_id, force_play=True)
                elif cmd == "OFF":
                    sp.pause_playback(device_id=device_id)
            else:
                logger.warning("[Spotify] Unknown command: %s", cmd)
                return False

            return True
        except Exception as e:
            logger.error("[Spotify] Command '%s' failed: %s", command, e)
            return False

    async def get_playlists(self, limit: int = 50) -> list:
        """Get user's playlists for the playlist picker UI."""
        if not SPOTIFY_AVAILABLE:
            return []

        try:
            sp = self._get_client()
            if not sp:
                return []

            results = sp.current_user_playlists(limit=limit)
            playlists = []
            for item in results.get("items", []):
                images = item.get("images", [])
                playlists.append({
                    "id": item.get("id"),
                    "name": item.get("name"),
                    "uri": item.get("uri"),
                    "image": images[0]["url"] if images else None,
                    "tracks_total": item.get("tracks", {}).get("total", 0),
                    "owner": item.get("owner", {}).get("display_name", ""),
                })
            return playlists
        except Exception as e:
            logger.error("[Spotify] Failed to fetch playlists: %s", e)
            return []
