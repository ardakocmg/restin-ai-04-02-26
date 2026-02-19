"""Authentication routes - login, MFA, token refresh"""
from fastapi import APIRouter, HTTPException, Depends, Query, Body
from fastapi.security import HTTPAuthorizationCredentials
from typing import Optional
from datetime import datetime, timezone
import pyotp
import jwt
import uuid
import logging

from core.database import db
from core.config import JWT_SECRET, JWT_ALGORITHM
from core.security import hash_pin, verify_pin, create_jwt_token, hash_password, verify_password, compute_pin_index
from core.dependencies import get_current_user, security
from models import UserRole
from services.auth_service import check_rate_limit, log_login_attempt
from services.audit_service import create_audit_log
from utils.helpers import log_event

logger = logging.getLogger("auth_routes")

# ── In-memory PIN cache: pin_index → user_id for instant lookups ──
_pin_cache: dict[str, str] = {}  # pin_index → user_id


def create_auth_router():
    router = APIRouter(tags=["auth"])

    @router.post("/auth/login/pin")
    async def login_with_pin(
        pin: str = Query(...),
        app: str = Query(...),  # admin, pos, kds
        deviceId: Optional[str] = Query(None),
        stationId: Optional[str] = Query(None)
    ):
        """
        PIN-first login — O(1) lookup via pin_index + in-memory cache.
        """
        # Check rate limit
        if deviceId and await check_rate_limit(deviceId):
            await log_login_attempt(deviceId, pin, app, False, "Rate limited")
            raise HTTPException(
                status_code=429, 
                detail="Too many failed attempts. Please try again in 5 minutes."
            )
        
        _role_sort_map = {
            "product_owner": 0, "owner": 1, "general_manager": 2,
            "manager": 3, "staff": 4
        }
        
        idx = compute_pin_index(pin)
        user = None
        
        # ── FAST PATH 1: In-memory cache hit ──
        cached_uid = _pin_cache.get(idx)
        if cached_uid:
            u = await db.users.find_one({"id": cached_uid}, {"_id": 0})
            if u and verify_pin(pin, u.get("pin_hash", "")):
                user = u
        
        # ── FAST PATH 2: DB index lookup ──
        if not user:
            indexed_users = await db.users.find({"pin_index": idx}).to_list(length=10)
            candidates = [u for u in indexed_users if verify_pin(pin, u.get("pin_hash", ""))]
            if candidates:
                candidates.sort(key=lambda u: _role_sort_map.get(u.get("role", "staff"), 5))
                user = candidates[0]
                # Populate cache
                _pin_cache[idx] = user["id"]
        
        # ── FALLBACK: Only scan users WITHOUT pin_index (un-migrated) ──
        if not user:
            unmigrated_count = await db.users.count_documents({
                "pin_hash": {"$exists": True, "$ne": ""},
                "pin_index": {"$exists": False}
            })
            
            if unmigrated_count > 0:
                # Only scan un-migrated users, not ALL users
                unmigrated_users = await db.users.find(
                    {"pin_hash": {"$exists": True, "$ne": ""}, "pin_index": {"$exists": False}}
                ).to_list(200)
                
                candidates = []
                for u in unmigrated_users:
                    if verify_pin(pin, u.get("pin_hash", "")):
                        candidates.append(u)
                        # Backfill pin_index for instant future logins
                        update_fields = {"pin_index": idx}
                        unset_fields = {}
                        stored = u.get("pin_hash", "")
                        if len(stored) == 64 and all(c in '0123456789abcdef' for c in stored):
                            update_fields["pin_hash"] = hash_pin(pin)
                            unset_fields["pin"] = ""
                        update_op = {"$set": update_fields}
                        if unset_fields:
                            update_op["$unset"] = unset_fields
                        await db.users.update_one({"_id": u["_id"]}, update_op)
                        logger.info("[AUTH] Backfilled pin_index for user_id=%s", u.get("id", "?"))
                
                if candidates:
                    candidates.sort(key=lambda u: _role_sort_map.get(u.get("role", "staff"), 5))
                    user = candidates[0]
                    _pin_cache[idx] = user["id"]
        
        if not user:
            await log_login_attempt(deviceId, pin, app, False, "Invalid PIN")
            await log_event(
                db,
                level="SECURITY",
                code="LOGIN_FAIL",
                message="Login failed: Invalid PIN",
                meta={"app": app, "device_id": deviceId, "reason": "invalid_pin"}
            )
            raise HTTPException(status_code=401, detail="Incorrect PIN")
        
        # Check shift schedule for staff (unless it's admin app or owner/manager)
        if app != "admin" and user["role"] == UserRole.STAFF:
            now = datetime.now(timezone.utc).isoformat()
            
            active_shift = await db.shifts.find_one({
                "user_id": user["id"],
                "start_time": {"$lte": now},
                "end_time": {"$gte": now}
            }, {"_id": 0})
            
            override = await db.manager_overrides.find_one({
                "user_id": user["id"],
                "expires_at": {"$gte": now}
            }, {"_id": 0})
            
            if not active_shift and not override:
                await log_login_attempt(deviceId, pin, app, False, "Outside scheduled hours")
                raise HTTPException(
                    status_code=403,
                    detail="You are not scheduled for a shift right now. Please contact your manager."
                )
        
        # Get allowed venues
        allowed_venue_ids = user.get("allowed_venue_ids", [])
        
        # Product Owner / Admin: if allowed_venue_ids is empty, grant ALL venues
        if not allowed_venue_ids and user["role"] in [UserRole.PRODUCT_OWNER, "product_owner", "admin"]:
            all_venues = await db.venues.find({}, {"_id": 0, "id": 1}).to_list(100)
            allowed_venue_ids = [v["id"] for v in all_venues]
        
        if not allowed_venue_ids:
            allowed_venue_ids = [user["venue_id"]]
        
        default_venue_id = user.get("default_venue_id")
        if not default_venue_id and len(allowed_venue_ids) == 1:
            default_venue_id = allowed_venue_ids[0]
        elif not default_venue_id and allowed_venue_ids:
            default_venue_id = allowed_venue_ids[0]
        
        # Check if MFA required
        if user["role"] in [UserRole.OWNER, UserRole.MANAGER] and user.get("mfa_enabled"):
            return {
                "requires_mfa": True,
                "user_id": user["id"],
                "allowedVenueIds": allowed_venue_ids
            }
        
        # Update last login
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": {
                "last_login": datetime.now(timezone.utc).isoformat(),
                "device_id": deviceId
            }}
        )
        
        token = create_jwt_token(user["id"], user["venue_id"], user["role"], deviceId)
        
        await log_login_attempt(deviceId, pin, app, True, None, user["id"], user["venue_id"])
        
        await log_event(
            db,
            level="SECURITY",
            code="LOGIN_SUCCESS",
            message=f"User {user['name']} logged in successfully",
            user=user,
            venue_id=user["venue_id"],
            meta={"app": app, "device_id": deviceId}
        )
        
        await create_audit_log(
            user["venue_id"], user["id"], user["name"], "login",
            "user", user["id"],
            {"device_id": deviceId, "app": app}
        )
        
        return {
            "accessToken": token,
            "user": {
                "id": user["id"],
                "name": user["name"],
                "role": user["role"],
                "venueId": user["venue_id"]
            },
            "allowedVenueIds": allowed_venue_ids,
            "defaultVenueId": default_venue_id
        }

    # ─── Credentials Login (email / username / employee_id + password) ───────
    @router.post("/auth/login/credentials")
    async def login_with_credentials(payload: dict = Body(...)):
        """
        Multi-identifier login: accepts email, username, or employee ID + password.
        """
        identifier = payload.get("identifier", "").strip()
        password = payload.get("password", "")
        app = payload.get("app", "admin")
        device_id = payload.get("deviceId")

        if not identifier or not password:
            raise HTTPException(status_code=400, detail="Identifier and password are required")

        # Rate limit check
        rate_key = device_id or identifier
        if await check_rate_limit(rate_key):
            await log_login_attempt(rate_key, "***", app, False, "Rate limited")
            raise HTTPException(
                status_code=429,
                detail="Too many failed attempts. Please try again in 5 minutes."
            )

        # Multi-identifier lookup: email OR username OR employee_id
        user = await db.users.find_one(
            {"$or": [
                {"email": identifier},
                {"username": identifier},
                {"employee_id": identifier}
            ]},
            {"_id": 0}
        )

        if not user or not user.get("password_hash"):
            await log_login_attempt(rate_key, "***", app, False, "Invalid credentials")
            raise HTTPException(status_code=401, detail="Invalid credentials")

        # Verify password
        if not verify_password(password, user["password_hash"]):
            await log_login_attempt(rate_key, "***", app, False, "Wrong password")
            raise HTTPException(status_code=401, detail="Invalid credentials")

        # Check account status
        if user.get("status") != "active":
            raise HTTPException(status_code=403, detail="Account is suspended or archived")

        # Shift scheduling check for staff on POS/KDS
        if app != "admin" and user["role"] == UserRole.STAFF:
            now = datetime.now(timezone.utc).isoformat()
            active_shift = await db.shifts.find_one({
                "user_id": user["id"],
                "start_time": {"$lte": now},
                "end_time": {"$gte": now}
            }, {"_id": 0})
            override = await db.manager_overrides.find_one({
                "user_id": user["id"],
                "expires_at": {"$gte": now}
            }, {"_id": 0})
            if not active_shift and not override:
                raise HTTPException(status_code=403, detail="Not scheduled for a shift right now")

        # Allowed venues
        allowed_venue_ids = user.get("allowed_venue_ids", [user["venue_id"]])
        if not allowed_venue_ids:
            allowed_venue_ids = [user["venue_id"]]

        # MFA check
        if user.get("mfa_enabled"):
            return {
                "requires_mfa": True,
                "user_id": user["id"],
                "allowedVenueIds": allowed_venue_ids
            }

        # Update last login
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": {
                "last_login": datetime.now(timezone.utc).isoformat(),
                "device_id": device_id
            }}
        )

        token = create_jwt_token(user["id"], user["venue_id"], user["role"], device_id)

        default_venue_id = user.get("default_venue_id")
        if not default_venue_id and len(allowed_venue_ids) == 1:
            default_venue_id = allowed_venue_ids[0]

        await log_login_attempt(rate_key, "***", app, True, None, user["id"], user["venue_id"])

        await log_event(
            db,
            level="SECURITY",
            code="LOGIN_SUCCESS",
            message=f"User {user['name']} logged in via credentials",
            user=user,
            venue_id=user["venue_id"],
            meta={"app": app, "device_id": device_id, "method": "credentials"}
        )

        await create_audit_log(
            user["venue_id"], user["id"], user["name"], "login",
            "user", user["id"],
            {"device_id": device_id, "app": app, "method": "credentials"}
        )

        return {
            "accessToken": token,
            "user": {
                "id": user["id"],
                "name": user["name"],
                "role": user["role"],
                "venueId": user["venue_id"]
            },
            "allowedVenueIds": allowed_venue_ids,
            "defaultVenueId": default_venue_id
        }

    # ─── Super Owner Setup Status ────────────────────────────────────────────
    @router.get("/auth/setup/status")
    async def check_setup_status():
        """Check if initial Super Owner setup is required."""
        super_owner = await db.users.find_one(
            {"is_super_owner": True},
            {"_id": 0, "id": 1}
        )
        return {"setupRequired": super_owner is None}

    # ─── Super Owner Setup ───────────────────────────────────────────────────
    @router.post("/auth/setup")
    async def setup_super_owner(payload: dict = Body(...)):
        """
        One-time Super Owner creation. Creates the root user with password + optional 2FA.
        Refuses to run if a super owner already exists.
        """
        existing = await db.users.find_one({"is_super_owner": True}, {"_id": 0, "id": 1})
        if existing:
            raise HTTPException(status_code=409, detail="Super Owner already exists")

        name = payload.get("name", "Super Owner")
        email = payload.get("email", "")
        password = payload.get("password", "")
        totp_code = payload.get("totpCode")
        enable_2fa = payload.get("enable2fa")

        if not email or not password:
            raise HTTPException(status_code=400, detail="Email and password are required")

        if len(password) < 8:
            raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

        # Get default venue
        default_venue = await db.venues.find_one({}, {"_id": 0, "id": 1})
        venue_id = default_venue["id"] if default_venue else "default"

        user_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()

        user_doc = {
            "id": user_id,
            "venue_id": venue_id,
            "name": name,
            "email": email,
            "username": email.split("@")[0] if "@" in email else email,
            "employee_id": "EMP-OWNER",
            "pin_hash": hash_pin("1234"),
            "password_hash": hash_password(password),
            "role": UserRole.OWNER,
            "is_super_owner": True,
            "mfa_enabled": False,
            "mfa_secret": None,
            "allowed_venue_ids": [],
            "status": "active",
            "created_at": now,
            "last_login": None,
        }

        # Handle 2FA enrollment
        if enable_2fa is True and totp_code:
            if not user_doc.get("mfa_secret"):
                raise HTTPException(status_code=400, detail="Setup 2FA first")
            totp = pyotp.TOTP(user_doc["mfa_secret"])
            if not totp.verify(totp_code):
                raise HTTPException(status_code=401, detail="Invalid TOTP code")
            user_doc["mfa_enabled"] = True

        elif enable_2fa is not False and not totp_code:
            # Generate QR code for enrollment
            secret = pyotp.random_base32()
            totp = pyotp.TOTP(secret)
            provisioning_uri = totp.provisioning_uri(name, issuer_name="restin.ai")
            user_doc["mfa_secret"] = secret

            await db.users.insert_one(user_doc)

            await log_event(
                db,
                level="SECURITY",
                code="SUPER_OWNER_SETUP_PENDING_2FA",
                message=f"Super Owner {name} created, awaiting 2FA verification",
                meta={"user_id": user_id, "email": email}
            )

            return {
                "qrCodeUrl": provisioning_uri,
                "secret": secret,
                "userId": user_id
            }

        await db.users.insert_one(user_doc)

        await log_event(
            db,
            level="SECURITY",
            code="SUPER_OWNER_CREATED",
            message=f"Super Owner {name} ({email}) created",
            meta={"user_id": user_id, "email": email, "mfa_enabled": user_doc["mfa_enabled"]}
        )

        await create_audit_log(
            venue_id, user_id, name, "super_owner_setup",
            "user", user_id,
            {"email": email, "mfa_enabled": user_doc["mfa_enabled"]}
        )

        return {
            "message": "Super Owner created successfully",
            "userId": user_id,
            "mfaEnabled": user_doc["mfa_enabled"]
        }

    @router.post("/auth/refresh")
    async def refresh_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
        """Refresh expired JWT token within grace period"""
        try:
            payload = jwt.decode(
                credentials.credentials, 
                JWT_SECRET, 
                algorithms=[JWT_ALGORITHM],
                options={"verify_exp": False}
            )
            
            exp_time = payload.get("exp", 0)
            now = datetime.now(timezone.utc).timestamp()
            grace_period = 5 * 60
            
            if now - exp_time > grace_period:
                raise HTTPException(status_code=401, detail="TOKEN_EXPIRED_BEYOND_GRACE")
            
            user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
            if not user:
                raise HTTPException(status_code=401, detail="TOKEN_INVALID_USER")
            
            new_token = create_jwt_token(
                user["id"], 
                payload.get("venue_id", user["venue_id"]), 
                user["role"], 
                payload.get("device_id")
            )
            
            return {
                "accessToken": new_token,
                "user": {
                    "id": user["id"],
                    "name": user["name"],
                    "role": user["role"],
                    "venueId": user["venue_id"]
                }
            }
            
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="TOKEN_EXPIRED")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="TOKEN_INVALID")
        except Exception as e:
            raise HTTPException(status_code=401, detail=f"TOKEN_REFRESH_FAILED: {str(e)}")

    @router.get("/auth/me")
    async def get_current_user_info(current_user: dict = Depends(get_current_user)):
        """Get current user info and token diagnostics"""
        return {
            "userId": current_user["id"],
            "name": current_user["name"],
            "role": current_user["role"],
            "venueId": current_user.get("venue_id"),
            "serverTime": datetime.now(timezone.utc).isoformat(),
            "serverTimestamp": int(datetime.now(timezone.utc).timestamp())
        }

    @router.post("/auth/login")
    async def login(venue_id: str, pin: str, device_id: Optional[str] = None):
        venue_users = await db.users.find(
            {"venue_id": venue_id, "pin_hash": {"$exists": True, "$ne": ""}},
            {"_id": 0}
        ).to_list(100)
        user = next((u for u in venue_users if verify_pin(pin, u.get("pin_hash", ""))), None)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid PIN")
        
        if user["role"] in [UserRole.OWNER, UserRole.MANAGER] and user.get("mfa_enabled"):
            return {"requires_mfa": True, "user_id": user["id"]}
        
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": {"last_login": datetime.now(timezone.utc).isoformat(), "device_id": device_id}}
        )
        
        token = create_jwt_token(user["id"], user["venue_id"], user["role"], device_id)
        
        await create_audit_log(
            venue_id, user["id"], user["name"], "login", "user", user["id"],
            {"device_id": device_id}
        )
        
        return {
            "token": token,
            "user": {
                "id": user["id"],
                "name": user["name"],
                "role": user["role"],
                "venue_id": user["venue_id"]
            }
        }

    @router.post("/auth/verify-mfa")
    async def verify_mfa(user_id: str, totp_code: str, device_id: Optional[str] = None):
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        if not user.get("mfa_secret"):
            raise HTTPException(status_code=400, detail="MFA not configured")
        
        totp = pyotp.TOTP(user["mfa_secret"])
        if not totp.verify(totp_code):
            raise HTTPException(status_code=401, detail="Invalid TOTP code")
        
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": {"last_login": datetime.now(timezone.utc).isoformat(), "device_id": device_id}}
        )
        
        token = create_jwt_token(user["id"], user["venue_id"], user["role"], device_id)
        
        await create_audit_log(
            user["venue_id"], user["id"], user["name"], "mfa_verify", "user", user["id"],
            {"device_id": device_id}
        )
        
        return {
            "token": token,
            "user": {
                "id": user["id"],
                "name": user["name"],
                "role": user["role"],
                "venue_id": user["venue_id"]
            }
        }

    @router.post("/auth/setup-mfa")
    async def setup_mfa(current_user: dict = Depends(get_current_user)):
        if current_user["role"] not in [UserRole.OWNER, UserRole.MANAGER]:
            raise HTTPException(status_code=403, detail="MFA only for owners/managers")
        
        secret = pyotp.random_base32()
        totp = pyotp.TOTP(secret)
        provisioning_uri = totp.provisioning_uri(current_user["name"], issuer_name="restin.ai")
        
        await db.users.update_one(
            {"id": current_user["id"]},
            {"$set": {"mfa_secret": secret}}
        )
        
        return {"secret": secret, "qr_uri": provisioning_uri}

    @router.post("/auth/enable-mfa")
    async def enable_mfa(totp_code: str, current_user: dict = Depends(get_current_user)):
        if not current_user.get("mfa_secret"):
            raise HTTPException(status_code=400, detail="Setup MFA first")
        
        totp = pyotp.TOTP(current_user["mfa_secret"])
        if not totp.verify(totp_code):
            raise HTTPException(status_code=401, detail="Invalid TOTP code")
        
        await db.users.update_one(
            {"id": current_user["id"]},
            {"$set": {"mfa_enabled": True}}
        )
        
        await create_audit_log(
            current_user["venue_id"], current_user["id"], current_user["name"],
            "mfa_enabled", "user", current_user["id"], {}
        )
        
        return {"message": "MFA enabled"}

    # ─── Change PIN ─────────────────────────────────────────────────
    @router.post("/change-pin")
    async def change_pin(payload: dict = Body(...), current_user: dict = Depends(get_current_user)):
        """Change user's login PIN"""
        user_id = payload.get("user_id")
        current_pin = payload.get("current_pin", "")
        new_pin = payload.get("new_pin", "")

        if not user_id or not current_pin or not new_pin:
            raise HTTPException(status_code=400, detail="user_id, current_pin, and new_pin are required")

        if current_user["id"] != user_id:
            raise HTTPException(status_code=403, detail="Not authorized")

        if len(new_pin) < 4:
            raise HTTPException(status_code=400, detail="PIN must be at least 4 digits")

        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        stored_hash = user.get("pin_hash", "")
        if stored_hash and not verify_pin(current_pin, stored_hash):
            raise HTTPException(status_code=401, detail="Current PIN is incorrect")

        await db.users.update_one(
            {"id": user_id},
            {"$set": {"pin_hash": hash_pin(new_pin), "pin_index": compute_pin_index(new_pin)}, "$unset": {"pin": ""}}
        )
        # Invalidate old cache entry (find and remove any entry pointing to this user)
        stale_keys = [k for k, v in _pin_cache.items() if v == user_id]
        for k in stale_keys:
            del _pin_cache[k]

        await log_event(db, level="SECURITY", code="PIN_CHANGED", message=f"PIN changed for user {user_id}", meta={"user_id": user_id})
        return {"success": True}

    # ─── Set / Change Password (for elevation) ─────────────────────────
    @router.post("/auth/set-password")
    async def set_password(payload: dict = Body(...), current_user: dict = Depends(get_current_user)):
        """
        Set or change the user's password for progressive auth elevation.
        - If no password exists: just set it (no current_password required).
        - If password exists: require current_password to change.
        """
        user_id = current_user["id"]
        new_password = payload.get("new_password", "")
        current_password = payload.get("current_password", "")

        if not new_password or len(new_password) < 8:
            raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        has_existing = bool(user.get("password_hash"))

        # If user already has a password, verify the current one
        if has_existing:
            if not current_password:
                raise HTTPException(status_code=400, detail="Current password is required to change password")
            if not verify_password(current_password, user["password_hash"]):
                await create_audit_log(
                    user.get("venue_id", ""), user_id, user.get("name", ""),
                    "password_change_failed", "user", user_id,
                    {"reason": "wrong_current_password"}
                )
                raise HTTPException(status_code=401, detail="Current password is incorrect")

        # Hash and save the new password
        hashed = hash_password(new_password)
        await db.users.update_one({"id": user_id}, {"$set": {"password_hash": hashed}})

        action = "password_changed" if has_existing else "password_set"
        await create_audit_log(
            user.get("venue_id", ""), user_id, user.get("name", ""),
            action, "user", user_id, {"method": "manual"}
        )

        return {"success": True, "message": f"Password {'changed' if has_existing else 'set'} successfully"}

    # ─── Admin: Set Password for Another User ────────────────────────
    @router.post("/auth/admin/set-password")
    async def admin_set_password(payload: dict = Body(...), current_user: dict = Depends(get_current_user)):
        """
        Admin-only: Set a password for a specific user (no current password required).
        Only product_owner / owner / general_manager can use this.
        """
        admin_role = current_user.get("role", "")
        if admin_role not in ("product_owner", "owner", "general_manager"):
            raise HTTPException(status_code=403, detail="Insufficient privileges")

        target_user_id = payload.get("user_id", "")
        new_password = payload.get("new_password", "")

        if not target_user_id:
            raise HTTPException(status_code=400, detail="user_id is required")
        if not new_password or len(new_password) < 8:
            raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

        target_user = await db.users.find_one({"id": target_user_id}, {"_id": 0})
        if not target_user:
            raise HTTPException(status_code=404, detail="Target user not found")

        hashed = hash_password(new_password)
        await db.users.update_one({"id": target_user_id}, {"$set": {"password_hash": hashed}})

        await create_audit_log(
            current_user.get("venue_id", ""), current_user["id"], current_user.get("name", ""),
            "admin_password_set", "user", target_user_id,
            {"admin_id": current_user["id"], "target_user": target_user.get("name", "")}
        )

        return {"success": True, "message": f"Password set for {target_user.get('name', 'user')}"}

    # ─── Progressive Auth Elevation (Password + Google Authenticator) ─
    @router.post("/auth/elevate")
    async def elevate_auth(payload: dict = Body(...), current_user: dict = Depends(get_current_user)):
        """
        Progressive Authentication: verify password or Google Authenticator TOTP.
        - password → 30 min TTL (sensitive areas: HR, inventory, settings)
        - totp → 15 min TTL (critical areas: finance, payroll, access control)
        product_owner bypass is handled client-side — they never hit this endpoint.
        """
        method = payload.get("method", "")
        user_id = current_user["id"]

        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        if method == "password":
            password = payload.get("password", "")
            if not password:
                raise HTTPException(status_code=400, detail="Password is required")

            if not user.get("password_hash"):
                raise HTTPException(
                    status_code=400,
                    detail="No password set. Please set a password in your profile first."
                )

            if not verify_password(password, user["password_hash"]):
                await create_audit_log(
                    user.get("venue_id", ""), user_id, user.get("name", ""),
                    "elevation_failed", "user", user_id,
                    {"method": "password", "reason": "wrong_password"}
                )
                raise HTTPException(status_code=401, detail="Invalid password")

            await create_audit_log(
                user.get("venue_id", ""), user_id, user.get("name", ""),
                "elevation_granted", "user", user_id,
                {"method": "password", "ttl_seconds": 1800}
            )
            return {"level": "password", "ttl_seconds": 1800}

        elif method == "totp":
            totp_code = payload.get("totp_code", "")
            if not totp_code:
                raise HTTPException(status_code=400, detail="Google Authenticator code is required")

            if not user.get("mfa_enabled"):
                raise HTTPException(
                    status_code=400,
                    detail="Google Authenticator is not set up. Enable 2FA in your profile settings."
                )

            mfa_secret = user.get("mfa_secret", "")
            if not mfa_secret:
                raise HTTPException(status_code=400, detail="2FA not configured. Set up Google Authenticator first.")

            import pyotp
            totp = pyotp.TOTP(mfa_secret)
            if not totp.verify(totp_code, valid_window=1):
                await create_audit_log(
                    user.get("venue_id", ""), user_id, user.get("name", ""),
                    "elevation_failed", "user", user_id,
                    {"method": "google_auth", "reason": "invalid_code"}
                )
                raise HTTPException(status_code=401, detail="Invalid code. Check Google Authenticator and try again.")

            await create_audit_log(
                user.get("venue_id", ""), user_id, user.get("name", ""),
                "elevation_granted", "user", user_id,
                {"method": "google_auth", "ttl_seconds": 900}
            )
            return {"level": "elevated", "ttl_seconds": 900}

        else:
            raise HTTPException(
                status_code=400,
                detail="Invalid method. Use 'password' or 'totp'."
            )

    return router
