# KDS Service - Business logic for Kitchen Display System operations
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any, Tuple

logger = logging.getLogger(__name__)

async def update_ticket_status(
    db, 
    ticket_id: str, 
    new_status: str,
    user: dict,
    additional_fields: Dict[str, Any] = None
) -> Tuple[bool, Dict[str, Any]]:
    """
    Update KDS ticket status
    Returns: (success: bool, result: dict)
    """
    ticket = await db.kds_tickets.find_one({"id": ticket_id}, {"_id": 0})
    if not ticket:
        return False, {"code": "TICKET_NOT_FOUND", "message": "Ticket not found"}
    
    now = datetime.now(timezone.utc).isoformat()
    
    update_doc = {
        "status": new_status,
        "last_action_by": user["id"],
        "last_action_at": now,
        "updated_at": now
    }
    
    # Add status-specific fields
    if new_status == "PREPARING":
        update_doc["started_at"] = now
        update_doc["claimed_by"] = user["id"]
        update_doc["claimed_by_name"] = user["name"]
        update_doc["claimed_at"] = now
    
    elif new_status == "READY":
        update_doc["ready_at"] = now
    
    elif new_status == "DONE":
        update_doc["done_at"] = now
    
    elif new_status == "HELD":
        if additional_fields and "reason" in additional_fields:
            update_doc["hold_reason"] = additional_fields["reason"]
            update_doc["held_by"] = user["id"]
            update_doc["held_at"] = now
    
    # Merge additional fields if provided
    if additional_fields:
        update_doc.update(additional_fields)
    
    await db.kds_tickets.update_one(
        {"id": ticket_id},
        {"$set": update_doc}
    )
    
    return True, {
        "ok": True,
        "ticket_id": ticket_id,
        "new_status": new_status,
        "updated_at": now
    }


async def update_ticket_item_status(
    db,
    ticket_id: str,
    item_id: str,
    new_status: str,
    user: dict
) -> Tuple[bool, Dict[str, Any]]:
    """
    Update individual item status within a KDS ticket
    Returns: (success: bool, result: dict)
    """
    ticket = await db.kds_tickets.find_one({"id": ticket_id}, {"_id": 0})
    if not ticket:
        return False, {"code": "TICKET_NOT_FOUND", "message": "Ticket not found"}
    
    items = ticket.get("items", [])
    item_found = False
    now = datetime.now(timezone.utc).isoformat()
    
    for item in items:
        if item.get("item_id") == item_id:
            item["status"] = new_status
            
            if new_status == "PREPARING":
                item["started_at"] = now
            elif new_status == "READY":
                item["ready_at"] = now
            elif new_status == "DONE":
                item["done_at"] = now
            elif new_status == "HELD":
                item["held_at"] = now
            
            item_found = True
            break
    
    if not item_found:
        return False, {"code": "ITEM_NOT_FOUND", "message": "Item not found in ticket"}
    
    # Check if all items are done/ready to update ticket status
    all_done = all(i.get("status") in ["DONE", "READY"] for i in items)
    
    update_doc = {
        "items": items,
        "last_action_by": user["id"],
        "last_action_at": now,
        "updated_at": now
    }
    
    if all_done and new_status == "DONE":
        update_doc["status"] = "DONE"
        update_doc["done_at"] = now
    elif new_status == "READY" and not all_done:
        # If some items ready but not all, keep ticket in PREPARING
        update_doc["status"] = "PREPARING"
    
    await db.kds_tickets.update_one(
        {"id": ticket_id},
        {"$set": update_doc}
    )
    
    return True, {
        "ok": True,
        "ticket_id": ticket_id,
        "item_id": item_id,
        "new_status": new_status,
        "all_items_done": all_done
    }


async def claim_ticket(
    db,
    ticket_id: str,
    user: dict
) -> Tuple[bool, Dict[str, Any]]:
    """
    Claim a KDS ticket for preparation
    Returns: (success: bool, result: dict)
    """
    ticket = await db.kds_tickets.find_one({"id": ticket_id}, {"_id": 0})
    if not ticket:
        return False, {"code": "TICKET_NOT_FOUND", "message": "Ticket not found"}
    
    # Check if already claimed
    if ticket.get("claimed_by") and ticket.get("claim_lock"):
        return False, {
            "code": "TICKET_CLAIMED",
            "message": f"Ticket already claimed by {ticket.get('claimed_by_name')}"
        }
    
    now = datetime.now(timezone.utc).isoformat()
    
    await db.kds_tickets.update_one(
        {"id": ticket_id},
        {"$set": {
            "claimed_by": user["id"],
            "claimed_by_name": user["name"],
            "claimed_at": now,
            "claim_lock": True,
            "last_action_by": user["id"],
            "last_action_at": now
        }}
    )
    
    return True, {
        "ok": True,
        "ticket_id": ticket_id,
        "claimed_by": user["name"],
        "claimed_at": now
    }


async def release_ticket(
    db,
    ticket_id: str,
    user: dict
) -> Tuple[bool, Dict[str, Any]]:
    """
    Release claim on a KDS ticket
    Returns: (success: bool, result: dict)
    """
    ticket = await db.kds_tickets.find_one({"id": ticket_id}, {"_id": 0})
    if not ticket:
        return False, {"code": "TICKET_NOT_FOUND", "message": "Ticket not found"}
    
    now = datetime.now(timezone.utc).isoformat()
    
    await db.kds_tickets.update_one(
        {"id": ticket_id},
        {"$set": {
            "claim_lock": False,
            "last_action_by": user["id"],
            "last_action_at": now
        }}
    )
    
    return True, {
        "ok": True,
        "ticket_id": ticket_id,
        "released_at": now
    }
