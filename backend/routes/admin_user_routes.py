"""Admin User Management Routes — CRUD, Archive, PIN Reset, Employee Linking"""
from fastapi import APIRouter, HTTPException, Depends, Body, Query
from typing import Optional, List
from datetime import datetime, timezone

from core.database import db
from core.dependencies import get_current_user, check_venue_access
from core.security import hash_pin
from models import UserRole
from services.audit_service import create_audit_log
import random


ADMIN_ROLES = {"owner", "general_manager", "manager", "it_admin"}


def create_admin_user_router():
    router = APIRouter(tags=["Admin Users"])

    async def require_admin(current_user: dict):
        """Raise if user is not admin"""
        role = current_user.get("role", "")
        if role not in ADMIN_ROLES:
            raise HTTPException(status_code=403, detail="Admin access required")

    # ─── GET single user ──────────────────────────────────────────────────
    @router.get("/venues/{venue_id}/admin/users/{user_id}")
    async def get_user_detail(
        venue_id: str,
        user_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Get detailed user profile including linked employee"""
        await check_venue_access(current_user, venue_id)
        await require_admin(current_user)

        user = await db.users.find_one(
            {"id": user_id, "venue_id": venue_id},
            {"_id": 0, "pin_hash": 0, "mfa_secret": 0, "mfa_secret_temp": 0}
        )
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Enrich with linked employee data
        employee_id = user.get("employee_id")
        if employee_id:
            employee = await db.employees.find_one(
                {"$or": [{"id": employee_id}, {"employee_code": employee_id}]},
                {"_id": 0}
            )
            user["linked_employee"] = employee
        else:
            user["linked_employee"] = None

        return user

    # ─── PATCH user ───────────────────────────────────────────────────────
    @router.patch("/venues/{venue_id}/admin/users/{user_id}")
    async def update_user(
        venue_id: str,
        user_id: str,
        updates: dict = Body(...),
        current_user: dict = Depends(get_current_user)
    ):
        """Update user fields (role, name, email, status, etc)"""
        await check_venue_access(current_user, venue_id)
        await require_admin(current_user)

        # Whitelist mutable fields
        allowed = {"name", "email", "phone", "role", "status", "is_active",
                   "employee_id", "allowed_venue_ids", "department"}
        safe_update = {k: v for k, v in updates.items() if k in allowed}
        if not safe_update:
            raise HTTPException(status_code=400, detail="No valid fields to update")

        safe_update["updated_at"] = datetime.now(timezone.utc).isoformat()

        result = await db.users.update_one(
            {"id": user_id, "venue_id": venue_id},
            {"$set": safe_update}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="User not found")

        await create_audit_log(
            venue_id, current_user["id"], current_user["name"],
            "update_user", "user", user_id, safe_update
        )

        return {"success": True, "updated": list(safe_update.keys())}

    # ─── Archive / Restore ────────────────────────────────────────────────
    @router.post("/venues/{venue_id}/admin/users/{user_id}/archive")
    async def archive_user(
        venue_id: str,
        user_id: str,
        restore: bool = Body(False),
        current_user: dict = Depends(get_current_user)
    ):
        """Archive or restore a user account"""
        await check_venue_access(current_user, venue_id)
        await require_admin(current_user)

        if user_id == current_user["id"]:
            raise HTTPException(status_code=400, detail="Cannot archive yourself")

        new_status = "active" if restore else "archived"
        update_data = {
            "status": new_status,
            "is_archived": not restore,
            "is_active": restore,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }

        result = await db.users.update_one(
            {"id": user_id, "venue_id": venue_id},
            {"$set": update_data}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="User not found")

        # Also update linked employee status
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if user and user.get("employee_id"):
            emp_status = "active" if restore else "terminated"
            await db.employees.update_one(
                {"$or": [{"id": user["employee_id"]}, {"employee_code": user["employee_id"]}]},
                {"$set": {"status": emp_status, "employment_status": emp_status}}
            )

        await create_audit_log(
            venue_id, current_user["id"], current_user["name"],
            "restore_user" if restore else "archive_user", "user", user_id, {}
        )

        action_label = "restored" if restore else "archived"
        return {"success": True, "message": f"User {action_label}", "status": new_status}

    # ─── Reset PIN ────────────────────────────────────────────────────────
    @router.post("/venues/{venue_id}/admin/users/{user_id}/reset-pin")
    async def reset_user_pin(
        venue_id: str,
        user_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Reset a user's PIN to a new random 4-digit PIN"""
        await check_venue_access(current_user, venue_id)
        await require_admin(current_user)

        # Generate unique PIN
        for _ in range(100):
            new_pin = f"{random.randint(0, 9999):04d}"
            pin_hash = hash_pin(new_pin)
            existing = await db.users.find_one(
                {"venue_id": venue_id, "pin_hash": pin_hash},
                {"_id": 1}
            )
            if not existing:
                break

        await db.users.update_one(
            {"id": user_id, "venue_id": venue_id},
            {"$set": {
                "pin_hash": pin_hash,
                "pin_must_change": True,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )

        await create_audit_log(
            venue_id, current_user["id"], current_user["name"],
            "reset_pin", "user", user_id, {}
        )

        return {"success": True, "new_pin": new_pin, "message": "PIN reset. Employee must change on next login."}

    # ─── Link Employee ────────────────────────────────────────────────────
    @router.post("/venues/{venue_id}/admin/users/{user_id}/link-employee")
    async def link_employee(
        venue_id: str,
        user_id: str,
        employee_id: str = Body(..., embed=True),
        current_user: dict = Depends(get_current_user)
    ):
        """Link a user account to an employee record"""
        await check_venue_access(current_user, venue_id)
        await require_admin(current_user)

        # Verify employee exists
        employee = await db.employees.find_one(
            {"$or": [
                {"id": employee_id, "venue_id": venue_id},
                {"employee_code": employee_id, "venue_id": venue_id}
            ]},
            {"_id": 0}
        )
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found in this venue")

        # Check if employee already linked to another user
        existing_link = await db.users.find_one(
            {"employee_id": employee_id, "venue_id": venue_id, "id": {"$ne": user_id}},
            {"_id": 0, "id": 1, "name": 1}
        )
        if existing_link:
            raise HTTPException(
                status_code=409,
                detail=f"Employee already linked to user: {existing_link.get('name', existing_link['id'])}"
            )

        # Update user with employee link
        await db.users.update_one(
            {"id": user_id, "venue_id": venue_id},
            {"$set": {
                "employee_id": employee_id,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )

        # Update employee with user link
        await db.employees.update_one(
            {"$or": [{"id": employee_id}, {"employee_code": employee_id}]},
            {"$set": {"user_id": user_id}}
        )

        await create_audit_log(
            venue_id, current_user["id"], current_user["name"],
            "link_employee", "user", user_id, {"employee_id": employee_id}
        )

        return {
            "success": True,
            "message": f"User linked to employee {employee.get('first_name', '')} {employee.get('last_name', '')}",
            "employee": employee
        }

    # ─── Unlink Employee ──────────────────────────────────────────────────
    @router.post("/venues/{venue_id}/admin/users/{user_id}/unlink-employee")
    async def unlink_employee(
        venue_id: str,
        user_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Remove user-employee link"""
        await check_venue_access(current_user, venue_id)
        await require_admin(current_user)

        user = await db.users.find_one({"id": user_id, "venue_id": venue_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        old_employee_id = user.get("employee_id")
        if old_employee_id:
            await db.employees.update_one(
                {"$or": [{"id": old_employee_id}, {"employee_code": old_employee_id}]},
                {"$unset": {"user_id": ""}}
            )

        await db.users.update_one(
            {"id": user_id, "venue_id": venue_id},
            {"$unset": {"employee_id": ""}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
        )

        return {"success": True, "message": "Employee link removed"}

    # ─── Search employees for linking ─────────────────────────────────────
    @router.get("/venues/{venue_id}/admin/linkable-employees")
    async def get_linkable_employees(
        venue_id: str,
        q: str = Query("", description="Search query"),
        current_user: dict = Depends(get_current_user)
    ):
        """Get employees that can be linked (not already linked to a user)"""
        await check_venue_access(current_user, venue_id)
        await require_admin(current_user)

        # Get all employees for this venue
        employees = await db.employees.find(
            {"venue_id": venue_id},
            {"_id": 0}
        ).to_list(500)

        # Get all already-linked employee IDs
        linked_users = await db.users.find(
            {"venue_id": venue_id, "employee_id": {"$exists": True, "$ne": None}},
            {"_id": 0, "employee_id": 1}
        ).to_list(500)
        linked_ids = {u["employee_id"] for u in linked_users}

        # Filter: unlinked + optional search
        results = []
        for emp in employees:
            emp_id = emp.get("id") or emp.get("employee_code")
            if emp_id in linked_ids:
                continue
            if q:
                full_name = f"{emp.get('first_name', '')} {emp.get('last_name', '')}".lower()
                if q.lower() not in full_name and q.lower() not in (emp.get("email", "") or "").lower():
                    continue
            results.append(emp)

        return results

    return router
