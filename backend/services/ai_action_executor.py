"""
AI Action Executor — Centralized Action Execution
===================================================
All Hey Rin actions pass through this single point for:
  1. Role-based permission check
  2. Execution against MongoDB
  3. Audit trail logging

Handlers return { "success": bool, "message": str, "data": dict }
"""

import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from uuid import uuid4
from core.database import get_database
from services.role_access import get_role_tier

logger = logging.getLogger(__name__)


# ─── ACTION REGISTRY ────────────────────────────────────────────

ACTION_METADATA = {
    "task_create": {
        "label": "Create Task",
        "sensitivity": "normal",
        "min_role": "staff",
        "icon": "📋",
    },
    "task_update": {
        "label": "Update Task",
        "sensitivity": "normal",
        "min_role": "staff",
        "icon": "✅",
    },
    "hive_send": {
        "label": "Send Hive Message",
        "sensitivity": "normal",
        "min_role": "staff",
        "icon": "💬",
    },
    "table_assign": {
        "label": "Assign Table",
        "sensitivity": "normal",
        "min_role": "staff",
        "icon": "🪑",
    },
    "announcement": {
        "label": "Send Announcement",
        "sensitivity": "normal",
        "min_role": "manager",
        "icon": "📢",
    },
    "order_comp": {
        "label": "Comp Item",
        "sensitivity": "sensitive",
        "min_role": "manager",
        "icon": "🎁",
    },
}

ROLE_HIERARCHY = ["staff", "supervisor", "manager", "admin", "super_admin", "product_owner"]


def _role_gte(user_role: str, min_role: str) -> bool:
    """Check if user_role is >= min_role in the hierarchy."""
    try:
        return ROLE_HIERARCHY.index(user_role) >= ROLE_HIERARCHY.index(min_role)
    except ValueError:
        return False


# ─── MAIN EXECUTOR ──────────────────────────────────────────────

async def execute_action(
    action_type: str,
    params: Dict[str, Any],
    user: dict,
    venue_id: str,
) -> Dict[str, Any]:
    """
    Execute a confirmed action. Returns success/failure with message.
    All mutations are audit-logged.
    """
    db = get_database()
    meta = ACTION_METADATA.get(action_type)

    if not meta:
        return {"success": False, "message": f"Unknown action type: {action_type}"}

    # Role check
    role_tier = get_role_tier(user)
    if not _role_gte(role_tier, meta["min_role"]):
        return {
            "success": False,
            "message": f"🔒 Bu işlem için en az **{meta['min_role']}** yetkisi gerekli.",
        }

    # Dispatch to handler
    handler = _HANDLERS.get(action_type)
    if not handler:
        return {"success": False, "message": "Action handler not implemented."}

    try:
        result = await handler(db, venue_id, params, user)
    except Exception as e:
        logger.error("Action execution failed: %s — %s", action_type, e)
        result = {"success": False, "message": f"⚠️ İşlem başarısız: {str(e)}"}

    # Audit log (fire-and-forget)
    try:
        await db.ai_action_logs.insert_one({
            "id": str(uuid4()),
            "venue_id": venue_id,
            "user_id": user.get("id", ""),
            "user_name": user.get("name", user.get("full_name", "")),
            "user_role": role_tier,
            "action_type": action_type,
            "params": params,
            "success": result.get("success", False),
            "message": result.get("message", ""),
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    except Exception:
        pass

    return result


# ─── ACTION HANDLERS ────────────────────────────────────────────

async def _exec_task_create(
    db, venue_id: str, params: Dict[str, Any], user: dict
) -> Dict[str, Any]:
    """Create a task in the tasks collection."""
    title = params.get("title", "").strip()
    if not title:
        return {"success": False, "message": "Task title is required."}

    assignee = params.get("assignee", "")
    priority = params.get("priority", "medium")

    # Try to find assignee by name
    assignee_id = ""
    assignee_name = assignee
    if assignee:
        emp = await db.employees.find_one(
            {"venue_id": venue_id, "full_name": {"$regex": assignee, "$options": "i"}},
            {"_id": 0, "id": 1, "full_name": 1},
        )
        if emp:
            assignee_id = emp.get("id", "")
            assignee_name = emp.get("full_name", assignee)

    task_id = str(uuid4())
    task_doc = {
        "id": task_id,
        "venue_id": venue_id,
        "title": title,
        "description": params.get("description", ""),
        "status": "todo",
        "priority": priority,
        "assignee_id": assignee_id,
        "assignee_name": assignee_name,
        "created_by": user.get("id", ""),
        "created_by_name": user.get("name", user.get("full_name", "")),
        "source": "hey_rin",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    await db.tasks.insert_one(task_doc)

    msg = f"📋 Task oluşturuldu: **{title}**"
    if assignee_name:
        msg += f"\nAtanan: **{assignee_name}**"
    msg += f"\nID: `{task_id[:8]}`"

    return {"success": True, "message": msg, "data": {"task_id": task_id}}


async def _exec_task_update(
    db, venue_id: str, params: Dict[str, Any], user: dict
) -> Dict[str, Any]:
    """Update a task status by fuzzy name match."""
    task_query = params.get("task_name", "").strip()
    new_status = params.get("status", "done")

    if not task_query:
        return {"success": False, "message": "Task name is required."}

    # Find task by fuzzy title match
    task = await db.tasks.find_one(
        {
            "venue_id": venue_id,
            "title": {"$regex": task_query, "$options": "i"},
            "status": {"$nin": ["done", "cancelled"]},
        },
        {"_id": 0, "id": 1, "title": 1, "status": 1},
    )

    if not task:
        return {"success": False, "message": f"'{task_query}' ile eşleşen aktif görev bulunamadı."}

    status_map = {
        "done": "done", "complete": "done", "tamamla": "done", "bitir": "done",
        "cancel": "cancelled", "iptal": "cancelled",
        "progress": "in_progress", "başla": "in_progress",
    }
    final_status = status_map.get(new_status.lower(), new_status)

    await db.tasks.update_one(
        {"id": task["id"]},
        {"$set": {
            "status": final_status,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": user.get("id", ""),
        }},
    )

    status_emoji = {"done": "✅", "cancelled": "❌", "in_progress": "🔄"}.get(final_status, "📋")
    return {
        "success": True,
        "message": f"{status_emoji} **{task['title']}** → `{final_status}`",
        "data": {"task_id": task["id"], "new_status": final_status},
    }


async def _exec_hive_send(
    db, venue_id: str, params: Dict[str, Any], user: dict
) -> Dict[str, Any]:
    """Send a message to Hive Chat."""
    message = params.get("message", "").strip()
    channel = params.get("channel", "general")
    recipient_name = params.get("recipient", "")

    if not message:
        return {"success": False, "message": "Message content is required."}

    msg_id = str(uuid4())
    msg_doc = {
        "id": msg_id,
        "venue_id": venue_id,
        "channel": channel,
        "sender_id": user.get("id", ""),
        "sender_name": user.get("name", user.get("full_name", "")),
        "content": message,
        "type": "text",
        "source": "hey_rin",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    # If DM, find recipient
    if recipient_name:
        emp = await db.employees.find_one(
            {"venue_id": venue_id, "full_name": {"$regex": recipient_name, "$options": "i"}},
            {"_id": 0, "id": 1, "full_name": 1},
        )
        if emp:
            msg_doc["recipient_id"] = emp.get("id", "")
            msg_doc["recipient_name"] = emp.get("full_name", recipient_name)
            msg_doc["channel"] = "dm"

    await db.hive_messages.insert_one(msg_doc)

    target = f"**#{channel}**" if not recipient_name else f"**{recipient_name}**"
    return {
        "success": True,
        "message": f"💬 Mesaj gönderildi → {target}\n> {message[:100]}",
        "data": {"message_id": msg_id},
    }


async def _exec_table_assign(
    db, venue_id: str, params: Dict[str, Any], user: dict
) -> Dict[str, Any]:
    """Assign a server to a table."""
    table_number = params.get("table_number")
    server_name = params.get("server_name", "").strip()

    if not table_number:
        return {"success": False, "message": "Table number is required."}

    # Find the table
    table = await db.tables.find_one(
        {"venue_id": venue_id, "$or": [
            {"number": table_number},
            {"number": str(table_number)},
            {"label": {"$regex": str(table_number), "$options": "i"}},
        ]},
        {"_id": 0, "id": 1, "number": 1, "label": 1},
    )

    if not table:
        return {"success": False, "message": f"Masa {table_number} bulunamadı."}

    # Find server by name
    server_id = ""
    if server_name:
        emp = await db.employees.find_one(
            {"venue_id": venue_id, "full_name": {"$regex": server_name, "$options": "i"}},
            {"_id": 0, "id": 1, "full_name": 1},
        )
        if emp:
            server_id = emp.get("id", "")
            server_name = emp.get("full_name", server_name)

    await db.tables.update_one(
        {"id": table["id"]},
        {"$set": {
            "assigned_server_id": server_id,
            "assigned_server_name": server_name,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
    )

    label = table.get("label") or table.get("number", table_number)
    return {
        "success": True,
        "message": f"🪑 Masa **{label}** → **{server_name or 'unassigned'}**",
        "data": {"table_id": table["id"]},
    }


async def _exec_announcement(
    db, venue_id: str, params: Dict[str, Any], user: dict
) -> Dict[str, Any]:
    """Broadcast an announcement to all staff."""
    message = params.get("message", "").strip()
    if not message:
        return {"success": False, "message": "Announcement text is required."}

    ann_id = str(uuid4())
    await db.hive_messages.insert_one({
        "id": ann_id,
        "venue_id": venue_id,
        "channel": "announcements",
        "sender_id": user.get("id", ""),
        "sender_name": user.get("name", user.get("full_name", "")),
        "content": f"📢 **DUYURU:** {message}",
        "type": "announcement",
        "source": "hey_rin",
        "pinned": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    return {
        "success": True,
        "message": f"📢 Duyuru yayınlandı:\n> {message[:150]}",
        "data": {"announcement_id": ann_id},
    }


async def _exec_order_comp(
    db, venue_id: str, params: Dict[str, Any], user: dict
) -> Dict[str, Any]:
    """Comp (complimentary) an item on a table's order."""
    table_number = params.get("table_number")
    item_name = params.get("item_name", "").strip()
    reason = params.get("reason", "Manager comp via Hey Rin")

    if not table_number or not item_name:
        return {"success": False, "message": "Table number and item name are required."}

    # Find active order for this table
    order = await db.orders.find_one(
        {
            "venue_id": venue_id,
            "table_number": {"$in": [table_number, str(table_number)]},
            "status": {"$in": ["open", "active", "in_progress"]},
        },
        {"_id": 0, "id": 1, "items": 1, "table_number": 1},
    )

    if not order:
        return {"success": False, "message": f"Masa {table_number}'de açık sipariş bulunamadı."}

    # Find item in order
    items = order.get("items", [])
    found_item = None
    for item in items:
        name = item.get("name", "")
        if item_name.lower() in name.lower():
            found_item = item
            break

    if not found_item:
        return {"success": False, "message": f"'{item_name}' siparişte bulunamadı."}

    # Log the comp
    comp_id = str(uuid4())
    await db.comps.insert_one({
        "id": comp_id,
        "venue_id": venue_id,
        "order_id": order["id"],
        "table_number": str(table_number),
        "item_name": found_item.get("name", item_name),
        "item_price": found_item.get("price", 0),
        "reason": reason,
        "comped_by": user.get("id", ""),
        "comped_by_name": user.get("name", user.get("full_name", "")),
        "source": "hey_rin",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    price = found_item.get("price", 0) / 100
    return {
        "success": True,
        "message": (
            f"🎁 Comp kaydedildi:\n"
            f"- Masa: **{table_number}**\n"
            f"- Ürün: **{found_item.get('name', item_name)}**\n"
            f"- Tutar: **€{price:.2f}**\n"
            f"- Sebep: {reason}"
        ),
        "data": {"comp_id": comp_id, "order_id": order["id"]},
    }


# ─── HANDLER MAP ────────────────────────────────────────────────

_HANDLERS = {
    "task_create": _exec_task_create,
    "task_update": _exec_task_update,
    "hive_send": _exec_hive_send,
    "table_assign": _exec_table_assign,
    "announcement": _exec_announcement,
    "order_comp": _exec_order_comp,
}
