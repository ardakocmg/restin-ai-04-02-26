"""
HR Onboarding / Offboarding Task Management Routes
Based on Shireburn Indigo Task Management feature:
- Custom checklist templates for onboarding/offboarding
- Task assignment with reminders and due dates
- Progress tracking per employee
- Document association
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, List
from datetime import datetime, timezone
from pydantic import BaseModel
import uuid

from core.database import db
from core.dependencies import get_current_user, check_venue_access


class ChecklistItem(BaseModel):
    title: str
    description: str = ""
    assignee_role: str = "hr"  # hr, manager, employee, it, finance
    due_days_offset: int = 0  # days after trigger date
    required_document: Optional[str] = None

class ChecklistTemplateRequest(BaseModel):
    name: str
    template_type: str  # onboarding, offboarding, probation_review, contract_renewal
    items: List[ChecklistItem] = []

class ActivateChecklistRequest(BaseModel):
    template_id: str
    employee_id: str
    employee_name: str
    trigger_date: str  # e.g. start_date or termination_date


def create_hr_onboarding_router():
    router = APIRouter(tags=["hr_onboarding"])

    # ═══════════════════════════════════════════════════════
    # CHECKLIST TEMPLATES
    # ═══════════════════════════════════════════════════════

    @router.post("/venues/{venue_id}/hr/checklist-templates")
    async def create_checklist_template(
        venue_id: str,
        template_data: ChecklistTemplateRequest,
        current_user: dict = Depends(get_current_user)
    ):
        """Create a reusable checklist template."""
        await check_venue_access(current_user, venue_id)

        template = {
            "id": f"tpl-{uuid.uuid4().hex[:12]}",
            "venue_id": venue_id,
            "name": template_data.name,
            "template_type": template_data.template_type,
            "items": [item.model_dump() for item in template_data.items],
            "created_by": current_user["id"],
            "created_at": datetime.now(timezone.utc).isoformat()
        }

        await db.hr_checklist_templates.insert_one(template)
        return template

    @router.get("/venues/{venue_id}/hr/checklist-templates")
    async def list_checklist_templates(
        venue_id: str,
        template_type: Optional[str] = None,
        current_user: dict = Depends(get_current_user)
    ):
        """List all checklist templates."""
        await check_venue_access(current_user, venue_id)

        query = {"venue_id": venue_id}
        if template_type:
            query["template_type"] = template_type

        templates = await db.hr_checklist_templates.find(query, {"_id": 0}).to_list(100)
        return templates

    @router.delete("/venues/{venue_id}/hr/checklist-templates/{template_id}")
    async def delete_checklist_template(
        venue_id: str,
        template_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Delete a checklist template."""
        await check_venue_access(current_user, venue_id)
        await db.hr_checklist_templates.delete_one({"id": template_id, "venue_id": venue_id})
        return {"message": "Template deleted"}

    # ═══════════════════════════════════════════════════════
    # ACTIVE CHECKLISTS (per employee)
    # ═══════════════════════════════════════════════════════

    @router.post("/venues/{venue_id}/hr/checklists/activate")
    async def activate_checklist(
        venue_id: str,
        data: ActivateChecklistRequest,
        current_user: dict = Depends(get_current_user)
    ):
        """Activate a checklist template for a specific employee."""
        await check_venue_access(current_user, venue_id)

        template = await db.hr_checklist_templates.find_one(
            {"id": data.template_id, "venue_id": venue_id}, {"_id": 0}
        )
        if not template:
            raise HTTPException(404, "Template not found")

        # Create tasks from template items
        tasks = []
        for item in template.get("items", []):
            tasks.append({
                "id": f"task-{uuid.uuid4().hex[:8]}",
                "title": item["title"],
                "description": item.get("description", ""),
                "assignee_role": item.get("assignee_role", "hr"),
                "due_days_offset": item.get("due_days_offset", 0),
                "required_document": item.get("required_document"),
                "completed": False,
                "completed_by": None,
                "completed_at": None
            })

        checklist = {
            "id": f"cl-{uuid.uuid4().hex[:12]}",
            "venue_id": venue_id,
            "template_id": data.template_id,
            "template_name": template["name"],
            "template_type": template["template_type"],
            "employee_id": data.employee_id,
            "employee_name": data.employee_name,
            "trigger_date": data.trigger_date,
            "tasks": tasks,
            "progress": 0,
            "total_tasks": len(tasks),
            "status": "in_progress",
            "created_by": current_user["id"],
            "created_at": datetime.now(timezone.utc).isoformat()
        }

        await db.hr_active_checklists.insert_one(checklist)
        return checklist

    @router.get("/venues/{venue_id}/hr/checklists")
    async def list_active_checklists(
        venue_id: str,
        status: Optional[str] = None,
        employee_id: Optional[str] = None,
        template_type: Optional[str] = None,
        current_user: dict = Depends(get_current_user)
    ):
        """List all active checklists."""
        await check_venue_access(current_user, venue_id)

        query = {"venue_id": venue_id}
        if status:
            query["status"] = status
        if employee_id:
            query["employee_id"] = employee_id
        if template_type:
            query["template_type"] = template_type

        checklists = await db.hr_active_checklists.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
        return checklists

    @router.put("/venues/{venue_id}/hr/checklists/{checklist_id}/tasks/{task_id}/complete")
    async def complete_task(
        venue_id: str,
        checklist_id: str,
        task_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Mark a task as completed."""
        await check_venue_access(current_user, venue_id)

        checklist = await db.hr_active_checklists.find_one(
            {"id": checklist_id, "venue_id": venue_id}, {"_id": 0}
        )
        if not checklist:
            raise HTTPException(404, "Checklist not found")

        tasks = checklist.get("tasks", [])
        completed_count = 0
        for task in tasks:
            if task["id"] == task_id:
                task["completed"] = True
                task["completed_by"] = current_user["id"]
                task["completed_at"] = datetime.now(timezone.utc).isoformat()
            if task["completed"]:
                completed_count += 1

        total = len(tasks)
        progress = round(completed_count / max(total, 1) * 100)
        status = "completed" if completed_count == total else "in_progress"

        await db.hr_active_checklists.update_one(
            {"id": checklist_id, "venue_id": venue_id},
            {"$set": {"tasks": tasks, "progress": progress, "status": status}}
        )

        return {"message": "Task completed", "progress": progress, "status": status}

    return router
