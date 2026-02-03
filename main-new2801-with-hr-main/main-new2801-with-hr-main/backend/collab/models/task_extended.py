"""Extended Task model with productization features"""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone
from uuid import uuid4

class ChecklistItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    text: str
    done: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class TaskDependency(BaseModel):
    task_id: str
    type: str  # BLOCKS | RELATES | DUPLICATES

class TaskApproval(BaseModel):
    required: bool = False
    status: str = "NONE"  # NONE | PENDING | APPROVED | REJECTED
    approvers: List[str] = []

class TaskExtended(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    venue_id: str
    title: str
    description: str = ""
    status: str = "TODO"
    priority: str = "MED"
    view: str = "KANBAN"  # LIST | KANBAN | CALENDAR | TIMELINE
    checklist_items: List[ChecklistItem] = []
    dependencies: List[TaskDependency] = []
    start_at: Optional[str] = None
    estimate_minutes: Optional[int] = None
    actual_minutes: Optional[int] = None
    recurrence_rule: Optional[str] = None  # RRULE
    template_id: Optional[str] = None
    approval: TaskApproval = Field(default_factory=TaskApproval)
    assignee_id: str = ""
    tags: List[str] = []
    created_by: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class TaskTemplate(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    venue_id: str
    name: str
    defaults: dict = {}  # {"priority": "HIGH", "tags": [...], "checklist_items": [...]}
    created_by: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
