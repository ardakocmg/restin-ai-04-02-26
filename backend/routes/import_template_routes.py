"""
Import Template Routes — CRUD for reusable import column mappings.

Saves mapping configurations from MigrationHub so users can
re-apply them to future imports without re-mapping every time.
"""

from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone
from uuid import uuid4
import logging

from core.database import get_database
from core.dependencies import get_current_user

logger = logging.getLogger(__name__)

db = get_database()

router = APIRouter(prefix="/import-templates", tags=["Import Templates"])


@router.get("")
async def list_import_templates(
    venue_id: str,
    source: str = None,
    current_user: dict = Depends(get_current_user),
):
    """List import templates for a venue, optionally filtered by source."""
    query = {"venue_id": venue_id, "deleted_at": None}
    if source:
        query["source"] = source

    cursor = db.import_templates.find(query, {"_id": 0}).sort("last_used_at", -1)
    templates = await cursor.to_list(length=100)
    return templates


@router.post("")
async def create_import_template(
    data: dict,
    current_user: dict = Depends(get_current_user),
):
    """Save a new import template with column mappings."""
    venue_id = data.get("venue_id")
    if not venue_id:
        raise HTTPException(status_code=400, detail="venue_id is required")

    name = data.get("name", "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Template name is required")

    source = data.get("source", "")
    if not source:
        raise HTTPException(status_code=400, detail="source is required (e.g. 'apicbase')")

    now = datetime.now(timezone.utc).isoformat()

    template_doc = {
        "id": str(uuid4()),
        "venue_id": venue_id,
        "name": name,
        "source": source,
        "target_type": data.get("target_type", "auto"),
        "column_mappings": data.get("column_mappings", []),
        "options": data.get("options", {}),
        "use_count": 0,
        "last_used_at": now,
        "created_at": now,
        "updated_at": now,
        "created_by": current_user.get("id", ""),
        "deleted_at": None,
    }

    await db.import_templates.insert_one(template_doc)

    logger.info(f"Import template created: {template_doc['id']} '{name}' by {current_user.get('name', 'Unknown')}")
    return template_doc


@router.get("/{template_id}")
async def get_import_template(
    template_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get a single import template by ID."""
    template = await db.import_templates.find_one(
        {"id": template_id, "deleted_at": None}, {"_id": 0}
    )
    if not template:
        raise HTTPException(status_code=404, detail="Import template not found")
    return template


@router.put("/{template_id}")
async def update_import_template(
    template_id: str,
    data: dict,
    current_user: dict = Depends(get_current_user),
):
    """Update an existing import template."""
    existing = await db.import_templates.find_one(
        {"id": template_id, "deleted_at": None}
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Import template not found")

    now = datetime.now(timezone.utc).isoformat()
    update_fields = {"updated_at": now}

    for field in ["name", "column_mappings", "options", "target_type"]:
        if field in data:
            update_fields[field] = data[field]

    await db.import_templates.update_one(
        {"id": template_id}, {"$set": update_fields}
    )

    logger.info(f"Import template updated: {template_id} by {current_user.get('name', 'Unknown')}")
    return {"status": "updated", "id": template_id}


@router.delete("/{template_id}")
async def delete_import_template(
    template_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Soft-delete an import template."""
    existing = await db.import_templates.find_one(
        {"id": template_id, "deleted_at": None}
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Import template not found")

    now = datetime.now(timezone.utc).isoformat()
    await db.import_templates.update_one(
        {"id": template_id},
        {"$set": {"deleted_at": now, "deleted_by": current_user.get("id", "")}},
    )

    logger.info(f"Import template deleted: {template_id} by {current_user.get('name', 'Unknown')}")
    return {"status": "deleted", "id": template_id}


@router.post("/{template_id}/use")
async def record_template_use(
    template_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Increment use_count and update last_used_at when a template is applied."""
    existing = await db.import_templates.find_one(
        {"id": template_id, "deleted_at": None}
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Import template not found")

    now = datetime.now(timezone.utc).isoformat()
    await db.import_templates.update_one(
        {"id": template_id},
        {"$inc": {"use_count": 1}, "$set": {"last_used_at": now}},
    )

    return {"status": "ok", "use_count": existing.get("use_count", 0) + 1}
