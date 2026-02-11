"""
Google SSO Authentication Routes
Handles Google Sign-In → ID Token verification → JWT issuance.
Sits alongside existing PIN-based auth (does NOT replace it).
"""
from fastapi import APIRouter, HTTPException, Body, Query, Depends
from typing import Optional, List
from datetime import datetime, timezone
import logging

from core.database import db
from core.security import create_jwt_token
from core.dependencies import get_current_user
from services.audit_service import create_audit_log
from utils.helpers import log_event

logger = logging.getLogger("google.sso")

# Lazy-load google.oauth2 (safe even if not installed)
try:
    from google.oauth2 import id_token as google_id_token
    from google.auth.transport import requests as google_requests
    GOOGLE_AUTH_AVAILABLE = True
except ImportError:
    GOOGLE_AUTH_AVAILABLE = False
    logger.warning("google-auth not installed — Google SSO disabled")


def create_google_sso_router():
    router = APIRouter(prefix="/auth/google", tags=["google-sso"])

    def _get_google_client_id() -> str:
        """Get GOOGLE_CLIENT_ID from env. Required for SSO."""
        import os
        client_id = os.environ.get("GOOGLE_CLIENT_ID", "")
        if not client_id:
            raise HTTPException(
                status_code=503,
                detail="Google SSO not configured (GOOGLE_CLIENT_ID missing)"
            )
        return client_id

    async def _get_allowed_domains(venue_id: Optional[str] = None) -> List[str]:
        """
        Get allowed Google login domains for a venue.
        Falls back to group-level domains, then to global config.
        """
        if venue_id:
            # Check venue-level google_settings
            settings = await db.google_settings.find_one(
                {"venue_id": venue_id},
                {"_id": 0}
            )
            if settings and settings.get("allowed_login_domains"):
                return settings["allowed_login_domains"]

            # Check venue's group-level settings
            venue = await db.venues.find_one({"id": venue_id}, {"_id": 0})
            if venue and venue.get("group_id"):
                group = await db.venue_groups.find_one(
                    {"id": venue["group_id"]},
                    {"_id": 0}
                )
                if group and group.get("allowed_login_domains"):
                    return group["allowed_login_domains"]

        # No domain restriction → accept any verified Google account
        return []

    async def _find_or_create_user(google_payload: dict, venue_id: Optional[str]) -> dict:
        """
        Find existing user by google_sub or email, or create placeholder.
        Returns user dict ready for JWT issuance.
        """
        email = google_payload["email"]
        google_sub = google_payload["sub"]
        name = google_payload.get("name", email.split("@")[0])
        picture = google_payload.get("picture", "")

        # 1. Try exact google_sub match (fastest)
        user = await db.users.find_one({"google_sub": google_sub}, {"_id": 0})
        if user:
            # Update last login
            await db.users.update_one(
                {"google_sub": google_sub},
                {"$set": {
                    "last_login": datetime.now(timezone.utc).isoformat(),
                    "avatar_url": picture,
                }}
            )
            return user

        # 2. Try email match (user exists but not linked to Google yet)
        user = await db.users.find_one({"email": email}, {"_id": 0})
        if user:
            # Link Google identity
            await db.users.update_one(
                {"id": user["id"]},
                {"$set": {
                    "google_sub": google_sub,
                    "identity_provider": "hybrid",
                    "avatar_url": picture,
                    "last_login": datetime.now(timezone.utc).isoformat(),
                },
                 "$addToSet": {"linked_emails": email}}
            )
            return user

        # 3. Try linked_emails match (multi-email identity)
        user = await db.users.find_one({"linked_emails": email}, {"_id": 0})
        if user:
            await db.users.update_one(
                {"id": user["id"]},
                {"$set": {
                    "google_sub": google_sub,
                    "identity_provider": "hybrid",
                    "avatar_url": picture,
                    "last_login": datetime.now(timezone.utc).isoformat(),
                }}
            )
            return user

        # 4. No match → return None (user must be pre-created by HR/Admin)
        return None

    # ─── LOGIN ────────────────────────────────────────────────────────────

    @router.post("/login")
    async def google_sso_login(
        payload: dict = Body(...),
    ):
        """
        Google SSO Login.
        Accepts Google ID Token, verifies it, finds/links user, issues JWT.

        Body: { "id_token": "eyJ...", "venue_id": "venue-xxx" (optional) }
        """
        if not GOOGLE_AUTH_AVAILABLE:
            raise HTTPException(
                status_code=503,
                detail="Google SSO not available (google-auth package not installed)"
            )

        raw_token = payload.get("id_token") or payload.get("credential")
        venue_id = payload.get("venue_id")

        if not raw_token:
            raise HTTPException(status_code=400, detail="id_token is required")

        client_id = _get_google_client_id()

        # ── Verify Google ID Token ────────────────────────────────────────
        try:
            google_payload = google_id_token.verify_oauth2_token(
                raw_token,
                google_requests.Request(),
                client_id
            )
        except ValueError as exc:
            logger.warning("Google token verification failed: %s", str(exc))
            raise HTTPException(status_code=401, detail="Invalid Google token")

        email = google_payload.get("email", "")
        email_verified = google_payload.get("email_verified", False)

        if not email or not email_verified:
            raise HTTPException(
                status_code=401,
                detail="Google account email not verified"
            )

        # ── Domain Validation ─────────────────────────────────────────────
        domain = email.split("@")[1].lower()
        allowed_domains = await _get_allowed_domains(venue_id)

        if allowed_domains and domain not in [d.lower() for d in allowed_domains]:
            logger.warning(
                "SSO domain rejected: email=%s, domain=%s, allowed=%s",
                email, domain, allowed_domains
            )
            await log_event(
                db,
                level="SECURITY",
                code="SSO_DOMAIN_REJECTED",
                message=f"Google SSO rejected: {email} (domain {domain} not allowed)",
                meta={"email": email, "domain": domain, "venue_id": venue_id}
            )
            raise HTTPException(
                status_code=403,
                detail=f"Email domain @{domain} is not authorized for this venue"
            )

        # ── Find / Link User ──────────────────────────────────────────────
        user = await _find_or_create_user(google_payload, venue_id)

        if not user:
            raise HTTPException(
                status_code=404,
                detail={
                    "code": "USER_NOT_FOUND",
                    "message": f"No restin.ai account found for {email}. "
                               "Please ask your administrator to create your account first.",
                    "email": email
                }
            )

        # ── Resolve Venue ─────────────────────────────────────────────────
        user_venue_id = venue_id or user.get("venue_id", "")

        # If multi-venue user, get allowed venues
        allowed_venue_ids = user.get("allowed_venue_ids", [])
        if not allowed_venue_ids:
            allowed_venue_ids = [user_venue_id] if user_venue_id else []

        # ── Issue JWT ─────────────────────────────────────────────────────
        token = create_jwt_token(
            user["id"],
            user_venue_id,
            user.get("role", "staff"),
            None  # No device_id for SSO
        )

        # ── Audit ─────────────────────────────────────────────────────────
        await log_event(
            db,
            level="SECURITY",
            code="SSO_LOGIN_SUCCESS",
            message=f"Google SSO login: {user.get('name', email)}",
            user=user,
            venue_id=user_venue_id,
            meta={
                "provider": "google",
                "email": email,
                "domain": domain,
                "google_sub": google_payload["sub"],
            }
        )

        await create_audit_log(
            user_venue_id, user["id"], user.get("name", ""),
            "sso_login", "user", user["id"],
            {"provider": "google", "email": email}
        )

        logger.info("SSO login success: user=%s, email=%s", user["id"], email)

        return {
            "accessToken": token,
            "user": {
                "id": user["id"],
                "name": user.get("name", ""),
                "role": user.get("role", "staff"),
                "venueId": user_venue_id,
                "email": email,
                "avatar": google_payload.get("picture", ""),
            },
            "allowedVenueIds": allowed_venue_ids,
            "defaultVenueId": user.get("default_venue_id") or (
                allowed_venue_ids[0] if allowed_venue_ids else ""
            ),
            "provider": "google",
        }

    # ─── LINK GOOGLE ACCOUNT ──────────────────────────────────────────────

    @router.post("/link")
    async def link_google_account(
        payload: dict = Body(...),
        current_user: dict = Depends(get_current_user),
    ):
        """
        Link an existing user to a Google account.
        Must be logged in (via PIN or password) first.

        Body: { "id_token": "eyJ..." }
        """
        if not GOOGLE_AUTH_AVAILABLE:
            raise HTTPException(status_code=503, detail="Google auth not available")

        raw_token = payload.get("id_token") or payload.get("credential")
        if not raw_token:
            raise HTTPException(status_code=400, detail="id_token is required")

        client_id = _get_google_client_id()

        try:
            google_payload = google_id_token.verify_oauth2_token(
                raw_token, google_requests.Request(), client_id
            )
        except ValueError:
            raise HTTPException(status_code=401, detail="Invalid Google token")

        email = google_payload.get("email", "")
        google_sub = google_payload["sub"]

        # Check no other user has this google_sub
        existing = await db.users.find_one(
            {"google_sub": google_sub, "id": {"$ne": current_user["id"]}},
            {"_id": 0}
        )
        if existing:
            raise HTTPException(
                status_code=409,
                detail="This Google account is already linked to another user"
            )

        await db.users.update_one(
            {"id": current_user["id"]},
            {
                "$set": {
                    "google_sub": google_sub,
                    "primary_email": email,
                    "identity_provider": "hybrid",
                    "avatar_url": google_payload.get("picture", ""),
                },
                "$addToSet": {"linked_emails": email},
            }
        )

        await create_audit_log(
            current_user.get("venue_id", ""), current_user["id"],
            current_user.get("name", ""), "google_account_linked",
            "user", current_user["id"],
            {"email": email, "google_sub": google_sub}
        )

        return {"success": True, "email": email, "message": "Google account linked"}

    # ─── UNLINK GOOGLE ACCOUNT ────────────────────────────────────────────

    @router.post("/unlink")
    async def unlink_google_account(
        current_user: dict = Depends(get_current_user),
    ):
        """Remove Google identity from user. PIN/password login still works."""
        # Ensure user has alternative auth method
        user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        has_pin = bool(user.get("pin_hash"))
        has_password = bool(user.get("password_hash"))

        if not has_pin and not has_password:
            raise HTTPException(
                status_code=400,
                detail="Cannot unlink Google — set a PIN or password first"
            )

        await db.users.update_one(
            {"id": current_user["id"]},
            {
                "$unset": {"google_sub": ""},
                "$set": {"identity_provider": "pin"},
            }
        )

        await create_audit_log(
            current_user.get("venue_id", ""), current_user["id"],
            current_user.get("name", ""), "google_account_unlinked",
            "user", current_user["id"], {}
        )

        return {"success": True, "message": "Google account unlinked"}

    # ─── SSO CONFIG (for frontend) ────────────────────────────────────────

    @router.get("/config")
    async def get_sso_config(venue_id: Optional[str] = Query(None)):
        """
        Public endpoint — returns SSO configuration for the login page.
        No auth required (needs to be called before login).
        """
        import os
        client_id = os.environ.get("GOOGLE_CLIENT_ID", "")

        if not client_id:
            return {"sso_enabled": False, "google_client_id": None}

        sso_enabled = False
        sso_enforce = False
        allowed_domains: List[str] = []

        if venue_id:
            settings = await db.google_settings.find_one(
                {"venue_id": venue_id},
                {"_id": 0}
            )
            if settings:
                sso_enabled = settings.get("sso_enabled", False)
                sso_enforce = settings.get("sso_enforce", False)
                allowed_domains = settings.get("allowed_login_domains", [])

        return {
            "sso_enabled": sso_enabled or bool(client_id),
            "sso_enforce": sso_enforce,
            "google_client_id": client_id,
            "allowed_domains": allowed_domains,
        }

    return router
