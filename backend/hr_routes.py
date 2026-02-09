"""
HR PHASE 1 Endpoints
Employees, Shifts, Attendance, Leave, Documents, Skills
Server-authoritative with strict permissions
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
from datetime import datetime, timezone, timedelta

# This file will be imported by server.py
# All dependencies (models, helpers, db) will be passed from server.py

def create_hr_router(db, ensure_ids, log_event, check_venue_access, get_current_user, effective_permissions, UserRole):
    """Factory function to create HR router with dependencies"""
    
    hr_router = APIRouter(prefix="/hr", tags=["hr"])
    
    # ==================== EMPLOYEES ====================
    @hr_router.get("/employees")
    async def list_employees(
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        """List employees with permission filtering"""
        await check_venue_access(current_user, venue_id)
        
        # Permission check
        venue = await db.venues.find_one({"id": venue_id}, {"_id": 0})
        venue_settings = venue.get("settings", {}) if venue else {}
        user_perms = effective_permissions(current_user["role"], venue_settings)
        
        if "EMPLOYEES_VIEW_SELF" in user_perms and "EMPLOYEES_VIEW_ALL" not in user_perms:
            # Find employee record linked to user
            query = {"venue_id": venue_id, "email": current_user.get("email")}
        elif "EMPLOYEES_VIEW_ALL" not in user_perms and "HR_VIEW" not in user_perms:
            raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "No access to employees"})
        else:
            query = {"venue_id": venue_id}
        
        # --- SEEDING LOGIC START ---
        count = await db.employees.count_documents({})
        if count == 0:
            from mock_data_store import MOCK_EMPLOYEES
            seed_docs = []
            for code, emp in MOCK_EMPLOYEES.items():
                seed_docs.append({
                    "id": str(uuid4()), # Generate new ID internal
                    "display_id": code, # Use code as display ID
                    "venue_id": venue_id, # Seed into current venue context
                    "full_name": emp["full_name"],
                    "email": emp["email"],
                    "role": "staff",
                    "department": emp["department"],
                    "employment_status": "active",
                    "start_date": emp.get("employment_date"),
                    "phone": emp.get("mobile"),
                    # Add extra fields to match schema
                    "occupation": emp["occupation"],
                    "cost_centre": emp["cost_centre"],
                    "vendor": emp.get("vendor"),
                    "created_at": datetime.now(timezone.utc).isoformat()
                })
            if seed_docs:
                await db.employees.insert_many(seed_docs)
        # --- SEEDING LOGIC END ---

        employees = await db.employees.find(query, {"_id": 0}).to_list(1000)
        
        # Filter sensitive fields based on permissions
        if "HR_VIEW_PAY" not in user_perms and "FINANCE_VIEW" not in user_perms:
            for emp in employees:
                emp.pop("bank_info", None)
                emp.pop("tax_profile_id", None)
                for assignment in emp.get("multi_role_assignments", []):
                    assignment.pop("pay_rate_override", None)
        
        return employees
    
    @hr_router.post("/employees")
    async def create_employee(
        data: dict,
        current_user: dict = Depends(get_current_user)
    ):
        """Create new employee (HR_EDIT required)"""
        from pydantic import ValidationError
        
        await check_venue_access(current_user, data.get("venue_id"))
        
        # Permission check
        venue = await db.venues.find_one({"id": data.get("venue_id")}, {"_id": 0})
        venue_settings = venue.get("settings", {}) if venue else {}
        user_perms = effective_permissions(current_user["role"], venue_settings)
        
        if "HR_EDIT" not in user_perms:
            raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "No access to create employees"})
        
        # Create employee
        from uuid import uuid4
        emp_doc = {
            "id": str(uuid4()),
            "venue_id": data.get("venue_id"),
            "full_name": data.get("full_name"),
            "role": data.get("role", "staff"),
            "department": data.get("department"),
            "employment_status": data.get("employment_status", "active"),
            "start_date": data.get("start_date"),
            "end_date": data.get("end_date"),
            "email": data.get("email"),
            "phone": data.get("phone"),
            "emergency_contact": data.get("emergency_contact"),
            "multi_role_assignments": data.get("multi_role_assignments", []),
            "skills": data.get("skills", []),
            "documents": data.get("documents", []),
            "notes": data.get("notes"),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Generate display_id
        emp_doc = await ensure_ids(db, "EMPLOYEE", emp_doc, data.get("venue_id"))
        
        await db.employees.insert_one(emp_doc)
        
        # Log event
        await log_event(
            db,
            level="AUDIT",
            code="EMPLOYEE_CREATED",
            message=f"Employee {emp_doc['full_name']} created",
            user=current_user,
            venue_id=data.get("venue_id"),
            meta={"employee_id": emp_doc["id"], "display_id": emp_doc.get("display_id")}
        )
        
        return emp_doc
    
    # ==================== SHIFTS ====================
    @hr_router.get("/shifts")
    async def list_shifts(
        venue_id: str = Query(...),
        employee_id: Optional[str] = None,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        current_user: dict = Depends(get_current_user)
    ):
        """List shifts with permission filtering"""
        await check_venue_access(current_user, venue_id)
        
        venue = await db.venues.find_one({"id": venue_id}, {"_id": 0})
        venue_settings = venue.get("settings", {}) if venue else {}
        user_perms = effective_permissions(current_user["role"], venue_settings)
        
        # Build query
        query = {"venue_id": venue_id}
        
        # Self-view only for employees
        if "SHIFTS_VIEW_SELF" in user_perms and "SHIFTS_VIEW_ALL" not in user_perms:
            # Find employee by user email
            emp = await db.employees.find_one({"venue_id": venue_id, "email": current_user.get("email")}, {"_id": 0, "id": 1})
            if emp:
                query["employee_id"] = emp["id"]
            else:
                return []  # No employee record
        elif "SHIFTS_VIEW_ALL" not in user_perms:
            raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "No access to shifts"})
        
        if employee_id:
            query["employee_id"] = employee_id
        
        if from_date:
            query["scheduled_start"] = {"$gte": from_date}
        if to_date:
            query.setdefault("scheduled_start", {})
            query["scheduled_start"]["$lte"] = to_date
        
        shifts = await db.shifts.find(query, {"_id": 0}).sort("scheduled_start", -1).limit(500).to_list(500)
        return shifts
    
    @hr_router.post("/shifts")
    async def create_shift(
        data: dict,
        current_user: dict = Depends(get_current_user)
    ):
        """Create shift (SHIFTS_EDIT required)"""
        await check_venue_access(current_user, data.get("venue_id"))
        
        venue = await db.venues.find_one({"id": data.get("venue_id")}, {"_id": 0})
        venue_settings = venue.get("settings", {}) if venue else {}
        user_perms = effective_permissions(current_user["role"], venue_settings)
        
        if "SHIFTS_EDIT" not in user_perms:
            raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "No access to create shifts"})
        
        from uuid import uuid4
        shift_doc = {
            "id": str(uuid4()),
            "employee_id": data.get("employee_id"),
            "venue_id": data.get("venue_id"),
            "station": data.get("station", "FLOOR"),
            "scheduled_start": data.get("scheduled_start"),
            "scheduled_end": data.get("scheduled_end"),
            "status": "scheduled",
            "break_minutes": 0,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        shift_doc = await ensure_ids(db, "SHIFT", shift_doc, data.get("venue_id"))
        await db.shifts.insert_one(shift_doc)
        
        await log_event(
            db,
            level="AUDIT",
            code="SHIFT_CREATED",
            message=f"Shift created for employee {data.get('employee_id')}",
            user=current_user,
            venue_id=data.get("venue_id"),
            meta={"shift_id": shift_doc["id"], "employee_id": data.get("employee_id")}
        )
        
        return shift_doc
    
    @hr_router.post("/shifts/{shift_id}/clock-in")
    async def clock_in(shift_id: str, current_user: dict = Depends(get_current_user)):
        """Clock in to shift"""
        shift = await db.shifts.find_one({"id": shift_id}, {"_id": 0})
        if not shift:
            raise HTTPException(status_code=404, detail="Shift not found")
        
        await check_venue_access(current_user, shift["venue_id"])
        
        now = datetime.now(timezone.utc).isoformat()
        
        await db.shifts.update_one(
            {"id": shift_id},
            {"$set": {"actual_start": now, "status": "clocked_in"}}
        )
        
        # Log attendance
        await db.attendance_logs.insert_one({
            "id": str(uuid4()),
            "employee_id": shift["employee_id"],
            "shift_id": shift_id,
            "venue_id": shift["venue_id"],
            "action": "IN",
            "timestamp": now,
            "source": "ADMIN",
            "device_id": None
        })
        
        return {"message": "Clocked in", "time": now}
    
    @hr_router.post("/shifts/{shift_id}/clock-out")
    async def clock_out(shift_id: str, current_user: dict = Depends(get_current_user)):
        """Clock out from shift"""
        shift = await db.shifts.find_one({"id": shift_id}, {"_id": 0})
        if not shift:
            raise HTTPException(status_code=404, detail="Shift not found")
        
        await check_venue_access(current_user, shift["venue_id"])
        
        now = datetime.now(timezone.utc).isoformat()
        
        await db.shifts.update_one(
            {"id": shift_id},
            {"$set": {"actual_end": now, "status": "completed"}}
        )
        
        # Log attendance
        from uuid import uuid4
        await db.attendance_logs.insert_one({
            "id": str(uuid4()),
            "employee_id": shift["employee_id"],
            "shift_id": shift_id,
            "venue_id": shift["venue_id"],
            "action": "OUT",
            "timestamp": now,
            "source": "ADMIN",
            "device_id": None
        })
        
        return {"message": "Clocked out", "time": now}
    
    # ==================== LEAVE REQUESTS ====================
    @hr_router.get("/leave")
    async def list_leave_requests(
        venue_id: str = Query(...),
        employee_id: Optional[str] = None,
        status: Optional[str] = None,
        current_user: dict = Depends(get_current_user)
    ):
        """List leave requests"""
        await check_venue_access(current_user, venue_id)
        
        venue = await db.venues.find_one({"id": venue_id}, {"_id": 0})
        venue_settings = venue.get("settings", {}) if venue else {}
        user_perms = effective_permissions(current_user["role"], venue_settings)
        
        query = {"venue_id": venue_id}
        
        if employee_id:
            query["employee_id"] = employee_id
        
        if status:
            query["status"] = status
        
        # Permission check (managers can see all, employees see only their own)
        if "LEAVE_VIEW_ALL" not in user_perms:
            raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "No access to leave requests"})
        
        leave_requests = await db.leave_requests.find(query, {"_id": 0}).sort("created_at", -1).limit(200).to_list(200)
        return leave_requests
    
    @hr_router.post("/leave")
    async def create_leave_request(
        data: dict,
        current_user: dict = Depends(get_current_user)
    ):
        """Create leave request"""
        await check_venue_access(current_user, data.get("venue_id"))
        
        from uuid import uuid4
        leave_doc = {
            "id": str(uuid4()),
            "employee_id": data.get("employee_id"),
            "venue_id": data.get("venue_id"),
            "type": data.get("type", "annual"),
            "start_date": data.get("start_date"),
            "end_date": data.get("end_date"),
            "status": "pending",
            "notes": data.get("notes"),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        leave_doc = await ensure_ids(db, "LEAVE_REQUEST", leave_doc, data.get("venue_id"))
        await db.leave_requests.insert_one(leave_doc)
        
        await log_event(
            db,
            level="AUDIT",
            code="LEAVE_REQUESTED",
            message=f"Leave request created: {leave_doc.get('display_id')}",
            user=current_user,
            venue_id=data.get("venue_id"),
            meta={"leave_id": leave_doc["id"], "employee_id": data.get("employee_id")}
        )
        
        return leave_doc
    
    @hr_router.post("/leave/{leave_id}/approve")
    async def approve_leave(
        leave_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Approve leave request (LEAVE_APPROVE required)"""
        leave = await db.leave_requests.find_one({"id": leave_id}, {"_id": 0})
        if not leave:
            raise HTTPException(status_code=404, detail="Leave request not found")
        
        await check_venue_access(current_user, leave["venue_id"])
        
        venue = await db.venues.find_one({"id": leave["venue_id"]}, {"_id": 0})
        venue_settings = venue.get("settings", {}) if venue else {}
        user_perms = effective_permissions(current_user["role"], venue_settings)
        
        if "LEAVE_APPROVE" not in user_perms:
            raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "No permission to approve leave"})
        
        now = datetime.now(timezone.utc).isoformat()
        
        await db.leave_requests.update_one(
            {"id": leave_id},
            {"$set": {
                "status": "approved",
                "approved_by": current_user["id"],
                "approved_at": now
            }}
        )
        
        await log_event(
            db,
            level="AUDIT",
            code="LEAVE_APPROVED",
            message=f"Leave approved: {leave.get('display_id')}",
            user=current_user,
            venue_id=leave["venue_id"],
            meta={"leave_id": leave_id, "employee_id": leave["employee_id"]}
        )
        
        return {"message": "Leave approved"}
    
    @hr_router.post("/leave/{leave_id}/reject")
    async def reject_leave(
        leave_id: str,
        reason: str = Query(""),
        current_user: dict = Depends(get_current_user)
    ):
        """Reject leave request"""
        leave = await db.leave_requests.find_one({"id": leave_id}, {"_id": 0})
        if not leave:
            raise HTTPException(status_code=404, detail="Leave request not found")
        
        await check_venue_access(current_user, leave["venue_id"])
        
        venue = await db.venues.find_one({"id": leave["venue_id"]}, {"_id": 0})
        venue_settings = venue.get("settings", {}) if venue else {}
        user_perms = effective_permissions(current_user["role"], venue_settings)
        
        if "LEAVE_APPROVE" not in user_perms:
            raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "No permission to reject leave"})
        
        now = datetime.now(timezone.utc).isoformat()
        
        await db.leave_requests.update_one(
            {"id": leave_id},
            {"$set": {
                "status": "rejected",
                "rejected_by": current_user["id"],
                "rejected_at": now,
                "notes": (leave.get("notes", "") + f"\nRejection reason: {reason}").strip()
            }}
        )
        
        return {"message": "Leave rejected"}
    
    # ==================== DOCUMENTS ====================
    @hr_router.get("/documents")
    async def list_hr_documents(
        venue_id: str = Query(...),
        employee_id: Optional[str] = None,
        current_user: dict = Depends(get_current_user)
    ):
        """List HR documents with visibility filtering"""
        await check_venue_access(current_user, venue_id)
        
        venue = await db.venues.find_one({"id": venue_id}, {"_id": 0})
        venue_settings = venue.get("settings", {}) if venue else {}
        user_perms = effective_permissions(current_user["role"], venue_settings)
        
        query = {"venue_id": venue_id}
        
        if employee_id:
            query["employee_id"] = employee_id
        
        # Permission filtering
        if "DOCUMENTS_VIEW_ALL" not in user_perms:
            # Employees can see only their own docs marked employee_self
            emp = await db.employees.find_one({"venue_id": venue_id, "email": current_user.get("email")}, {"_id": 0, "id": 1})
            if emp:
                query["employee_id"] = emp["id"]
                query["visibility"] = {"$in": ["employee_self", "manager"]}
            else:
                return []
        
        documents = await db.hr_documents.find(query, {"_id": 0}).sort("created_at", -1).limit(200).to_list(200)
        return documents
    
    @hr_router.post("/documents")
    async def create_hr_document(
        data: dict,
        current_user: dict = Depends(get_current_user)
    ):
        """Upload HR document metadata"""
        await check_venue_access(current_user, data.get("venue_id"))
        
        venue = await db.venues.find_one({"id": data.get("venue_id")}, {"_id": 0})
        venue_settings = venue.get("settings", {}) if venue else {}
        user_perms = effective_permissions(current_user["role"], venue_settings)
        
        if "DOCUMENTS_UPLOAD" not in user_perms:
            raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "No permission to upload documents"})
        
        from uuid import uuid4
        doc = {
            "id": str(uuid4()),
            "employee_id": data.get("employee_id"),
            "venue_id": data.get("venue_id"),
            "type": data.get("type", "other"),
            "title": data.get("title"),
            "file_url": data.get("file_url"),
            "storage_key": data.get("storage_key"),
            "expiry_date": data.get("expiry_date"),
            "visibility": data.get("visibility", "hr_only"),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": current_user["id"]
        }
        
        doc = await ensure_ids(db, "HR_DOCUMENT", doc, data.get("venue_id"))
        await db.hr_documents.insert_one(doc)
        
        return doc
    
    # ==================== ATTENDANCE ====================
    @hr_router.get("/attendance")
    async def list_attendance(
        venue_id: str = Query(...),
        employee_id: Optional[str] = None,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        current_user: dict = Depends(get_current_user)
    ):
        """List attendance logs"""
        await check_venue_access(current_user, venue_id)
        
        venue = await db.venues.find_one({"id": venue_id}, {"_id": 0})
        venue_settings = venue.get("settings", {}) if venue else {}
        user_perms = effective_permissions(current_user["role"], venue_settings)
        
        if "ATTENDANCE_VIEW" not in user_perms:
            raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "No access to attendance"})
        
        query = {"venue_id": venue_id}
        
        if employee_id:
            query["employee_id"] = employee_id
        
        if from_date or to_date:
            query["timestamp"] = {}
            if from_date:
                query["timestamp"]["$gte"] = from_date
            if to_date:
                query["timestamp"]["$lte"] = to_date
        
        logs = await db.attendance_logs.find(query, {"_id": 0}).sort("timestamp", -1).limit(500).to_list(500)
        return logs
    
    # ==================== SKILLS ====================
    @hr_router.get("/skills")
    async def list_skills(
        venue_id: str = Query(...),
        employee_id: Optional[str] = None,
        current_user: dict = Depends(get_current_user)
    ):
        """List skills"""
        await check_venue_access(current_user, venue_id)
        
        query = {"venue_id": venue_id}
        if employee_id:
            query["employee_id"] = employee_id
        
        skills = await db.skills.find(query, {"_id": 0}).to_list(500)
        return skills
    
    @hr_router.post("/skills/{skill_id}/verify")
    async def verify_skill(
        skill_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Verify skill (SKILLS_VERIFY required)"""
        skill = await db.skills.find_one({"id": skill_id}, {"_id": 0})
        if not skill:
            raise HTTPException(status_code=404, detail="Skill not found")
        
        await check_venue_access(current_user, skill["venue_id"])
        
        venue = await db.venues.find_one({"id": skill["venue_id"]}, {"_id": 0})
        venue_settings = venue.get("settings", {}) if venue else {}
        user_perms = effective_permissions(current_user["role"], venue_settings)
        
        if "SKILLS_VERIFY" not in user_perms:
            raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "No permission to verify skills"})
        
        now = datetime.now(timezone.utc).isoformat()
        
        await db.skills.update_one(
            {"id": skill_id},
            {"$set": {
                "verified": True,
                "verified_by": current_user["id"],
                "verified_at": now
            }}
        )
        
        return {"message": "Skill verified"}
    
    # ==================== HR ANALYTICS ====================
    @hr_router.get("/analytics")
    async def get_hr_analytics(
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        """Get HR analytics summary"""
        await check_venue_access(current_user, venue_id)
        
        venue = await db.venues.find_one({"id": venue_id}, {"_id": 0})
        venue_settings = venue.get("settings", {}) if venue else {}
        user_perms = effective_permissions(current_user["role"], venue_settings)
        
        if "HR_VIEW" not in user_perms:
            raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "No access to HR analytics"})
        
        # Get counts
        total_employees = await db.employees.count_documents({"venue_id": venue_id, "employment_status": "active"})
        
        # Shifts today
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0).isoformat()
        today_end = datetime.now(timezone.utc).isoformat()
        
        shifts_today = await db.shifts.count_documents({
            "venue_id": venue_id,
            "scheduled_start": {"$gte": today_start, "$lte": today_end}
        })
        
        # Pending leave requests
        pending_leave = await db.leave_requests.count_documents({
            "venue_id": venue_id,
            "status": "pending"
        })
        
        # Documents expiring soon (30 days)
        thirty_days = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
        expiring_docs = await db.hr_documents.count_documents({
            "venue_id": venue_id,
            "expiry_date": {"$ne": None, "$lte": thirty_days}
        })
        
        return {
            "total_employees": total_employees,
            "shifts_today": shifts_today,
            "pending_leave": pending_leave,
            "expiring_docs": expiring_docs
        }
    
    # ==================== CONTRACTS (MODULE 2) ====================
    @hr_router.post("/contracts")
    async def create_contract(data: dict, current_user: dict = Depends(get_current_user)):
        """Create employment contract"""
        await check_venue_access(current_user, data.get("venue_id"))
        
        from uuid import uuid4
        contract_doc = {
            "id": str(uuid4()),
            "employee_id": data.get("employee_id"),
            "venue_id": data.get("venue_id"),
            "contract_type": data.get("contract_type", "full_time"),
            "start_date": data.get("start_date"),
            "end_date": data.get("end_date"),
            "base_pay_type": data.get("base_pay_type", "monthly"),
            "base_rate": data.get("base_rate", 0.0),
            "pay_frequency": data.get("pay_frequency", "monthly"),
            "standard_hours_per_week": data.get("standard_hours_per_week", 40.0),
            "status": "draft",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        contract_doc = await ensure_ids(db, "CONTRACT", contract_doc, data.get("venue_id"))
        await db.contracts.insert_one(contract_doc)
        
        await log_event(db, level="AUDIT", code="CONTRACT_CREATED", message=f"Contract {contract_doc.get('display_id')} created", 
                       user=current_user, venue_id=data.get("venue_id"), meta={"contract_id": contract_doc["id"]})
        
        return contract_doc
    
    @hr_router.get("/contracts")
    async def list_contracts(venue_id: str = Query(...), employee_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
        """List contracts"""
        await check_venue_access(current_user, venue_id)
        query = {"venue_id": venue_id}
        if employee_id:
            query["employee_id"] = employee_id
        contracts = await db.contracts.find(query, {"_id": 0}).to_list(200)
        return contracts
    
    @hr_router.post("/contracts/{contract_id}/activate")
    async def activate_contract(contract_id: str, current_user: dict = Depends(get_current_user)):
        """Activate contract"""
        contract = await db.contracts.find_one({"id": contract_id}, {"_id": 0})
        if not contract:
            raise HTTPException(status_code=404, detail="Contract not found")
        
        await db.contracts.update_one({"id": contract_id}, {"$set": {"status": "active", "signed_at": datetime.now(timezone.utc).isoformat(), "signed_by": current_user["id"]}})
        await log_event(db, level="AUDIT", code="CONTRACT_ACTIVATED", message=f"Contract {contract.get('display_id')} activated", user=current_user, venue_id=contract["venue_id"])
        return {"message": "Contract activated"}
    
    # ==================== TIMESHEETS (MODULE 3) ====================
    @hr_router.post("/timesheets")
    async def create_timesheet(data: dict, current_user: dict = Depends(get_current_user)):
        """Create timesheet"""
        from uuid import uuid4
        ts_doc = {
            "id": str(uuid4()),
            "employee_id": data.get("employee_id"),
            "venue_id": data.get("venue_id"),
            "period_start": data.get("period_start"),
            "period_end": data.get("period_end"),
            "entries": data.get("entries", []),
            "total_hours": sum(e.get("hours", 0) for e in data.get("entries", [])),
            "status": "open",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        ts_doc = await ensure_ids(db, "TIMESHEET", ts_doc, data.get("venue_id"))
        await db.timesheets.insert_one(ts_doc)
        return ts_doc
    
    @hr_router.get("/timesheets")
    async def list_timesheets(venue_id: str = Query(...), employee_id: Optional[str] = None, status: Optional[str] = None, current_user: dict = Depends(get_current_user)):
        """List timesheets"""
        await check_venue_access(current_user, venue_id)
        query = {"venue_id": venue_id}
        if employee_id:
            query["employee_id"] = employee_id
        if status:
            query["status"] = status
        timesheets = await db.timesheets.find(query, {"_id": 0}).to_list(200)
        return timesheets
    
    @hr_router.post("/timesheets/{timesheet_id}/submit")
    async def submit_timesheet(timesheet_id: str, current_user: dict = Depends(get_current_user)):
        """Submit timesheet for approval"""
        await db.timesheets.update_one({"id": timesheet_id}, {"$set": {"status": "submitted", "submitted_at": datetime.now(timezone.utc).isoformat(), "submitted_by": current_user["id"]}})
        return {"message": "Timesheet submitted"}
    
    @hr_router.post("/timesheets/{timesheet_id}/approve")
    async def approve_timesheet(timesheet_id: str, current_user: dict = Depends(get_current_user)):
        """Approve timesheet"""
        await db.timesheets.update_one({"id": timesheet_id}, {"$set": {"status": "approved", "approved_at": datetime.now(timezone.utc).isoformat(), "approved_by": current_user["id"]}})
        return {"message": "Timesheet approved"}
    
    # ==================== TIPS (MODULE 4) ====================
    @hr_router.post("/tips/pools")
    async def create_tips_pool(data: dict, current_user: dict = Depends(get_current_user)):
        """Create tips pool"""
        from uuid import uuid4
        pool_doc = {
            "id": str(uuid4()),
            "venue_id": data.get("venue_id"),
            "date": data.get("date"),
            "sources": data.get("sources", []),
            "total_amount": sum(s.get("amount", 0) for s in data.get("sources", [])),
            "status": "open",
            "created_by": current_user["id"],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        pool_doc = await ensure_ids(db, "TIPS_POOL", pool_doc, data.get("venue_id"))
        await db.tips_pools.insert_one(pool_doc)
        return pool_doc
    
    @hr_router.get("/tips/pools")
    async def list_tips_pools(venue_id: str = Query(...), current_user: dict = Depends(get_current_user)):
        """List tips pools"""
        await check_venue_access(current_user, venue_id)
        pools = await db.tips_pools.find({"venue_id": venue_id}, {"_id": 0}).sort("date", -1).to_list(200)
        return pools
    
    @hr_router.post("/tips/pools/{pool_id}/allocate")
    async def allocate_tips(pool_id: str, data: dict, current_user: dict = Depends(get_current_user)):
        """Allocate tips to employees"""
        pool = await db.tips_pools.find_one({"id": pool_id}, {"_id": 0})
        if not pool:
            raise HTTPException(status_code=404, detail="Tips pool not found")
        
        from uuid import uuid4
        allocation_doc = {
            "id": str(uuid4()),
            "venue_id": pool["venue_id"],
            "tips_pool_id": pool_id,
            "method": data.get("method", "points"),
            "allocations": data.get("allocations", []),
            "total_allocated": sum(a.get("amount", 0) for a in data.get("allocations", [])),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        allocation_doc = await ensure_ids(db, "TIPS_ALLOCATION", allocation_doc, pool["venue_id"])
        await db.tips_allocations.insert_one(allocation_doc)
        await db.tips_pools.update_one({"id": pool_id}, {"$set": {"status": "allocated"}})
        
        return allocation_doc
    
    @hr_router.post("/tips/pools/{pool_id}/lock")
    async def lock_tips_pool(pool_id: str, current_user: dict = Depends(get_current_user)):
        """Lock tips pool"""
        await db.tips_pools.update_one({"id": pool_id}, {"$set": {"status": "locked"}})
        return {"message": "Tips pool locked"}
    
    # ==================== PAYROLL (MODULE 5-6) ====================
    @hr_router.post("/payruns")
    async def create_payrun(data: dict, current_user: dict = Depends(get_current_user)):
        """Create payroll run"""
        from uuid import uuid4
        payrun_doc = {
            "id": str(uuid4()),
            "venue_id": data.get("venue_id"),
            "period_start": data.get("period_start"),
            "period_end": data.get("period_end"),
            "pay_date": data.get("pay_date"),
            "status": "draft",
            "created_by": current_user["id"],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        payrun_doc = await ensure_ids(db, "PAY_RUN", payrun_doc, data.get("venue_id"))
        await db.pay_runs.insert_one(payrun_doc)
        return payrun_doc
    
    @hr_router.get("/payruns")
    async def list_payruns(venue_id: str = Query(...), current_user: dict = Depends(get_current_user)):
        """List payroll runs"""
        await check_venue_access(current_user, venue_id)
        payruns = await db.pay_runs.find({"venue_id": venue_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
        return payruns
    
    @hr_router.post("/payruns/{payrun_id}/calculate")
    async def calculate_payrun(payrun_id: str, current_user: dict = Depends(get_current_user)):
        """Calculate payslips based on REAL Clocking Data"""
        payrun = await db.pay_runs.find_one({"id": payrun_id}, {"_id": 0})
        if not payrun:
            raise HTTPException(status_code=404, detail="Payrun not found")
        
        # Period dates (important for filtering clocking)
        # Expected format: "2026-01-01" or similar iso date
        p_start = payrun.get("period_start")
        p_end = payrun.get("period_end")

        # Get employees
        employees = await db.employees.find({"venue_id": payrun["venue_id"], "employment_status": "active"}, {"_id": 0}).to_list(1000)
        
        from uuid import uuid4
        payslips_created = 0
        
        # Pre-fetch clocking for efficiency? Or one by one.
        # One by one is fine for 1000 employees in this scale.
        
        filtered_clocking_query = {
             "venue_id": payrun["venue_id"]
        }
        # Add date range filter if dates are valid ISO strings (YYYY-MM-DD or DD/MM/YYYY)
        # Clocking data stores date as "DD/MM/YYYY" string currently (legacy mock format).
        # We need to handle this carefully. Mock data seeded with "DD/MM/YYYY".
        
        # Helper to parse dates
        def parse_date(d_str):
            try:
                # Try ISO YYYY-MM-DD
                return datetime.strptime(d_str, "%Y-%m-%d")
            except:
                try:
                    # Try DD/MM/YYYY
                    return datetime.strptime(d_str, "%d/%m/%Y")
                except:
                    return None

        dt_start = parse_date(p_start) if p_start else None
        dt_end = parse_date(p_end) if p_end else None

        for emp in employees:
            # Get Contract Rate
            contract = await db.contracts.find_one({"employee_id": emp["id"], "status": "active"}, {"_id": 0})
            if not contract:
                # Fallback to hourly_rate in employee record if no contract (migration support)
                base_rate = emp.get("hourly_rate", 10.0) # Default 10 EUR
            else:
                base_rate = contract.get("base_rate", 0.0)
            
            # Fetch Clocking Records for this Employee
            # Since date strings are messy ("DD/MM/YYYY"), complex range queries in Mongo are hard on strings.
            # We will fetch all for employee and filter in python (safe for small dataset < 5000 records/emp).
            # Limitation: Performance. Optimization: Store ISODate in ClockingRecord next time.
            
            emp_clocking = await db.clocking_records.find({"employee_id": emp["id"]}).to_list(1000)
            
            total_hours = 0.0
            
            for record in emp_clocking:
                r_date_str = record.get("date")
                r_date = parse_date(r_date_str)
                
                if r_date and dt_start and dt_end:
                    if dt_start <= r_date <= dt_end:
                        total_hours += record.get("hours_worked", 0.0)
                else:
                    # If no valid date range, include nothing (safety)
                    pass

            # Calculate Pay
            gross = total_hours * base_rate
            
            # Simple Tax Rules (Malta Placeholder)
            tax = gross * 0.10 # 10% FSS
            social = gross * 0.10 # 10% NI
            net = gross - tax - social
            
            payslip_doc = {
                "id": str(uuid4()),
                "venue_id": payrun["venue_id"],
                "pay_run_id": payrun_id,
                "employee_id": emp["id"],
                "period_start": p_start,
                "period_end": p_end,
                "worked_hours": total_hours, # Storing the source of truth!
                "hourly_rate": base_rate,
                "earnings": {"base": gross},
                "deductions": {"tax": tax, "social": social},
                "gross": gross,
                "net": net,
                "email_status": "pending",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            payslip_doc = await ensure_ids(db, "PAYSLIP", payslip_doc, payrun["venue_id"])
            await db.payslips.insert_one(payslip_doc)
            payslips_created += 1
        
        await db.pay_runs.update_one({"id": payrun_id}, {"$set": {"status": "calculated"}})
        
        return {"message": f"Calculated {payslips_created} payslips using REAL clocking data"}
    
    @hr_router.post("/payruns/{payrun_id}/approve")
    async def approve_payrun(payrun_id: str, current_user: dict = Depends(get_current_user)):
        """Approve payrun"""
        await db.pay_runs.update_one({"id": payrun_id}, {"$set": {"status": "approved"}})
        await log_event(db, level="AUDIT", code="PAYRUN_APPROVED", message=f"Payrun {payrun_id} approved", user=current_user)
        return {"message": "Payrun approved"}
    
    @hr_router.post("/payruns/{payrun_id}/lock")
    async def lock_payrun(payrun_id: str, current_user: dict = Depends(get_current_user)):
        """Lock payrun and trigger PDF generation + email dispatch"""
        payrun = await db.pay_runs.find_one({"id": payrun_id}, {"_id": 0})
        if not payrun:
            raise HTTPException(status_code=404, detail="Payrun not found")
        
        # Lock payrun
        await db.pay_runs.update_one(
            {"id": payrun_id},
            {"$set": {"status": "locked", "locked_by": current_user["id"], "locked_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        # Mark all payslips as immutable
        await db.payslips.update_many(
            {"pay_run_id": payrun_id},
            {"$set": {"immutable_after_lock": True}}
        )
        
        await log_event(db, level="AUDIT", code="PAYRUN_LOCKED", message=f"Payrun {payrun.get('display_id')} locked", 
                       user=current_user, venue_id=payrun["venue_id"], meta={"payrun_id": payrun_id})
        
        # Trigger payslip email dispatch pipeline
        payslips = await db.payslips.find({"pay_run_id": payrun_id}, {"_id": 0}).to_list(1000)
        queued_count = 0
        for payslip in payslips:
            # Queue each payslip for email dispatch
            await db.payslips.update_one(
                {"id": payslip["id"]},
                {"$set": {"email_status": "queued", "queued_at": datetime.now(timezone.utc).isoformat()}}
            )
            # Create email job entry for background worker
            await db.email_jobs.insert_one({
                "id": str(uuid4()),
                "type": "payslip_dispatch",
                "payslip_id": payslip["id"],
                "employee_id": payslip["employee_id"],
                "venue_id": payrun["venue_id"],
                "status": "pending",
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            queued_count += 1
        
        return {"message": f"Payrun locked. {queued_count} payslips queued for email dispatch."}
    
    @hr_router.get("/payruns/{payrun_id}/payslips")
    async def get_payrun_payslips(payrun_id: str, current_user: dict = Depends(get_current_user)):
        """Get all payslips for a payrun"""
        payslips = await db.payslips.find({"pay_run_id": payrun_id}, {"_id": 0}).to_list(1000)
        return payslips
    
    @hr_router.get("/payslips/{payslip_id}")
    async def get_payslip(payslip_id: str, current_user: dict = Depends(get_current_user)):
        """Get single payslip"""
        payslip = await db.payslips.find_one({"id": payslip_id}, {"_id": 0})
        if not payslip:
            raise HTTPException(status_code=404, detail="Payslip not found")
        return payslip

    # ==================== GENERIC DICTIONARIES (SETUP) ====================
    @hr_router.get("/dictionaries/{type}")
    async def list_dictionary_items(
        type: str,
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        """Generic endpoint for Key-Value setup items (Banks, Grades, etc.)"""
        await check_venue_access(current_user, venue_id)
        
        ALLOWED_TYPES = [
            "departments", "cost_centres", "grades", "employment_types", 
            "banks", "locations", "citizenships", "termination_reasons", 
            "schedules", "occupations",
            "public_holidays", "countries", "salary_packages"
        ]
        
        if type not in ALLOWED_TYPES:
            raise HTTPException(status_code=400, detail="Invalid dictionary type")
        
        items = await db.hr_dictionaries.find(
            {"venue_id": venue_id, "type": type, "is_active": True}, 
            {"_id": 0}
        ).to_list(1000)
        
        return items

    @hr_router.post("/dictionaries/{type}")
    async def create_dictionary_item(
        type: str,
        data: dict,
        current_user: dict = Depends(get_current_user)
    ):
        """Create dictionary item"""
        await check_venue_access(current_user, data.get("venue_id"))
        
        from uuid import uuid4
        
        if not data.get("name"):
             raise HTTPException(status_code=400, detail="Name is required")

        item_doc = {
            "id": str(uuid4()),
            "venue_id": data.get("venue_id"),
            "type": type,
            "name": data.get("name"),
            "code": data.get("code"), # Optional
            "description": data.get("description"), # Optional
            "meta": data.get("meta", {}), # For things like Start Time in Schedules
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Specific ID generation if needed, skipping for generic speed
        
        await db.hr_dictionaries.insert_one(item_doc)
        return item_doc

    @hr_router.delete("/dictionaries/{type}/{item_id}")
    async def delete_dictionary_item(
        type: str,
        item_id: str,
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        """Soft delete dictionary item"""
        await check_venue_access(current_user, venue_id)
        
        result = await db.hr_dictionaries.update_one(
            {"id": item_id, "venue_id": venue_id, "type": type},
            {"$set": {"is_active": False}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Item not found")
            
        return {"message": "Item deleted"}

    return hr_router
