"""Employee self-service + HR directory routes"""
from fastapi import APIRouter, HTTPException, Depends, Body
from typing import Optional
from datetime import datetime, timezone
from uuid import uuid4

from core.database import db
from core.dependencies import get_current_user, check_venue_access


def create_employee_router():
    router = APIRouter(tags=["employee"])

    # ==================== HR DIRECTORY (People & Talent) ====================
    @router.get("/venues/{venue_id}/hr/employees")
    async def list_hr_employees(
        venue_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """List employees for HR directory — supports multi-venue"""
        await check_venue_access(current_user, venue_id)
        
        # Build query: support multi-venue for org-wide access
        if venue_id == "all":
            query = {}
        else:
            allowed = current_user.get("allowed_venue_ids", [venue_id])
            if allowed and len(allowed) > 1:
                query = {"venue_id": {"$in": allowed}}
            else:
                query = {"venue_id": venue_id}
        
        employees = await db.employees.find(
            query, {"_id": 0}
        ).sort("last_name", 1).to_list(1000)
        
        return employees

    @router.post("/venues/{venue_id}/hr/employees")
    async def create_hr_employee(
        venue_id: str,
        payload: dict = Body(...),
        current_user: dict = Depends(get_current_user)
    ):
        """Create a new employee in the HR directory"""
        await check_venue_access(current_user, venue_id)
        
        # Only managers+ can create employees
        if current_user.get("role", "").upper() not in ["OWNER", "MANAGER", "PRODUCT_OWNER"]:
            raise HTTPException(status_code=403, detail="Only managers can add employees")
        
        emp_id = str(uuid4())
        employee_code = payload.get("employee_code", f"EMP-{emp_id[:6].upper()}")
        
        employee = {
            "id": emp_id,
            "display_id": f"EMP-{employee_code}",
            "employee_code": employee_code,
            "venue_id": venue_id,
            "first_name": payload.get("first_name", ""),
            "last_name": payload.get("last_name", ""),
            "full_name": f"{payload.get('first_name', '')} {payload.get('last_name', '')}".strip(),
            "email": payload.get("email", ""),
            "role": payload.get("role", "staff"),
            "occupation": payload.get("role", "staff"),
            "department": payload.get("department", "Operations"),
            "status": payload.get("status", "active"),
            "employment_status": payload.get("employment_status", "active"),
            "start_date": payload.get("start_date"),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": current_user.get("id"),
        }
        
        await db.employees.insert_one(employee)
        employee.pop("_id", None)
        return employee

    @router.get("/venues/{venue_id}/hr/employees/{employee_code}")
    async def get_hr_employee_detail(
        venue_id: str,
        employee_code: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Get single employee details by code or ID"""
        await check_venue_access(current_user, venue_id)
        
        # Try by employee_code first, then by id, then by display_id
        emp = await db.employees.find_one(
            {"$or": [
                {"employee_code": employee_code},
                {"id": employee_code},
                {"display_id": employee_code},
                {"display_id": f"EMP-{employee_code}"}
            ]},
            {"_id": 0}
        )
        
        if not emp:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        # Also fetch employee_details if available
        details = await db.employee_details.find_one(
            {"$or": [
                {"employee_code": employee_code},
                {"employee_id": employee_code},
                {"display_id": employee_code},
                {"display_id": f"EMP-{employee_code}"}
            ]},
            {"_id": 0}
        )
        
        if details:
            emp["details"] = details
        
        return emp

    @router.get("/employee/tips")
    async def get_my_tips(
        user_id: Optional[str] = None,
        current_user: dict = Depends(get_current_user)
    ):
        """Get employee's tip history"""
        target_user_id = user_id or current_user["id"]
        
        # Only allow viewing own tips unless manager/owner
        if target_user_id != current_user["id"] and current_user["role"] not in ["owner", "manager"]:
            raise HTTPException(status_code=403, detail="Can only view own tips")
        
        tips = await db.tips.find(
            {"server_id": target_user_id},
            {"_id": 0}
        ).sort("distributed_at", -1).to_list(100)
        
        return tips

    @router.get("/employee/payslips")
    async def get_my_payslips(current_user: dict = Depends(get_current_user)):
        """Get employee's payslips"""
        payslips = await db.documents.find(
            {
                "entity_type": "user",
                "entity_id": current_user["id"],
                "category": "payslip"
            },
            {"_id": 0, "file_data": 0}
        ).sort("uploaded_at", -1).to_list(50)
        
        return payslips

    @router.get("/employee/documents")
    async def get_my_documents(current_user: dict = Depends(get_current_user)):
        """Get employee's documents (contracts, certificates, etc.)"""
        docs = await db.documents.find(
            {
                "entity_type": "user",
                "entity_id": current_user["id"]
            },
            {"_id": 0, "file_data": 0}
        ).sort("uploaded_at", -1).to_list(100)
        
        return docs

    return router
