"""
Template Wizard — CRUD & Lifecycle Routes
──────────────────────────────────────────
Endpoints for template management, versioning, and rendering.
Permission-gated via effective_permissions().
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Header
from typing import Optional, List
from datetime import datetime, timezone
from uuid import uuid4
import logging

from core.database import db
from core.dependencies import get_current_user
from services.permission_service import effective_permissions
from services.template_render_service import render_template, compute_content_hash

logger = logging.getLogger("restin.template.routes")


def create_template_router():
    router = APIRouter(prefix="/templates", tags=["Template Wizard"])

    # ── Helpers ─────────────────────────────────────────────────
    async def _get_perms(current_user: dict, venue_id: str) -> set:
        venue = await db.venues.find_one({"id": venue_id}, {"_id": 0})
        venue_settings = venue.get("settings", {}) if venue else {}
        return effective_permissions(current_user["role"], venue_settings)

    # ── LIST ────────────────────────────────────────────────────
    @router.get("")
    async def list_templates(
        venue_id: str = Query(...),
        status: Optional[str] = None,
        template_type: Optional[str] = None,
        current_user: dict = Depends(get_current_user)
    ):
        """List templates for a venue (TEMPLATE_VIEW required)"""
        perms = await _get_perms(current_user, venue_id)
        if "TEMPLATE_VIEW" not in perms:
            raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "No access to templates"})

        query = {"venue_id": venue_id}
        if status:
            query["status"] = status
        if template_type:
            query["type"] = template_type

        templates = await db.templates.find(
            query,
            {"_id": 0, "versions": 0}  # Exclude version history from list view
        ).sort("updated_at", -1).to_list(200)

        return templates

    # ── GET DETAIL ──────────────────────────────────────────────
    @router.get("/{template_id}")
    async def get_template(
        template_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Get full template with blocks and versions (TEMPLATE_VIEW required)"""
        template = await db.templates.find_one({"id": template_id}, {"_id": 0})
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")

        perms = await _get_perms(current_user, template["venue_id"])
        if "TEMPLATE_VIEW" not in perms:
            raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "No access to templates"})

        return template

    # ── CREATE ──────────────────────────────────────────────────
    @router.post("")
    async def create_template(
        data: dict,
        current_user: dict = Depends(get_current_user)
    ):
        """Create a new template in DRAFT status (TEMPLATE_EDIT required)"""
        venue_id = data.get("venue_id")
        if not venue_id:
            raise HTTPException(status_code=400, detail="venue_id is required")

        perms = await _get_perms(current_user, venue_id)
        if "TEMPLATE_EDIT" not in perms:
            raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "No permission to create templates"})

        now = datetime.now(timezone.utc).isoformat()
        template_doc = {
            "id": str(uuid4()),
            "venue_id": venue_id,
            "name": data.get("name", "Untitled Template"),
            "description": data.get("description", ""),
            "type": data.get("type", "receipt"),
            "status": "draft",
            "schema_version": 1,
            "blocks": data.get("blocks", []),
            "paper_profile": data.get("paper_profile", {
                "width": "80mm",
                "margin_left": 4,
                "margin_right": 4,
                "margin_top": 2,
                "margin_bottom": 2,
                "cut_feed": 4,
                "dpi": 203
            }),
            "variables_schema": data.get("variables_schema", {}),
            "current_version": 0,
            "versions": [],
            "has_fiscal_block": any(b.get("type") == "fiscal" for b in data.get("blocks", [])),
            "tags": data.get("tags", []),
            "created_at": now,
            "updated_at": now,
            "created_by": current_user.get("id", ""),
            "updated_by": current_user.get("id", "")
        }

        await db.templates.insert_one(template_doc)

        # Audit
        await db.event_logs.insert_one({
            "id": str(uuid4()),
            "level": "AUDIT",
            "code": "TEMPLATE_CREATED",
            "message": f"Template '{template_doc['name']}' created",
            "user_id": current_user.get("id"),
            "user_name": current_user.get("name", ""),
            "venue_id": venue_id,
            "meta": {"template_id": template_doc["id"], "type": template_doc["type"]},
            "timestamp": now
        })

        logger.info(f"Template created: {template_doc['id']} by {current_user.get('name', 'Unknown')}")
        return template_doc

    # ── UPDATE (DRAFT) ──────────────────────────────────────────
    @router.put("/{template_id}")
    async def update_template(
        template_id: str,
        data: dict,
        current_user: dict = Depends(get_current_user)
    ):
        """Update template draft (TEMPLATE_EDIT required). Cannot edit ACTIVE templates."""
        template = await db.templates.find_one({"id": template_id}, {"_id": 0})
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")

        perms = await _get_perms(current_user, template["venue_id"])
        if "TEMPLATE_EDIT" not in perms:
            raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "No permission to edit templates"})

        if template["status"] == "archived":
            raise HTTPException(status_code=400, detail="Cannot edit archived templates")

        now = datetime.now(timezone.utc).isoformat()

        # Updatable fields
        update_fields = {}
        for field in ["name", "description", "type", "blocks", "paper_profile", "variables_schema", "tags"]:
            if field in data:
                update_fields[field] = data[field]

        update_fields["updated_at"] = now
        update_fields["updated_by"] = current_user.get("id", "")

        # Check for fiscal blocks
        if "blocks" in data:
            update_fields["has_fiscal_block"] = any(b.get("type") == "fiscal" for b in data["blocks"])

        await db.templates.update_one(
            {"id": template_id},
            {"$set": update_fields}
        )

        # Audit
        await db.event_logs.insert_one({
            "id": str(uuid4()),
            "level": "AUDIT",
            "code": "TEMPLATE_UPDATED",
            "message": f"Template '{template.get('name')}' updated",
            "user_id": current_user.get("id"),
            "venue_id": template["venue_id"],
            "meta": {"template_id": template_id, "fields_changed": list(update_fields.keys())},
            "timestamp": now
        })

        updated = await db.templates.find_one({"id": template_id}, {"_id": 0})
        return updated

    # ── PUBLISH (Create Immutable Version) ──────────────────────
    @router.post("/{template_id}/publish")
    async def publish_template(
        template_id: str,
        data: dict = None,
        x_publish_request_id: Optional[str] = Header(None, alias="x-publish-request-id"),
        current_user: dict = Depends(get_current_user)
    ):
        """
        Publish a template: creates an immutable versioned snapshot.
        Requires TEMPLATE_PUBLISH permission.
        Idempotent: uses x-publish-request-id header.
        """
        if data is None:
            data = {}

        template = await db.templates.find_one({"id": template_id}, {"_id": 0})
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")

        perms = await _get_perms(current_user, template["venue_id"])
        if "TEMPLATE_PUBLISH" not in perms:
            raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "No permission to publish templates. Contact GM or Owner."})

        if template["status"] == "archived":
            raise HTTPException(status_code=400, detail="Cannot publish archived templates")

        # Idempotency check
        if x_publish_request_id:
            existing_versions = template.get("versions", [])
            for v in existing_versions:
                if v.get("publish_request_id") == x_publish_request_id:
                    return {"message": "Already published with this request ID", "version": v}

        now = datetime.now(timezone.utc).isoformat()
        new_version_number = template.get("current_version", 0) + 1

        # Create immutable version snapshot
        version_snapshot = {
            "version": new_version_number,
            "blocks": template.get("blocks", []),
            "paper_profile": template.get("paper_profile", {}),
            "content_hash": compute_content_hash(template.get("blocks", [])),
            "published_at": now,
            "published_by": current_user.get("id", ""),
            "publish_request_id": x_publish_request_id,
            "notes": data.get("notes", "")
        }

        await db.templates.update_one(
            {"id": template_id},
            {
                "$push": {"versions": version_snapshot},
                "$set": {
                    "current_version": new_version_number,
                    "status": "active",
                    "updated_at": now,
                    "updated_by": current_user.get("id", "")
                }
            }
        )

        # Audit
        await db.event_logs.insert_one({
            "id": str(uuid4()),
            "level": "AUDIT",
            "code": "TEMPLATE_PUBLISHED",
            "message": f"Template '{template.get('name')}' published v{new_version_number}",
            "user_id": current_user.get("id"),
            "venue_id": template["venue_id"],
            "meta": {
                "template_id": template_id,
                "version": new_version_number,
                "content_hash": version_snapshot["content_hash"]
            },
            "timestamp": now
        })

        logger.info(f"Template {template_id} published v{new_version_number}")
        return {"message": f"Published version {new_version_number}", "version": version_snapshot}

    # ── ARCHIVE ─────────────────────────────────────────────────
    @router.post("/{template_id}/archive")
    async def archive_template(
        template_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Archive a template (TEMPLATE_DELETE required)"""
        template = await db.templates.find_one({"id": template_id}, {"_id": 0})
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")

        perms = await _get_perms(current_user, template["venue_id"])
        if "TEMPLATE_DELETE" not in perms:
            raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "No permission to archive templates"})

        now = datetime.now(timezone.utc).isoformat()
        await db.templates.update_one(
            {"id": template_id},
            {"$set": {"status": "archived", "updated_at": now, "updated_by": current_user.get("id", "")}}
        )

        # Audit
        await db.event_logs.insert_one({
            "id": str(uuid4()),
            "level": "AUDIT",
            "code": "TEMPLATE_ARCHIVED",
            "message": f"Template '{template.get('name')}' archived",
            "user_id": current_user.get("id"),
            "venue_id": template["venue_id"],
            "meta": {"template_id": template_id},
            "timestamp": now
        })

        return {"message": "Template archived"}

    # ── VERSION HISTORY ─────────────────────────────────────────
    @router.get("/{template_id}/versions")
    async def list_versions(
        template_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """List published versions (TEMPLATE_VIEW required)"""
        template = await db.templates.find_one(
            {"id": template_id},
            {"_id": 0, "versions": 1, "venue_id": 1, "name": 1}
        )
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")

        perms = await _get_perms(current_user, template["venue_id"])
        if "TEMPLATE_VIEW" not in perms:
            raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "No access to templates"})

        versions = template.get("versions", [])
        # Return without full block data for performance
        summary = []
        for v in versions:
            summary.append({
                "version": v.get("version"),
                "content_hash": v.get("content_hash"),
                "published_at": v.get("published_at"),
                "published_by": v.get("published_by"),
                "notes": v.get("notes"),
                "block_count": len(v.get("blocks", []))
            })

        return {"template_id": template_id, "name": template.get("name"), "versions": summary}

    # ── RENDER ──────────────────────────────────────────────────
    @router.post("/render")
    async def render_template_endpoint(
        data: dict,
        current_user: dict = Depends(get_current_user)
    ):
        """
        Render a template with injected data.
        Returns HTML (or ESCPOS commands in future).
        TEMPLATE_VIEW required.
        """
        template_id = data.get("template_id")
        venue_id = data.get("venue_id")
        if not template_id or not venue_id:
            raise HTTPException(status_code=400, detail="template_id and venue_id required")

        perms = await _get_perms(current_user, venue_id)
        if "TEMPLATE_VIEW" not in perms:
            raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "No access to templates"})

        template = await db.templates.find_one({"id": template_id}, {"_id": 0})
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")

        result = await render_template(
            db=db,
            template_doc=template,
            data=data.get("data", {}),
            version=data.get("version"),
            order_id=data.get("order_id"),
            venue_id=venue_id,
            output_format=data.get("output_format", "html"),
            debug=False
        )

        return result

    # ── RENDER DEBUG ────────────────────────────────────────────
    @router.post("/render-debug")
    async def render_debug_endpoint(
        data: dict,
        current_user: dict = Depends(get_current_user)
    ):
        """
        Debug render — includes diagnostics info.
        TEMPLATE_RENDER_DEBUG required.
        """
        venue_id = data.get("venue_id")
        if not venue_id:
            raise HTTPException(status_code=400, detail="venue_id required")

        perms = await _get_perms(current_user, venue_id)
        if "TEMPLATE_RENDER_DEBUG" not in perms:
            raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "No access to render debug"})

        template_id = data.get("template_id")
        template = await db.templates.find_one({"id": template_id}, {"_id": 0})
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")

        result = await render_template(
            db=db,
            template_doc=template,
            data=data.get("data", {}),
            version=data.get("version"),
            order_id=data.get("order_id"),
            venue_id=venue_id,
            output_format=data.get("output_format", "html"),
            debug=True
        )

        return result

    # ── DUPLICATE ───────────────────────────────────────────────
    @router.post("/{template_id}/duplicate")
    async def duplicate_template(
        template_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Duplicate a template as a new DRAFT (TEMPLATE_EDIT required)"""
        template = await db.templates.find_one({"id": template_id}, {"_id": 0})
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")

        perms = await _get_perms(current_user, template["venue_id"])
        if "TEMPLATE_EDIT" not in perms:
            raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "No permission to create templates"})

        now = datetime.now(timezone.utc).isoformat()
        new_doc = {
            "id": str(uuid4()),
            "venue_id": template["venue_id"],
            "name": f"{template.get('name', 'Template')} (Copy)",
            "description": template.get("description", ""),
            "type": template.get("type", "receipt"),
            "status": "draft",
            "schema_version": template.get("schema_version", 1),
            "blocks": template.get("blocks", []),
            "paper_profile": template.get("paper_profile", {}),
            "variables_schema": template.get("variables_schema", {}),
            "current_version": 0,
            "versions": [],
            "has_fiscal_block": template.get("has_fiscal_block", False),
            "tags": template.get("tags", []),
            "created_at": now,
            "updated_at": now,
            "created_by": current_user.get("id", ""),
            "updated_by": current_user.get("id", "")
        }

        await db.templates.insert_one(new_doc)
        return new_doc

    return router
