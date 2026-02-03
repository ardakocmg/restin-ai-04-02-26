"""Authentication routes - login, MFA, token refresh"""
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.security import HTTPAuthorizationCredentials
from typing import Optional
from datetime import datetime, timezone
import pyotp
import jwt

from core.database import db
from core.config import JWT_SECRET, JWT_ALGORITHM
from core.security import hash_pin, create_jwt_token
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
            # V2 Detailed Logging: LOGIN_FAIL
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
            
            # Check for active shift
            active_shift = await db.shifts.find_one({
                "user_id": user["id"],
                "start_time": {"$lte": now},
                "end_time": {"$gte": now}
            }, {"_id": 0})
            
            # Check for manager override
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
        
        # Get allowed venues (default to user's primary venue if not set)
        allowed_venue_ids = user.get("allowed_venue_ids", [user["venue_id"]])
        if not allowed_venue_ids:
            allowed_venue_ids = [user["venue_id"]]
        
        default_venue_id = user.get("default_venue_id")
        if not default_venue_id and len(allowed_venue_ids) == 1:
            default_venue_id = allowed_venue_ids[0]
        
        # Check if MFA required for owner/manager
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
        
        # Create token (venue-agnostic for now, will be set after venue selection)
        token = create_jwt_token(user["id"], user["venue_id"], user["role"], deviceId)
        
        # Log successful attempt
        await log_login_attempt(deviceId, pin, app, True, None, user["id"], user["venue_id"])
        
        # V2 Detailed Logging: LOGIN_SUCCESS
        await log_event(
            db,
            level="SECURITY",
            code="LOGIN_SUCCESS",
            message=f"User {user['name']} logged in successfully",
            user=user,
            venue_id=user["venue_id"],
            meta={"app": app, "device_id": deviceId}
        )
        
        # Audit log
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

    @router.post("/auth/refresh")
    async def refresh_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
        """Refresh expired JWT token within grace period"""
        try:
            # Decode token (allow expired within 5 min grace)
            payload = jwt.decode(
                credentials.credentials, 
                JWT_SECRET, 
                algorithms=[JWT_ALGORITHM],
                options={"verify_exp": False}  # Manual exp check for grace period
            )
            
            exp_time = payload.get("exp", 0)
            now = datetime.now(timezone.utc).timestamp()
            grace_period = 5 * 60  # 5 minutes
            
            # Check if within grace period
            if now - exp_time > grace_period:
                raise HTTPException(status_code=401, detail="TOKEN_EXPIRED_BEYOND_GRACE")
            
            # Verify user still exists
            user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
            if not user:
                raise HTTPException(status_code=401, detail="TOKEN_INVALID_USER")
            
            # Issue new token
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
        
        # Check if MFA required for owner/manager
        if user["role"] in [UserRole.OWNER, UserRole.MANAGER] and user.get("mfa_enabled"):
            return {"requires_mfa": True, "user_id": user["id"]}
        
        # Update last login
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

    return router
