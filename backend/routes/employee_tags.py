"""
Employee Tagging / Grouping Routes
Based on Shireburn Indigo employee tagging feature:
- Create and manage tags (project teams, skill groups, etc.)
- Assign/remove tags from employees
- Filter employees by tags
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, List
from datetime import datetime, timezone
from pydantic import BaseModel
import uuid

from core.database import db
from core.dependencies import get_current_user, check_venue_access


class TagRequest(BaseModel):
    name: str
    color: str = "#00BFFF"
    description: str = ""
    category: str = "general"  # general, project, skill, department, location


def create_employee_tags_router():
    router = APIRouter(tags=["employee_tags"])

    # ── Tag CRUD ──────────────────────────────────────
    @router.post("/venues/{venue_id}/hr/tags")
    async def create_tag(
        venue_id: str,
        tag_data: TagRequest,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        tag = {
            "id": f"tag-{uuid.uuid4().hex[:8]}",
            "venue_id": venue_id,
            "name": tag_data.name,
            "color": tag_data.color,
            "description": tag_data.description,
            "category": tag_data.category,
            "employee_count": 0,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.hr_tags.insert_one(tag)
        return tag

    @router.get("/venues/{venue_id}/hr/tags")
    async def list_tags(
        venue_id: str,
        category: Optional[str] = None,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        query = {"venue_id": venue_id}
        if category:
            query["category"] = category
        return await db.hr_tags.find(query, {"_id": 0}).sort("name", 1).to_list(200)

    @router.delete("/venues/{venue_id}/hr/tags/{tag_id}")
    async def delete_tag(
        venue_id: str,
        tag_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        await db.hr_tags.delete_one({"id": tag_id, "venue_id": venue_id})
        # Also remove from all employees
        await db.employees.update_many(
            {"venue_id": venue_id},
            {"$pull": {"tags": tag_id}}
        )
        return {"message": "Tag deleted"}

    # ── Tag Assignment ────────────────────────────────
    @router.post("/venues/{venue_id}/hr/employees/{employee_id}/tags/{tag_id}")
    async def assign_tag(
        venue_id: str,
        employee_id: str,
        tag_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        await db.employees.update_one(
            {"id": employee_id, "venue_id": venue_id},
            {"$addToSet": {"tags": tag_id}}
        )
        await db.hr_tags.update_one(
            {"id": tag_id, "venue_id": venue_id},
            {"$inc": {"employee_count": 1}}
        )
        return {"message": "Tag assigned"}

    @router.delete("/venues/{venue_id}/hr/employees/{employee_id}/tags/{tag_id}")
    async def remove_tag(
        venue_id: str,
        employee_id: str,
        tag_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        await db.employees.update_one(
            {"id": employee_id, "venue_id": venue_id},
            {"$pull": {"tags": tag_id}}
        )
        await db.hr_tags.update_one(
            {"id": tag_id, "venue_id": venue_id},
            {"$inc": {"employee_count": -1}}
        )
        return {"message": "Tag removed"}

    @router.get("/venues/{venue_id}/hr/employees/by-tag/{tag_id}")
    async def get_employees_by_tag(
        venue_id: str,
        tag_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        employees = await db.employees.find(
            {"venue_id": venue_id, "tags": tag_id},
            {"_id": 0, "id": 1, "full_name": 1, "name": 1, "occupation": 1, "department": 1, "tags": 1}
        ).to_list(500)
        return employees

    return router
