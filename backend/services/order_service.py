# Order Service - Business logic for order operations
import uuid
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Tuple
from services.id_service import ensure_ids
from utils.helpers import _rid, _step_log, calculate_risk_score

logger = logging.getLogger(__name__)

async def process_send_order(
    db,
    order_id: str,
    request,
    do_print: bool,
    do_kds: bool,
    do_stock: bool,
    client_send_id: Optional[str],
    current_user: dict
) -> Tuple[bool, Dict[str, Any]]:
    """
    Process order send pipeline
    Returns: (success: bool, result: dict)
    """
    _step_log(request, "START", {"order_id": order_id, "do_print": do_print, "do_kds": do_kds, "do_stock": do_stock})
    
    try:
        # Step 1: Load order and venue settings
        order = await db.orders.find_one({"id": order_id}, {"_id": 0})
        if not order:
            return False, {"code": "ORDER_NOT_FOUND", "message": "Order not found", "order_id": order_id}
        
        venue_id = order.get("venue_id")
        if not venue_id:
            return False, {"code": "VENUE_ID_MISSING", "message": "Order missing venue_id"}
        
        # Load venue settings
        venue = await db.venues.find_one({"id": venue_id}, {"_id": 0})
        settings = venue.get("settings", {}) if venue else {}
        
        # Step 2: Idempotency check
        if client_send_id and client_send_id in order.get("send_client_ids", []):
            _step_log(request, "DEDUPED", {"client_send_id": client_send_id})
            last_round = order.get("send_rounds", [])[-1] if order.get("send_rounds") else {}
            return True, {
                "ok": True,
                "code": "SEND_DEDUPED",
                "order_id": order_id,
                "created_tickets": last_round.get("ticket_ids", []),
                "created_print_jobs": [],
                "stock_deducted": last_round.get("do_stock", False),
                "request_id": _rid(request)
            }
        
        # Step 3: Validate
        items = order.get("items", [])
        if not items:
            return False, {"code": "ORDER_EMPTY", "message": "Order must contain items"}
        
        pending_items = [i for i in items if i.get("status") == "pending"]
        if not pending_items:
            return False, {"code": "NO_PENDING_ITEMS", "message": "No pending items to send"}
        
        _step_log(request, "VALIDATED", {"venue_id": venue_id, "pending_items": len(pending_items)})
        
        # Step 4: Increment round and prepare items
        now = datetime.now(timezone.utc).isoformat()
        round_seq = order.get("send_round_seq", 0) + 1
        round_label = f"Round {round_seq}"
        
        table_id = order.get("table_id") or "NO_TABLE"
        table_name = order.get("table_name", "Unknown")
        
        prep_groups = await _group_items_by_prep_area(db, items, round_seq)
        _step_log(request, "ROUTED", {"groups": len(prep_groups)})
        
        # Step 5: Create KDS tickets
        ticket_ids = []
        if do_kds:
            ticket_ids = await _create_kds_tickets(
                db, prep_groups, venue_id, order_id, table_id, table_name, 
                round_seq, round_label, settings, now
            )
            _step_log(request, "KDS_CREATED", {"count": len(ticket_ids)})
        else:
            _step_log(request, "KDS_SKIPPED")
        
        # Step 6: Create print jobs
        print_job_ids = []
        if do_print:
            print_job_ids = await _create_print_jobs(
                db, prep_groups, venue_id, order_id, table_name, round_label, round_seq, now
            )
            _step_log(request, "PRINT_CREATED", {"count": len(print_job_ids)})
        else:
            _step_log(request, "PRINT_SKIPPED")
        
        # Step 7: Stock deduction (if enabled)
        if do_stock:
            await _deduct_stock(db, pending_items, venue_id, order_id, current_user["id"])
            _step_log(request, "STOCK_DEDUCTED")
        else:
            _step_log(request, "STOCK_SKIPPED")
        
        # Step 8: Update order
        send_round_record = {
            "round_no": round_seq,
            "sent_at": now,
            "do_print": do_print,
            "do_kds": do_kds,
            "do_stock": do_stock,
            "ticket_ids": ticket_ids,
            "print_job_ids": print_job_ids,
            "client_send_id": client_send_id
        }
        
        update_doc = {
            "$set": {
                "items": items,
                "send_round_seq": round_seq,
                "status": "sent"
            },
            "$push": {"send_rounds": send_round_record},
            "$addToSet": {"send_client_ids": client_send_id} if client_send_id else {}
        }
        
        if not client_send_id:
            del update_doc["$addToSet"]
        
        await db.orders.update_one({"id": order_id}, update_doc)
        
        _step_log(request, "SUCCESS", {"round": round_seq})
        
        return True, {
            "ok": True,
            "code": "SEND_SUCCESS",
            "order_id": order_id,
            "round_no": round_seq,
            "created_tickets": ticket_ids,
            "created_print_jobs": print_job_ids,
            "stock_deducted": do_stock,
            "request_id": _rid(request)
        }
        
    except Exception as e:
        logger.error(f"Send order failed: {e}", exc_info=True)
        return False, {"code": "SEND_FAILED", "message": f"Send order failed: {str(e)}"}


async def _group_items_by_prep_area(db, items: List[dict], round_seq: int) -> Dict[str, dict]:
    """Group items by prep area and course"""
    now = datetime.now(timezone.utc).isoformat()
    prep_groups = {}
    
    for item in items:
        if item.get("status") != "pending":
            continue
        
        item["status"] = "sent"
        item["sent_at"] = now
        item["round_no"] = round_seq
        
        # Determine station
        menu_item_id = item.get("menu_item_id") or item.get("item_id")
        prep_area = "kitchen"
        target_prep_seconds = 900  # Default 15 min
        
        if menu_item_id:
            menu_item = await db.menu_items.find_one({"id": menu_item_id}, {"_id": 0})
            if menu_item:
                prep_area = menu_item.get("prep_area", "kitchen")
                target_prep_seconds = menu_item.get("prep_time_seconds", 900)
        
        course = item.get("course", 1)
        key = f"{prep_area}_{course}"
        
        if key not in prep_groups:
            prep_groups[key] = {"prep_area": prep_area, "course": course, "items": []}
        
        # Safe modifiers
        if item.get("modifiers") is None:
            item["modifiers"] = []
        
        # Enrich item with KDS-specific fields
        item_copy = item.copy()
        item_copy["item_id"] = item_copy.get("id") or str(uuid.uuid4())
        item_copy["seat_no"] = item.get("seat_number", 1)
        item_copy["course_no"] = course
        item_copy["round_no"] = round_seq
        item_copy["notes"] = item.get("notes")
        item_copy["status"] = "NEW"  # KDS item status
        item_copy["target_prep_seconds"] = target_prep_seconds
        
        prep_groups[key]["items"].append(item_copy)
    
    return prep_groups


async def _create_kds_tickets(
    db, prep_groups: dict, venue_id: str, order_id: str, 
    table_id: str, table_name: str, round_seq: int, 
    round_label: str, settings: dict, now: str
) -> List[str]:
    """Create KDS tickets for each prep group"""
    ticket_ids = []
    
    for key, group in prep_groups.items():
        ticket_doc = {
            "id": str(uuid.uuid4()),
            "venue_id": venue_id,
            "order_id": order_id,
            "table_id": table_id,
            "table_name": table_name,
            "prep_area": group["prep_area"],
            "station": group["prep_area"].upper(),
            "items": group["items"],
            "course": group["course"],
            "round_no": round_seq,
            "round_label": round_label,
            "status": "NEW",
            "pass_required": settings.get("kds", {}).get("require_pass_approval", True),
            "pass_approved": False,
            "created_at": now
        }
        
        try:
            ticket_doc = await ensure_ids(db, "kds_ticket", ticket_doc, venue_id)
        except:
            pass
        
        await db.kds_tickets.insert_one(ticket_doc)
        ticket_ids.append(ticket_doc["id"])
    
    return ticket_ids


async def _create_print_jobs(
    db, prep_groups: dict, venue_id: str, order_id: str, 
    table_name: str, round_label: str, round_seq: int, now: str
) -> List[str]:
    """Create print jobs for each prep group"""
    print_job_ids = []
    
    for key, group in prep_groups.items():
        content = f"========== {round_label.upper()} ==========\n"
        content += f"TABLE: {table_name}\n"
        content += f"Course: {group['course']}\n"
        content += "-" * 30 + "\n"
        
        for item in group["items"]:
            content += f"{item.get('quantity', 1)}x {item.get('menu_item_name', 'Item')}\n"
            
            # Modifiers
            mods = item.get("modifiers", [])
            if mods:
                if isinstance(mods, list) and len(mods) > 0:
                    if isinstance(mods[0], dict):
                        mod_names = [m.get("name", str(m)) for m in mods]
                        content += f"   MOD: {', '.join(mod_names)}\n"
                    else:
                        content += f"   MOD: {', '.join(str(m) for m in mods)}\n"
            
            if item.get("notes"):
                content += f"   NOTE: {item['notes']}\n"
            
            content += f"   Seat: {item.get('seat_no', 1)}\n"
        
        content += "=" * 30 + "\n"
        
        print_job_doc = {
            "id": str(uuid.uuid4()),
            "venue_id": venue_id,
            "order_id": order_id,
            "printer_zone": group["prep_area"],
            "content": content,
            "status": "pending",
            "idempotency_key": f"{order_id}_{key}_{round_seq}_{now}",
            "created_at": now
        }
        await db.print_jobs.insert_one(print_job_doc)
        print_job_ids.append(print_job_doc["id"])
    
    return print_job_ids


async def _deduct_stock(db, items: List[dict], venue_id: str, order_id: str, user_id: str):
    """Deduct stock for order items"""
    # Stock deduction logic (placeholder for now)
    # This would integrate with inventory management
    pass


async def transfer_order_to_table(db, order_id: str, new_table_id: str, current_user: dict) -> Tuple[bool, Dict[str, Any]]:
    """Transfer order to different table"""
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        return False, {"code": "ORDER_NOT_FOUND", "message": "Order not found"}
    
    new_table = await db.tables.find_one({"id": new_table_id}, {"_id": 0})
    if not new_table:
        return False, {"code": "TABLE_NOT_FOUND", "message": "Table not found"}
    
    # Update order
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {
            "table_id": new_table_id,
            "table_name": new_table["name"]
        }}
    )
    
    # Update KDS tickets
    await db.kds_tickets.update_many(
        {"order_id": order_id},
        {"$set": {
            "table_id": new_table_id,
            "table_name": new_table["name"]
        }}
    )
    
    # Update old table status
    await db.tables.update_one(
        {"id": order["table_id"]},
        {"$set": {"status": "available", "current_order_id": None}}
    )
    
    # Update new table status
    await db.tables.update_one(
        {"id": new_table_id},
        {"$set": {"status": "occupied", "current_order_id": order_id}}
    )
    
    return True, {"ok": True, "message": "Order transferred", "new_table": new_table["name"]}


async def close_order(db, order_id: str, current_user: dict) -> Tuple[bool, Dict[str, Any]]:
    """Close an order"""
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        return False, {"code": "ORDER_NOT_FOUND", "message": "Order not found"}
    
    if order.get("status") == "closed":
        return False, {"code": "ORDER_ALREADY_CLOSED", "message": "Order already closed"}
    
    now = datetime.now(timezone.utc).isoformat()
    
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {
            "status": "closed",
            "closed_at": now
        }}
    )
    
    # Free the table
    if order.get("table_id"):
        await db.tables.update_one(
            {"id": order["table_id"]},
            {"$set": {"status": "available", "current_order_id": None}}
        )
    
    return True, {"ok": True, "message": "Order closed", "closed_at": now}
