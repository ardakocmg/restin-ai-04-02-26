from fastapi import APIRouter, HTTPException, Depends, Query, Body
from typing import List, Optional, Dict
from datetime import datetime, timezone

from core.database import db
from core.dependencies import get_current_user
from models.rbac import ActiveContext, RoleAssignment, AuditEvent, RolePermission
from models.auth import User
from services.audit_service import create_audit_log

def create_rbac_router():
    router = APIRouter(tags=["rbac"])

    # --- Active Context Management ---

    @router.get("/rbac/context")
    async def get_active_context(current_user: dict = Depends(get_current_user)):
        """Get the current active context for the logged-in user."""
        context = await db.active_context.find_one({"principal_id": current_user["id"]}, {"_id": 0})
        
        if not context:
            # Create default context if none exists
            # Find primary assignment
            assignment = await db.role_assignments.find_one({"principal_id": current_user["id"]}, {"_id": 0})
            
            if assignment:
                new_context = ActiveContext(
                    principal_id=current_user["id"],
                    active_unit_type=assignment["unit_type"],
                    active_unit_id=assignment["unit_id"],
                    active_role=assignment["roles"][0] if assignment["roles"] else "staff",
                    active_station="office" # default
                )
                await db.active_context.insert_one(new_context.model_dump())
                return new_context.model_dump()
            
            return None # Should handle this case in frontend (e.g. show "No Access")

        return context

    @router.post("/rbac/context/switch")
    async def switch_context(
        unit_id: str = Body(...),
        role: str = Body(...),
        station: Optional[str] = Body(None),
        current_user: dict = Depends(get_current_user)
    ):
        """Switch the user's active context (Unit, Role, Station)."""
        # Validate assignment
        assignment = await db.role_assignments.find_one({
            "principal_id": current_user["id"],
            "unit_id": unit_id
        })
        
        if not assignment or role not in assignment["roles"]:
            # Audit the DENY
            await db.audit_events.insert_one(AuditEvent(
                event_type="rbac.context_switch",
                severity="HIGH",
                result="DENY",
                reason="Invalid role or unit assignment",
                principal_id=current_user["id"],
                unit_id=unit_id,
                active_role=role
            ).model_dump())
            raise HTTPException(status_code=403, detail="Invalid context switch request")

        # Update Context
        new_context = {
            "active_unit_type": assignment["unit_type"],
            "active_unit_id": unit_id,
            "active_role": role,
            "active_station": station or "floor",
            "last_updated": datetime.now(timezone.utc).isoformat()
        }
        
        await db.active_context.update_one(
            {"principal_id": current_user["id"]},
            {"$set": new_context},
            upsert=True
        )

        # Audit the ALLOW
        await db.audit_events.insert_one(AuditEvent(
            event_type="rbac.context_switch",
            severity="LOW",
            result="ALLOW",
            principal_id=current_user["id"],
            unit_id=unit_id,
            active_role=role,
            active_station=station
        ).model_dump())

        return {"message": "Context switched", "context": new_context}

    # --- User Access & Archiving ---

    @router.get("/admin/users/{user_id}/assignments")
    async def get_user_assignments(user_id: str, current_user: dict = Depends(get_current_user)):
        """Get all role assignments for a user."""
        cursor = db.role_assignments.find({"principal_id": user_id}, {"_id": 0})
        return await cursor.to_list(length=100)

    @router.post("/admin/users/{user_id}/status")
    async def set_user_status(
        user_id: str, 
        status: str = Body(..., pattern="^(active|archived|suspended)$"),
        is_archived: bool = Body(...),
        current_user: dict = Depends(get_current_user)
    ):
        """Archive, restore, or suspend a user."""
        # RBAC: Verify current user has USER_MANAGE permission
        admin_roles = {"owner", "general_manager", "manager", "it_admin"}
        current_role = current_user.get("role", "staff")
        if current_role not in admin_roles:
            await db.audit_events.insert_one(AuditEvent(
                event_type="user.status_change",
                severity="HIGH",
                result="DENY",
                reason="Insufficient permissions for USER_MANAGE",
                principal_id=current_user["id"],
                resource_type="user",
                resource_id=user_id
            ).model_dump())
            raise HTTPException(status_code=403, detail="Insufficient permissions to manage users")
        
        user = await db.users.find_one({"id": user_id})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        update_data = {
            "status": status,
            "is_archived": is_archived
        }
        
        if is_archived and not user.get("is_archived"):
             update_data["archived_at"] = datetime.now(timezone.utc).isoformat()
        elif not is_archived:
             update_data["archived_at"] = None

        await db.users.update_one({"id": user_id}, {"$set": update_data})

        # Audit
        await db.audit_events.insert_one(AuditEvent(
            event_type="user.status_change",
            severity="MED",
            result="ALLOW",
            principal_id=current_user["id"],
            resource_type="user",
            resource_id=user_id,
            after=update_data
        ).model_dump())

        return {"message": f"User status updated to {status}"}

    @router.get("/admin/users/{user_id}/context")
    async def get_user_active_context(user_id: str, current_user: dict = Depends(get_current_user)):
        """Get the active context of a specific user."""
        return await db.active_context.find_one({"principal_id": user_id}, {"_id": 0})

    @router.post("/admin/users/{user_id}/context/reset")
    async def reset_user_context(user_id: str, current_user: dict = Depends(get_current_user)):
        """Force reset a user's context."""
        await db.active_context.delete_one({"principal_id": user_id})
        await db.audit_events.insert_one(AuditEvent(
            event_type="rbac.context_reset",
            severity="MED",
            result="ALLOW",
            principal_id=current_user["id"],
            resource_type="user",
            resource_id=user_id
        ).model_dump())
        return {"message": "Context reset"}

    @router.get("/admin/users/{user_id}/audit")
    async def get_user_audit_logs(user_id: str, current_user: dict = Depends(get_current_user)):
        """Get audit logs for a specific user."""
        cursor = db.audit_events.find({"principal_id": user_id}, {"_id": 0}).sort("ts_utc", -1).limit(50)
        return await cursor.to_list(length=50)

    @router.get("/admin/roles")
    async def get_system_roles():
        """Get list of all available system roles."""
        # This could be dynamic from DB, but for now returning the new static list
        return [
            {"id": "owner", "category": "Management"},
            {"id": "general_manager", "category": "Management"},
            {"id": "manager", "category": "Management"},
            {"id": "supervisor", "category": "Management"},
            {"id": "waiter", "category": "Service"},
            {"id": "runner", "category": "Service"},
            {"id": "bartender", "category": "Service"},
            {"id": "host", "category": "Service"},
            {"id": "executive_chef", "category": "Kitchen"},
            {"id": "head_chef", "category": "Kitchen"},
            {"id": "sous_chef", "category": "Kitchen"},
            {"id": "chef_de_partie", "category": "Kitchen"},
            {"id": "commis_chef", "category": "Kitchen"},
            {"id": "kitchen_porter", "category": "Kitchen"},
            {"id": "pastry_chef", "category": "Kitchen"},
            {"id": "cashier", "category": "Other"},
            {"id": "finance", "category": "Other"},
            {"id": "it_admin", "category": "Other"},
            {"id": "staff", "category": "Other"}
        ]

    return router
