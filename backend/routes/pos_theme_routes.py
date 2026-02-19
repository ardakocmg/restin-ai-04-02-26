"""
POS/KDS Theme Routes — CRUD API for layout themes

Endpoints:
  GET    /pos-themes           — List all themes (built-in + custom) for a venue
  GET    /pos-themes/:id       — Get single theme
  POST   /pos-themes           — Create custom theme
  PUT    /pos-themes/:id       — Update theme config
  POST   /pos-themes/:id/duplicate — Clone a theme
  DELETE /pos-themes/:id       — Soft-delete custom theme
  POST   /pos-themes/:id/activate  — Set as venue active theme
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from bson import ObjectId
from app.core.database import get_database
from core.dependencies import get_current_user
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/pos-themes", tags=["POS Themes"])

# ─── Models ──────────────────────────────────────────────────────

class ThemeStyles(BaseModel):
    rootBg: str = "#000000"
    topBarBg: str = "#1a1a1a"
    sidebarBg: str = "#111111"
    accentColor: str = "#2A9D8F"
    accentColorHover: str = "#34B5A5"
    textPrimary: str = "#ffffff"
    textSecondary: str = "#888888"
    tileRadius: int = 12
    tileBg: str = "#333333"
    orderPanelBg: str = "#0d0d0d"
    fontFamily: str = "-apple-system, BlinkMacSystemFont, sans-serif"
    categoryColors: Dict[str, str] = {}

class ThemeMeta(BaseModel):
    name: str
    description: str = ""
    thumbnail: str = ""
    author: str = "Custom"
    version: str = "1.0.0"
    tags: List[str] = []
    businessType: List[str] = []

class ZoneConfig(BaseModel):
    id: str
    component: str
    position: str  # 'top' | 'left' | 'right' | 'center' | 'bottom'
    width: Optional[str] = None  # e.g. 'w-80', '320px', '25%'
    height: Optional[str] = None
    order: int = 0
    visible: bool = True
    config: Dict[str, Any] = {}

class ThemeCreateRequest(BaseModel):
    layout_type: str = "pos"  # 'pos' | 'kds'
    engine: str = "custom"
    meta: ThemeMeta
    styles: ThemeStyles = ThemeStyles()
    zones: List[ZoneConfig] = []
    venue_id: Optional[str] = None
    brand_id: Optional[str] = None

class ThemeUpdateRequest(BaseModel):
    meta: Optional[ThemeMeta] = None
    styles: Optional[ThemeStyles] = None
    zones: Optional[List[ZoneConfig]] = None

class ThemeActivateRequest(BaseModel):
    venue_id: str

# ─── Built-in Templates ─────────────────────────────────────────

BUILTIN_POS_THEMES = [
    {
        "_id": "theme-lseries",
        "layout_type": "pos",
        "engine": "l-series",
        "is_builtin": True,
        "meta": {
            "name": "L-Series",
            "description": "Lightspeed L-Series style. Dark, professional, iPad-optimized layout.",
            "thumbnail": "/themes/lseries-thumb.png",
            "author": "Restin.AI",
            "version": "1.0.0",
            "tags": ["dark", "ipad", "full-service"],
            "businessType": ["full-service", "bar", "fine-dining"],
        },
        "zones": [
            {"id": "top-bar", "component": "TopBar", "position": "top", "order": 0, "visible": True, "config": {}},
            {"id": "sidebar-left", "component": "SideTools", "position": "left", "width": "56px", "order": 1, "visible": True, "config": {}},
            {"id": "order-panel", "component": "OrderPanel", "position": "left", "width": "280px", "order": 2, "visible": True, "config": {}},
            {"id": "item-grid", "component": "ItemGrid", "position": "center", "order": 3, "visible": True, "config": {}},
            {"id": "category-bar", "component": "CategoryBar", "position": "bottom", "order": 4, "visible": True, "config": {"style": "tabs"}},
            {"id": "payment-bar", "component": "PaymentBar", "position": "bottom", "order": 5, "visible": True, "config": {}},
        ],
    },
    {
        "_id": "theme-restin",
        "layout_type": "pos",
        "engine": "restin",
        "is_builtin": True,
        "meta": {
            "name": "Restin Classic",
            "description": "Original 3-column layout: categories, items, order.",
            "thumbnail": "/themes/restin-thumb.png",
            "author": "Restin.AI",
            "version": "1.0.0",
            "tags": ["dark", "classic", "three-column"],
            "businessType": ["full-service", "casual-dining", "cafe"],
        },
        "zones": [
            {"id": "category-bar", "component": "CategoryBar", "position": "left", "width": "192px", "order": 0, "visible": True, "config": {"style": "sidebar"}},
            {"id": "item-grid", "component": "ItemGrid", "position": "center", "order": 1, "visible": True, "config": {}},
            {"id": "order-panel", "component": "OrderPanel", "position": "right", "width": "320px", "order": 2, "visible": True, "config": {}},
        ],
    },
    {
        "_id": "theme-pro",
        "layout_type": "pos",
        "engine": "pro",
        "is_builtin": True,
        "meta": {
            "name": "Pro",
            "description": "iPad full-service layout with course management.",
            "thumbnail": "/themes/pro-thumb.png",
            "author": "Restin.AI",
            "version": "1.0.0",
            "tags": ["dark", "ipad", "courses", "seats"],
            "businessType": ["full-service", "fine-dining", "hotel"],
        },
        "zones": [
            {"id": "order-panel", "component": "OrderPanel", "position": "left", "width": "320px", "order": 0, "visible": True, "config": {"courses": True, "seats": True}},
            {"id": "category-bar", "component": "CategoryBar", "position": "top", "order": 1, "visible": True, "config": {"style": "tabs"}},
            {"id": "item-grid", "component": "ItemGrid", "position": "center", "order": 2, "visible": True, "config": {"columns": 4}},
        ],
    },
    {
        "_id": "theme-express",
        "layout_type": "pos",
        "engine": "express",
        "is_builtin": True,
        "meta": {
            "name": "Express",
            "description": "Quick service counter layout. Large grid, instant payment.",
            "thumbnail": "/themes/express-thumb.png",
            "author": "Restin.AI",
            "version": "1.0.0",
            "tags": ["dark", "counter", "quick-service"],
            "businessType": ["counter", "cafe", "bar", "food-truck"],
        },
        "zones": [
            {"id": "category-bar", "component": "CategoryBar", "position": "top", "order": 0, "visible": True, "config": {"style": "strip"}},
            {"id": "item-grid", "component": "ItemGrid", "position": "center", "order": 1, "visible": True, "config": {"columns": 3, "size": "large"}},
            {"id": "order-panel", "component": "OrderPanel", "position": "right", "width": "240px", "order": 2, "visible": True, "config": {"compact": True}},
            {"id": "payment-bar", "component": "PaymentBar", "position": "bottom", "order": 3, "visible": True, "config": {"autoSend": True}},
        ],
    },
]

BUILTIN_KDS_THEMES = [
    {
        "_id": "theme-kds-classic",
        "layout_type": "kds",
        "engine": "kds-classic",
        "is_builtin": True,
        "meta": {
            "name": "KDS Classic",
            "description": "Standard kitchen display with order cards in columns.",
            "thumbnail": "/themes/kds-classic-thumb.png",
            "author": "Restin.AI",
            "version": "1.0.0",
            "tags": ["kitchen", "columns", "classic"],
            "businessType": ["full-service", "casual-dining"],
        },
        "zones": [
            {"id": "header", "component": "KDSHeader", "position": "top", "order": 0, "visible": True, "config": {}},
            {"id": "order-columns", "component": "KDSOrderColumns", "position": "center", "order": 1, "visible": True, "config": {"columns": 4}},
            {"id": "status-bar", "component": "KDSStatusBar", "position": "bottom", "order": 2, "visible": True, "config": {}},
        ],
    },
    {
        "_id": "theme-kds-timeline",
        "layout_type": "kds",
        "engine": "kds-timeline",
        "is_builtin": True,
        "meta": {
            "name": "KDS Timeline",
            "description": "Timeline-based view with time-coded order progression.",
            "thumbnail": "/themes/kds-timeline-thumb.png",
            "author": "Restin.AI",
            "version": "1.0.0",
            "tags": ["kitchen", "timeline", "progress"],
            "businessType": ["fine-dining", "hotel"],
        },
        "zones": [
            {"id": "header", "component": "KDSHeader", "position": "top", "order": 0, "visible": True, "config": {}},
            {"id": "timeline", "component": "KDSTimeline", "position": "center", "order": 1, "visible": True, "config": {}},
            {"id": "status-bar", "component": "KDSStatusBar", "position": "bottom", "order": 2, "visible": True, "config": {}},
        ],
    },
]

ALL_BUILTINS = {t["_id"]: t for t in BUILTIN_POS_THEMES + BUILTIN_KDS_THEMES}


# ─── Helpers ─────────────────────────────────────────────────────

def serialize_theme(doc: dict) -> dict:
    """Convert MongoDB doc to API response"""
    doc["id"] = str(doc.pop("_id", ""))
    doc.pop("deleted_at", None)
    return doc


# ─── Endpoints ───────────────────────────────────────────────────

@router.get("")
async def list_themes(
    layout_type: str = "pos",
    venue_id: Optional[str] = None,
    user=Depends(get_current_user),
):
    """List all themes: built-in + custom for this venue"""
    db = get_database()
    # Built-in themes filtered by layout_type
    builtins = [
        {**t, "id": t["_id"]}
        for t in (BUILTIN_POS_THEMES if layout_type == "pos" else BUILTIN_KDS_THEMES)
    ]

    # Custom themes from DB
    query = {"layout_type": layout_type, "deleted_at": None}
    if venue_id:
        query["venue_id"] = venue_id

    custom_themes = []
    async for doc in db.pos_themes.find(query).sort("created_at", -1):
        custom_themes.append(serialize_theme(doc))

    return {"themes": builtins + custom_themes}


@router.get("/{theme_id}")
async def get_theme(
    theme_id: str,
    user=Depends(get_current_user),
):
    """Get a single theme by ID"""
    db = get_database()
    # Check built-ins first
    if theme_id in ALL_BUILTINS:
        t = ALL_BUILTINS[theme_id]
        return {**t, "id": t["_id"]}

    # Check custom themes
    try:
        doc = await db.pos_themes.find_one({"_id": ObjectId(theme_id), "deleted_at": None})
    except Exception:
        raise HTTPException(status_code=404, detail="Theme not found")

    if not doc:
        raise HTTPException(status_code=404, detail="Theme not found")

    return serialize_theme(doc)


@router.post("")
async def create_theme(
    body: ThemeCreateRequest,
    user=Depends(get_current_user),
):
    """Create a new custom theme"""
    db = get_database()
    now = datetime.now(timezone.utc)
    doc = {
        "layout_type": body.layout_type,
        "engine": body.engine,
        "is_builtin": False,
        "meta": body.meta.model_dump(),
        "styles": body.styles.model_dump(),
        "zones": [z.model_dump() for z in body.zones],
        "venue_id": body.venue_id,
        "brand_id": body.brand_id,
        "created_by": str(user.get("id", user.get("_id", ""))),
        "created_at": now,
        "updated_at": now,
        "deleted_at": None,
    }
    result = await db.pos_themes.insert_one(doc)
    doc["_id"] = result.inserted_id
    logger.info("Created theme %s: %s", result.inserted_id, body.meta.name)
    return serialize_theme(doc)


@router.put("/{theme_id}")
async def update_theme(
    theme_id: str,
    body: ThemeUpdateRequest,
    user=Depends(get_current_user),
):
    """Update a custom theme (built-ins are immutable)"""
    db = get_database()
    if theme_id in ALL_BUILTINS:
        raise HTTPException(status_code=403, detail="Cannot modify built-in themes")

    update = {"$set": {"updated_at": datetime.now(timezone.utc)}}
    if body.meta:
        update["$set"]["meta"] = body.meta.model_dump()
    if body.styles:
        update["$set"]["styles"] = body.styles.model_dump()
    if body.zones is not None:
        update["$set"]["zones"] = [z.model_dump() for z in body.zones]

    try:
        result = await db.pos_themes.update_one(
            {"_id": ObjectId(theme_id), "deleted_at": None},
            update,
        )
    except Exception:
        raise HTTPException(status_code=404, detail="Theme not found")

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Theme not found")

    logger.info("Updated theme %s", theme_id)
    return {"status": "updated", "id": theme_id}


@router.post("/{theme_id}/duplicate")
async def duplicate_theme(
    theme_id: str,
    user=Depends(get_current_user),
):
    """Clone a theme (works for both built-in and custom)"""
    db = get_database()
    # Get source
    source = None
    if theme_id in ALL_BUILTINS:
        source = {**ALL_BUILTINS[theme_id]}
    else:
        try:
            source = await db.pos_themes.find_one({"_id": ObjectId(theme_id), "deleted_at": None})
        except Exception:
            pass

    if not source:
        raise HTTPException(status_code=404, detail="Source theme not found")

    now = datetime.now(timezone.utc)
    clone = {
        "layout_type": source.get("layout_type", "pos"),
        "engine": "custom",
        "is_builtin": False,
        "meta": {
            **source.get("meta", {}),
            "name": f"{source.get('meta', {}).get('name', 'Theme')} (Copy)",
            "author": "Custom",
        },
        "styles": source.get("styles", {}),
        "zones": source.get("zones", []),
        "venue_id": source.get("venue_id"),
        "brand_id": source.get("brand_id"),
        "created_by": str(user.get("id", user.get("_id", ""))),
        "created_at": now,
        "updated_at": now,
        "deleted_at": None,
    }

    result = await db.pos_themes.insert_one(clone)
    clone["_id"] = result.inserted_id
    logger.info("Duplicated theme %s → %s", theme_id, result.inserted_id)
    return serialize_theme(clone)


@router.delete("/{theme_id}")
async def delete_theme(
    theme_id: str,
    user=Depends(get_current_user),
):
    """Soft-delete a custom theme"""
    db = get_database()
    if theme_id in ALL_BUILTINS:
        raise HTTPException(status_code=403, detail="Cannot delete built-in themes")

    try:
        result = await db.pos_themes.update_one(
            {"_id": ObjectId(theme_id), "deleted_at": None},
            {"$set": {"deleted_at": datetime.now(timezone.utc)}},
        )
    except Exception:
        raise HTTPException(status_code=404, detail="Theme not found")

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Theme not found")

    logger.info("Soft-deleted theme %s", theme_id)
    return {"status": "deleted", "id": theme_id}


@router.post("/{theme_id}/activate")
async def activate_theme(
    theme_id: str,
    body: ThemeActivateRequest,
    user=Depends(get_current_user),
):
    """Set a theme as active for a venue"""
    db = get_database()
    # Verify theme exists
    exists = theme_id in ALL_BUILTINS
    if not exists:
        try:
            doc = await db.pos_themes.find_one({"_id": ObjectId(theme_id), "deleted_at": None})
            exists = doc is not None
        except Exception:
            pass

    if not exists:
        raise HTTPException(status_code=404, detail="Theme not found")

    # Upsert venue active theme
    await db.venue_active_themes.update_one(
        {"venue_id": body.venue_id},
        {"$set": {
            "venue_id": body.venue_id,
            "active_theme_id": theme_id,
            "updated_at": datetime.now(timezone.utc),
            "updated_by": str(user.get("id", user.get("_id", ""))),
        }},
        upsert=True,
    )

    logger.info("Activated theme %s for venue %s", theme_id, body.venue_id)
    return {"status": "activated", "theme_id": theme_id, "venue_id": body.venue_id}
