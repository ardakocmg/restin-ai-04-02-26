"""Collab Tasks Routes - Productization"""
from fastapi import APIRouter, Depends, Query

from core.database import db
from core.dependencies import get_current_user, check_venue_access


def create_collab_tasks_router():
    router = APIRouter(tags=["collab_tasks"])

    @router.get("/collab/tasks/board")
    async def get_kanban_board(
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        # Server-authoritative columns
        columns = [
            {"key": "TODO", "title": "To Do"},
            {"key": "IN_PROGRESS", "title": "In Progress"},
            {"key": "REVIEW", "title": "Review"},
            {"key": "DONE", "title": "Done"}
        ]
        
        # Get all tasks (simplified - would use task model)
        tasks = await db.tasks.find(
            {"venue_id": venue_id},
            {"_id": 0}
        ).to_list(500)
        
        return {"ok": True, "data": {"columns": columns, "cards": tasks}}

    @router.get("/collab/task-templates")
    async def list_templates(
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        templates = await db.task_templates.find(
            {"venue_id": venue_id},
            {"_id": 0}
        ).to_list(100)
        
        return {"ok": True, "data": templates}

    return router
