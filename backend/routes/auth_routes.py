"""Authentication routes - login, MFA, token refresh"""
from fastapi import APIRouter, HTTPException, Depends, Query, Body
from fastapi.security import HTTPAuthorizationCredentials
from typing import Optional
from datetime import datetime, timezone
import pyotp
import jwt
import uuid

from core.database import db
from core.config import JWT_SECRET, JWT_ALGORITHM
from core.security import hash_pin, create_jwt_token, hash_password, verify_password
from core.dependencies import get_current_user, security
from models import UserRole
from services.auth_service import check_rate_limit, log_login_attempt
from services.audit_service import create_audit_log
from utils.helpers import log_event


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
        New PIN-first login flow.
        Returns user info + allowed venues for venue selection.
        """
        # Check rate limit
        if deviceId and await check_rate_limit(deviceId):
            await log_login_attempt(deviceId, pin, app, False, "Rate limited")
            raise HTTPException(
                status_code=429, 
                detail="Too many failed attempts. Please try again in 5 minutes."
            )
        
        # Hash PIN and find user
        pin_hash = hash_pin(pin)
        user = await db.users.find_one(
            {"pin_hash": pin_hash},
            {"_id": 0}
        )
        
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
        pin_hash = hash_pin(pin)
        user = await db.users.find_one(
            {"venue_id": venue_id, "pin_hash": pin_hash},
            {"_id": 0}
        )
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

        from core.security import hash_pin
        stored_hash = user.get("pin_hash", "")
        if stored_hash and hash_pin(current_pin) != stored_hash:
            raise HTTPException(status_code=401, detail="Current PIN is incorrect")

        await db.users.update_one(
            {"id": user_id},
            {"$set": {"pin_hash": hash_pin(new_pin), "pin": new_pin}}
        )

        log_event("pin_changed", {"user_id": user_id})
        return {"success": True}

    # ─── Progressive Auth Elevation ──────────────────────────────────
    @router.post("/auth/elevate")
    async def elevate_auth(payload: dict = Body(...), current_user: dict = Depends(get_current_user)):
        """
        Progressive Authentication: verify password or TOTP to elevate session auth level.
        Called when user navigates to a sensitive area (HR, Finance, System settings).
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
                raise HTTPException(status_code=400, detail="TOTP code is required")

            if not user.get("mfa_enabled"):
                raise HTTPException(
                    status_code=400,
                    detail="2FA is not enabled. Enable it in your profile settings."
                )

            mfa_secret = user.get("mfa_secret", "")
            if not mfa_secret:
                raise HTTPException(status_code=400, detail="MFA not configured")

            import pyotp
            totp = pyotp.TOTP(mfa_secret)
            if not totp.verify(totp_code, valid_window=1):
                await create_audit_log(
                    user.get("venue_id", ""), user_id, user.get("name", ""),
                    "elevation_failed", "user", user_id,
                    {"method": "totp", "reason": "invalid_code"}
                )
                raise HTTPException(status_code=401, detail="Invalid 2FA code")

            await create_audit_log(
                user.get("venue_id", ""), user_id, user.get("name", ""),
                "elevation_granted", "user", user_id,
                {"method": "totp", "ttl_seconds": 900}
            )
            return {"level": "elevated", "ttl_seconds": 900}

        else:
            raise HTTPException(
                status_code=400,
                detail="Invalid method. Use 'password' or 'totp'."
            )

    return router
