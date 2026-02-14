"""Extended Task model with productization features — Unified Hive + Kanban"""
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
    status: str = "TODO"  # TODO | IN_PROGRESS | REVIEW | DONE
    priority: str = "MED"  # LOW | MED | HIGH | CRITICAL
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
    assignee: Optional[str] = None  # Display name for assignee
    department: Optional[str] = None
    tags: List[str] = []
    created_by: str = ""

    # ── Hive Gamification Fields ──────────────────────────────────────────
    xp: int = 0  # Experience points reward
    urgency: str = "MEDIUM"  # LOW | MEDIUM | HIGH | CRITICAL (Hive-style)
    recurrence: str = "none"  # none | daily | weekly | shift-start | shift-end
    source: str = "kanban"  # "kanban" | "hive" — origin of this task

    # ── Message Linking (Hive → Chat bidirectional) ───────────────────────
    source_message_id: Optional[str] = None
    source_message_text: Optional[str] = None
    source_channel_id: Optional[str] = None

    # ── Timestamps ────────────────────────────────────────────────────────
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class TaskTemplate(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    venue_id: str
    name: str
    defaults: dict = {}  # {"priority": "HIGH", "tags": [...], "checklist_items": [...]}
    created_by: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# ─── Status Mapping: Hive ↔ Kanban ──────────────────────────────────────
# Hive uses: pool, assigned, in-progress, done
# Kanban uses: TODO, IN_PROGRESS, REVIEW, DONE

HIVE_TO_KANBAN = {
    "pool": "TODO",
    "assigned": "TODO",
    "in-progress": "IN_PROGRESS",
    "done": "DONE",
}

KANBAN_TO_HIVE = {
    "TODO": "pool",
    "IN_PROGRESS": "in-progress",
    "REVIEW": "in-progress",
    "DONE": "done",
}

def to_kanban_status(hive_status: str) -> str:
    """Convert Hive status to Kanban status."""
    return HIVE_TO_KANBAN.get(hive_status, "TODO")

def to_hive_status(kanban_status: str, has_assignee: bool = False) -> str:
    """Convert Kanban status to Hive status."""
    s = KANBAN_TO_HIVE.get(kanban_status, "pool")
    if s == "pool" and has_assignee:
        return "assigned"
    return s

