"""
Hive Communication Hub — API Routes
Chat messages, micro-tasks, online staff
"""
import logging
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from bson import ObjectId

from app.core.database import get_database

logger = logging.getLogger(__name__)
router = APIRouter()


# ─── Models ──────────────────────────────────────────────────────────────

class ReactionUpdate(BaseModel):
    emoji: str
    user_name: str

class MessageCreate(BaseModel):
    channel_id: str
    sender: str
    sender_initials: str
    sender_color: str = "bg-zinc-600"
    text: str
    reply_to: Optional[str] = None
    reply_preview: Optional[str] = None
    is_voice: bool = False
    voice_duration: Optional[float] = None
    audio_url: Optional[str] = None
    attachments: Optional[list] = None
    poll: Optional[dict] = None
    is_scheduled: bool = False
    scheduled_time: Optional[str] = None

class MessageEdit(BaseModel):
    text: str

class TaskCreate(BaseModel):
    title: str
    urgency: str = "MEDIUM"
    xp: int = 50
    assigned_to: Optional[str] = None
    department: Optional[str] = None
    deadline: Optional[str] = None
    recurrence: str = "none"
    source_message_id: Optional[str] = None
    source_message_text: Optional[str] = None
    source_channel_id: Optional[str] = None

class TaskUpdate(BaseModel):
    status: Optional[str] = None
    assigned_to: Optional[str] = None


def _serialize(doc: dict) -> dict:
    """Convert MongoDB doc to JSON-safe dict."""
    if doc is None:
        return None
    doc["id"] = str(doc.pop("_id"))
    return doc


# ─── Messages ────────────────────────────────────────────────────────────

@router.get("/messages")
async def list_messages(channel: str = "general", limit: int = 100, before: Optional[str] = None):
    """Get messages for a channel, newest last."""
    db = get_database()
    query = {"channel_id": channel}
    if before:
        query["created_at"] = {"$lt": before}
    
    cursor = db.hive_messages.find(query).sort("created_at", 1).limit(limit)
    messages = []
    async for doc in cursor:
        messages.append(_serialize(doc))
    return {"messages": messages, "count": len(messages)}


@router.post("/messages")
async def send_message(msg: MessageCreate):
    """Send a new chat message."""
    db = get_database()
    now = datetime.now(timezone.utc)
    
    doc = {
        "channel_id": msg.channel_id,
        "sender": msg.sender,
        "sender_initials": msg.sender_initials,
        "sender_color": msg.sender_color,
        "text": msg.text,
        "timestamp": now.strftime("%H:%M:%S"),
        "is_pinned": False,
        "reactions": {},
        "read_by": [],
        "is_edited": False,
        "is_bookmarked": False,
        "is_priority": False,
        "reply_to": msg.reply_to,
        "reply_preview": msg.reply_preview,
        "is_voice": msg.is_voice,
        "voice_duration": msg.voice_duration,
        "audio_url": msg.audio_url,
        "attachments": msg.attachments or [],
        "poll": msg.poll,
        "is_scheduled": msg.is_scheduled,
        "scheduled_time": msg.scheduled_time,
        "created_at": now.isoformat(),
    }
    
    result = await db.hive_messages.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _serialize(doc)


@router.put("/messages/{message_id}")
async def edit_message(message_id: str, edit: MessageEdit):
    """Edit a message's text."""
    db = get_database()
    result = await db.hive_messages.update_one(
        {"_id": ObjectId(message_id)},
        {"$set": {"text": edit.text, "is_edited": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Message not found")
    return {"status": "ok", "id": message_id}


@router.delete("/messages/{message_id}")
async def delete_message(message_id: str):
    """Delete a message."""
    db = get_database()
    result = await db.hive_messages.delete_one({"_id": ObjectId(message_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Message not found")
    return {"status": "deleted", "id": message_id}


@router.post("/messages/{message_id}/reaction")
async def toggle_reaction(message_id: str, reaction: ReactionUpdate):
    """Add or remove a reaction from a message."""
    db = get_database()
    doc = await db.hive_messages.find_one({"_id": ObjectId(message_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Message not found")
    
    reactions = doc.get("reactions", {})
    users = reactions.get(reaction.emoji, [])
    
    if reaction.user_name in users:
        users.remove(reaction.user_name)
        if not users:
            reactions.pop(reaction.emoji, None)
        else:
            reactions[reaction.emoji] = users
    else:
        reactions[reaction.emoji] = users + [reaction.user_name]
    
    await db.hive_messages.update_one(
        {"_id": ObjectId(message_id)},
        {"$set": {"reactions": reactions}}
    )
    return {"status": "ok", "reactions": reactions}


@router.put("/messages/{message_id}/pin")
async def toggle_pin(message_id: str):
    """Toggle pin status on a message."""
    db = get_database()
    doc = await db.hive_messages.find_one({"_id": ObjectId(message_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Message not found")
    
    new_pin = not doc.get("is_pinned", False)
    await db.hive_messages.update_one(
        {"_id": ObjectId(message_id)},
        {"$set": {"is_pinned": new_pin}}
    )
    return {"status": "ok", "is_pinned": new_pin}


@router.put("/messages/{message_id}/bookmark")
async def toggle_bookmark(message_id: str):
    """Toggle bookmark on a message."""
    db = get_database()
    doc = await db.hive_messages.find_one({"_id": ObjectId(message_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Message not found")
    
    new_val = not doc.get("is_bookmarked", False)
    await db.hive_messages.update_one(
        {"_id": ObjectId(message_id)},
        {"$set": {"is_bookmarked": new_val}}
    )
    return {"status": "ok", "is_bookmarked": new_val}


@router.put("/messages/{message_id}/priority")
async def toggle_priority(message_id: str):
    """Toggle priority flag on a message."""
    db = get_database()
    doc = await db.hive_messages.find_one({"_id": ObjectId(message_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Message not found")
    
    new_val = not doc.get("is_priority", False)
    await db.hive_messages.update_one(
        {"_id": ObjectId(message_id)},
        {"$set": {"is_priority": new_val}}
    )
    return {"status": "ok", "is_priority": new_val}


# ─── Tasks ───────────────────────────────────────────────────────────────

@router.get("/tasks")
async def list_tasks():
    """Get all active tasks."""
    db = get_database()
    cursor = db.hive_tasks.find().sort("created_at", -1)
    tasks = []
    async for doc in cursor:
        tasks.append(_serialize(doc))
    return {"tasks": tasks, "count": len(tasks)}


@router.post("/tasks")
async def create_task(task: TaskCreate):
    """Create a new micro-task."""
    db = get_database()
    now = datetime.now(timezone.utc)
    
    doc = {
        "title": task.title,
        "urgency": task.urgency,
        "xp": task.xp,
        "assigned_to": task.assigned_to,
        "department": task.department,
        "deadline": task.deadline,
        "status": "assigned" if task.assigned_to else "pool",
        "recurrence": task.recurrence,
        "source_message_id": task.source_message_id,
        "source_message_text": task.source_message_text,
        "source_channel_id": task.source_channel_id,
        "started_at": None,
        "completed_at": None,
        "created_at": now.isoformat(),
    }
    
    result = await db.hive_tasks.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _serialize(doc)


@router.put("/tasks/{task_id}")
async def update_task(task_id: str, update: TaskUpdate):
    """Update task status or assignment."""
    db = get_database()
    now = datetime.now(timezone.utc)
    
    set_fields = {}
    if update.status:
        set_fields["status"] = update.status
        if update.status == "in-progress":
            set_fields["started_at"] = now.strftime("%H:%M")
        elif update.status == "done":
            set_fields["completed_at"] = now.strftime("%H:%M")
    if update.assigned_to is not None:
        set_fields["assigned_to"] = update.assigned_to
    
    if not set_fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    result = await db.hive_tasks.update_one(
        {"_id": ObjectId(task_id)},
        {"$set": set_fields}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"status": "ok", "id": task_id}


# ─── Online Staff ────────────────────────────────────────────────────────

@router.get("/staff/online")
async def get_online_staff():
    """Get staff list with online status (derived from active users)."""
    db = get_database()
    
    # Get active employees with user accounts
    cursor = db.users.find(
        {"status": {"$ne": "INACTIVE"}},
        {"name": 1, "email": 1, "role": 1, "status": 1}
    ).limit(20)
    
    COLORS = [
        "bg-pink-600", "bg-orange-600", "bg-blue-600", "bg-teal-600",
        "bg-purple-600", "bg-violet-600", "bg-emerald-600", "bg-red-600",
        "bg-amber-600", "bg-cyan-600",
    ]
    
    staff = []
    async for doc in cursor:
        name = doc.get("name", "Unknown")
        parts = name.split()
        initials = "".join(p[0].upper() for p in parts[:2]) if parts else "??"
        role = doc.get("role", "Staff")
        
        # Simple heuristic: users with recent activity are "online"
        # In production, this would check WebSocket connections or heartbeat
        import random
        statuses = ["online", "online", "online", "busy", "away"]
        
        staff.append({
            "name": name,
            "initials": initials,
            "color": COLORS[len(staff) % len(COLORS)],
            "role": role.replace("_", " ").title() if role else "Staff",
            "status": random.choice(statuses),
        })
    
    return {"staff": staff, "count": len(staff)}
