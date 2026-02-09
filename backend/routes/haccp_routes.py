from fastapi import APIRouter, Depends, HTTPException, Body
from typing import Dict, Any
from core.database import db
from core.dependencies import get_current_user
from datetime import datetime, timezone
from uuid import uuid4
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/haccp", tags=["Compliance (Pillar 7)"])


@router.get("/templates")
async def list_templates(venue_id: str):
    """List HACCP checklist templates for a venue"""
    templates = await db.haccp_templates.find(
        {"venue_id": venue_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return templates


@router.post("/templates")
async def create_template(
    venue_id: str,
    payload: Dict[str, Any] = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """Create a new HACCP checklist template"""
    template = {
        "id": str(uuid4()),
        "venue_id": venue_id,
        "name": payload.get("name", "Untitled Checklist"),
        "category": payload.get("category", "general"),
        "frequency": payload.get("frequency", "daily"),
        "items": payload.get("items", []),
        "is_active": True,
        "created_by": current_user.get("id"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.haccp_templates.insert_one(template)
    logger.info("HACCP template created: %s for venue %s", template["id"], venue_id)
    template.pop("_id", None)
    return template


@router.get("/logs")
async def list_logs(venue_id: str, limit: int = 50):
    """List completed HACCP checklist submissions"""
    logs = await db.haccp_logs.find(
        {"venue_id": venue_id}, {"_id": 0}
    ).sort("completed_at", -1).to_list(limit)
    return logs


@router.post("/logs")
async def submit_log(
    venue_id: str,
    payload: Dict[str, Any] = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """Submit a completed HACCP checklist"""
    items = payload.get("items", [])
    passed = sum(1 for i in items if i.get("passed", False))

    log_entry = {
        "id": str(uuid4()),
        "venue_id": venue_id,
        "template_id": payload.get("template_id"),
        "template_name": payload.get("template_name", ""),
        "items": items,
        "total_items": len(items),
        "passed_items": passed,
        "compliance_score": round((passed / len(items) * 100) if items else 0, 1),
        "status": "pass" if passed == len(items) else "fail",
        "notes": payload.get("notes", ""),
        "completed_by": current_user.get("id"),
        "completed_at": datetime.now(timezone.utc).isoformat()
    }
    await db.haccp_logs.insert_one(log_entry)
    logger.info("HACCP log submitted: %s score=%.1f%% venue=%s",
                log_entry["id"], log_entry["compliance_score"], venue_id)
    log_entry.pop("_id", None)
    return log_entry


@router.post("/seed")
async def seed_haccp(
    venue_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Seed demo HACCP templates and logs"""
    now = datetime.now(timezone.utc).isoformat()

    templates = [
        {
            "id": str(uuid4()), "venue_id": venue_id, "name": "Morning Opening Checks",
            "category": "temperature", "frequency": "daily", "is_active": True,
            "items": [
                {"id": "1", "label": "Fridge temperature ≤ 5°C", "type": "temp_check", "target_min": 0, "target_max": 5},
                {"id": "2", "label": "Freezer temperature ≤ -18°C", "type": "temp_check", "target_min": -25, "target_max": -18},
                {"id": "3", "label": "Hot hold unit ≥ 63°C", "type": "temp_check", "target_min": 63, "target_max": 100},
                {"id": "4", "label": "Hand wash stations stocked", "type": "yes_no"},
                {"id": "5", "label": "Pest control bait stations checked", "type": "yes_no"},
            ],
            "created_by": current_user.get("id"), "created_at": now
        },
        {
            "id": str(uuid4()), "venue_id": venue_id, "name": "Delivery Inspection",
            "category": "receiving", "frequency": "per_delivery", "is_active": True,
            "items": [
                {"id": "1", "label": "Supplier temperature log present", "type": "yes_no"},
                {"id": "2", "label": "Chilled goods ≤ 5°C on arrival", "type": "temp_check", "target_min": 0, "target_max": 5},
                {"id": "3", "label": "Packaging intact & labels correct", "type": "yes_no"},
                {"id": "4", "label": "Use-by dates acceptable", "type": "yes_no"},
            ],
            "created_by": current_user.get("id"), "created_at": now
        },
        {
            "id": str(uuid4()), "venue_id": venue_id, "name": "Closing Cleaning Schedule",
            "category": "cleaning", "frequency": "daily", "is_active": True,
            "items": [
                {"id": "1", "label": "All surfaces sanitised", "type": "yes_no"},
                {"id": "2", "label": "Floors swept & mopped", "type": "yes_no"},
                {"id": "3", "label": "Waste bins emptied", "type": "yes_no"},
                {"id": "4", "label": "Equipment cleaned & stored", "type": "yes_no"},
            ],
            "created_by": current_user.get("id"), "created_at": now
        }
    ]

    for t in templates:
        await db.haccp_templates.update_one({"id": t["id"]}, {"$set": t}, upsert=True)

    # Seed sample logs
    logs = [
        {
            "id": str(uuid4()), "venue_id": venue_id, "template_id": templates[0]["id"],
            "template_name": "Morning Opening Checks",
            "items": [
                {"label": "Fridge temperature ≤ 5°C", "passed": True, "value": "3.8°C"},
                {"label": "Freezer temperature ≤ -18°C", "passed": True, "value": "-20.1°C"},
                {"label": "Hot hold unit ≥ 63°C", "passed": True, "value": "65.2°C"},
                {"label": "Hand wash stations stocked", "passed": True, "value": "Yes"},
                {"label": "Pest control bait stations checked", "passed": True, "value": "Yes"},
            ],
            "total_items": 5, "passed_items": 5, "compliance_score": 100.0,
            "status": "pass", "completed_by": current_user.get("id"), "completed_at": now
        },
        {
            "id": str(uuid4()), "venue_id": venue_id, "template_id": templates[1]["id"],
            "template_name": "Delivery Inspection",
            "items": [
                {"label": "Supplier temperature log present", "passed": True, "value": "Yes"},
                {"label": "Chilled goods ≤ 5°C on arrival", "passed": False, "value": "8.3°C"},
                {"label": "Packaging intact & labels correct", "passed": True, "value": "Yes"},
                {"label": "Use-by dates acceptable", "passed": True, "value": "Yes"},
            ],
            "total_items": 4, "passed_items": 3, "compliance_score": 75.0,
            "status": "fail", "completed_by": current_user.get("id"), "completed_at": now
        },
    ]

    for l in logs:
        await db.haccp_logs.update_one({"id": l["id"]}, {"$set": l}, upsert=True)

    logger.info("HACCP data seeded for venue %s", venue_id)
    return {"status": "seeded", "templates": len(templates), "logs": len(logs)}
