from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Query, Request, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import FileResponse, RedirectResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
import traceback
import os
import logging
import secrets
import pyotp
import jwt
from pathlib import Path
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import json
import pandas as pd
import io

# New modular imports
from core.config import FRONTEND_BUILD_DIR, STATIC_DIR, INDEX_FILE, BUILD_ID, GIT_SHA, BUILT_AT
from core.database import db, client
from core.security import hash_pin, create_jwt_token, verify_jwt_token
from core.middleware import RequestIDMiddleware, make_error, setup_exception_handlers
from core.dependencies import get_current_user, check_venue_access, security

from models import *
from services.id_service import ensure_ids
from services.permission_service import (
    PERMISSION_KEYS, ROLE_DEFAULT_PERMISSIONS, effective_permissions,
    get_allowed_schema, filter_row_by_schema, TABLE_SCHEMAS
)
from services.settings_service import DEFAULT_VENUE_SETTINGS, MODULE_REGISTRY
from services.auth_service import check_rate_limit, log_login_attempt
from services.audit_service import create_audit_log
from services.reporting_service import register_builtin_reports, run_report, suggest_reports_from_search
from services.document_service import save_document, ALLOWED_MIME
from services.ocr_service import extract_text
from services.error_registry import list_all_error_codes, get_error_info
from services.log_service import log_system_event
from services.order_service import process_send_order, transfer_order_to_table, close_order
from services.kds_service import update_ticket_status, update_ticket_item_status, claim_ticket, release_ticket

# Event-Driven Architecture imports
from services.event_bus import event_bus
from services.service_registry import service_registry
from services.order_service_events import order_service
from services.inventory_service_events import inventory_service
from services.analytics_service_events import analytics_service
from services.email_service_events import email_service
from services.notification_service_events import notification_service
from services.payment_service_events import payment_service
from services.payroll_service_events import payroll_service

from utils.helpers import _rid, _json_fail, _step_log, _now_iso, compute_hash, calculate_risk_score, fill_min_fields, log_event

# Create the main app
app = FastAPI(title="restin.ai API", version="1.0.0")
api_router = APIRouter(prefix="/api")
admin_router = APIRouter(prefix="/api/admin", tags=["admin"])

# Add middleware
app.add_middleware(RequestIDMiddleware)

# Setup exception handlers from middleware module
setup_exception_handlers(app)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== ALL MODELS, ENUMS, CONSTANTS NOW IN MODULES ====================
# Models: from models import *
# Permissions: from services.permission_service import *
# Settings: from services.settings_service import *
# ==================================================================================

# ==================== AUTH ROUTES (MOVED TO routes/auth_routes.py) ====================
# All authentication routes (/auth/*) have been moved to routes/auth_routes.py
# This includes: login/pin, refresh, login, verify-mfa, setup-mfa, enable-mfa
# Kept here temporarily for reference, will be removed in next cleanup phase
# ==================================================================================


@api_router.post("/auth/login/pin")
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

@api_router.post("/auth/refresh")
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

@api_router.get("/auth/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current user info and token diagnostics"""
    token = None
    try:
        # Try to get token from request context
        from starlette.requests import Request
        from fastapi import Request as FastAPIRequest
    except:
        pass
    
    return {
        "userId": current_user["id"],
        "name": current_user["name"],
        "role": current_user["role"],
        "venueId": current_user.get("venue_id"),
        "serverTime": datetime.now(timezone.utc).isoformat(),
        "serverTimestamp": int(datetime.now(timezone.utc).timestamp())
    }

@api_router.post("/auth/login")
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

@api_router.post("/auth/verify-mfa")
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

@api_router.post("/auth/setup-mfa")
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

@api_router.post("/auth/enable-mfa")
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

# ==================== VENUE ROUTES ====================
@api_router.get("/venues", response_model=List[Venue])
async def list_venues():
    venues = await db.venues.find({}, {"_id": 0}).to_list(100)
    return venues

@api_router.get("/venues/{venue_id}")
async def get_venue(venue_id: str):
    venue = await db.venues.find_one({"id": venue_id}, {"_id": 0})
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")
    return venue

@api_router.post("/venues", response_model=Venue)
async def create_venue(data: VenueCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.OWNER:
        raise HTTPException(status_code=403, detail="Only owners can create venues")
    
    venue = Venue(**data.model_dump())
    await db.venues.insert_one(venue.model_dump())
    
    await create_audit_log(
        venue.id, current_user["id"], current_user["name"],
        "create", "venue", venue.id, {"name": venue.name}
    )
    
    return venue

@api_router.put("/venues/{venue_id}")
async def update_venue(venue_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.OWNER, UserRole.MANAGER]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    result = await db.venues.update_one({"id": venue_id}, {"$set": data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Venue not found")
    
    await create_audit_log(
        venue_id, current_user["id"], current_user["name"],
        "update", "venue", venue_id, data
    )
    
    return {"message": "Venue updated"}

@api_router.patch("/venues/{venue_id}/settings")
async def update_venue_settings(venue_id: str, settings_update: dict, current_user: dict = Depends(get_current_user)):
    """Update venue settings (MEGA PATCH: Merge settings)"""
    if current_user["role"] not in [UserRole.OWNER, UserRole.GENERAL_MANAGER, UserRole.MANAGER]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    venue = await db.venues.find_one({"id": venue_id}, {"_id": 0})
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")
    
    # Deep merge with defaults
    current_settings = venue.get("settings", DEFAULT_VENUE_SETTINGS.copy())
    
    def deep_merge(base, update):
        """Recursively merge update into base"""
        for key, value in update.items():
            if key in base and isinstance(base[key], dict) and isinstance(value, dict):
                deep_merge(base[key], value)
            else:
                base[key] = value
        return base
    
    merged_settings = deep_merge(current_settings, settings_update)
    
    await db.venues.update_one(
        {"id": venue_id},
        {"$set": {"settings": merged_settings}}
    )
    
    await create_audit_log(
        venue_id, current_user["id"], current_user["name"],
        "update_settings", "venue", venue_id, settings_update
    )
    
    return {"message": "Settings updated", "settings": merged_settings}

@api_router.get("/venues/{venue_id}/settings")
async def get_venue_settings(venue_id: str, current_user: dict = Depends(get_current_user)):
    """Get venue settings with defaults (MEGA PATCH)"""
    venue = await db.venues.find_one({"id": venue_id}, {"_id": 0})
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")
    
    await check_venue_access(current_user, venue_id)
    
    # Return settings merged with defaults
    settings = venue.get("settings", {})
    
    # Deep merge defaults
    def deep_merge(base, update):
        result = base.copy()
        for key, value in update.items():
            if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                result[key] = deep_merge(result[key], value)
            elif key not in result:
                result[key] = value
        return result
    
    merged = deep_merge(DEFAULT_VENUE_SETTINGS, settings)
    return {"settings": merged}

# ==================== ZONE ROUTES ====================
@api_router.get("/venues/{venue_id}/zones", response_model=List[Zone])
async def list_zones(venue_id: str):
    zones = await db.zones.find({"venue_id": venue_id}, {"_id": 0}).to_list(100)
    return zones

@api_router.post("/zones", response_model=Zone)
async def create_zone(data: ZoneCreate, current_user: dict = Depends(get_current_user)):
    await check_venue_access(current_user, data.venue_id)
    
    zone = Zone(**data.model_dump())
    await db.zones.insert_one(zone.model_dump())
    
    await create_audit_log(
        data.venue_id, current_user["id"], current_user["name"],
        "create", "zone", zone.id, {"name": zone.name}
    )
    
    return zone

# ==================== TABLE ROUTES ====================
@api_router.get("/venues/{venue_id}/tables", response_model=List[Table])
async def list_tables(venue_id: str):
    tables = await db.tables.find({"venue_id": venue_id}, {"_id": 0}).to_list(200)
    return tables

@api_router.post("/tables", response_model=Table)
async def create_table(data: TableCreate, current_user: dict = Depends(get_current_user)):
    await check_venue_access(current_user, data.venue_id)
    
    table = Table(**data.model_dump())
    await db.tables.insert_one(table.model_dump())
    
    await create_audit_log(
        data.venue_id, current_user["id"], current_user["name"],
        "create", "table", table.id, {"name": table.name}
    )
    
    return table

@api_router.put("/tables/{table_id}")
async def update_table(table_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    table = await db.tables.find_one({"id": table_id}, {"_id": 0})
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    
    await check_venue_access(current_user, table["venue_id"])
    
    await db.tables.update_one({"id": table_id}, {"$set": data})
    
    await create_audit_log(
        table["venue_id"], current_user["id"], current_user["name"],
        "update", "table", table_id, data
    )
    
    return {"message": "Table updated"}

# ==================== USER ROUTES ====================
@api_router.get("/venues/{venue_id}/users")
async def list_users(venue_id: str, current_user: dict = Depends(get_current_user)):
    await check_venue_access(current_user, venue_id)
    users = await db.users.find(
        {"venue_id": venue_id}, 
        {"_id": 0, "pin_hash": 0, "mfa_secret": 0}
    ).to_list(200)
    return users

@api_router.post("/users")
async def create_user(data: UserCreate, current_user: dict = Depends(get_current_user)):
    await check_venue_access(current_user, data.venue_id)
    
    if current_user["role"] not in [UserRole.OWNER, UserRole.MANAGER]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    user_dict = data.model_dump()
    user_dict["pin_hash"] = hash_pin(user_dict.pop("pin"))
    user = User(**user_dict)
    
    await db.users.insert_one(user.model_dump())
    
    await create_audit_log(
        data.venue_id, current_user["id"], current_user["name"],
        "create", "user", user.id, {"name": user.name, "role": user.role}
    )
    
    return {"id": user.id, "name": user.name, "role": user.role}

# ==================== MENU ROUTES ====================
@api_router.get("/venues/{venue_id}/menus")
async def list_menus(venue_id: str):
    menus = await db.menus.find({"venue_id": venue_id}, {"_id": 0}).to_list(100)
    return menus

@api_router.get("/venues/{venue_id}/menus/active")
async def get_active_menu(venue_id: str):
    menu = await db.menus.find_one({"venue_id": venue_id, "is_active": True}, {"_id": 0})
    if not menu:
        return None
    return menu

@api_router.post("/menus", response_model=Menu)
async def create_menu(data: MenuCreate, current_user: dict = Depends(get_current_user)):
    await check_venue_access(current_user, data.venue_id)
    
    menu = Menu(**data.model_dump())
    await db.menus.insert_one(menu.model_dump())
    
    await create_audit_log(
        data.venue_id, current_user["id"], current_user["name"],
        "create", "menu", menu.id, {"name": menu.name}
    )
    
    return menu

@api_router.put("/menus/{menu_id}")
async def update_menu(menu_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    menu = await db.menus.find_one({"id": menu_id}, {"_id": 0})
    if not menu:
        raise HTTPException(status_code=404, detail="Menu not found")
    
    await check_venue_access(current_user, menu["venue_id"])
    
    # If setting this menu as active, deactivate others
    if data.get("is_active") == True:
        await db.menus.update_many(
            {"venue_id": menu["venue_id"], "id": {"$ne": menu_id}},
            {"$set": {"is_active": False}}
        )
    
    await db.menus.update_one({"id": menu_id}, {"$set": data})
    
    return {"message": "Menu updated"}

@api_router.get("/venues/{venue_id}/menu/categories", response_model=List[MenuCategory])
async def list_categories(venue_id: str, menu_id: Optional[str] = None):
    query = {"venue_id": venue_id}
    if menu_id:
        query["menu_id"] = menu_id
    categories = await db.menu_categories.find(query, {"_id": 0}).sort("sort_order", 1).to_list(100)
    return categories

@api_router.post("/menu/categories", response_model=MenuCategory)
async def create_category(data: MenuCategoryCreate, current_user: dict = Depends(get_current_user)):
    await check_venue_access(current_user, data.venue_id)
    
    category = MenuCategory(**data.model_dump())
    await db.menu_categories.insert_one(category.model_dump())
    
    return category

@api_router.put("/menu/categories/{category_id}")
async def update_category(category_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    category = await db.menu_categories.find_one({"id": category_id}, {"_id": 0})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    await check_venue_access(current_user, category["venue_id"])
    await db.menu_categories.update_one({"id": category_id}, {"$set": data})
    
    return {"message": "Category updated"}

@api_router.delete("/menu/categories/{category_id}")
async def delete_category(category_id: str, current_user: dict = Depends(get_current_user)):
    category = await db.menu_categories.find_one({"id": category_id}, {"_id": 0})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    await check_venue_access(current_user, category["venue_id"])
    
    # Delete category and its items
    await db.menu_items.delete_many({"category_id": category_id})
    await db.menu_categories.delete_one({"id": category_id})
    
    return {"message": "Category deleted"}

@api_router.get("/venues/{venue_id}/menu/items", response_model=List[MenuItem])
async def list_menu_items(venue_id: str, category_id: Optional[str] = None, menu_id: Optional[str] = None, include_inactive: bool = False):
    query = {"venue_id": venue_id}
    if not include_inactive:
        query["is_active"] = True
    if category_id:
        query["category_id"] = category_id
    if menu_id:
        query["menu_id"] = menu_id
    items = await db.menu_items.find(query, {"_id": 0}).to_list(500)
    return items

@api_router.get("/menu/items/{item_id}")
async def get_menu_item(item_id: str):
    item = await db.menu_items.find_one({"id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

@api_router.post("/menu/items", response_model=MenuItem)
async def create_menu_item(data: MenuItemCreate, current_user: dict = Depends(get_current_user)):
    await check_venue_access(current_user, data.venue_id)
    
    item_data = data.model_dump()
    # Calculate price_cents if not provided
    if not item_data.get("price_cents"):
        item_data["price_cents"] = int(item_data["price"] * 100)
    
    item = MenuItem(**item_data)
    await db.menu_items.insert_one(item.model_dump())
    
    return item

@api_router.put("/menu/items/{item_id}")
async def update_menu_item(item_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    item = await db.menu_items.find_one({"id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    await check_venue_access(current_user, item["venue_id"])
    
    # Update price_cents if price changed
    if "price" in data and "price_cents" not in data:
        data["price_cents"] = int(data["price"] * 100)
    
    await db.menu_items.update_one({"id": item_id}, {"$set": data})
    
    await create_audit_log(
        item["venue_id"], current_user["id"], current_user["name"],
        "update", "menu_item", item_id, {"name": item["name"]}
    )
    
    return {"message": "Item updated"}

@api_router.delete("/menu/items/{item_id}")
async def delete_menu_item(item_id: str, current_user: dict = Depends(get_current_user)):
    item = await db.menu_items.find_one({"id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    await check_venue_access(current_user, item["venue_id"])
    
    # Soft delete - just mark inactive
    await db.menu_items.update_one({"id": item_id}, {"$set": {"is_active": False}})
    
    return {"message": "Item deleted"}

# ==================== MODIFIER ROUTES ====================
@api_router.post("/modifier-groups")
async def create_modifier_group(
    group_data: ModifierGroupCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a modifier group"""
    await check_venue_access(current_user, group_data.venue_id)
    
    group = ModifierGroup(**group_data.model_dump())
    await db.modifier_groups.insert_one(group.model_dump())
    
    return group.model_dump()

@api_router.get("/venues/{venue_id}/modifier-groups")
async def list_modifier_groups(venue_id: str, current_user: dict = Depends(get_current_user)):
    """List all modifier groups for a venue"""
    await check_venue_access(current_user, venue_id)
    
    groups = await db.modifier_groups.find({"venue_id": venue_id}, {"_id": 0}).sort("sort_order", 1).to_list(100)
    return groups

@api_router.post("/modifier-groups/{group_id}/options")
async def create_modifier_option(
    group_id: str,
    option_data: ModifierOptionCreate,
    current_user: dict = Depends(get_current_user)
):
    """Add an option to a modifier group"""
    group = await db.modifier_groups.find_one({"id": group_id}, {"_id": 0})
    if not group:
        raise HTTPException(status_code=404, detail="Modifier group not found")
    
    await check_venue_access(current_user, group["venue_id"])
    
    option = ModifierOption(**option_data.model_dump())
    await db.modifier_options.insert_one(option.model_dump())
    
    return option.model_dump()

@api_router.get("/modifier-groups/{group_id}/options")
async def list_modifier_options(group_id: str):
    """List all options for a modifier group"""
    options = await db.modifier_options.find({"group_id": group_id}, {"_id": 0}).sort("sort_order", 1).to_list(100)
    return options

@api_router.post("/menu/items/{item_id}/modifiers/{group_id}")
async def link_modifier_to_item(
    item_id: str,
    group_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Link a modifier group to a menu item"""
    item = await db.menu_items.find_one({"id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    
    await check_venue_access(current_user, item["venue_id"])
    
    link = MenuItemModifier(menu_item_id=item_id, modifier_group_id=group_id)
    await db.menu_item_modifiers.insert_one(link.model_dump())
    
    return {"message": "Modifier linked to item"}

@api_router.get("/menu/items/{item_id}/modifiers")
async def get_item_modifiers(item_id: str):
    """Get all modifier groups for a menu item"""
    links = await db.menu_item_modifiers.find({"menu_item_id": item_id}, {"_id": 0}).to_list(100)
    
    result = []
    for link in links:
        group = await db.modifier_groups.find_one({"id": link["modifier_group_id"]}, {"_id": 0})
        if group:
            options = await db.modifier_options.find(
                {"group_id": group["id"]},
                {"_id": 0}
            ).sort("sort_order", 1).to_list(100)
            group["options"] = options
            result.append(group)
    
    return result

# ==================== ORDER ROUTES ====================
@api_router.get("/venues/{venue_id}/orders")
async def list_orders(
    venue_id: str, 
    status: Optional[str] = None,
    table_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    await check_venue_access(current_user, venue_id)
    
    query = {"venue_id": venue_id}
    if status:
        query["status"] = status
    if table_id:
        query["table_id"] = table_id
    
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
    return orders

@api_router.get("/orders/{order_id}")
async def get_order(order_id: str, current_user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    await check_venue_access(current_user, order["venue_id"])
    return order

@api_router.post("/orders")
async def create_order(data: OrderCreate, current_user: dict = Depends(get_current_user)):
    await check_venue_access(current_user, data.venue_id)
    
    table = await db.tables.find_one({"id": data.table_id}, {"_id": 0})
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    
    server = await db.users.find_one({"id": data.server_id}, {"_id": 0})
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    
    order = Order(
        venue_id=data.venue_id,
        table_id=data.table_id,
        table_name=table["name"],
        server_id=data.server_id,
        server_name=server["name"],
        guest_count=table["seats"]
    )
    
    # Apply IDService
    order_dict = order.model_dump()
    order_dict = await ensure_ids(db, "ORDER", order_dict, data.venue_id)
    
    await db.orders.insert_one(order_dict)
    await db.tables.update_one(
        {"id": data.table_id},
        {"$set": {"status": "occupied", "current_order_id": order_dict["id"]}}
    )
    
    await create_audit_log(
        data.venue_id, current_user["id"], current_user["name"],
        "create", "order", order_dict["id"], {"table": table["name"]}
    )
    
    return order_dict

@api_router.post("/orders/{order_id}/items")
async def add_order_item(order_id: str, data: OrderItemCreate, current_user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    await check_venue_access(current_user, order["venue_id"])
    
    # Normalize menu_item_id (backward compatibility)
    menu_item_id = data.get_menu_item_id()
    if not menu_item_id:
        raise HTTPException(status_code=400, detail="menu_item_id or item_id required")
    
    menu_item = await db.menu_items.find_one({"id": menu_item_id}, {"_id": 0})
    if not menu_item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    
    order_item = OrderItem(
        menu_item_id=menu_item_id,
        menu_item_name=menu_item["name"],
        price=menu_item["price"],
        quantity=data.quantity,
        seat_number=data.seat_number,
        modifiers=data.modifiers,
        notes=data.notes,
        course=data.course
    )
    
    # Calculate new totals
    items = order.get("items", [])
    items.append(order_item.model_dump())
    subtotal = sum(i["price"] * i["quantity"] for i in items)
    tax = subtotal * 0.08  # 8% tax
    total = subtotal + tax
    
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {"items": items, "subtotal": subtotal, "tax": tax, "total": total}}
    )
    
    return order_item.model_dump()

@api_router.post("/orders/{order_id}/send")
async def send_order(
    order_id: str, 
    request: Request, 
    send_req: SendOrderRequest = SendOrderRequest(),
    current_user: dict = Depends(get_current_user)
):
    """Send order to kitchen - Refactored to use order_service"""
    # Use order service for business logic
    success, result = await process_send_order(
        db, order_id, request, 
        send_req.do_print, send_req.do_kds, send_req.do_stock,
        send_req.client_send_id, current_user
    )
    
    if not success:
        status_code = 404 if result.get("code") == "ORDER_NOT_FOUND" else 400
        return _json_fail(request, result.get("code", "ERROR"), result.get("message", "Error"), result, status_code)
    
    return result

@api_router.post("/orders/{order_id}/transfer")
async def transfer_order(order_id: str, new_table_id: str, current_user: dict = Depends(get_current_user)):
    """Transfer order - Refactored to use order_service"""
    success, result = await transfer_order_to_table(db, order_id, new_table_id, current_user)
    
    if not success:
        status_code = 404 if 'NOT_FOUND' in result.get('code', '') else 400
        raise HTTPException(status_code=status_code, detail=result.get('message', 'Error'))
    
    # Audit log
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if order:
        await create_audit_log(
            order["venue_id"], current_user["id"], current_user["name"],
            "transfer", "order", order_id,
            {"to_table": result.get("new_table")}
        )
    
    return result

@api_router.post("/orders/{order_id}/split")
async def split_order(order_id: str, seat_numbers: List[int], current_user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    await check_venue_access(current_user, order["venue_id"])
    
    # Create new order with selected items
    items_to_move = [i for i in order["items"] if i["seat_number"] in seat_numbers]
    remaining_items = [i for i in order["items"] if i["seat_number"] not in seat_numbers]
    
    if not items_to_move:
        raise HTTPException(status_code=400, detail="No items to split")
    
    # Calculate new totals for remaining order
    remaining_subtotal = sum(i["price"] * i["quantity"] for i in remaining_items)
    remaining_tax = remaining_subtotal * 0.08
    remaining_total = remaining_subtotal + remaining_tax
    
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {
            "items": remaining_items,
            "subtotal": remaining_subtotal,
            "tax": remaining_tax,
            "total": remaining_total
        }}
    )
    
    # Create new split order
    new_subtotal = sum(i["price"] * i["quantity"] for i in items_to_move)
    new_tax = new_subtotal * 0.08
    new_total = new_subtotal + new_tax
    
    new_order = Order(
        venue_id=order["venue_id"],
        table_id=order["table_id"],
        table_name=order["table_name"],
        server_id=order["server_id"],
        server_name=order["server_name"],
        items=items_to_move,
        status=order["status"],
        subtotal=new_subtotal,
        tax=new_tax,
        total=new_total,
        guest_count=len(seat_numbers)
    )
    
    await db.orders.insert_one(new_order.model_dump())
    
    await create_audit_log(
        order["venue_id"], current_user["id"], current_user["name"],
        "split", "order", order_id,
        {"new_order_id": new_order.id, "seats": seat_numbers}
    )
    
    return {"original_order_id": order_id, "new_order_id": new_order.id}

@api_router.post("/orders/{order_id}/merge")
async def merge_orders(order_id: str, merge_order_id: str, current_user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    merge_order = await db.orders.find_one({"id": merge_order_id}, {"_id": 0})
    
    if not order or not merge_order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    await check_venue_access(current_user, order["venue_id"])
    
    # Merge items
    combined_items = order["items"] + merge_order["items"]
    subtotal = sum(i["price"] * i["quantity"] for i in combined_items)
    tax = subtotal * 0.08
    total = subtotal + tax
    
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {
            "items": combined_items,
            "subtotal": subtotal,
            "tax": tax,
            "total": total,
            "guest_count": order["guest_count"] + merge_order["guest_count"]
        }}
    )
    
    # Delete merged order
    await db.orders.update_one(
        {"id": merge_order_id},
        {"$set": {"status": OrderStatus.VOIDED}}
    )
    
    await create_audit_log(
        order["venue_id"], current_user["id"], current_user["name"],
        "merge", "order", order_id,
        {"merged_order_id": merge_order_id}
    )
    
    return {"message": "Orders merged"}

@api_router.post("/orders/{order_id}/close")
async def close_order_endpoint(order_id: str, current_user: dict = Depends(get_current_user)):
    """Close order - Refactored to use order_service"""
    from services.order_service import close_order as order_close
    success, result = await order_close(db, order_id, current_user)
    
    if not success:
        status_code = 404 if 'NOT_FOUND' in result.get('code', '') else 400
        raise HTTPException(status_code=status_code, detail=result.get('message', 'Error'))
    
    # Audit log
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if order:
        await create_audit_log(
            order["venue_id"], current_user["id"], current_user["name"],
            "close", "order", order_id, {"total": order["total"]}
        )
    
    return result

# ==================== OFFLINE SYNC ROUTES ====================
@api_router.post("/orders/offline-sync")
async def offline_sync(orders: List[dict], current_user: dict = Depends(get_current_user)):
    """Deterministic replay of offline orders"""
    results = []
    
    for order_data in orders:
        offline_id = order_data.get("offline_id")
        
        # Check if already synced (idempotent)
        existing = await db.orders.find_one({"offline_id": offline_id}, {"_id": 0})
        if existing:
            results.append({"offline_id": offline_id, "status": "already_synced", "order_id": existing["id"]})
            continue
        
        # Create order
        order_data["offline_id"] = offline_id
        order = Order(**order_data)
        await db.orders.insert_one(order.model_dump())
        
        results.append({"offline_id": offline_id, "status": "synced", "order_id": order.id})
    
    return {"results": results}

# ==================== KDS ROUTES ====================
@api_router.get("/venues/{venue_id}/kds/tickets")
async def list_kds_tickets(
    venue_id: str,
    prep_area: Optional[str] = None,
    status: Optional[str] = None
):
    query = {"venue_id": venue_id}
    if prep_area:
        query["prep_area"] = prep_area
    if status:
        query["status"] = status
    else:
        query["status"] = {"$ne": "ready"}
    
    tickets = await db.kds_tickets.find(query, {"_id": 0}).sort("created_at", 1).to_list(100)
    return tickets

@api_router.post("/kds/tickets/{ticket_id}/start")
async def start_ticket(ticket_id: str, current_user: dict = Depends(get_current_user)):
    """Start ticket - Refactored to use kds_service"""
    success, result = await update_ticket_status(db, ticket_id, "PREPARING", current_user)
    
    if not success:
        raise HTTPException(status_code=404, detail=result.get("message", "Error"))
    
    return result

@api_router.post("/kds/tickets/{ticket_id}/ready")
async def mark_ticket_ready(ticket_id: str, current_user: dict = Depends(get_current_user)):
    """Mark ticket ready - Refactored to use kds_service"""
    success, result = await update_ticket_status(db, ticket_id, "READY", current_user)
    
    if not success:
        raise HTTPException(status_code=404, detail=result.get("message", "Error"))
    
    return result

@api_router.post("/kds/tickets/{ticket_id}/done")
async def mark_ticket_done(ticket_id: str, pass_notes: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Mark ticket as DONE (PASS confirmed)"""
    ticket = await db.kds_tickets.find_one({"id": ticket_id}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Only PASS roles can mark DONE
    if current_user["role"] not in [UserRole.OWNER, UserRole.MANAGER, UserRole.SUPERVISOR]:
        raise HTTPException(status_code=403, detail="PASS role required")
    
    now = datetime.now(timezone.utc).isoformat()
    await db.kds_tickets.update_one(
        {"id": ticket_id},
        {"$set": {
            "status": "done",
            "done_at": now,
            "pass_notes": pass_notes
        }}
    )
    
    # Update order to served
    await db.orders.update_one(
        {"id": ticket["order_id"]},
        {"$set": {"status": "served"}}
    )
    
    return {"message": "Ticket DONE - ready to serve"}

@api_router.post("/kds/tickets/{ticket_id}/pass-approve")
async def pass_approve_ticket(ticket_id: str, current_user: dict = Depends(get_current_user)):
    """PASS approval - Refactored to use kds_service"""
    # Role check: Only PASS roles
    if current_user["role"] not in [UserRole.OWNER, UserRole.GENERAL_MANAGER, UserRole.MANAGER, UserRole.SUPERVISOR]:
        raise HTTPException(status_code=403, detail="PASS role required")
    
    now = datetime.now(timezone.utc).isoformat()
    
    success, result = await update_ticket_status(
        db, ticket_id, "READY", current_user,
        {"pass_approved": True, "pass_approved_at": now, "pass_approved_by": current_user["id"]}
    )
    
    if not success:
        raise HTTPException(status_code=404, detail=result.get("message", "Error"))
    
    return {"message": "PASS approved"}

@api_router.post("/kds/tickets/{ticket_id}/deliver")
async def deliver_ticket(ticket_id: str, item_ids: Optional[List[str]] = None, current_user: dict = Depends(get_current_user)):
    """Mark ticket (or specific items) as delivered and set to DONE (MEGA PATCH: Item-level deliver)"""
    ticket = await db.kds_tickets.find_one({"id": ticket_id}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    await check_venue_access(current_user, ticket["venue_id"])
    
    # Role check: Waiter, Runner, Manager
    if current_user["role"] not in [UserRole.OWNER, UserRole.GENERAL_MANAGER, UserRole.MANAGER, UserRole.SUPERVISOR, UserRole.STAFF]:
        raise HTTPException(status_code=403, detail="Waiter/Runner/Manager required")
    
    now = datetime.now(timezone.utc).isoformat()
    items = ticket.get("items", [])
    
    # If no item_ids specified, mark ALL items as delivered/done
    if not item_ids:
        for item in items:
            if item.get("status") in ["READY", "PREPARING"]:
                item["status"] = "DONE"
                item["done_at"] = now
                
                # Calculate actual prep time
                started_at_str = item.get("started_at")
                if started_at_str:
                    try:
                        started_at = datetime.fromisoformat(started_at_str.replace("Z", "+00:00"))
                        done_at = datetime.now(timezone.utc)
                        actual_seconds = int((done_at - started_at).total_seconds())
                        item["actual_prep_seconds"] = actual_seconds
                    except:
                        pass
    else:
        # Mark only specified items
        for item in items:
            item_key = item.get("item_id") or item.get("id")
            if item_key in item_ids and item.get("status") in ["READY", "PREPARING"]:
                item["status"] = "DONE"
                item["done_at"] = now
                
                # Calculate actual prep time
                started_at_str = item.get("started_at")
                if started_at_str:
                    try:
                        started_at = datetime.fromisoformat(started_at_str.replace("Z", "+00:00"))
                        done_at = datetime.now(timezone.utc)
                        actual_seconds = int((done_at - started_at).total_seconds())
                        item["actual_prep_seconds"] = actual_seconds
                    except:
                        pass
    
    # Check if all items are DONE
    all_done = all(i.get("status") == "DONE" for i in items)
    ticket_status = "DONE" if all_done else ticket.get("status", "READY")
    
    await db.kds_tickets.update_one(
        {"id": ticket_id},
        {"$set": {
            "items": items,
            "delivered": True,
            "delivered_at": now,
            "delivered_by": current_user["id"],
            "status": ticket_status,
            "done_at": now if all_done else ticket.get("done_at"),
            "last_action_by": current_user["id"],
            "last_action_at": now,
            "updated_at": now
        }}
    )
    
    # Update order status if all tickets are done
    if all_done:
        tickets = await db.kds_tickets.find({"order_id": ticket["order_id"]}, {"_id": 0}).to_list(100)
        all_tickets_done = all(t.get("status") == "DONE" for t in tickets)
        
        if all_tickets_done:
            await db.orders.update_one(
                {"id": ticket["order_id"]},
                {"$set": {"status": "served"}}
            )
    
    return {"message": "Delivered to table", "all_done": all_done}

@api_router.get("/orders/{order_id}/kds-status")
async def get_order_kds_status(order_id: str, current_user: dict = Depends(get_current_user)):
    """Get KDS completion status for order"""
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    await check_venue_access(current_user, order["venue_id"])
    
    # Get all tickets for this order
    tickets = await db.kds_tickets.find({"order_id": order_id}, {"_id": 0}).to_list(100)
    
    any_not_ready = any(t.get("status") in ["pending", "new", "preparing", "in_progress"] for t in tickets)
    any_waiting_pass = any(t.get("status") == "ready" and not t.get("pass_approved", False) for t in tickets)
    any_not_delivered = any(not t.get("delivered", False) for t in tickets)
    
    if any_not_ready:
        state = "IN_PROGRESS"
    elif any_waiting_pass:
        state = "READY_WAITING_PASS"
    elif any_not_delivered:
        state = "PASS_APPROVED"
    else:
        state = "DONE"
    
    return {
        "state": state,
        "pending_items_count": sum(1 for t in tickets if t.get("status") in ["pending", "new", "preparing", "in_progress"]),
        "any_undelivered": any_not_delivered,
        "all_done": state == "DONE"
    }

@api_router.get("/orders/{order_id}/billing-eligibility")
async def get_billing_eligibility(order_id: str, current_user: dict = Depends(get_current_user)):
    """Check if order can be billed (MEGA PATCH: Billing Guard)"""
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    await check_venue_access(current_user, order["venue_id"])
    
    # Get venue settings
    venue = await db.venues.find_one({"id": order["venue_id"]}, {"_id": 0})
    settings = venue.get("settings", {}) if venue else {}
    bill_require_done = settings.get("pos", {}).get("bill_require_done", True)
    message = settings.get("pos", {}).get("bill_require_done_message", 
                                         "Some items are not completed yet. Please wait for DONE items before printing the bill.")
    
    # If feature disabled, always allow
    if not bill_require_done:
        return BillingEligibilityResponse(eligible=True, blocking_items=[], message=None).model_dump()
    
    # Get all KDS tickets for this order
    tickets = await db.kds_tickets.find({"order_id": order_id}, {"_id": 0}).to_list(100)
    
    # If no KDS tickets (print-only mode), allow billing
    send_rounds = order.get("send_rounds", [])
    any_kds_sent = any(r.get("do_kds") for r in send_rounds)
    
    if not tickets and not any_kds_sent:
        return BillingEligibilityResponse(eligible=True, blocking_items=[], message=None).model_dump()
    
    # Check item-level status
    blocking_items = []
    for ticket in tickets:
        items = ticket.get("items", [])
        for item in items:
            status = item.get("status", "NEW")
            if status != "DONE":
                blocking_items.append({
                    "menu_item_name": item.get("menu_item_name", "Unknown"),
                    "seat_no": item.get("seat_no", item.get("seat_number", 1)),
                    "course_no": item.get("course_no", item.get("course", 1)),
                    "status": status
                })
    
    eligible = len(blocking_items) == 0
    
    return BillingEligibilityResponse(
        eligible=eligible,
        blocking_items=blocking_items[:3],  # Return first 3
        message=message if not eligible else None
    ).model_dump()

@api_router.post("/kds/tickets/{ticket_id}/hold")
async def hold_ticket(ticket_id: str, reason: str, current_user: dict = Depends(get_current_user)):
    """Put ticket on HOLD - Refactored to use kds_service"""
    success, result = await update_ticket_status(db, ticket_id, "HELD", current_user, {"reason": reason})
    
    if not success:
        raise HTTPException(status_code=404, detail=result.get("message", "Error"))
    
    return result

@api_router.post("/kds/tickets/{ticket_id}/claim")
async def claim_ticket_endpoint(ticket_id: str, current_user: dict = Depends(get_current_user)):
    """Claim ticket - Refactored to use kds_service"""
    from services.kds_service import claim_ticket as kds_claim_ticket
    success, result = await kds_claim_ticket(db, ticket_id, current_user)
    
    if not success:
        status_code = 409 if result.get("code") == "TICKET_CLAIMED" else 404
        raise HTTPException(status_code=status_code, detail=result.get("message", "Error"))
    
    return result

@api_router.post("/kds/tickets/{ticket_id}/release")
async def release_ticket_endpoint(ticket_id: str, current_user: dict = Depends(get_current_user)):
    """Release ticket - Refactored to use kds_service"""
    from services.kds_service import release_ticket as kds_release_ticket
    success, result = await kds_release_ticket(db, ticket_id, current_user)
    
    if not success:
        raise HTTPException(status_code=404, detail=result.get("message", "Error"))
    
    return result

# ==================== ITEM-BASED KDS ENDPOINTS (MEGA PATCH) ====================
@api_router.post("/kds/tickets/{ticket_id}/items/{item_id}/start")
async def start_ticket_item(ticket_id: str, item_id: str, current_user: dict = Depends(get_current_user)):
    """Start item - Refactored to use kds_service"""
    success, result = await update_ticket_item_status(db, ticket_id, item_id, "PREPARING", current_user)
    
    if not success:
        status_code = 404
        raise HTTPException(status_code=status_code, detail=result.get("message", "Error"))
    
    return result

@api_router.post("/kds/tickets/{ticket_id}/items/{item_id}/ready")
async def mark_ticket_item_ready(ticket_id: str, item_id: str, current_user: dict = Depends(get_current_user)):
    """Mark item ready - Refactored to use kds_service"""
    success, result = await update_ticket_item_status(db, ticket_id, item_id, "READY", current_user)
    
    if not success:
        raise HTTPException(status_code=404, detail=result.get("message", "Error"))
    
    return result

@api_router.post("/kds/tickets/{ticket_id}/items/{item_id}/hold")
async def hold_ticket_item(ticket_id: str, item_id: str, reason: str = "", current_user: dict = Depends(get_current_user)):
    """Hold item - Refactored to use kds_service"""
    success, result = await update_ticket_item_status(db, ticket_id, item_id, "HELD", current_user)
    
    if not success:
        raise HTTPException(status_code=404, detail=result.get("message", "Error"))
    
    return result

@api_router.post("/kds/tickets/{ticket_id}/items/{item_id}/done")
async def mark_ticket_item_done(ticket_id: str, item_id: str, current_user: dict = Depends(get_current_user)):
    """Mark a specific item as done (with pass/deliver rules)"""
    ticket = await db.kds_tickets.find_one({"id": ticket_id}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    await check_venue_access(current_user, ticket["venue_id"])
    
    # Get venue settings
    venue = await db.venues.find_one({"id": ticket["venue_id"]}, {"_id": 0})
    settings = venue.get("settings", {}) if venue else {}
    require_pass = settings.get("kds", {}).get("require_pass_approval", True)
    allow_done_only_on_deliver = settings.get("kds", {}).get("allow_done_only_on_deliver", True)
    
    # Check rules
    if require_pass and not ticket.get("pass_approved"):
        raise HTTPException(
            status_code=400, 
            detail={"code": "PASS_APPROVAL_REQUIRED", "message": "Pass approval required before marking DONE"}
        )
    
    if allow_done_only_on_deliver and not ticket.get("delivered"):
        raise HTTPException(
            status_code=400,
            detail={"code": "DELIVERY_REQUIRED", "message": "Item must be delivered before marking DONE"}
        )
    
    # Find and update the item
    items = ticket.get("items", [])
    item_found = False
    now = datetime.now(timezone.utc).isoformat()
    
    for item in items:
        if item.get("item_id") == item_id or item.get("id") == item_id:
            item["status"] = "DONE"
            item["done_at"] = now
            
            # Calculate actual prep time
            started_at_str = item.get("started_at")
            if started_at_str:
                started_at = datetime.fromisoformat(started_at_str.replace("Z", "+00:00"))
                done_at = datetime.now(timezone.utc)
                actual_seconds = int((done_at - started_at).total_seconds())
                item["actual_prep_seconds"] = actual_seconds
            
            item_found = True
            break
    
    if not item_found:
        raise HTTPException(status_code=404, detail="Item not found in ticket")
    
    # Check if all items are DONE
    all_done = all(i.get("status") == "DONE" for i in items)
    ticket_status = "DONE" if all_done else ticket.get("status", "READY")
    
    await db.kds_tickets.update_one(
        {"id": ticket_id},
        {"$set": {
            "items": items,
            "status": ticket_status,
            "done_at": now if all_done else ticket.get("done_at"),
            "last_action_by": current_user["id"],
            "last_action_at": now,
            "updated_at": now
        }}
    )
    
    return {"message": "Item done", "item_id": item_id, "status": "DONE"}

@api_router.post("/kds/stations/{station}/pause")
async def pause_station(
    station: str,
    reason: str,
    current_user: dict = Depends(get_current_user)
):
    """Pause station (manager/expo only)"""
    if current_user["role"] not in [UserRole.OWNER, UserRole.GENERAL_MANAGER, UserRole.MANAGER, UserRole.SUPERVISOR]:
        raise HTTPException(status_code=403, detail="Manager/Expo required")
    
    venue_id = current_user["venue_id"]
    now = datetime.now(timezone.utc).isoformat()
    
    await db.station_states.update_one(
        {"venue_id": venue_id, "station": station},
        {"$set": {
            "paused": True,
            "paused_by": current_user["id"],
            "paused_at": now,
            "pause_reason": reason
        }},
        upsert=True
    )
    return {"message": f"{station} paused"}

@api_router.post("/kds/stations/{station}/resume")
async def resume_station(station: str, current_user: dict = Depends(get_current_user)):
    """Resume station"""
    if current_user["role"] not in [UserRole.OWNER, UserRole.GENERAL_MANAGER, UserRole.MANAGER, UserRole.SUPERVISOR]:
        raise HTTPException(status_code=403, detail="Manager/Expo required")
    
    venue_id = current_user["venue_id"]
    
    await db.station_states.update_one(
        {"venue_id": venue_id, "station": station},
        {"$set": {"paused": False}}
    )
    return {"message": f"{station} resumed"}

@api_router.get("/kds/stations/state")
async def get_station_states(venue_id: str, current_user: dict = Depends(get_current_user)):
    """Get all station pause states"""
    await check_venue_access(current_user, venue_id)
    states = await db.station_states.find({"venue_id": venue_id}, {"_id": 0}).to_list(10)
    return states

# ==================== UI ERROR TELEMETRY ROUTES ====================
@api_router.post("/incidents/ui-error")
async def log_ui_error(payload: dict, current_user: dict = Depends(get_current_user)):
    """Log UI error with dedupe"""
    # Dedupe key
    key = f"{current_user['id']}|{payload.get('app_mode')}|{payload.get('name')}|{payload.get('message', '')[:120]}"
    now = datetime.now(timezone.utc)
    
    # Check if same error logged in last 60s
    existing = await db.ui_errors.find_one({
        "dedupe_key": key,
        "created_at": {"$gte": (now - timedelta(seconds=60)).isoformat()}
    })
    
    if existing:
        return {"ok": True, "deduped": True}
    
    doc = {
        "id": str(uuid.uuid4()),
        "dedupe_key": key,
        "user_id": current_user["id"],
        "role": current_user.get("role"),
        "venue_id": current_user.get("venue_id"),
        "app_mode": payload.get("app_mode", "UNKNOWN"),
        "name": payload.get("name", "Error"),
        "message": payload.get("message", ""),
        "stack": payload.get("stack", ""),
        "component_stack": payload.get("component_stack", ""),
        "url": payload.get("url", ""),
        "user_agent": payload.get("user_agent", ""),
        "ts": payload.get("ts", now.isoformat()),
        "created_at": now.isoformat()
    }
    
    await db.ui_errors.insert_one(doc)
    return {"ok": True}

@api_router.get("/incidents/ui-errors")
async def list_ui_errors(limit: int = Query(200), current_user: dict = Depends(get_current_user)):
    """List UI errors (admin only)"""
    if current_user.get("role") not in [UserRole.OWNER, UserRole.GENERAL_MANAGER, UserRole.MANAGER, UserRole.IT_ADMIN, UserRole.FINANCE, UserRole.SUPERVISOR]:
        raise HTTPException(status_code=403, detail="Admin role required")
    
    limit = min(max(limit, 1), 500)
    items = await db.ui_errors.find({}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return {"items": items}

# ==================== PRINT ROUTES ====================
@api_router.get("/venues/{venue_id}/print-jobs")
async def list_print_jobs(venue_id: str, status: Optional[str] = None):
    query = {"venue_id": venue_id}
    if status:
        query["status"] = status
    jobs = await db.print_jobs.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return jobs

@api_router.post("/print-jobs/{job_id}/complete")
async def complete_print_job(job_id: str):
    # Idempotent - check if already printed
    job = await db.print_jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Print job not found")
    
    if job["status"] == "printed":
        return {"message": "Already printed", "idempotent": True}
    
    now = datetime.now(timezone.utc).isoformat()
    await db.print_jobs.update_one(
        {"id": job_id},
        {"$set": {"status": "printed", "printed_at": now}}
    )
    
    return {"message": "Print job completed"}

# ==================== UNIVERSAL GUIDE SYSTEM ROUTES ====================
@api_router.post("/assets/upload")
async def upload_asset(
    file: UploadFile = File(...),
    venue_id: str = Query(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload an asset (photo) for guides"""
    await check_venue_access(current_user, venue_id)
    
    # Read file content
    content = await file.read()
    
    # Generate storage key
    file_ext = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
    storage_key = f"assets/{venue_id}/{uuid.uuid4()}.{file_ext}"
    
    # In production, upload to S3/cloud storage
    # For now, save locally
    upload_dir = Path(f"/app/uploads/{venue_id}")
    upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = upload_dir / f"{uuid.uuid4()}.{file_ext}"
    
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Create asset record
    asset = Asset(
        venue_id=venue_id,
        filename=file.filename,
        mime_type=file.content_type or "image/jpeg",
        size_bytes=len(content),
        storage_key=storage_key,
        url=f"/uploads/{venue_id}/{file_path.name}",
        created_by=current_user["id"]
    )
    
    await db.assets.insert_one(asset.model_dump())
    
    return asset.model_dump()

@api_router.get("/venues/{venue_id}/guides")
async def list_guides(
    venue_id: str,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    guide_kind: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """List all guides for a venue"""
    await check_venue_access(current_user, venue_id)
    
    query = {"venue_id": venue_id}
    if entity_type:
        query["entity_type"] = entity_type
    if entity_id:
        query["entity_id"] = entity_id
    if guide_kind:
        query["guide_kind"] = guide_kind
    
    guides = await db.guide_documents.find(query, {"_id": 0}).sort("updated_at", -1).to_list(200)
    return guides

@api_router.get("/guides/{guide_id}")
async def get_guide(guide_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific guide"""
    guide = await db.guide_documents.find_one({"id": guide_id}, {"_id": 0})
    if not guide:
        raise HTTPException(status_code=404, detail="Guide not found")
    
    await check_venue_access(current_user, guide["venue_id"])
    return guide

@api_router.post("/guides")
async def create_guide(data: dict, current_user: dict = Depends(get_current_user)):
    """Create a new guide"""
    venue_id = data.get("venue_id")
    if not venue_id:
        raise HTTPException(status_code=400, detail="venue_id required")
    
    await check_venue_access(current_user, venue_id)
    
    # Create guide document
    guide = GuideDocument(
        venue_id=venue_id,
        entity_type=EntityType(data.get("entity_type", "menu_item")),
        entity_id=data.get("entity_id", ""),
        guide_kind=GuideKind(data.get("guide_kind", "service")),
        version=data.get("version", 1),
        photos=[GuidePhoto(**p) for p in data.get("photos", [])],
        steps=[GuideStep(**s) for s in data.get("steps", [])],
        measures=[GuideMeasure(**m) for m in data.get("measures", [])],
        tags=data.get("tags", []),
        updated_by_user_id=current_user["id"]
    )
    
    await db.guide_documents.insert_one(guide.model_dump())
    
    await create_audit_log(
        venue_id, current_user["id"], current_user["name"],
        "create", "guide", guide.id,
        {"entity_type": guide.entity_type, "entity_id": guide.entity_id}
    )
    
    return guide.model_dump()

@api_router.put("/guides/{guide_id}")
async def update_guide(guide_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    """Update a guide"""
    guide = await db.guide_documents.find_one({"id": guide_id}, {"_id": 0})
    if not guide:
        raise HTTPException(status_code=404, detail="Guide not found")
    
    await check_venue_access(current_user, guide["venue_id"])
    
    # Update fields
    update_data = {
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by_user_id": current_user["id"]
    }
    
    if "photos" in data:
        update_data["photos"] = [GuidePhoto(**p).model_dump() for p in data["photos"]]
    if "steps" in data:
        update_data["steps"] = [GuideStep(**s).model_dump() for s in data["steps"]]
    if "measures" in data:
        update_data["measures"] = [GuideMeasure(**m).model_dump() for m in data["measures"]]
    if "tags" in data:
        update_data["tags"] = data["tags"]
    if "version" in data:
        update_data["version"] = data["version"]
    
    await db.guide_documents.update_one({"id": guide_id}, {"$set": update_data})
    
    await create_audit_log(
        guide["venue_id"], current_user["id"], current_user["name"],
        "update", "guide", guide_id, update_data
    )
    
    return {"message": "Guide updated"}

@api_router.delete("/guides/{guide_id}")
async def delete_guide(guide_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a guide"""
    guide = await db.guide_documents.find_one({"id": guide_id}, {"_id": 0})
    if not guide:
        raise HTTPException(status_code=404, detail="Guide not found")
    
    await check_venue_access(current_user, guide["venue_id"])
    
    await db.guide_documents.delete_one({"id": guide_id})
    
    await create_audit_log(
        guide["venue_id"], current_user["id"], current_user["name"],
        "delete", "guide", guide_id, {}
    )
    
    return {"message": "Guide deleted"}

@api_router.get("/guides/entity/{entity_type}/{entity_id}")
async def get_guide_by_entity(
    entity_type: str,
    entity_id: str,
    guide_kind: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get guide for a specific entity (menu item, inventory item, etc.)"""
    query = {
        "entity_type": entity_type,
        "entity_id": entity_id
    }
    if guide_kind:
        query["guide_kind"] = guide_kind
    
    guide = await db.guide_documents.find_one(query, {"_id": 0})
    if not guide:
        return None
    
    await check_venue_access(current_user, guide["venue_id"])
    return guide

# ==================== INVENTORY ROUTES ====================
@api_router.get("/venues/{venue_id}/inventory")
async def list_inventory(venue_id: str, current_user: dict = Depends(get_current_user)):
    await check_venue_access(current_user, venue_id)
    items = await db.inventory_items.find({"venue_id": venue_id}, {"_id": 0}).to_list(500)
    return items

@api_router.post("/inventory/items", response_model=InventoryItem)
async def create_inventory_item(data: InventoryItemCreate, current_user: dict = Depends(get_current_user)):
    await check_venue_access(current_user, data.venue_id)
    
    item = InventoryItem(**data.model_dump())
    await db.inventory_items.insert_one(item.model_dump())
    
    await create_audit_log(
        data.venue_id, current_user["id"], current_user["name"],
        "create", "inventory_item", item.id, {"name": item.name}
    )
    
    return item

@api_router.post("/inventory/ledger")
async def create_ledger_entry(
    item_id: str,
    action: LedgerAction,
    quantity: float,
    reason: Optional[str] = None,
    lot_number: Optional[str] = None,
    expiry_date: Optional[str] = None,
    po_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    item = await db.inventory_items.find_one({"id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    await check_venue_access(current_user, item["venue_id"])
    
    # Get last ledger entry hash
    last_entry = await db.stock_ledger.find_one(
        {"venue_id": item["venue_id"]},
        sort=[("created_at", -1)],
        projection={"_id": 0, "entry_hash": 1}
    )
    prev_hash = last_entry["entry_hash"] if last_entry else "genesis"
    
    entry_data = {
        "item_id": item_id,
        "action": action,
        "quantity": quantity,
        "reason": reason
    }
    entry_hash = compute_hash(entry_data, prev_hash)
    
    entry = StockLedgerEntry(
        venue_id=item["venue_id"],
        item_id=item_id,
        action=action,
        quantity=quantity,
        lot_number=lot_number,
        expiry_date=expiry_date,
        reason=reason,
        po_id=po_id,
        user_id=current_user["id"],
        prev_hash=prev_hash,
        entry_hash=entry_hash
    )
    
    await db.stock_ledger.insert_one(entry.model_dump())
    
    # Update current stock
    stock_delta = quantity if action in [LedgerAction.IN] else -quantity
    if action == LedgerAction.ADJUST:
        await db.inventory_items.update_one(
            {"id": item_id},
            {"$set": {"current_stock": quantity}}
        )
    else:
        await db.inventory_items.update_one(
            {"id": item_id},
            {"$inc": {"current_stock": stock_delta}}
        )
    
    await create_audit_log(
        item["venue_id"], current_user["id"], current_user["name"],
        f"inventory_{action}", "inventory_item", item_id,
        {"quantity": quantity, "reason": reason}
    )
    
    return entry.model_dump()

@api_router.get("/venues/{venue_id}/inventory/ledger")
async def get_ledger(
    venue_id: str,
    item_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    await check_venue_access(current_user, venue_id)
    
    query = {"venue_id": venue_id}
    if item_id:
        query["item_id"] = item_id
    
    entries = await db.stock_ledger.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return entries

@api_router.get("/venues/{venue_id}/inventory/variance")
async def get_variance_report(venue_id: str, current_user: dict = Depends(get_current_user)):
    await check_venue_access(current_user, venue_id)
    
    items = await db.inventory_items.find({"venue_id": venue_id}, {"_id": 0}).to_list(500)
    
    variance_report = []
    for item in items:
        # Calculate expected vs actual
        ledger = await db.stock_ledger.find({"item_id": item["id"]}, {"_id": 0}).to_list(1000)
        
        total_in = sum(e["quantity"] for e in ledger if e["action"] == "in")
        total_out = sum(e["quantity"] for e in ledger if e["action"] == "out")
        total_waste = sum(e["quantity"] for e in ledger if e["action"] == "waste")
        expected = total_in - total_out - total_waste
        
        variance_report.append({
            "item_id": item["id"],
            "name": item["name"],
            "current_stock": item["current_stock"],
            "expected_stock": expected,
            "variance": item["current_stock"] - expected,
            "waste": total_waste
        })
    
    return variance_report

# ==================== PROCUREMENT ROUTES ====================
@api_router.get("/venues/{venue_id}/purchase-orders")
async def list_purchase_orders(venue_id: str, current_user: dict = Depends(get_current_user)):
    await check_venue_access(current_user, venue_id)
    orders = await db.purchase_orders.find({"venue_id": venue_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return orders

@api_router.post("/purchase-orders", response_model=PurchaseOrder)
async def create_purchase_order(data: PurchaseOrderCreate, current_user: dict = Depends(get_current_user)):
    await check_venue_access(current_user, data.venue_id)
    
    # Add received=0 to each item
    items = [{"item_id": i.get("item_id"), "name": i.get("name"), "quantity": i.get("quantity"), "received": 0} for i in data.items]
    
    po = PurchaseOrder(
        venue_id=data.venue_id,
        supplier_name=data.supplier_name,
        items=items
    )
    
    await db.purchase_orders.insert_one(po.model_dump())
    
    await create_audit_log(
        data.venue_id, current_user["id"], current_user["name"],
        "create", "purchase_order", po.id, {"supplier": po.supplier_name}
    )
    
    return po

@api_router.post("/purchase-orders/{po_id}/receive")
async def receive_delivery(
    po_id: str,
    received_items: List[dict],  # [{item_id, quantity, lot_number?, expiry_date?}]
    current_user: dict = Depends(get_current_user)
):
    po = await db.purchase_orders.find_one({"id": po_id}, {"_id": 0})
    if not po:
        raise HTTPException(status_code=404, detail="PO not found")
    
    await check_venue_access(current_user, po["venue_id"])
    
    # Update received quantities and create ledger entries
    items = po["items"]
    all_received = True
    
    for received in received_items:
        for item in items:
            if item["item_id"] == received["item_id"]:
                item["received"] += received["quantity"]
                if item["received"] < item["quantity"]:
                    all_received = False
                
                # Create inventory ledger entry
                await create_ledger_entry(
                    item_id=received["item_id"],
                    action=LedgerAction.IN,
                    quantity=received["quantity"],
                    reason=f"PO Receive: {po_id}",
                    lot_number=received.get("lot_number"),
                    expiry_date=received.get("expiry_date"),
                    po_id=po_id,
                    current_user=current_user
                )
    
    status = "received" if all_received else "partial"
    
    await db.purchase_orders.update_one(
        {"id": po_id},
        {"$set": {
            "items": items,
            "status": status,
            "received_at": datetime.now(timezone.utc).isoformat() if all_received else None
        }}
    )
    
    await create_audit_log(
        po["venue_id"], current_user["id"], current_user["name"],
        "receive", "purchase_order", po_id, {"status": status}
    )
    
    return {"message": f"Delivery {status}"}

# ==================== DOCUMENT HUB ROUTES ====================
UPLOAD_DIR = Path("/app/uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

@api_router.post("/documents/upload")
async def upload_document(
    venue_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload a document (placeholder implementation)"""
    await check_venue_access(current_user, venue_id)
    
    # Save file
    file_path = UPLOAD_DIR / f"{venue_id}_{datetime.now(timezone.utc).timestamp()}_{file.filename}"
    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
    
    return {"filename": file.filename, "path": str(file_path)}


# ==================== FLOOR PLAN ROUTES ====================
@api_router.get("/venues/{venue_id}/floor-plans")
async def get_floor_plans(venue_id: str, current_user: dict = Depends(get_current_user)):
    """Get all floor plans for a venue"""
    await check_venue_access(current_user, venue_id)
    plans = await db.floor_plans.find({"venue_id": venue_id}, {"_id": 0}).to_list(100)
    return plans

@api_router.get("/floor-plans/{plan_id}")
async def get_floor_plan(plan_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific floor plan with its objects"""
    plan = await db.floor_plans.find_one({"id": plan_id}, {"_id": 0})
    if not plan:
        raise HTTPException(status_code=404, detail="Floor plan not found")
    
    await check_venue_access(current_user, plan["venue_id"])
    
    # Get objects for this floor plan
    objects = await db.floor_plan_objects.find({"floor_plan_id": plan_id}, {"_id": 0}).to_list(1000)
    plan["objects"] = objects
    
    return plan

@api_router.post("/venues/{venue_id}/floor-plans")
async def create_floor_plan(
    venue_id: str,
    plan_data: FloorPlanCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new floor plan"""
    await check_venue_access(current_user, venue_id)
    
    if plan_data.venue_id != venue_id:
        raise HTTPException(status_code=400, detail="Venue ID mismatch")
    
    plan = FloorPlan(**plan_data.model_dump())
    await db.floor_plans.insert_one(plan.model_dump())
    
    await create_audit_log(
        venue_id, current_user["id"], current_user["name"],
        "create", "floor_plan", plan.id, {"name": plan.name}
    )
    
    return plan

@api_router.put("/floor-plans/{plan_id}")
async def update_floor_plan(
    plan_id: str,
    updates: dict,
    current_user: dict = Depends(get_current_user)
):
    """Update floor plan details"""
    plan = await db.floor_plans.find_one({"id": plan_id}, {"_id": 0})
    if not plan:
        raise HTTPException(status_code=404, detail="Floor plan not found")
    
    await check_venue_access(current_user, plan["venue_id"])
    
    # Update timestamp
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.floor_plans.update_one(
        {"id": plan_id},
        {"$set": updates}
    )
    
    await create_audit_log(
        plan["venue_id"], current_user["id"], current_user["name"],
        "update", "floor_plan", plan_id, updates
    )
    
    return {"success": True}

@api_router.post("/floor-plans/{plan_id}/activate")
async def activate_floor_plan(plan_id: str, current_user: dict = Depends(get_current_user)):
    """Set this floor plan as active (and deactivate others)"""
    plan = await db.floor_plans.find_one({"id": plan_id}, {"_id": 0})
    if not plan:
        raise HTTPException(status_code=404, detail="Floor plan not found")
    
    await check_venue_access(current_user, plan["venue_id"])
    
    # Deactivate all other plans for this venue
    await db.floor_plans.update_many(
        {"venue_id": plan["venue_id"]},
        {"$set": {"is_active": False}}
    )
    
    # Activate this one
    await db.floor_plans.update_one(
        {"id": plan_id},
        {"$set": {"is_active": True}}
    )
    
    await create_audit_log(
        plan["venue_id"], current_user["id"], current_user["name"],
        "activate", "floor_plan", plan_id, {}
    )
    
    return {"success": True}

@api_router.delete("/floor-plans/{plan_id}")
async def delete_floor_plan(plan_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a floor plan and its objects"""
    plan = await db.floor_plans.find_one({"id": plan_id}, {"_id": 0})
    if not plan:
        raise HTTPException(status_code=404, detail="Floor plan not found")
    
    await check_venue_access(current_user, plan["venue_id"])
    
    if plan.get("is_active"):
        raise HTTPException(status_code=400, detail="Cannot delete active floor plan")
    
    # Delete objects first
    await db.floor_plan_objects.delete_many({"floor_plan_id": plan_id})
    
    # Delete plan
    await db.floor_plans.delete_one({"id": plan_id})
    
    await create_audit_log(
        plan["venue_id"], current_user["id"], current_user["name"],
        "delete", "floor_plan", plan_id, {"name": plan["name"]}
    )
    
    return {"success": True}

@api_router.post("/floor-plans/{plan_id}/duplicate")
async def duplicate_floor_plan(plan_id: str, new_name: str, current_user: dict = Depends(get_current_user)):
    """Duplicate a floor plan with all its objects"""
    plan = await db.floor_plans.find_one({"id": plan_id}, {"_id": 0})
    if not plan:
        raise HTTPException(status_code=404, detail="Floor plan not found")
    
    await check_venue_access(current_user, plan["venue_id"])
    
    # Create new plan
    new_plan = FloorPlan(
        venue_id=plan["venue_id"],
        name=new_name,
        background_image_url=plan.get("background_image_url"),
        width=plan.get("width", 1920),
        height=plan.get("height", 1080),
        is_active=False
    )
    await db.floor_plans.insert_one(new_plan.model_dump())
    
    # Copy objects
    objects = await db.floor_plan_objects.find({"floor_plan_id": plan_id}, {"_id": 0}).to_list(1000)
    for obj in objects:
        new_obj = FloorPlanObject(**{**obj, "floor_plan_id": new_plan.id, "id": str(uuid.uuid4())})
        await db.floor_plan_objects.insert_one(new_obj.model_dump())
    
    await create_audit_log(
        plan["venue_id"], current_user["id"], current_user["name"],
        "duplicate", "floor_plan", new_plan.id, {"from": plan_id, "name": new_name}
    )
    
    return new_plan

# Floor Plan Objects
@api_router.get("/floor-plans/{plan_id}/objects")
async def get_floor_plan_objects(plan_id: str, current_user: dict = Depends(get_current_user)):
    """Get all objects for a floor plan"""
    plan = await db.floor_plans.find_one({"id": plan_id}, {"_id": 0, "venue_id": 1})
    if not plan:
        raise HTTPException(status_code=404, detail="Floor plan not found")
    
    await check_venue_access(current_user, plan["venue_id"])
    
    objects = await db.floor_plan_objects.find({"floor_plan_id": plan_id}, {"_id": 0}).to_list(1000)
    return objects

@api_router.post("/floor-plans/{plan_id}/objects")
async def create_floor_plan_object(
    plan_id: str,
    obj_data: FloorPlanObjectCreate,
    current_user: dict = Depends(get_current_user)
):
    """Add an object to a floor plan"""
    plan = await db.floor_plans.find_one({"id": plan_id}, {"_id": 0})
    if not plan:
        raise HTTPException(status_code=404, detail="Floor plan not found")
    
    await check_venue_access(current_user, plan["venue_id"])
    
    if obj_data.floor_plan_id != plan_id:
        raise HTTPException(status_code=400, detail="Floor plan ID mismatch")
    
    obj = FloorPlanObject(**obj_data.model_dump())
    await db.floor_plan_objects.insert_one(obj.model_dump())
    
    return obj

@api_router.put("/floor-plan-objects/{obj_id}")
async def update_floor_plan_object(
    obj_id: str,
    updates: dict,
    current_user: dict = Depends(get_current_user)
):
    """Update a floor plan object"""
    obj = await db.floor_plan_objects.find_one({"id": obj_id}, {"_id": 0})
    if not obj:
        raise HTTPException(status_code=404, detail="Object not found")
    
    plan = await db.floor_plans.find_one({"id": obj["floor_plan_id"]}, {"_id": 0})
    await check_venue_access(current_user, plan["venue_id"])
    
    await db.floor_plan_objects.update_one(
        {"id": obj_id},
        {"$set": updates}
    )
    
    return {"success": True}

@api_router.delete("/floor-plan-objects/{obj_id}")
async def delete_floor_plan_object(obj_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a floor plan object"""
    obj = await db.floor_plan_objects.find_one({"id": obj_id}, {"_id": 0})
    if not obj:
        raise HTTPException(status_code=404, detail="Object not found")
    
    plan = await db.floor_plans.find_one({"id": obj["floor_plan_id"]}, {"_id": 0})
    await check_venue_access(current_user, plan["venue_id"])
    
    await db.floor_plan_objects.delete_one({"id": obj_id})
    
    return {"success": True}

@api_router.post("/floor-plans/{plan_id}/objects/bulk-save")
async def bulk_save_objects(
    plan_id: str,
    objects: List[FloorPlanObjectCreate],
    current_user: dict = Depends(get_current_user)
):
    """Bulk save/update floor plan objects (for canvas editor) with normalized coordinates"""
    plan = await db.floor_plans.find_one({"id": plan_id}, {"_id": 0})
    if not plan:
        raise HTTPException(status_code=404, detail="Floor plan not found")
    
    await check_venue_access(current_user, plan["venue_id"])
    
    base_width = plan.get("base_width", plan.get("width", 1920))
    base_height = plan.get("base_height", plan.get("height", 1080))
    
    # Process and normalize objects
    normalized_objects = []
    for obj in objects:
        obj_dict = obj.model_dump()
        
        # If absolute coords provided, convert to normalized
        if obj_dict.get("x") is not None and obj_dict.get("x_norm") is None:
            obj_dict["x_norm"] = obj_dict["x"] / base_width if base_width > 0 else 0
            obj_dict["y_norm"] = obj_dict["y"] / base_height if base_height > 0 else 0
            obj_dict["w_norm"] = obj_dict["w"] / base_width if base_width > 0 else 0.05
            obj_dict["h_norm"] = obj_dict["h"] / base_height if base_height > 0 else 0.05
        
        # Store both normalized and absolute (for backward compat)
        if obj_dict.get("x_norm") is not None:
            obj_dict["x"] = obj_dict["x_norm"] * base_width
            obj_dict["y"] = obj_dict["y_norm"] * base_height
            obj_dict["w"] = obj_dict["w_norm"] * base_width
            obj_dict["h"] = obj_dict["h_norm"] * base_height
        
        normalized_objects.append(FloorPlanObject(**obj_dict).model_dump())
    
    # Delete existing objects
    await db.floor_plan_objects.delete_many({"floor_plan_id": plan_id})
    
    # Insert new objects
    if normalized_objects:
        await db.floor_plan_objects.insert_many(normalized_objects)
    
    # Increment version for cache invalidation
    new_version = plan.get("version", 1) + 1
    await db.floor_plans.update_one(
        {"id": plan_id},
        {"$set": {
            "version": new_version,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    await create_audit_log(
        plan["venue_id"], current_user["id"], current_user["name"],
        "bulk_update", "floor_plan_objects", plan_id, {"count": len(objects), "version": new_version}
    )
    
    return {"success": True, "count": len(objects), "version": new_version}

@api_router.get("/venues/{venue_id}/active-floor-plan")
async def get_active_floor_plan(venue_id: str):
    """Get the active floor plan for a venue (used by POS)"""
    plan = await db.floor_plans.find_one(
        {"venue_id": venue_id, "is_active": True},
        {"_id": 0}
    )
    
    if not plan:
        return None
    
    # Get objects
    objects = await db.floor_plan_objects.find(
        {"floor_plan_id": plan["id"]},
        {"_id": 0}
    ).to_list(1000)
    
    plan["objects"] = objects
    return plan

# ==================== MENU IMPORT ROUTES ====================

def parse_price(price_str: str) -> float:
    """Robust price parser supporting multiple formats"""
    if not price_str or price_str == "nan":
        return 0.0
    
    # Convert to string and clean
    price_str = str(price_str).strip()
    
    # Remove currency symbols and common prefixes
    for symbol in ["€", "$", "£", "EUR", "USD", "GBP", "TL", "₺"]:
        price_str = price_str.replace(symbol, "")
    
    price_str = price_str.strip()
    
    try:
        # Handle comma as decimal separator (European format)
        if "," in price_str and "." not in price_str:
            price_str = price_str.replace(",", ".")
        # Handle comma as thousands separator
        elif "," in price_str and "." in price_str:
            price_str = price_str.replace(",", "")
        
        price = float(price_str)
        
        # Reject negative prices
        if price < 0:
            return 0.0
        
        return round(price, 2)
    except:
        return 0.0

def normalize_allergens(text: str) -> List[str]:
    """Normalize allergen text to canonical list"""
    if not text or text == "nan":
        return []
    
    text = str(text).lower()
    
    # Canonical allergens with synonyms
    allergen_map = {
        "gluten": ["gluten", "wheat", "bread", "flour", "cereal"],
        "dairy": ["dairy", "milk", "cheese", "cream", "butter", "lactose", "yogurt"],
        "nuts": ["nuts", "nut", "peanut", "almond", "walnut", "cashew", "hazelnut", "tree nuts"],
        "shellfish": ["shellfish", "shrimp", "crab", "lobster", "prawn", "crustaceans"],
        "fish": ["fish", "salmon", "tuna", "cod", "haddock"],
        "eggs": ["egg", "eggs", "mayonnaise"],
        "soy": ["soy", "soya", "soybean", "tofu"],
        "sesame": ["sesame", "tahini"],
        "mustard": ["mustard"],
        "celery": ["celery", "celeriac"],
        "sulphites": ["sulphite", "sulphites", "sulfite", "sulfites", "sulphur dioxide"],
        "lupin": ["lupin", "lupine"],
        "molluscs": ["mollusc", "molluscs", "mollusk", "oyster", "mussel", "clam", "squid", "octopus"]
    }
    
    found = []
    # Split by common separators
    parts = text.replace(";", ",").replace("/", ",").split(",")
    
    for part in parts:
        part = part.strip()
        for canonical, synonyms in allergen_map.items():
            if any(syn in part for syn in synonyms) and canonical not in found:
                found.append(canonical)
    
    return found

def parse_excel_menu(file_content: bytes) -> Dict[str, Any]:
    """Parse Excel file to menu structure"""
    try:
        df = pd.read_excel(io.BytesIO(file_content))
        
        # Try to detect columns
        columns = [c.lower() for c in df.columns]
        
        # Common column patterns
        name_col = next((c for c in columns if "name" in c or "item" in c or "dish" in c), columns[0])
        category_col = next((c for c in columns if "category" in c or "section" in c), None)
        price_col = next((c for c in columns if "price" in c or "cost" in c), None)
        desc_col = next((c for c in columns if "description" in c or "desc" in c), None)
        allergen_col = next((c for c in columns if "allergen" in c or "allergy" in c), None)
        
        # Parse rows
        categories = {}
        current_category = "Main"
        
        for idx, row in df.iterrows():
            # Check if this is a category header (all caps, no price)
            if category_col:
                cat_value = str(row[df.columns[columns.index(category_col)]]).strip()
                if cat_value and cat_value != "nan":
                    current_category = cat_value
            
            # Get item name
            item_name = str(row[df.columns[columns.index(name_col)]]).strip()
            if not item_name or item_name == "nan":
                continue
            
            # Check if this row is actually a category (heuristic)
            if len(item_name) > 3 and item_name.isupper() and (not price_col or pd.isna(row[df.columns[columns.index(price_col)]])):
                current_category = item_name.title()
                continue
            
            # Parse price
            price = 0.0
            if price_col:
                price_val = str(row[df.columns[columns.index(price_col)]]).strip()
                price = parse_price(price_val)
            
            # Parse description
            description = ""
            if desc_col:
                desc_val = str(row[df.columns[columns.index(desc_col)]]).strip()
                if desc_val != "nan":
                    description = desc_val
            
            # Parse allergens
            allergens = []
            if allergen_col:
                allergen_val = str(row[df.columns[columns.index(allergen_col)]]).strip()
                if allergen_val != "nan":
                    allergens = normalize_allergens(allergen_val)
            
            # Add to category
            if current_category not in categories:
                categories[current_category] = []
            
            categories[current_category].append({
                "name": item_name,
                "description": description,
                "price": price,
                "allergens": allergens,
                "tags": []
            })
        
        return {
            "format": "excel",
            "categories": categories,
            "total_items": sum(len(items) for items in categories.values()),
            "confidence": "high"
        }
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse Excel: {str(e)}")

def parse_csv_menu(file_content: bytes) -> Dict[str, Any]:
    """Parse CSV file to menu structure"""
    try:
        df = pd.read_csv(io.BytesIO(file_content))
        return parse_excel_menu(file_content.replace(b',', b'\t'))  # Reuse Excel parser
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {str(e)}")

def parse_pdf_menu(file_content: bytes) -> Dict[str, Any]:
    """Parse PDF using OCR (placeholder - integrate with Document Hub OCR)"""
    # This would integrate with your existing OCR pipeline
    return {
        "format": "pdf",
        "categories": {
            "Extracted Items": [
                {
                    "name": "OCR extraction pending",
                    "description": "PDF parsing requires Document Hub OCR integration",
                    "price": 0.0,
                    "allergens": [],
                    "tags": []
                }
            ]
        },
        "total_items": 1,
        "confidence": "low",
        "requires_manual_review": True
    }

@api_router.post("/venues/{venue_id}/menu-import/parse")
async def parse_menu_import(
    venue_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Parse uploaded menu file and return preview"""
    await check_venue_access(current_user, venue_id)
    
    # Read file
    content = await file.read()
    filename = file.filename.lower()
    
    # Determine format and parse
    if filename.endswith('.xlsx') or filename.endswith('.xls'):
        parsed = parse_excel_menu(content)
    elif filename.endswith('.csv'):
        parsed = parse_csv_menu(content)
    elif filename.endswith('.pdf'):
        parsed = parse_pdf_menu(content)
    elif filename.endswith(('.png', '.jpg', '.jpeg')):
        parsed = parse_pdf_menu(content)  # Use same OCR pipeline
    else:
        raise HTTPException(status_code=400, detail="Unsupported file format")
    
    # Store parsed data temporarily (in memory or cache)
    parsed["venue_id"] = venue_id
    parsed["filename"] = file.filename
    
    return parsed

@api_router.post("/venues/{venue_id}/menu-import/commit")
async def commit_menu_import(
    venue_id: str,
    import_data: dict,
    mode: str = "merge",  # merge or replace
    current_user: dict = Depends(get_current_user)
):
    """Commit parsed menu import to database with dedup and versioning"""
    await check_venue_access(current_user, venue_id)
    
    categories_data = import_data.get("categories", {})
    warnings = []
    
    # Get or create menu
    menu = await db.menus.find_one({"venue_id": venue_id, "is_active": True}, {"_id": 0})
    if not menu:
        # Create new menu
        menu = {
            "id": str(uuid.uuid4()),
            "venue_id": venue_id,
            "name": "Imported Menu",
            "is_active": True,
            "version": 1,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.menus.insert_one(menu)
    
    menu_id = menu["id"]
    
    # If replace mode, delete existing items
    if mode == "replace":
        existing_cats = await db.menu_categories.find({"menu_id": menu_id}, {"_id": 0}).to_list(1000)
        for cat in existing_cats:
            await db.menu_items.delete_many({"category_id": cat["id"]})
        await db.menu_categories.delete_many({"menu_id": menu_id})
    
    stats = {
        "created_categories": 0,
        "created_items": 0,
        "updated_items": 0,
        "skipped_items": 0
    }
    
    # Helper to normalize names for dedup
    def normalize_name(name: str) -> str:
        return name.strip().lower().replace("  ", " ")
    
    # Import categories and items
    for cat_name, items in categories_data.items():
        normalized_cat_name = normalize_name(cat_name)
        
        # Find or create category (case-insensitive match)
        category = await db.menu_categories.find_one(
            {"menu_id": menu_id, "name": {"$regex": f"^{cat_name}$", "$options": "i"}},
            {"_id": 0}
        )
        
        if not category:
            category = {
                "id": str(uuid.uuid4()),
                "menu_id": menu_id,
                "venue_id": venue_id,
                "name": cat_name,
                "sort_order": 0,
                "prep_area": "kitchen",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.menu_categories.insert_one(category)
            stats["created_categories"] += 1
        
        category_id = category["id"]
        
        # Import items with dedup
        for item_data in items:
            item_name = item_data.get("name", "").strip()
            
            # Validation warnings
            if not item_name:
                warnings.append(f"Skipped item with no name in category {cat_name}")
                stats["skipped_items"] += 1
                continue
            
            price = item_data.get("price", 0.0)
            if price <= 0:
                warnings.append(f"Item '{item_name}' has zero or invalid price")
            elif price > 1000:
                warnings.append(f"Item '{item_name}' has suspiciously high price: {price}")
            
            # Dedup: case-insensitive name match in same category
            existing = await db.menu_items.find_one(
                {
                    "category_id": category_id,
                    "name": {"$regex": f"^{item_name}$", "$options": "i"}
                },
                {"_id": 0}
            )
            
            if existing:
                # Update existing item (merge mode)
                await db.menu_items.update_one(
                    {"id": existing["id"]},
                    {"$set": {
                        "name": item_name,  # Update to new casing
                        "description": item_data.get("description", ""),
                        "price": price,
                        "allergens": item_data.get("allergens", []),
                        "tags": item_data.get("tags", []),
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                stats["updated_items"] += 1
            else:
                # Create new item
                new_item = {
                    "id": str(uuid.uuid4()),
                    "category_id": category_id,
                    "venue_id": venue_id,
                    "name": item_name,
                    "description": item_data.get("description", ""),
                    "price": price,
                    "prep_time": 15,
                    "allergens": item_data.get("allergens", []),
                    "tags": item_data.get("tags", []),
                    "is_available": True,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                await db.menu_items.insert_one(new_item)
                stats["created_items"] += 1
    
    # Increment menu version for cache invalidation
    new_version = menu.get("version", 1) + 1
    await db.menus.update_one(
        {"id": menu_id},
        {"$set": {
            "version": new_version,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Audit log
    await create_audit_log(
        venue_id, current_user["id"], current_user["name"],
        "import", "menu", menu_id, 
        {"mode": mode, "stats": stats, "version": new_version, "filename": import_data.get("filename")}
    )
    
    return {
        "success": True,
        "menu_id": menu_id,
        "stats": stats,
        "warnings": warnings,
        "version": new_version
    }

# ==================== DOCUMENT MANAGEMENT ROUTES ====================

@api_router.get("/venues/{venue_id}/documents")
async def list_documents(venue_id: str, current_user: dict = Depends(get_current_user)):
    await check_venue_access(current_user, venue_id)
    docs = await db.documents.find({"venue_id": venue_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return docs

@api_router.get("/documents/{doc_id}")
async def get_document(doc_id: str, current_user: dict = Depends(get_current_user)):
    doc = await db.documents.find_one({"id": doc_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    await check_venue_access(current_user, doc["venue_id"])
    return doc

@api_router.post("/documents/{doc_id}/approve")
async def approve_quarantined_document(doc_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.OWNER, UserRole.MANAGER]:
        raise HTTPException(status_code=403, detail="Manager approval required")
    
    doc = await db.documents.find_one({"id": doc_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    await db.documents.update_one(
        {"id": doc_id},
        {"$set": {"status": DocumentStatus.COMPLETED}}
    )
    
    await create_audit_log(
        doc["venue_id"], current_user["id"], current_user["name"],
        "approve_document", "document", doc_id, {}
    )
    
    return {"message": "Document approved"}

# ==================== REVIEW CONTROL ROUTES ====================
@api_router.get("/venues/{venue_id}/review-risk")
async def get_review_risk_dashboard(venue_id: str, current_user: dict = Depends(get_current_user)):
    await check_venue_access(current_user, venue_id)
    
    venue = await db.venues.find_one({"id": venue_id}, {"_id": 0})
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")
    
    # Get all open orders
    orders = await db.orders.find(
        {"venue_id": venue_id, "status": {"$nin": ["closed", "voided"]}},
        {"_id": 0}
    ).to_list(100)
    
    # Calculate risk for each table
    table_risks = []
    for order in orders:
        score, factors = calculate_risk_score(order)
        
        # Determine risk level based on venue policy
        if score <= venue["review_policy_low_threshold"]:
            level = RiskLevel.LOW
        elif score <= venue["review_policy_medium_threshold"]:
            level = RiskLevel.MEDIUM
        else:
            level = RiskLevel.HIGH
        
        table_risks.append({
            "table_id": order["table_id"],
            "table_name": order["table_name"],
            "order_id": order["id"],
            "risk_score": score,
            "risk_level": level,
            "factors": factors,
            "review_allowed": level == RiskLevel.LOW
        })
    
    return {
        "venue_id": venue_id,
        "policy": {
            "low_threshold": venue["review_policy_low_threshold"],
            "medium_threshold": venue["review_policy_medium_threshold"]
        },
        "tables": table_risks
    }

@api_router.get("/orders/{order_id}/review-status")
async def get_review_status(order_id: str, current_user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    await check_venue_access(current_user, order["venue_id"])
    
    venue = await db.venues.find_one({"id": order["venue_id"]}, {"_id": 0})
    score, factors = calculate_risk_score(order)
    
    if score <= venue["review_policy_low_threshold"]:
        level = RiskLevel.LOW
        can_show_qr = True
        requires_override = None
    elif score <= venue["review_policy_medium_threshold"]:
        level = RiskLevel.MEDIUM
        can_show_qr = current_user["role"] in [UserRole.OWNER, UserRole.MANAGER]
        requires_override = "manager"
    else:
        level = RiskLevel.HIGH
        can_show_qr = current_user["role"] == UserRole.OWNER
        requires_override = "owner"
    
    return {
        "order_id": order_id,
        "risk_score": score,
        "risk_level": level,
        "factors": factors,
        "can_show_qr": can_show_qr,
        "requires_override": requires_override
    }

@api_router.post("/orders/{order_id}/override-review")
async def override_review_block(order_id: str, reason: str, current_user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    await check_venue_access(current_user, order["venue_id"])
    
    venue = await db.venues.find_one({"id": order["venue_id"]}, {"_id": 0})
    score, _ = calculate_risk_score(order)
    
    if score <= venue["review_policy_medium_threshold"]:
        required_role = UserRole.MANAGER
    else:
        required_role = UserRole.OWNER
    
    if current_user["role"] == UserRole.STAFF:
        raise HTTPException(status_code=403, detail="Override not allowed for staff")
    
    if current_user["role"] == UserRole.MANAGER and required_role == UserRole.OWNER:
        raise HTTPException(status_code=403, detail="Owner override required for high risk")
    
    await create_audit_log(
        order["venue_id"], current_user["id"], current_user["name"],
        "review_override", "order", order_id,
        {"risk_score": score, "reason": reason}
    )
    
    return {"message": "Review override granted", "reason": reason}

# ==================== AUDIT LOG ROUTES ====================
@api_router.get("/venues/{venue_id}/audit-logs")
async def get_audit_logs(
    venue_id: str,
    resource_type: Optional[str] = None,
    action: Optional[str] = None,
    limit: int = Query(default=100, le=500),
    current_user: dict = Depends(get_current_user)
):
    await check_venue_access(current_user, venue_id)
    
    # DLP: Export permission check
    if limit > 100 and current_user["role"] not in [UserRole.OWNER, UserRole.MANAGER]:
        raise HTTPException(status_code=403, detail="Export quota exceeded for staff")
    
    query = {"venue_id": venue_id}
    if resource_type:
        query["resource_type"] = resource_type
    if action:
        query["action"] = action
    
    logs = await db.audit_logs.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return logs

@api_router.get("/venues/{venue_id}/audit-logs/export")
async def export_audit_logs(
    venue_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Export with DLP controls - watermarked"""
    if current_user["role"] not in [UserRole.OWNER, UserRole.MANAGER]:
        raise HTTPException(status_code=403, detail="Export permission denied")
    
    await check_venue_access(current_user, venue_id)
    
    logs = await db.audit_logs.find({"venue_id": venue_id}, {"_id": 0}).to_list(1000)
    
    # Add watermark
    export_metadata = {
        "exported_by": current_user["name"],
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "venue_id": venue_id,
        "watermark": f"CONFIDENTIAL - Exported by {current_user['name']} on {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M')}"
    }
    
    await create_audit_log(
        venue_id, current_user["id"], current_user["name"],
        "export", "audit_logs", venue_id, {"count": len(logs)}
    )
    
    return {"metadata": export_metadata, "logs": logs}

# ==================== SHIFT MANAGEMENT ROUTES ====================
@api_router.post("/venues/{venue_id}/shifts")
async def create_shift(
    venue_id: str,
    shift_data: ShiftCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a shift for a staff member (manager/owner only)"""
    if current_user["role"] not in [UserRole.OWNER, UserRole.MANAGER]:
        raise HTTPException(status_code=403, detail="Manager/Owner permission required")
    
    await check_venue_access(current_user, venue_id)
    
    if shift_data.venue_id != venue_id:
        raise HTTPException(status_code=400, detail="Venue ID mismatch")
    
    shift = Shift(**shift_data.model_dump())
    await db.shifts.insert_one(shift.model_dump())
    
    await create_audit_log(
        venue_id, current_user["id"], current_user["name"],
        "create_shift", "shift", shift.id,
        {"user_id": shift_data.user_id, "start": shift_data.start_time, "end": shift_data.end_time}
    )
    
    return shift.model_dump()

@api_router.get("/venues/{venue_id}/shifts")
async def get_shifts(
    venue_id: str,
    user_id: Optional[str] = None,
    date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get shifts for a venue, optionally filtered by user and date"""
    await check_venue_access(current_user, venue_id)
    
    query = {"venue_id": venue_id}
    if user_id:
        query["user_id"] = user_id
    if date:
        # Filter for shifts on a specific date
        start_of_day = f"{date}T00:00:00"
        end_of_day = f"{date}T23:59:59"
        query["start_time"] = {"$gte": start_of_day, "$lte": end_of_day}
    
    shifts = await db.shifts.find(query, {"_id": 0}).to_list(1000)
    return shifts

@api_router.get("/venues/{venue_id}/shifts/active")
async def get_active_shifts(venue_id: str, current_user: dict = Depends(get_current_user)):
    """Get currently active shifts"""
    await check_venue_access(current_user, venue_id)
    
    now = datetime.now(timezone.utc).isoformat()
    
    shifts = await db.shifts.find({
        "venue_id": venue_id,
        "start_time": {"$lte": now},
        "end_time": {"$gte": now}
    }, {"_id": 0}).to_list(100)
    
    # Enrich with user info
    for shift in shifts:
        user = await db.users.find_one({"id": shift["user_id"]}, {"_id": 0, "name": 1, "role": 1})
        if user:
            shift["user_name"] = user["name"]
            shift["user_role"] = user["role"]
    
    return shifts

@api_router.post("/venues/{venue_id}/shifts/{shift_id}/check-in")
async def check_in_shift(
    venue_id: str,
    shift_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Check in to a shift"""
    await check_venue_access(current_user, venue_id)
    
    shift = await db.shifts.find_one({"id": shift_id, "venue_id": venue_id}, {"_id": 0})
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    
    if shift["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not your shift")
    
    if shift.get("checked_in"):
        raise HTTPException(status_code=400, detail="Already checked in")
    
    now = datetime.now(timezone.utc).isoformat()
    await db.shifts.update_one(
        {"id": shift_id},
        {"$set": {"checked_in": True, "checked_in_at": now}}
    )
    
    await create_audit_log(
        venue_id, current_user["id"], current_user["name"],
        "shift_check_in", "shift", shift_id, {}
    )
    
    return {"message": "Checked in successfully", "checked_in_at": now}

@api_router.post("/venues/{venue_id}/shifts/{shift_id}/check-out")
async def check_out_shift(
    venue_id: str,
    shift_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Check out from a shift"""
    await check_venue_access(current_user, venue_id)
    
    shift = await db.shifts.find_one({"id": shift_id, "venue_id": venue_id}, {"_id": 0})
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    
    if shift["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not your shift")
    
    if shift.get("checked_out"):
        raise HTTPException(status_code=400, detail="Already checked out")
    
    now = datetime.now(timezone.utc).isoformat()
    await db.shifts.update_one(
        {"id": shift_id},
        {"$set": {"checked_out": True, "checked_out_at": now}}
    )
    
    await create_audit_log(
        venue_id, current_user["id"], current_user["name"],
        "shift_check_out", "shift", shift_id, {}
    )
    
    return {"message": "Checked out successfully", "checked_out_at": now}

@api_router.get("/users/{user_id}/current-shift")
async def get_current_shift(user_id: str):
    """Get the current active shift for a user (if any)"""
    now = datetime.now(timezone.utc).isoformat()
    
    shift = await db.shifts.find_one({
        "user_id": user_id,
        "start_time": {"$lte": now},
        "end_time": {"$gte": now}
    }, {"_id": 0})
    
    if not shift:
        return {"has_shift": False}
    
    return {"has_shift": True, "shift": shift}

# ==================== MANAGER OVERRIDE ROUTES ====================
@api_router.post("/venues/{venue_id}/manager-override")
async def grant_manager_override(
    venue_id: str,
    user_id: str,
    reason: str,
    duration_hours: int = 4,
    current_user: dict = Depends(get_current_user)
):
    """Grant temporary access override to a staff member"""
    if current_user["role"] not in [UserRole.OWNER, UserRole.MANAGER]:
        raise HTTPException(status_code=403, detail="Manager/Owner permission required")
    
    await check_venue_access(current_user, venue_id)
    
    # Check if user exists
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Create override
    expires_at = (datetime.now(timezone.utc) + timedelta(hours=duration_hours)).isoformat()
    override = ManagerOverride(
        venue_id=venue_id,
        user_id=user_id,
        manager_id=current_user["id"],
        reason=reason,
        expires_at=expires_at
    )
    
    await db.manager_overrides.insert_one(override.model_dump())
    
    await create_audit_log(
        venue_id, current_user["id"], current_user["name"],
        "grant_override", "access", user_id,
        {"reason": reason, "expires_at": expires_at}
    )
    
    return override.model_dump()

@api_router.get("/venues/{venue_id}/manager-override/{user_id}")
async def check_manager_override(venue_id: str, user_id: str):
    """Check if a user has an active override"""
    now = datetime.now(timezone.utc).isoformat()
    
    override = await db.manager_overrides.find_one({
        "venue_id": venue_id,
        "user_id": user_id,
        "expires_at": {"$gte": now}
    }, {"_id": 0})
    
    if not override:
        return {"has_override": False}
    
    # Get manager info
    manager = await db.users.find_one({"id": override["manager_id"]}, {"_id": 0, "name": 1})
    if manager:
        override["manager_name"] = manager["name"]
    
    return {"has_override": True, "override": override}

@api_router.get("/venues/{venue_id}/manager-override")
async def list_active_overrides(
    venue_id: str,
    current_user: dict = Depends(get_current_user)
):
    """List all active overrides for a venue"""
    if current_user["role"] not in [UserRole.OWNER, UserRole.MANAGER]:
        raise HTTPException(status_code=403, detail="Manager/Owner permission required")
    
    await check_venue_access(current_user, venue_id)
    
    now = datetime.now(timezone.utc).isoformat()
    
    overrides = await db.manager_overrides.find({
        "venue_id": venue_id,
        "expires_at": {"$gte": now}
    }, {"_id": 0}).to_list(100)
    
    # Enrich with user and manager names
    for override in overrides:
        user = await db.users.find_one({"id": override["user_id"]}, {"_id": 0, "name": 1, "role": 1})
        manager = await db.users.find_one({"id": override["manager_id"]}, {"_id": 0, "name": 1})
        if user:
            override["user_name"] = user["name"]
            override["user_role"] = user["role"]
        if manager:
            override["manager_name"] = manager["name"]
    
    return overrides

@api_router.post("/admin/backfill-all")
async def admin_backfill_all(
    req: BackfillRequest,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Backfill all collections with IDs and minimal fields (OWNER/PRODUCT_OWNER only)"""
    if current_user["role"] not in [UserRole.OWNER, UserRole.PRODUCT_OWNER]:
        raise HTTPException(status_code=403, detail="OWNER or PRODUCT_OWNER required")
    
    rid = _rid(request)
    results = []
    
    for entity_type, collection_name, venue_field, minimal in BACKFILL_MAP:
        r = await backfill_collection(
            db=db,
            entity_type=entity_type,
            collection_name=collection_name,
            venue_field=venue_field,
            minimal_fields=minimal,
            venue_id=req.venue_id,
            dry_run=req.dry_run,
            limit=req.limit_per_collection,
            fill_missing_fields=req.fill_missing_fields
        )
        results.append(r)
    
    return JSONResponse(
        status_code=200,
        content={
            "ok": True,
            "code": "BACKFILL_COMPLETE",
            "request_id": rid,
            "dry_run": req.dry_run,
            "venue_id": req.venue_id,
            "results": results
        },
        headers={"X-Request-ID": rid or ""}
    )

# ==================== DEVICE HUB ROUTES ====================
@api_router.post("/device-hub/devices")
async def register_device(
    device_type: DeviceType,
    name: str,
    venue_id: str,
    enrollment_token: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Register a new device"""
    if current_user["role"] not in [UserRole.OWNER, UserRole.MANAGER]:
        raise HTTPException(status_code=403, detail="Manager/Owner required")
    
    await check_venue_access(current_user, venue_id)
    
    device = Device(
        venue_id=venue_id,
        device_type=device_type,
        name=name,
        enrollment_token=enrollment_token,
        status="online",
        last_seen_at=datetime.now(timezone.utc).isoformat()
    )
    
    await db.devices.insert_one(device.model_dump())
    return device.model_dump()

@api_router.get("/venues/{venue_id}/devices")
async def list_devices(venue_id: str, current_user: dict = Depends(get_current_user)):
    await check_venue_access(current_user, venue_id)
    devices = await db.devices.find({"venue_id": venue_id}, {"_id": 0}).to_list(100)
    return devices

@api_router.post("/device-hub/printer-mapping")
async def map_printer_to_zone(
    printer_device_id: str,
    zone_id: str,
    prep_area: str,
    venue_id: str,
    current_user: dict = Depends(get_current_user)
):
    await check_venue_access(current_user, venue_id)
    
    mapping = PrinterZoneMapping(
        venue_id=venue_id,
        printer_device_id=printer_device_id,
        zone_id=zone_id,
        prep_area=prep_area
    )
    
    await db.printer_zone_mappings.insert_one(mapping.model_dump())
    return mapping.model_dump()

@api_router.get("/venues/{venue_id}/incidents")
async def list_incidents(
    venue_id: str,
    resolved: Optional[bool] = None,
    current_user: dict = Depends(get_current_user)
):
    await check_venue_access(current_user, venue_id)
    
    query = {"venue_id": venue_id}
    if resolved is not None:
        query["resolved"] = resolved
    
    incidents = await db.incidents.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return incidents

@api_router.post("/venues/{venue_id}/incidents")
async def create_incident(
    venue_id: str,
    incident_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Create new incident"""
    await check_venue_access(current_user, venue_id)
    
    incident = Incident(
        venue_id=venue_id,
        type=incident_data.get("type"),
        severity=incident_data.get("severity", "medium"),
        title=incident_data.get("title"),
        description=incident_data.get("description"),
        device_id=incident_data.get("device_id")
    )
    
    await db.incidents.insert_one(incident.model_dump())
    return incident.model_dump()

@api_router.post("/venues/{venue_id}/backup")
async def create_venue_backup(venue_id: str, current_user: dict = Depends(get_current_user)):
    """Create full venue backup"""
    if current_user["role"] not in [UserRole.OWNER, UserRole.GENERAL_MANAGER]:
        raise HTTPException(status_code=403, detail="Owner/GM required")
    
    await check_venue_access(current_user, venue_id)
    
    # Collect all venue data
    backup_data = {
        "venue": await db.venues.find_one({"id": venue_id}, {"_id": 0}),
        "tables": await db.tables.find({"venue_id": venue_id}, {"_id": 0}).to_list(500),
        "zones": await db.zones.find({"venue_id": venue_id}, {"_id": 0}).to_list(100),
        "menu_categories": await db.menu_categories.find({"venue_id": venue_id}, {"_id": 0}).to_list(500),
        "menu_items": await db.menu_items.find({"venue_id": venue_id}, {"_id": 0}).to_list(1000),
        "floor_plans": await db.floor_plans.find({"venue_id": venue_id}, {"_id": 0}).to_list(100),
        "inventory_items": await db.inventory_items.find({"venue_id": venue_id}, {"_id": 0}).to_list(500)
    }
    
    backup_json = json.dumps(backup_data)
    size_bytes = len(backup_json.encode('utf-8'))
    
    backup = VenueBackup(
        venue_id=venue_id,
        backup_type="full",
        data=backup_data,
        size_bytes=size_bytes,
        created_by=current_user["id"]
    )
    
    await db.venue_backups.insert_one(backup.model_dump())
    
    await create_audit_log(
        venue_id, current_user["id"], current_user["name"],
        "backup", "venue", venue_id, {"size_mb": size_bytes / 1024 / 1024}
    )
    
    return {"id": backup.id, "size_bytes": size_bytes}

# ==================== DEVICE BINDING ROUTES ====================
@api_router.post("/devices/bind")
async def bind_device(
    device_id: str,
    venue_id: str,
    station_type: StationType,
    zone_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    # Only managers/owners can bind devices
    if current_user["role"] not in [UserRole.OWNER, UserRole.MANAGER]:
        raise HTTPException(status_code=403, detail="Device binding requires manager/owner")
    
    # Check if device already bound
    existing = await db.device_bindings.find_one({"device_id": device_id}, {"_id": 0})
    if existing:
        # Rebinding requires audit
        await create_audit_log(
            existing["venue_id"], current_user["id"], current_user["name"],
            "device_unbind", "device", device_id,
            {"old_venue": existing["venue_id"], "old_station": existing["station_type"]}
        )
        await db.device_bindings.delete_one({"device_id": device_id})
    
    binding = DeviceBinding(
        device_id=device_id,
        venue_id=venue_id,
        station_type=station_type,
        zone_id=zone_id
    )
    
    await db.device_bindings.insert_one(binding.model_dump())
    
    await create_audit_log(
        venue_id, current_user["id"], current_user["name"],
        "device_bind", "device", device_id,
        {"station_type": station_type, "zone_id": zone_id}
    )
    
    return binding.model_dump()

@api_router.get("/devices/{device_id}/binding")
async def get_device_binding(device_id: str):
    binding = await db.device_bindings.find_one({"device_id": device_id}, {"_id": 0})
    if not binding:
        return {"bound": False}
    return {"bound": True, "binding": binding}

# ==================== UNIT ENGINE v4 ROUTES ====================
async def convert_to_canonical(quantity: float, from_unit: str, scope_id: Optional[str] = None) -> tuple:
    """Convert any unit to canonical base (g/ml/pcs) with BFS pathfinding"""
    # Normalize unit (handle aliases)
    alias = await db.unit_aliases.find_one({"alias": from_unit.lower()}, {"_id": 0})
    if alias:
        from_unit = alias["canonical_unit"]
    
    # Check if already canonical
    canonical = await db.base_units.find_one({"code": from_unit}, {"_id": 0})
    if canonical:
        return (quantity, from_unit, True, [])
    
    # BFS conversion pathfinding
    # Priority: ingredient > global
    query = {"from_unit": from_unit}
    if scope_id:
        conversions = await db.unit_conversions.find(
            {"$or": [
                {"from_unit": from_unit, "scope": "ingredient", "scope_id": scope_id},
                {"from_unit": from_unit, "scope": "global"}
            ]},
            {"_id": 0}
        ).to_list(10)
    else:
        conversions = await db.unit_conversions.find(
            {"from_unit": from_unit, "scope": "global"},
            {"_id": 0}
        ).to_list(10)
    
    if not conversions:
        return (quantity, from_unit, False, [])  # Cannot convert
    
    # Use first matching conversion (priority already sorted)
    conversion = conversions[0]
    converted_qty = quantity * conversion["multiplier"]
    path = [f"{from_unit} -> {conversion['to_unit']} (×{conversion['multiplier']})"]
    
    # Check if target is canonical
    target_canonical = await db.base_units.find_one({"code": conversion["to_unit"]}, {"_id": 0})
    if target_canonical:
        return (converted_qty, conversion["to_unit"], True, path)
    
    # Recursive conversion (max 3 hops to prevent infinite loops)
    if len(path) < 3:
        result = await convert_to_canonical(converted_qty, conversion["to_unit"], scope_id)
        if result[2]:  # Successfully converted
            return (result[0], result[1], True, path + result[3])
    
    return (converted_qty, conversion["to_unit"], False, path)

@api_router.post("/units/convert")
async def convert_unit(
    quantity: float = Query(...),
    from_unit: str = Query(...),
    scope_id: Optional[str] = Query(None)
):
    """Convert quantity to canonical unit"""
    result_qty, result_unit, success, path = await convert_to_canonical(quantity, from_unit, scope_id)
    
    return {
        "original_quantity": quantity,
        "original_unit": from_unit,
        "canonical_quantity": result_qty,
        "canonical_unit": result_unit,
        "success": success,
        "conversion_path": path,
        "needs_mapping": not success
    }

@api_router.get("/units/aliases")
async def list_unit_aliases():
    """List all unit aliases"""
    aliases = await db.unit_aliases.find({}, {"_id": 0}).to_list(200)
    return aliases

@api_router.get("/units/conversions")
async def list_conversions():
    """List all conversion rules"""
    conversions = await db.unit_conversions.find({}, {"_id": 0}).to_list(200)
    return conversions

@api_router.patch("/devices/{device_id}/station")
async def update_device_station(
    device_id: str,
    payload: dict,
    current_user: dict = Depends(get_current_user)
):
    """Update device station assignment (drag & drop)"""
    if current_user["role"] not in [UserRole.OWNER, UserRole.GENERAL_MANAGER, UserRole.MANAGER]:
        raise HTTPException(status_code=403, detail="Manager required")
    
    station = payload.get("station")
    if not station:
        raise HTTPException(status_code=400, detail="station required")
    
    device = await db.devices.find_one({"id": device_id}, {"_id": 0})
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    await db.devices.update_one(
        {"id": device_id},
        {"$set": {"station": station}}
    )
    
    return {"message": "Device station updated", "device_id": device_id, "station": station}

# ==================== GUEST & RESERVATION ROUTES ====================
@api_router.post("/guests")
async def create_guest(guest_data: GuestCreate, current_user: dict = Depends(get_current_user)):
    await check_venue_access(current_user, guest_data.venue_id)
    guest = Guest(**guest_data.model_dump())
    await db.guests.insert_one(guest.model_dump())
    return guest.model_dump()

@api_router.get("/venues/{venue_id}/guests")
async def list_guests(
    venue_id: str,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    await check_venue_access(current_user, venue_id)
    query = {"venue_id": venue_id}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}}
        ]
    guests = await db.guests.find(query, {"_id": 0}).sort("name", 1).to_list(500)
    return guests

@api_router.get("/guests/{guest_id}")
async def get_guest(guest_id: str, current_user: dict = Depends(get_current_user)):
    guest = await db.guests.find_one({"id": guest_id}, {"_id": 0})
    if not guest:
        raise HTTPException(status_code=404, detail="Guest not found")
    await check_venue_access(current_user, guest["venue_id"])
    return guest

@api_router.put("/guests/{guest_id}")
async def update_guest(
    guest_id: str,
    updates: dict,
    current_user: dict = Depends(get_current_user)
):
    guest = await db.guests.find_one({"id": guest_id}, {"_id": 0})
    if not guest:
        raise HTTPException(status_code=404, detail="Guest not found")
    await check_venue_access(current_user, guest["venue_id"])
    await db.guests.update_one({"id": guest_id}, {"$set": updates})
    return {"message": "Guest updated"}

@api_router.post("/reservations")
async def create_reservation(
    res_data: ReservationCreate,
    current_user: dict = Depends(get_current_user)
):
    await check_venue_access(current_user, res_data.venue_id)
    
    guest = await db.guests.find_one({"id": res_data.guest_id}, {"_id": 0})
    if not guest:
        raise HTTPException(status_code=404, detail="Guest not found")
    
    reservation = Reservation(**res_data.model_dump(), guest_name=guest["name"])
    await db.reservations.insert_one(reservation.model_dump())
    
    await create_audit_log(
        res_data.venue_id, current_user["id"], current_user["name"],
        "create_reservation", "reservation", reservation.id,
        {"guest": guest["name"], "date": res_data.date, "time": res_data.time}
    )
    
    return reservation.model_dump()

@api_router.get("/venues/{venue_id}/reservations")
async def list_reservations(
    venue_id: str,
    date: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    await check_venue_access(current_user, venue_id)
    
    query = {"venue_id": venue_id}
    if date:
        query["date"] = date
    if status:
        query["status"] = status
    
    reservations = await db.reservations.find(query, {"_id": 0}).sort("time", 1).to_list(500)
    return reservations

@api_router.patch("/reservations/{res_id}/seat")
async def seat_reservation(
    res_id: str,
    table_id: str,
    current_user: dict = Depends(get_current_user)
):
    reservation = await db.reservations.find_one({"id": res_id}, {"_id": 0})
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    
    await check_venue_access(current_user, reservation["venue_id"])
    
    await db.reservations.update_one(
        {"id": res_id},
        {"$set": {
            "table_id": table_id,
            "status": ReservationStatus.SEATED,
            "seated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Reservation seated"}

@api_router.patch("/reservations/{res_id}/status")
async def update_reservation_status(
    res_id: str,
    status: ReservationStatus,
    current_user: dict = Depends(get_current_user)
):
    reservation = await db.reservations.find_one({"id": res_id}, {"_id": 0})
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    
    await check_venue_access(current_user, reservation["venue_id"])
    
    updates = {"status": status}
    if status == ReservationStatus.COMPLETED:
        updates["completed_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.reservations.update_one({"id": res_id}, {"$set": updates})
    return {"message": "Status updated"}

# ==================== STATS/DASHBOARD ====================
@api_router.get("/venues/{venue_id}/stats")
async def get_venue_stats(venue_id: str, current_user: dict = Depends(get_current_user)):
    await check_venue_access(current_user, venue_id)
    
    # Count open orders
    open_orders = await db.orders.count_documents({"venue_id": venue_id, "status": {"$nin": ["closed", "voided"]}})
    
    # Count tables
    tables = await db.tables.count_documents({"venue_id": venue_id})
    occupied_tables = await db.tables.count_documents({"venue_id": venue_id, "status": "occupied"})
    
    # Pending KDS tickets
    pending_tickets = await db.kds_tickets.count_documents({"venue_id": venue_id, "status": {"$ne": "ready"}})
    
    # Low stock items
    low_stock = await db.inventory_items.count_documents({
        "venue_id": venue_id,
        "$expr": {"$lte": ["$current_stock", "$min_stock"]}
    })
    
    return {
        "open_orders": open_orders,
        "total_tables": tables,
        "occupied_tables": occupied_tables,
        "pending_kds_tickets": pending_tickets,
        "low_stock_items": low_stock
    }

@api_router.get("/venues/{venue_id}/active-config-version")
async def get_active_config_version(venue_id: str):
    """Get versions of active menu and floor plan for cache invalidation"""
    # Get active menu version
    menu = await db.menus.find_one(
        {"venue_id": venue_id, "is_active": True},
        {"_id": 0, "version": 1, "updated_at": 1}
    )
    menu_version = menu.get("version", 1) if menu else 0
    menu_updated = menu.get("updated_at", "") if menu else ""
    
    # Get active floor plan version
    floor_plan = await db.floor_plans.find_one(
        {"venue_id": venue_id, "is_active": True},
        {"_id": 0, "version": 1, "updated_at": 1}
    )
    floor_plan_version = floor_plan.get("version", 1) if floor_plan else 0
    floor_plan_updated = floor_plan.get("updated_at", "") if floor_plan else ""
    
    return {
        "menu_version": menu_version,
        "menu_updated_at": menu_updated,
        "floor_plan_version": floor_plan_version,
        "floor_plan_updated_at": floor_plan_updated,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

# ==================== HEALTH & ROOT ====================
@api_router.get("/")
async def root():
    return {"message": "restin.ai API v1.0.0"}

@api_router.get("/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# ==================== SYSTEM VERSION ENDPOINTS ====================
@api_router.get("/system/version")
async def get_system_version():
    """Get resolved system version (server-authoritative)"""
    # Try system_meta collection
    system_meta = await db.system_meta.find_one({"key": "system_version"}, {"_id": 0})
    
    if system_meta:
        return {
            "version_name": system_meta.get("version_name", "restin.ai v1.0.0"),
            "version_code": system_meta.get("version_code", "1.0.0"),
            "release_channel": system_meta.get("release_channel", "prod"),
            "build_id": system_meta.get("build_id", os.getenv("BUILD_ID", "dev")),
            "git_sha": system_meta.get("git_sha", os.getenv("GIT_SHA", "local")),
            "built_at": system_meta.get("built_at", datetime.now(timezone.utc).isoformat()),
            "source": "system_meta"
        }
    
    # Fallback to env defaults
    return {
        "version_name": os.getenv("VERSION_NAME", "restin.ai v1.0.0"),
        "version_code": os.getenv("VERSION_CODE", "1.0.0"),
        "release_channel": os.getenv("RELEASE_CHANNEL", "dev"),
        "build_id": os.getenv("BUILD_ID", "local"),
        "git_sha": os.getenv("GIT_SHA", "uncommitted"),
        "built_at": datetime.now(timezone.utc).isoformat(),
        "source": "env_defaults"
    }

@api_router.patch("/system/version")
async def update_system_version(payload: dict, current_user: dict = Depends(get_current_user)):
    """Update system version (OWNER/PRODUCT_OWNER only)"""
    if current_user["role"] not in [UserRole.OWNER, UserRole.PRODUCT_OWNER]:
        raise HTTPException(status_code=403, detail="OWNER or PRODUCT_OWNER required")
    
    # Validate
    version_name = payload.get("version_name")
    version_code = payload.get("version_code")
    release_channel = payload.get("release_channel", "prod")

@api_router.get("/system/modules")
async def get_system_modules(current_user: dict = Depends(get_current_user)):
    """Get module registry (server-side feature flags)"""
    return {"modules": MODULE_REGISTRY}
    
    if not version_name or not version_code:
        raise HTTPException(status_code=400, detail="version_name and version_code required")
    
    # Update or create
    now = datetime.now(timezone.utc).isoformat()
    
    await db.system_meta.update_one(
        {"key": "system_version"},
        {"$set": {
            "version_name": version_name,
            "version_code": version_code,
            "release_channel": release_channel,
            "updated_at": now,
            "updated_by": current_user["id"]
        }},
        upsert=True
    )
    
    return {"message": "System version updated", "version_name": version_name}

# ==================== GLOBAL SEARCH ENDPOINT ====================
@api_router.get("/search")
async def global_search(
    q: str = Query(..., min_length=2),
    context: str = Query("ADMIN"),  # KDS, POS, ADMIN
    scope: str = Query("auto"),
    station: Optional[str] = None,
    mode: str = Query("results"),  # results, reports
    current_user: dict = Depends(get_current_user)
):
    """Universal search across entities with role-based filtering + Report suggestions"""
    
    # Get user permissions for report suggestions
    venue_id = current_user.get("venue_id")
    venue = await db.venues.find_one({"id": venue_id}, {"_id": 0})
    venue_settings = venue.get("settings", {}) if venue else {}
    user_perms = effective_permissions(current_user["role"], venue_settings)
    
    # MODE: reports - return report suggestions
    if mode == "reports":
        suggestions = suggest_reports_from_search(q, user_perms)
        return {"report_suggestions": suggestions}
    
    # MODE: results - existing search logic
    results = {
        "tickets": [],
        "menu_items": [],
        "tables": [],
        "guests": [],
        "inventory": [],
        "orders": [],
        "users": []
    }
    
    venue_id = current_user.get("venue_id")
    role = current_user.get("role")
    
    # PRODUCT_OWNER sees everything
    is_product_owner = role == UserRole.PRODUCT_OWNER
    
    # Context-based entity permissions
    CONTEXT_MAP = {
        "KDS": ["tickets", "tables"],
        "POS": ["menu_items", "tables", "orders"],
        "ADMIN": ["guests", "inventory", "orders", "users", "menu_items", "tables"]
    }
    
    # Role-based entity permissions
    ROLE_MAP = {
        UserRole.WAITER: ["menu_items", "tables", "orders"],
        UserRole.KITCHEN: ["tickets", "tables"],
        UserRole.MANAGER: ["tickets", "menu_items", "tables", "orders", "guests", "inventory"],
        UserRole.OWNER: ["tickets", "menu_items", "tables", "orders", "guests", "inventory", "users"],
        UserRole.PRODUCT_OWNER: ["tickets", "menu_items", "tables", "orders", "guests", "inventory", "users"]
    }
    
    # Determine allowed entities
    context_entities = CONTEXT_MAP.get(context, [])
    role_entities = ROLE_MAP.get(role, [])
    allowed_entities = set(context_entities) & set(role_entities) if not is_product_owner else set(context_entities)
    
    # Search regex (case-insensitive)
    regex = {"$regex": q, "$options": "i"}
    
    # Search tickets (KDS)
    if "tickets" in allowed_entities:
        query = {"venue_id": venue_id}
        if station:
            query["prep_area"] = station
        # Search in table_name, items
        tickets = await db.kds_tickets.find({
            **query,
            "$or": [
                {"table_name": regex},
                {"items.menu_item_name": regex},
                {"special_notes": regex}
            ]
        }, {"_id": 0}).limit(20).to_list(20)
        results["tickets"] = tickets
    
    # Search menu items (POS/ADMIN)
    if "menu_items" in allowed_entities:
        items = await db.menu_items.find({
            "venue_id": venue_id,
            "name": regex
        }, {"_id": 0}).limit(20).to_list(20)
        results["menu_items"] = items
    
    # Search tables
    if "tables" in allowed_entities:
        tables = await db.tables.find({
            "venue_id": venue_id,
            "name": regex
        }, {"_id": 0}).limit(10).to_list(10)
        results["tables"] = tables
    
    # Search guests (ADMIN)
    if "guests" in allowed_entities:
        guests = await db.guests.find({
            "venue_id": venue_id,
            "$or": [
                {"name": regex},
                {"email": regex},
                {"phone": regex}
            ]
        }, {"_id": 0}).limit(10).to_list(10)
        results["guests"] = guests
    
    # Search inventory (ADMIN)
    if "inventory" in allowed_entities:
        inventory = await db.inventory_items.find({
            "venue_id": venue_id,
            "name": regex
        }, {"_id": 0}).limit(10).to_list(10)
        results["inventory"] = inventory
    
    # Search orders (POS/ADMIN)
    if "orders" in allowed_entities:
        orders = await db.orders.find({
            "venue_id": venue_id,
            "$or": [
                {"table_name": regex},
                {"server_name": regex}
            ]
        }, {"_id": 0}).limit(10).to_list(10)
        results["orders"] = orders
    
    # Search users (ADMIN, MANAGER+)
    if "users" in allowed_entities:
        users = await db.users.find({
            "venue_id": venue_id,
            "name": regex
        }, {"_id": 0, "pin_hash": 0}).limit(10).to_list(10)
        results["users"] = users
    
    return results

# ==================== LOGS ENDPOINTS (V2: Detailed Logging) ====================
@api_router.get("/venues/{venue_id}/logs")
async def get_venue_logs(
    venue_id: str,
    level: Optional[str] = None,
    code: Optional[str] = None,
    user_id: Optional[str] = None,
    table_id: Optional[str] = None,
    order_id: Optional[str] = None,
    ticket_id: Optional[str] = None,
    from_ts: Optional[str] = Query(None, alias="from"),
    to_ts: Optional[str] = Query(None, alias="to"),
    q: Optional[str] = None,
    limit: int = Query(200, le=1000),
    cursor: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get venue logs with role-based filtering"""
    await check_venue_access(current_user, venue_id)
    
    # Role-based visibility filtering
    role = current_user["role"]
    venue = await db.venues.find_one({"id": venue_id}, {"_id": 0, "settings": 1})
    settings = venue.get("settings", {}) if venue else {}
    visibility_rules = settings.get("logs", {}).get("visibility", DEFAULT_VENUE_SETTINGS["logs"]["visibility"])
    
    visibility = visibility_rules.get(role, "limited")
    
    # Build query
    query = {"venue_id": venue_id}
    
    # Apply role-based restrictions
    if visibility == "limited":
        # SUPERVISOR: last 7 days only
        seven_days_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
        query["ts"] = {"$gte": seven_days_ago}
    elif visibility == "finance_only":
        # FINANCE: only financial codes
        query["code"] = {"$in": ["BILL_PRINT", "PAYMENT_RECONCILE", "CASH_CLOSE", "ORDER_PAID"]}
    elif visibility == "system_only":
        # IT_ADMIN: only system/error logs
        query["level"] = {"$in": ["ERROR", "SECURITY"]}
    
    # User filters
    if level:
        query["level"] = level
    if code:
        query["code"] = code
    if user_id:
        query["user_id"] = user_id
    if table_id:
        query["table_id"] = table_id
    if order_id:
        query["order_id"] = order_id
    if ticket_id:
        query["ticket_id"] = ticket_id
    
    # Time range
    if from_ts or to_ts:
        query["ts"] = {}
        if from_ts:
            query["ts"]["$gte"] = from_ts
        if to_ts:
            query["ts"]["$lte"] = to_ts
    
    # Text search
    if q:
        query["$or"] = [
            {"message": {"$regex": q, "$options": "i"}},
            {"code": {"$regex": q, "$options": "i"}}
        ]
    
    # Cursor pagination
    if cursor:
        query["_id"] = {"$lt": cursor}
    
    # Fetch logs
    logs = await db.logs_events.find(query, {"_id": 0}).sort("ts", -1).limit(limit).to_list(limit)
    
    # Next cursor (if more results)
    next_cursor = logs[-1]["id"] if len(logs) == limit else None
    
    return {"items": logs, "next_cursor": next_cursor}

@api_router.get("/system/logs")
async def get_system_logs(
    level: Optional[str] = None,
    code: Optional[str] = None,
    venue_id: Optional[str] = None,
    from_ts: Optional[str] = Query(None, alias="from"),
    to_ts: Optional[str] = Query(None, alias="to"),
    q: Optional[str] = None,
    limit: int = Query(200, le=1000),
    cursor: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get system-wide logs (PRODUCT_OWNER/OWNER/IT_ADMIN only)"""
    if current_user["role"] not in [UserRole.PRODUCT_OWNER, UserRole.OWNER, UserRole.IT_ADMIN]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    # Build query
    query = {}
    
    if level:
        query["level"] = level
    if code:
        query["code"] = code
    if venue_id:
        query["venue_id"] = venue_id
    
    # Time range
    if from_ts or to_ts:
        query["ts"] = {}
        if from_ts:
            query["ts"]["$gte"] = from_ts
        if to_ts:
            query["ts"]["$lte"] = to_ts
    
    # Text search
    if q:
        query["$or"] = [
            {"message": {"$regex": q, "$options": "i"}},
            {"code": {"$regex": q, "$options": "i"}}
        ]
    
    # Cursor pagination
    if cursor:
        query["_id"] = {"$lt": cursor}
    
    # Fetch logs
    logs = await db.logs_events.find(query, {"_id": 0}).sort("ts", -1).limit(limit).to_list(limit)
    
    # Next cursor
    next_cursor = logs[-1]["id"] if len(logs) == limit else None
    
    return {"items": logs, "next_cursor": next_cursor}

@api_router.post("/system/logs/cleanup")
async def cleanup_old_logs(
    dry_run: bool = Query(False),
    current_user: dict = Depends(get_current_user)
):
    """Manual log retention cleanup (PRODUCT_OWNER/OWNER only)"""
    if current_user["role"] not in [UserRole.PRODUCT_OWNER, UserRole.OWNER]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    # Get all venues with their retention settings
    venues = await db.venues.find({}, {"_id": 0, "id": 1, "settings": 1}).to_list(1000)
    
    deleted_count = 0
    venue_stats = []
    
    for venue in venues:
        venue_id = venue["id"]
        retention_days = venue.get("settings", {}).get("logs", {}).get("retention_days", DEFAULT_VENUE_SETTINGS["logs"]["retention_days"])
        
        cutoff_date = (datetime.now(timezone.utc) - timedelta(days=retention_days)).isoformat()
        
        if dry_run:
            count = await db.logs_events.count_documents({
                "venue_id": venue_id,
                "ts": {"$lt": cutoff_date}
            })
        else:
            result = await db.logs_events.delete_many({
                "venue_id": venue_id,
                "ts": {"$lt": cutoff_date}
            })
            count = result.deleted_count
        
        deleted_count += count
        if count > 0:
            venue_stats.append({"venue_id": venue_id, "deleted": count, "retention_days": retention_days})
    
    # Log the cleanup action
    if not dry_run:
        await log_event(
            db,
            level="AUDIT",
            code="LOG_RETENTION_CLEANUP",
            message=f"Log retention cleanup: {deleted_count} logs deleted",
            user=current_user,
            meta={"deleted_count": deleted_count, "venue_stats": venue_stats}
        )
    
    return {
        "dry_run": dry_run,
        "deleted_count": deleted_count,
        "venue_stats": venue_stats
    }

# ==================== TABLE SCHEMA & FINANCE ENDPOINTS (V3: Permissioned Tables) ====================
@api_router.get("/venues/{venue_id}/ui/table-schema")
async def get_table_schema(
    venue_id: str,
    table: str = Query(...),
    current_user: dict = Depends(get_current_user)
):
    """Get table schema with only columns user has permission to see (server-authoritative)"""
    await check_venue_access(current_user, venue_id)
    
    # Get venue settings
    venue = await db.venues.find_one({"id": venue_id}, {"_id": 0})
    venue_settings = venue.get("settings", {}) if venue else {}
    currency = venue.get("currency", "EUR") if venue else "EUR"
    
    # Calculate effective permissions
    user_perms = effective_permissions(current_user["role"], venue_settings)
    
    # Get allowed schema
    schema = get_allowed_schema(table, user_perms, currency)
    
    if not schema:
        raise HTTPException(
            status_code=403,
            detail={"code": "FORBIDDEN", "message": f"No access to table '{table}'"}
        )
    
    return schema

@api_router.get("/venues/{venue_id}/finance/summary")
async def get_finance_summary(venue_id: str, current_user: dict = Depends(get_current_user)):
    """Get finance summary (widgets data)"""
    await check_venue_access(current_user, venue_id)
    
    # Check permission
    venue = await db.venues.find_one({"id": venue_id}, {"_id": 0})
    venue_settings = venue.get("settings", {}) if venue else {}
    user_perms = effective_permissions(current_user["role"], venue_settings)
    
    if "FINANCE_VIEW" not in user_perms:
        raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "No finance access"})
    
    # Calculate today's range
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    today_end = datetime.now(timezone.utc).isoformat()
    
    # Open orders count
    open_orders = await db.orders.count_documents({
        "venue_id": venue_id,
        "status": {"$nin": ["CLOSED", "PAID", "CANCELLED"]}
    })
    
    # Closed checks today
    closed_checks = await db.orders.count_documents({
        "venue_id": venue_id,
        "status": {"$in": ["CLOSED", "PAID"]},
        "closed_at": {"$gte": today_start, "$lte": today_end}
    })
    
    # Gross sales today (if FINANCE_VIEW_MONEY permission)
    gross_sales = 0.0
    avg_check = 0.0
    
    if "FINANCE_VIEW_MONEY" in user_perms:
        # Calculate from closed orders
        closed_orders = await db.orders.find({
            "venue_id": venue_id,
            "status": {"$in": ["CLOSED", "PAID"]},
            "closed_at": {"$gte": today_start, "$lte": today_end}
        }, {"_id": 0, "total": 1}).to_list(1000)
        
        gross_sales = sum(o.get("total", 0) for o in closed_orders)
        avg_check = gross_sales / closed_checks if closed_checks > 0 else 0.0
    
    summary = {
        "open_orders_count": open_orders,
        "closed_checks_count": closed_checks,
        "currency": venue.get("currency", "EUR") if venue else "EUR"
    }
    
    # Only add money fields if user has permission
    if "FINANCE_VIEW_MONEY" in user_perms:
        summary["gross_sales_today"] = gross_sales
        summary["avg_check_today"] = avg_check
    
    return summary

@api_router.get("/venues/{venue_id}/finance/orders/open")
async def get_open_orders(venue_id: str, current_user: dict = Depends(get_current_user)):
    """Get open orders with permission-filtered columns"""
    await check_venue_access(current_user, venue_id)
    
    # Get schema first (this checks permissions)
    venue = await db.venues.find_one({"id": venue_id}, {"_id": 0})
    venue_settings = venue.get("settings", {}) if venue else {}
    user_perms = effective_permissions(current_user["role"], venue_settings)
    currency = venue.get("currency", "EUR") if venue else "EUR"
    
    schema = get_allowed_schema("orders_open", user_perms, currency)
    if not schema:
        raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "No access to open orders"})
    
    # Fetch open orders
    orders = await db.orders.find({
        "venue_id": venue_id,
        "status": {"$nin": ["CLOSED", "PAID", "CANCELLED"]}
    }, {"_id": 0}).sort("created_at", -1).limit(200).to_list(200)
    
    # Build rows with allowed columns only
    rows = []
    for order in orders:
        row = {
            "order_display_id": order.get("display_id", order.get("id", "")[:8]),
            "table_display_id": order.get("table_name", ""),
            "server_display_id": order.get("server_id", "")[:8] if order.get("server_id") else "",
            "server_name": order.get("server_name", ""),
            "created_at": order.get("created_at", ""),
            "status": order.get("status", ""),
            "items_count": len(order.get("items", [])),
            "subtotal": order.get("subtotal", 0.0),
            "tax": order.get("tax", 0.0),
            "total": order.get("total", 0.0)
        }
        # Filter to only allowed columns
        filtered_row = filter_row_by_schema(row, schema)
        rows.append(filtered_row)
    
    return {
        "schema": schema,
        "rows": rows,
        "meta": {"count": len(rows), "currency": currency}
    }

@api_router.get("/venues/{venue_id}/finance/checks/closed")
async def get_closed_checks(
    venue_id: str,
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """Get closed checks with permission-filtered columns"""
    await check_venue_access(current_user, venue_id)
    
    # Get schema first
    venue = await db.venues.find_one({"id": venue_id}, {"_id": 0})
    venue_settings = venue.get("settings", {}) if venue else {}
    user_perms = effective_permissions(current_user["role"], venue_settings)
    currency = venue.get("currency", "EUR") if venue else "EUR"
    
    schema = get_allowed_schema("checks_closed", user_perms, currency)
    if not schema:
        raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "No access to closed checks"})
    
    # Build date query
    query = {
        "venue_id": venue_id,
        "status": {"$in": ["CLOSED", "PAID"]},
        "closed_at": {"$ne": None}
    }
    
    if from_date:
        query["closed_at"] = query.get("closed_at", {})
        query["closed_at"]["$gte"] = from_date
    
    if to_date:
        query["closed_at"] = query.get("closed_at", {})
        query["closed_at"]["$lte"] = to_date
    
    # Fetch closed orders
    orders = await db.orders.find(query, {"_id": 0}).sort("closed_at", -1).limit(200).to_list(200)
    
    # Build rows
    rows = []
    for order in orders:
        row = {
            "order_display_id": order.get("display_id", order.get("id", "")[:8]),
            "table_display_id": order.get("table_name", ""),
            "server_display_id": order.get("server_id", "")[:8] if order.get("server_id") else "",
            "server_name": order.get("server_name", ""),
            "closed_at": order.get("closed_at", ""),
            "payment_method": order.get("payment_method", "Unknown"),
            "subtotal": order.get("subtotal", 0.0),
            "tax": order.get("tax", 0.0),
            "total": order.get("total", 0.0),
            "tip": order.get("tip", 0.0)
        }
        filtered_row = filter_row_by_schema(row, schema)
        rows.append(filtered_row)
    
    return {
        "schema": schema,
        "rows": rows,
        "meta": {"count": len(rows), "currency": currency}
    }

@api_router.get("/venues/{venue_id}/policy/effective")
async def get_effective_permissions(venue_id: str, current_user: dict = Depends(get_current_user)):
    """Get effective permissions for all roles at this venue (read-only view)"""
    await check_venue_access(current_user, venue_id)
    
    # Only allow viewing for managers+
    if current_user["role"] not in [UserRole.PRODUCT_OWNER, UserRole.OWNER, UserRole.GENERAL_MANAGER, UserRole.MANAGER]:
        raise HTTPException(status_code=403, detail="Manager+ required")
    
    # Get venue settings
    venue = await db.venues.find_one({"id": venue_id}, {"_id": 0})
    venue_settings = venue.get("settings", {}) if venue else {}
    
    # Calculate for all roles
    roles_perms = {}
    for role in UserRole:
        perms = effective_permissions(role.value, venue_settings)
        roles_perms[role.value] = sorted(list(perms))
    
    return {"roles": roles_perms}

# ==================== REPORTING ENDPOINTS (MODULE R: Search→Report) ====================
from services.reporting_service import register_builtin_reports, run_report, suggest_reports_from_search

@api_router.get("/reports/defs")
async def list_report_defs(
    venue_id: str = Query(...),
    category: Optional[str] = None,
    q: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """List available report definitions with permission filtering"""
    await check_venue_access(current_user, venue_id)
    
    # Get venue settings
    venue = await db.venues.find_one({"id": venue_id}, {"_id": 0})
    venue_settings = venue.get("settings", {}) if venue else {}
    user_perms = effective_permissions(current_user["role"], venue_settings)
    
    query = {"venue_id": {"$in": [venue_id, "GLOBAL"]}}
    if category:
        query["category"] = category
    if q:
        query["$or"] = [
            {"title": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}}
        ]
    
    all_defs = await db.report_defs.find(query, {"_id": 0}).to_list(200)
    
    # Filter by permissions
    allowed_defs = []
    for report_def in all_defs:
        required_perms = set(report_def.get("permissions_required", []))
        if required_perms.issubset(user_perms):
            allowed_defs.append(report_def)
    
    return allowed_defs

@api_router.post("/reports/run")
async def run_report_endpoint(
    data: dict,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Run a report"""
    venue_id = data.get("venue_id")
    await check_venue_access(current_user, venue_id)
    
    venue = await db.venues.find_one({"id": venue_id}, {"_id": 0})
    venue_settings = venue.get("settings", {}) if venue else {}
    user_perms = effective_permissions(current_user["role"], venue_settings)
    
    report_result = await run_report(
        db,
        current_user,
        venue_id,
        data.get("report_key"),
        data.get("params", {}),
        data.get("format", "json"),
        user_perms
    )
    
    # Create ReportRun record
    from uuid import uuid4
    run_doc = {
        "id": str(uuid4()),
        "venue_id": venue_id,
        "report_key": data.get("report_key"),
        "params": data.get("params", {}),
        "format": data.get("format", "json"),
        "status": report_result.get("status", "done"),
        "requested_by": current_user["id"],
        "requested_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": datetime.now(timezone.utc).isoformat() if report_result.get("status") == "done" else None,
        "result_meta": {
            "row_count": report_result.get("row_count", 0),
            "duration_ms": report_result.get("duration_ms", 0),
            "cache_hit": report_result.get("cache_hit", False)
        },
        "result_data_ref": {"type": "inline"},
        "error": report_result.get("error"),
        "request_id": getattr(request.state, "request_id", None)
    }
    
    try:
        run_doc = await ensure_ids(db, "REPORT_RUN", run_doc, venue_id)
    except:
        run_doc["display_id"] = f"RPR-{run_doc['id'][:8].upper()}"
    
    await db.report_runs.insert_one(run_doc)
    
    # Log event
    await log_event(
        db,
        level="AUDIT",
        code="REPORT_RUN",
        message=f"Report {data.get('report_key')} executed",
        request=request,
        user=current_user,
        venue_id=venue_id,
        meta={"report_run_id": run_doc["id"], "cache_hit": report_result.get("cache_hit")}
    )
    
    # Remove MongoDB _id before returning
    run_doc.pop('_id', None)
    
    # Return with inline results
    return {
        **run_doc,
        "result_data": report_result.get("result_data")
    }

@api_router.get("/reports/runs")
async def list_report_runs(
    venue_id: str = Query(...),
    report_key: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """List report runs"""
    await check_venue_access(current_user, venue_id)
    
    query = {"venue_id": venue_id}
    if report_key:
        query["report_key"] = report_key
    if status:
        query["status"] = status
    
    runs = await db.report_runs.find(query, {"_id": 0}).sort("requested_at", -1).limit(100).to_list(100)
    return runs

# ==================== DOCUMENT SERVICE ENDPOINTS (Shared Upload + OCR) ====================
from services.document_service import save_document, ALLOWED_MIME
from services.ocr_service import extract_text
from fastapi import UploadFile, File, Form

@api_router.post("/documents/upload")
async def upload_document(
    venue_id: str = Form(...),
    module: str = Form(...),
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    request: Request = None
):
    """Upload document with automatic OCR (shared service for all modules)"""
    try:
        await check_venue_access(current_user, venue_id)
        
        # Read file for OCR
        raw_content = await file.read()
        
        # Extract text (fail-safe)
        ocr_text = ""
        try:
            ocr_text = extract_text(raw_content, file.content_type)
        except Exception as e:
            logger.warning(f"OCR failed for {file.filename}: {e}")
        
        # Reset file pointer
        await file.seek(0)
        
        # Save document
        doc = await save_document(
            db,
            venue_id=venue_id,
            user_id=current_user["id"],
            module=module,
            file=file,
            ocr_text=ocr_text,
            ensure_ids=ensure_ids
        )
        
        # Log event
        await log_event(
            db,
            level="AUDIT",
            code="DOCUMENT_UPLOADED",
            message=f"Document uploaded: {file.filename} ({module} module)",
            request=request,
            user=current_user,
            venue_id=venue_id,
            meta={
                "document_id": doc["id"],
                "module": module,
                "filename": file.filename,
                "size": doc["size"],
                "has_ocr": bool(ocr_text)
            }
        )
        
        return {"ok": True, "document": doc}
        
    except ValueError as e:
        error_code = str(e)
        return JSONResponse(
            status_code=400,
            content={"code": error_code, "message": f"Upload failed: {error_code}"}
        )
    except Exception as e:
        logger.error(f"Document upload failed: {e}")
        return JSONResponse(
            status_code=500,
            content={"code": "DOCUMENT_UPLOAD_FAILED", "message": "Failed to upload document"}
        )

@api_router.get("/documents")
async def list_documents(
    venue_id: str = Query(...),
    module: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """List documents with optional module filter"""
    await check_venue_access(current_user, venue_id)
    
    query = {"venue_id": venue_id}
    if module:
        query["module"] = module
    
    documents = await db.documents.find(query, {"_id": 0}).sort("created_at", -1).limit(200).to_list(200)
    return documents

@api_router.get("/documents/{document_id}")
async def get_document(
    document_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get single document"""
    doc = await db.documents.find_one({"id": document_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail={"code": "DOCUMENT_NOT_FOUND", "message": "Document not found"})
    
    await check_venue_access(current_user, doc["venue_id"])
    return doc

@api_router.delete("/documents/{document_id}")
async def delete_document(
    document_id: str,
    current_user: dict = Depends(get_current_user),
    request: Request = None
):
    """Delete document"""
    doc = await db.documents.find_one({"id": document_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail={"code": "DOCUMENT_NOT_FOUND", "message": "Document not found"})
    
    await check_venue_access(current_user, doc["venue_id"])
    
    # Delete file from disk
    try:
        if os.path.exists(doc.get("file_path", "")):
            os.remove(doc["file_path"])
    except Exception as e:
        logger.warning(f"Failed to delete file: {e}")
    
    # Delete from database
    await db.documents.delete_one({"id": document_id})
    
    # Log event
    await log_event(
        db,
        level="AUDIT",
        code="DOCUMENT_DELETED",
        message=f"Document deleted: {doc.get('filename')}",
        request=request,
        user=current_user,
        venue_id=doc["venue_id"],
        meta={"document_id": document_id, "module": doc.get("module")}
    )
    
    return {"ok": True, "message": "Document deleted"}

# ==================== OBSERVABILITY: LOGS & ERROR CODES ====================
from services.error_registry import list_all_error_codes, get_error_info
from services.log_service import log_system_event
from services.order_service import process_send_order, transfer_order_to_table, close_order
from services.kds_service import update_ticket_status, update_ticket_item_status, claim_ticket, release_ticket

@api_router.get("/admin/error-codes")
async def get_error_codes(current_user: dict = Depends(get_current_user)):
    """Get error code registry (PRODUCT_OWNER/OWNER/IT_ADMIN/GM)"""
    if current_user["role"] not in ["product_owner", "owner", "it_admin", "general_manager", "manager"]:
        raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "Insufficient permissions"})
    
    return {"codes": list_all_error_codes()}

@api_router.get("/admin/logs")
async def get_system_logs(
    venue_id: Optional[str] = None,
    level: Optional[str] = None,
    code: Optional[str] = None,
    q: Optional[str] = None,
    since: Optional[str] = None,
    until: Optional[str] = None,
    limit: int = Query(200, le=500),
    cursor: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get system logs with filters (PRODUCT_OWNER/OWNER/IT_ADMIN/GM)"""
    if current_user["role"] not in ["product_owner", "owner", "it_admin", "general_manager", "manager"]:
        raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "Insufficient permissions"})
    
    query = {}
    
    if venue_id:
        query["venue_id"] = venue_id
    if level:
        query["level"] = level
    if code:
        query["code"] = code
    
    # Text search
    if q:
        query["$or"] = [
            {"message": {"$regex": q, "$options": "i"}},
            {"code": {"$regex": q, "$options": "i"}}
        ]
    
    # Time range
    if since or until:
        query["ts"] = {}
        if since:
            query["ts"]["$gte"] = since
        if until:
            query["ts"]["$lte"] = until
    
    # Cursor pagination
    if cursor:
        query["ts"] = query.get("ts", {})
        query["ts"]["$lt"] = cursor
    
    logs = await db.system_logs.find(query, {"_id": 0}).sort("ts", -1).limit(limit).to_list(limit)
    
    next_cursor = logs[-1]["ts"] if len(logs) == limit else None
    
    return {"items": logs, "next_cursor": next_cursor}

@api_router.post("/admin/logs/{log_id}/ack")
async def acknowledge_log(
    log_id: str,
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Acknowledge system log"""
    if current_user["role"] not in ["product_owner", "owner", "it_admin", "general_manager", "manager"]:
        raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "Insufficient permissions"})
    
    now = datetime.now(timezone.utc).isoformat()
    
    await db.system_logs.update_one(
        {"id": log_id},
        {"$set": {
            "acknowledged": data.get("acknowledged", True),
            "acknowledged_by": current_user["id"],
            "acknowledged_at": now
        }}
    )
    
    return {"ok": True, "message": "Log acknowledged"}

# Include routers
from hr_routes import create_hr_router
from routes.auth_routes import create_auth_router
from routes.system_routes import create_system_router
from routes.venue_routes import create_venue_router
from routes.menu_routes import create_menu_router
from routes.order_routes import create_order_router
from routes.guest_routes import create_guest_router
from routes.stats_routes import create_stats_router
from routes.finance_routes import create_finance_router
from routes.report_routes import create_report_router
from routes.document_routes import create_document_router
from routes.device_routes import create_device_router
from routes.admin_routes import create_admin_router
from routes.event_routes import create_event_router
from routes.inventory_routes import create_inventory_router
from routes.order_ops_routes import create_order_ops_router
from routes.log_routes import create_log_router
from routes.procurement_routes import create_procurement_router
from routes.shift_routes import create_shift_router
from routes.manager_override_routes import create_manager_override_router
from routes.floor_plan_routes import create_floor_plan_router
from routes.utils_routes import create_utils_router
from routes.print_routes import create_print_router
from routes.telemetry_routes import create_telemetry_router
from routes.guide_routes import create_guide_router
from routes.menu_import_routes import create_menu_import_router
from routes.review_routes import create_review_router
from routes.audit_routes import create_audit_router

hr_router = create_hr_router(db, ensure_ids, log_event, check_venue_access, get_current_user, effective_permissions, UserRole)
auth_router = create_auth_router()
system_router = create_system_router()
venue_router = create_venue_router()
menu_router = create_menu_router()
order_router = create_order_router()
guest_router = create_guest_router()
stats_router = create_stats_router()
finance_router = create_finance_router()
report_router = create_report_router()
document_router = create_document_router()
device_router = create_device_router()
admin_router_new = create_admin_router()
event_router = create_event_router()
inventory_router = create_inventory_router()
order_ops_router = create_order_ops_router()
log_router = create_log_router()
procurement_router = create_procurement_router()
shift_router = create_shift_router()
manager_override_router = create_manager_override_router()
floor_plan_router = create_floor_plan_router()
utils_router = create_utils_router()
print_router = create_print_router()
telemetry_router = create_telemetry_router()
guide_router = create_guide_router()
menu_import_router = create_menu_import_router()
review_router = create_review_router()
audit_router = create_audit_router()

# Mount all routers
app.include_router(api_router)
app.include_router(admin_router)
app.include_router(hr_router)
app.include_router(auth_router, prefix="/api")
app.include_router(system_router, prefix="/api")
app.include_router(venue_router, prefix="/api")
app.include_router(menu_router, prefix="/api")
app.include_router(order_router, prefix="/api")
app.include_router(order_ops_router, prefix="/api")
app.include_router(guest_router, prefix="/api")
app.include_router(stats_router, prefix="/api")
app.include_router(finance_router, prefix="/api")
app.include_router(report_router, prefix="/api")
app.include_router(document_router, prefix="/api")
app.include_router(device_router, prefix="/api")
app.include_router(inventory_router, prefix="/api")
app.include_router(log_router, prefix="/api")
app.include_router(procurement_router, prefix="/api")
app.include_router(shift_router, prefix="/api")
app.include_router(manager_override_router, prefix="/api")
app.include_router(floor_plan_router, prefix="/api")
app.include_router(utils_router, prefix="/api")
app.include_router(print_router, prefix="/api")
app.include_router(telemetry_router, prefix="/api")
app.include_router(guide_router, prefix="/api")
app.include_router(menu_import_router, prefix="/api")
app.include_router(review_router, prefix="/api")
app.include_router(audit_router, prefix="/api")
app.include_router(admin_router_new)
app.include_router(event_router, prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    """Initialize report definitions and event-driven services on startup"""
    try:
        # Register built-in reports
        await register_builtin_reports(db, venue_id="GLOBAL")
        logger.info("✓ Built-in reports registered")
        
        # Initialize event-driven services
        await order_service.initialize()
        await inventory_service.initialize()
        await analytics_service.initialize()
        await email_service.initialize()
        await notification_service.initialize()
        await payment_service.initialize()
        await payroll_service.initialize()
        logger.info("✓ Event-driven services initialized (7 microservices)")
        
        # Start event bus processor in background
        event_bus.start()
        import asyncio
        asyncio.create_task(event_bus.process_pending_events())
        logger.info("✓ Event bus started")
        
    except Exception as e:
        logger.error(f"Startup error: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    event_bus.stop()
    logger.info("✓ Event bus stopped")
    client.close()

# ==================== EVENT-DRIVEN API EXAMPLE ====================
@api_router.post("/orders/{order_id}/close-v2")
async def close_order_v2(order_id: str, current_user: dict = Depends(get_current_user)):
    """
    🚀 NEW: Event-driven order close (microservice architecture)
    This endpoint demonstrates the new event-driven approach!
    """
    success, result = await order_service.close_order_event_driven(order_id, current_user)
    
    if not success:
        raise HTTPException(status_code=404, detail=result.get("error"))
    
    return result

@api_router.get("/services/status")
async def get_services_status(current_user: dict = Depends(get_current_user)):
    """Get status of all registered microservices"""
    services = await service_registry.list_all_services()
    return {"services": services, "event_bus_running": event_bus.running}

@api_router.get("/events/outbox")
async def get_event_outbox(
    status: str = None,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """View event outbox (for monitoring)"""
    query = {}
    if status:
        query["status"] = status
    
    events = await db.event_outbox.find(query, {"_id": 0}).sort("published_at", -1).limit(limit).to_list(limit)
    return {"events": events, "count": len(events)}

@api_router.get("/events/dlq")
async def get_dead_letter_queue(
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """View dead letter queue (failed events)"""
    events = await db.event_dlq.find({}, {"_id": 0}).sort("moved_to_dlq_at", -1).limit(limit).to_list(limit)
    return {"events": events, "count": len(events)}
# ==================== END EVENT-DRIVEN ====================

# ==================== FRONTEND SPA SERVING ====================
# Serve React build (SPA fallback for deployment)
def frontend_available() -> bool:
    return INDEX_FILE.exists()

if frontend_available():
    # Serve static assets
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
    
    @app.get("/favicon.ico", include_in_schema=False)
    async def favicon():
        favicon_path = Path(FRONTEND_BUILD_DIR) / "favicon.ico"
        if favicon_path.exists():
            return FileResponse(favicon_path)
        return FileResponse(INDEX_FILE)
    
    @app.get("/manifest.json", include_in_schema=False)
    async def manifest():
        manifest_path = Path(FRONTEND_BUILD_DIR) / "manifest.json"
        if manifest_path.exists():
            return FileResponse(manifest_path)
        return FileResponse(INDEX_FILE)
    
    # Root health redirect for platform checks
    @app.get("/health", include_in_schema=False)
    async def root_health():
        return RedirectResponse(url="/api/health")
    
    # SPA fallback: return index.html for non-API routes
    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa_fallback(full_path: str):
        # Never hijack API routes
        if full_path.startswith("api") or full_path == "api":
            raise HTTPException(status_code=404, detail="Not Found")
        
        # Return index.html for all SPA routes
        return FileResponse(INDEX_FILE)
else:
    logger.warning("Frontend build not found - SPA serving disabled")
