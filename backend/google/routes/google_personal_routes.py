"""
Google Personal Integration Routes
Real OAuth2 + API calls for Calendar, Drive, Gmail, Contacts, Tasks, Photos, Sheets, YouTube.
"""

import os
import json
import logging
from typing import Optional
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import RedirectResponse
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from core.dependencies import get_current_user
from core.database import db

logger = logging.getLogger("google.personal")

ALL_SERVICES = ["calendar", "drive", "gmail", "contacts", "tasks", "photos", "sheets", "youtube"]
DEFAULT_SERVICES = ["calendar", "drive"]

# Scopes needed for all 8 services
SCOPES = [
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/contacts.readonly",
    "https://www.googleapis.com/auth/tasks.readonly",
    "https://www.googleapis.com/auth/photoslibrary.readonly",
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/youtube.readonly",
]


def _get_client_config() -> dict:
    client_id = os.getenv("GOOGLE_CLIENT_ID", "")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET", "")
    if not client_id or not client_secret:
        raise HTTPException(
            status_code=500,
            detail="GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not configured in .env"
        )
    return {
        "web": {
            "client_id": client_id,
            "client_secret": client_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/google/personal/callback")],
        }
    }


def _get_redirect_uri() -> str:
    return os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/google/personal/callback")


def _get_uid(user: dict) -> str:
    return str(user.get("_id", user.get("id", user.get("sub", ""))))


def _build_service(creds, service_name: str, version: str):
    return build(service_name, version, credentials=creds, cache_discovery=False)


async def _get_credentials(user_id: str) -> Optional[Credentials]:
    token_doc = await db.user_google_tokens.find_one({"user_id": user_id, "active": True})
    if not token_doc:
        return None
    creds = Credentials(
        token=token_doc.get("access_token"),
        refresh_token=token_doc.get("refresh_token"),
        token_uri="https://oauth2.googleapis.com/token",
        client_id=os.getenv("GOOGLE_CLIENT_ID", ""),
        client_secret=os.getenv("GOOGLE_CLIENT_SECRET", ""),
        scopes=token_doc.get("scopes", SCOPES),
    )
    # Auto-refresh if expired
    if creds.expired and creds.refresh_token:
        try:
            from google.auth.transport.requests import Request as GoogleRequest
            creds.refresh(GoogleRequest())
            # Save refreshed token
            await db.user_google_tokens.update_one(
                {"user_id": user_id},
                {"$set": {
                    "access_token": creds.token,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }},
            )
        except Exception as e:
            logger.error("Token refresh failed for %s: %s", user_id, e)
            return None
    return creds


def create_google_personal_router():
    router = APIRouter(prefix="/google/personal", tags=["Google Personal"])

    # ─── OAuth Flow ─────────────────────────────────────────────────────

    @router.get("/authorize")
    async def get_authorize_url(current_user: dict = Depends(get_current_user)):
        user_id = _get_uid(current_user)
        try:
            flow = Flow.from_client_config(
                _get_client_config(),
                scopes=SCOPES,
                redirect_uri=_get_redirect_uri(),
            )
            authorization_url, state = flow.authorization_url(
                access_type="offline",
                include_granted_scopes="true",
                prompt="consent",
                state=user_id,  # Pass user_id as state for callback
            )
            # Store state for CSRF verification
            await db.google_oauth_states.update_one(
                {"state": state},
                {"$set": {"user_id": user_id, "created_at": datetime.now(timezone.utc).isoformat()}},
                upsert=True,
            )
            return {"ok": True, "url": authorization_url}
        except Exception as e:
            logger.error("OAuth authorize failed: %s", e)
            raise HTTPException(status_code=500, detail=str(e))

    @router.get("/callback")
    async def oauth_callback(request: Request, code: str = Query(...), state: str = Query("")):
        try:
            # Resolve user_id from state
            state_doc = await db.google_oauth_states.find_one({"state": state})
            user_id = state_doc.get("user_id", state) if state_doc else state

            # Exchange code for tokens
            flow = Flow.from_client_config(
                _get_client_config(),
                scopes=SCOPES,
                redirect_uri=_get_redirect_uri(),
            )
            flow.fetch_token(code=code)
            creds = flow.credentials

            # Get user info (email, name, avatar)
            user_info_service = build("oauth2", "v2", credentials=creds, cache_discovery=False)
            user_info = user_info_service.userinfo().get().execute()

            now_iso = datetime.now(timezone.utc).isoformat()
            token_doc = {
                "user_id": user_id,
                "email": user_info.get("email", ""),
                "display_name": user_info.get("name", ""),
                "avatar_url": user_info.get("picture", ""),
                "access_token": creds.token,
                "refresh_token": creds.refresh_token,
                "scopes": list(creds.scopes) if creds.scopes else SCOPES,
                "active": True,
                "connected_at": now_iso,
                "updated_at": now_iso,
            }

            await db.user_google_tokens.update_one(
                {"user_id": user_id}, {"$set": token_doc}, upsert=True,
            )

            # Set default services
            await db.user_google_services.update_one(
                {"user_id": user_id},
                {"$setOnInsert": {"user_id": user_id, "enabled": DEFAULT_SERVICES}},
                upsert=True,
            )

            # Cleanup state
            await db.google_oauth_states.delete_one({"state": state})

            logger.info("Google OAuth completed for %s (%s)", user_id, user_info.get("email"))

            # Redirect back to frontend
            frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
            return RedirectResponse(url=f"{frontend_url}/manager/my-google?connected=true")

        except Exception as e:
            logger.error("OAuth callback failed: %s", e)
            frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
            return RedirectResponse(url=f"{frontend_url}/manager/my-google?error={str(e)}")

    # ─── Status / Config ────────────────────────────────────────────────

    @router.get("/status")
    async def get_connection_status(current_user: dict = Depends(get_current_user)):
        user_id = _get_uid(current_user)
        token_doc = await db.user_google_tokens.find_one({"user_id": user_id, "active": True})
        if not token_doc:
            return {"ok": True, "connected": False}
        return {
            "ok": True,
            "connected": True,
            "email": token_doc.get("email", ""),
            "display_name": token_doc.get("display_name", ""),
            "avatar_url": token_doc.get("avatar_url", ""),
            "connected_at": token_doc.get("connected_at", ""),
        }

    @router.get("/services")
    async def get_enabled_services(current_user: dict = Depends(get_current_user)):
        user_id = _get_uid(current_user)
        doc = await db.user_google_services.find_one({"user_id": user_id})
        enabled = doc.get("enabled", DEFAULT_SERVICES) if doc else DEFAULT_SERVICES
        return {"ok": True, "enabled": enabled, "available": ALL_SERVICES}

    @router.post("/services/toggle")
    async def toggle_service(body: dict, current_user: dict = Depends(get_current_user)):
        user_id = _get_uid(current_user)
        service = body.get("service", "")
        if service not in ALL_SERVICES:
            raise HTTPException(status_code=400, detail=f"Unknown service: {service}")
        doc = await db.user_google_services.find_one({"user_id": user_id})
        enabled = doc.get("enabled", DEFAULT_SERVICES) if doc else list(DEFAULT_SERVICES)
        if service in enabled:
            enabled.remove(service)
        else:
            enabled.append(service)
        await db.user_google_services.update_one(
            {"user_id": user_id},
            {"$set": {"enabled": enabled}},
            upsert=True,
        )
        return {"ok": True, "enabled": enabled}

    @router.post("/disconnect")
    async def disconnect_google(current_user: dict = Depends(get_current_user)):
        user_id = _get_uid(current_user)
        await db.user_google_tokens.update_one(
            {"user_id": user_id}, {"$set": {"active": False}}
        )
        return {"ok": True}

    # ─── Calendar (Real API) ────────────────────────────────────────────

    @router.get("/calendar/events")
    async def list_events(current_user: dict = Depends(get_current_user)):
        user_id = _get_uid(current_user)
        creds = await _get_credentials(user_id)
        if not creds:
            raise HTTPException(status_code=400, detail="Google not connected")
        try:
            service = _build_service(creds, "calendar", "v3")
            now = datetime.now(timezone.utc).isoformat()
            result = service.events().list(
                calendarId="primary",
                timeMin=now,
                maxResults=15,
                singleEvents=True,
                orderBy="startTime",
            ).execute()
            events = []
            for item in result.get("items", []):
                start = item.get("start", {})
                end = item.get("end", {})
                events.append({
                    "id": item.get("id", ""),
                    "title": item.get("summary", "(No title)"),
                    "description": item.get("description", ""),
                    "start": start.get("dateTime", start.get("date", "")),
                    "end": end.get("dateTime", end.get("date", "")),
                    "location": item.get("location", ""),
                    "attendees": len(item.get("attendees", [])),
                    "status": item.get("status", "confirmed"),
                    "calendar": "primary",
                    "color": "#4285f4",
                })
            return {"ok": True, "data": events, "count": len(events)}
        except HttpError as e:
            logger.error("Calendar API error: %s", e)
            return {"ok": False, "error": str(e), "data": [], "count": 0}

    # ─── Drive (Real API) ───────────────────────────────────────────────

    @router.get("/drive/files")
    async def list_drive_files(current_user: dict = Depends(get_current_user)):
        user_id = _get_uid(current_user)
        creds = await _get_credentials(user_id)
        if not creds:
            raise HTTPException(status_code=400, detail="Google not connected")
        try:
            service = _build_service(creds, "drive", "v3")
            result = service.files().list(
                pageSize=20,
                fields="files(id,name,mimeType,modifiedTime,size,webViewLink,iconLink,starred,shared)",
                orderBy="modifiedTime desc",
            ).execute()
            files = []
            for item in result.get("files", []):
                mime = item.get("mimeType", "")
                ftype = "folder" if "folder" in mime else (
                    "spreadsheet" if "spreadsheet" in mime else (
                        "document" if "document" in mime else (
                            "presentation" if "presentation" in mime else (
                                "pdf" if "pdf" in mime else "file"
                            )
                        )
                    )
                )
                files.append({
                    "id": item.get("id", ""),
                    "name": item.get("name", ""),
                    "type": ftype,
                    "mime_type": mime,
                    "modified_at": item.get("modifiedTime", ""),
                    "size_bytes": int(item.get("size", 0)),
                    "starred": item.get("starred", False),
                    "shared": item.get("shared", False),
                    "web_link": item.get("webViewLink", "#"),
                })
            return {"ok": True, "data": files, "count": len(files)}
        except HttpError as e:
            logger.error("Drive API error: %s", e)
            return {"ok": False, "error": str(e), "data": [], "count": 0}

    # ─── Gmail (Real API) ──────────────────────────────────────────────

    @router.get("/gmail/messages")
    async def list_gmail_messages(current_user: dict = Depends(get_current_user)):
        user_id = _get_uid(current_user)
        creds = await _get_credentials(user_id)
        if not creds:
            raise HTTPException(status_code=400, detail="Google not connected")
        try:
            service = _build_service(creds, "gmail", "v1")
            result = service.users().messages().list(
                userId="me", maxResults=15, labelIds=["INBOX"],
            ).execute()
            messages = []
            for msg_ref in result.get("messages", []):
                msg = service.users().messages().get(
                    userId="me", id=msg_ref["id"], format="metadata",
                    metadataHeaders=["From", "Subject", "Date"],
                ).execute()
                headers = {h["name"]: h["value"] for h in msg.get("payload", {}).get("headers", [])}
                labels = msg.get("labelIds", [])
                messages.append({
                    "id": msg.get("id", ""),
                    "thread_id": msg.get("threadId", ""),
                    "from": headers.get("From", ""),
                    "subject": headers.get("Subject", "(No subject)"),
                    "snippet": msg.get("snippet", ""),
                    "date": headers.get("Date", ""),
                    "unread": "UNREAD" in labels,
                    "starred": "STARRED" in labels,
                    "has_attachment": any("ATTACHMENT" in l for l in labels),
                    "labels": [l for l in labels if l not in ("INBOX", "UNREAD", "CATEGORY_PRIMARY")],
                })
            return {"ok": True, "data": messages, "count": len(messages)}
        except HttpError as e:
            logger.error("Gmail API error: %s", e)
            return {"ok": False, "error": str(e), "data": [], "count": 0}

    # ─── Contacts / People (Real API) ──────────────────────────────────

    @router.get("/contacts")
    async def list_contacts(current_user: dict = Depends(get_current_user)):
        user_id = _get_uid(current_user)
        creds = await _get_credentials(user_id)
        if not creds:
            raise HTTPException(status_code=400, detail="Google not connected")
        try:
            service = _build_service(creds, "people", "v1")
            result = service.people().connections().list(
                resourceName="people/me",
                pageSize=30,
                personFields="names,emailAddresses,phoneNumbers,photos,organizations",
            ).execute()
            contacts = []
            for person in result.get("connections", []):
                names = person.get("names", [{}])
                emails = person.get("emailAddresses", [])
                phones = person.get("phoneNumbers", [])
                photos = person.get("photos", [{}])
                orgs = person.get("organizations", [{}])
                contacts.append({
                    "id": person.get("resourceName", ""),
                    "name": names[0].get("displayName", "") if names else "",
                    "email": emails[0].get("value", "") if emails else "",
                    "phone": phones[0].get("value", "") if phones else "",
                    "avatar_url": photos[0].get("url", "") if photos else "",
                    "company": orgs[0].get("name", "") if orgs else "",
                    "title": orgs[0].get("title", "") if orgs else "",
                })
            return {"ok": True, "data": contacts, "count": len(contacts)}
        except HttpError as e:
            logger.error("Contacts API error: %s", e)
            return {"ok": False, "error": str(e), "data": [], "count": 0}

    # ─── Tasks (Real API) ──────────────────────────────────────────────

    @router.get("/tasks")
    async def list_tasks(current_user: dict = Depends(get_current_user)):
        user_id = _get_uid(current_user)
        creds = await _get_credentials(user_id)
        if not creds:
            raise HTTPException(status_code=400, detail="Google not connected")
        try:
            service = _build_service(creds, "tasks", "v1")
            # Get task lists
            task_lists = service.tasklists().list(maxResults=10).execute()
            all_tasks = []
            for tl in task_lists.get("items", []):
                tl_id = tl.get("id", "")
                tl_title = tl.get("title", "My Tasks")
                tasks_result = service.tasks().list(
                    tasklist=tl_id, maxResults=20, showCompleted=True,
                ).execute()
                for task in tasks_result.get("items", []):
                    all_tasks.append({
                        "id": task.get("id", ""),
                        "title": task.get("title", ""),
                        "notes": task.get("notes", ""),
                        "due_date": task.get("due", ""),
                        "completed": task.get("status", "") == "completed",
                        "task_list": tl_title,
                        "priority": "medium",
                        "updated": task.get("updated", ""),
                    })
            return {"ok": True, "data": all_tasks, "count": len(all_tasks)}
        except HttpError as e:
            logger.error("Tasks API error: %s", e)
            return {"ok": False, "error": str(e), "data": [], "count": 0}

    # ─── Photos (Real API — REST) ──────────────────────────────────────

    @router.get("/photos")
    async def list_photos(current_user: dict = Depends(get_current_user)):
        user_id = _get_uid(current_user)
        creds = await _get_credentials(user_id)
        if not creds:
            raise HTTPException(status_code=400, detail="Google not connected")
        try:
            import urllib.request
            headers = {"Authorization": f"Bearer {creds.token}"}
            url = "https://photoslibrary.googleapis.com/v1/mediaItems?pageSize=20"
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req) as response:
                data = json.loads(response.read().decode())

            photos = []
            for item in data.get("mediaItems", []):
                meta = item.get("mediaMetadata", {})
                photos.append({
                    "id": item.get("id", ""),
                    "name": item.get("filename", ""),
                    "url": item.get("baseUrl", ""),
                    "thumbnail_url": f"{item.get('baseUrl', '')}=w256-h256" if item.get("baseUrl") else "",
                    "width": int(meta.get("width", 0)),
                    "height": int(meta.get("height", 0)),
                    "size_bytes": 0,
                    "taken_at": meta.get("creationTime", ""),
                    "album": "Library",
                    "type": item.get("mimeType", "image/jpeg"),
                })
            return {"ok": True, "data": photos, "count": len(photos), "albums": ["Library"], "total_bytes": 0}
        except Exception as e:
            logger.error("Photos API error: %s", e)
            return {"ok": False, "error": str(e), "data": [], "count": 0}

    # ─── Sheets (Real API) ────────────────────────────────────────────

    @router.get("/sheets")
    async def list_spreadsheets(current_user: dict = Depends(get_current_user)):
        user_id = _get_uid(current_user)
        creds = await _get_credentials(user_id)
        if not creds:
            raise HTTPException(status_code=400, detail="Google not connected")
        try:
            # Use Drive API to find spreadsheets
            service = _build_service(creds, "drive", "v3")
            result = service.files().list(
                q="mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
                pageSize=20,
                fields="files(id,name,modifiedTime,createdTime,webViewLink,owners,shared)",
                orderBy="modifiedTime desc",
            ).execute()

            sheets = []
            for item in result.get("files", []):
                owners = item.get("owners", [{}])
                sheets.append({
                    "id": item.get("id", ""),
                    "name": item.get("name", ""),
                    "modified_at": item.get("modifiedTime", ""),
                    "created_at": item.get("createdTime", ""),
                    "web_link": item.get("webViewLink", "#"),
                    "owner": owners[0].get("displayName", "") if owners else "",
                    "shared": item.get("shared", False),
                })
            return {"ok": True, "data": sheets, "count": len(sheets)}
        except HttpError as e:
            logger.error("Sheets API error: %s", e)
            return {"ok": False, "error": str(e), "data": [], "count": 0}

    # ─── YouTube (Real API) ───────────────────────────────────────────

    @router.get("/youtube/videos")
    async def list_youtube_videos(current_user: dict = Depends(get_current_user)):
        """List user's liked videos and their channel's uploads."""
        user_id = _get_uid(current_user)
        creds = await _get_credentials(user_id)
        if not creds:
            raise HTTPException(status_code=400, detail="Google not connected")
        try:
            service = _build_service(creds, "youtube", "v3")

            # Get user's channel
            channels = service.channels().list(
                part="snippet,contentDetails,statistics",
                mine=True,
            ).execute()

            channel_info = None
            if channels.get("items"):
                ch = channels["items"][0]
                channel_info = {
                    "id": ch["id"],
                    "title": ch["snippet"]["title"],
                    "thumbnail": ch["snippet"]["thumbnails"].get("default", {}).get("url", ""),
                    "subscriber_count": int(ch["statistics"].get("subscriberCount", 0)),
                    "video_count": int(ch["statistics"].get("videoCount", 0)),
                    "view_count": int(ch["statistics"].get("viewCount", 0)),
                }

            # Get liked videos
            liked = service.videos().list(
                part="snippet,statistics",
                myRating="like",
                maxResults=15,
            ).execute()

            videos = []
            for item in liked.get("items", []):
                snippet = item.get("snippet", {})
                stats = item.get("statistics", {})
                thumbnails = snippet.get("thumbnails", {})
                thumb = thumbnails.get("medium", thumbnails.get("default", {}))
                videos.append({
                    "id": item.get("id", ""),
                    "title": snippet.get("title", ""),
                    "description": snippet.get("description", "")[:200],
                    "channel_title": snippet.get("channelTitle", ""),
                    "published_at": snippet.get("publishedAt", ""),
                    "thumbnail_url": thumb.get("url", ""),
                    "view_count": int(stats.get("viewCount", 0)),
                    "like_count": int(stats.get("likeCount", 0)),
                    "web_link": f"https://www.youtube.com/watch?v={item.get('id', '')}",
                })

            return {
                "ok": True,
                "channel": channel_info,
                "data": videos,
                "count": len(videos),
            }
        except HttpError as e:
            logger.error("YouTube API error: %s", e)
            return {"ok": False, "error": str(e), "data": [], "count": 0, "channel": None}

    @router.get("/youtube/subscriptions")
    async def list_youtube_subscriptions(current_user: dict = Depends(get_current_user)):
        user_id = _get_uid(current_user)
        creds = await _get_credentials(user_id)
        if not creds:
            raise HTTPException(status_code=400, detail="Google not connected")
        try:
            service = _build_service(creds, "youtube", "v3")
            result = service.subscriptions().list(
                part="snippet",
                mine=True,
                maxResults=20,
                order="alphabetical",
            ).execute()

            subs = []
            for item in result.get("items", []):
                snippet = item.get("snippet", {})
                thumbnails = snippet.get("thumbnails", {})
                thumb = thumbnails.get("default", {})
                subs.append({
                    "id": item.get("id", ""),
                    "channel_id": snippet.get("resourceId", {}).get("channelId", ""),
                    "title": snippet.get("title", ""),
                    "description": snippet.get("description", "")[:150],
                    "thumbnail_url": thumb.get("url", ""),
                })
            return {"ok": True, "data": subs, "count": len(subs)}
        except HttpError as e:
            logger.error("YouTube subscriptions error: %s", e)
            return {"ok": False, "error": str(e), "data": [], "count": 0}

    return router
