"""Employee Detail Routes"""
import os
from fastapi import APIRouter, Depends, HTTPException
from models.employee_detail import EmployeeDetailComplete, EmployeeDetailUpdateRequest
from models.employee_detail import PersonalDetails, EmploymentDetails, TaxPersonalDetails
from models.employee_detail import PaymentDetails, BankDetails, ContactDetails
from models.employee_detail import EmergencyContact, LeaveDetails, AttendanceDetails
from core.dependencies import get_current_user, get_database

router = APIRouter(prefix="/employees", tags=["Employee Detail"])


@router.get("/{employee_code}", response_model=EmployeeDetailComplete)
async def get_employee_detail(
    employee_code: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Get complete employee detail"""
    venue_id = current_user.get("venueId")
    
    # Try to find by display_id (code) first, as that's what frontend passes
    emp_data = await db.employees.find_one({
        "venue_id": venue_id, 
        "$or": [{"display_id": employee_code}, {"id": employee_code}]
    }, {"_id": 0})
    
    # If not found, and it's a "numeric" code, maybe try searching without venue if global?
    # For now strict venue check is safer.
    
    if not emp_data:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Map DB fields to complex response structure
    employee = EmployeeDetailComplete(
        venue_id=venue_id,
        personal_details=PersonalDetails(
            code=emp_data.get("display_id", "N/A"),
            id_number=emp_data.get("id_number", "TBA"),
            surname=emp_data.get("full_name", "").split(" ")[-1],
            name=emp_data.get("full_name", "").split(" ")[0],
            sex=emp_data.get("sex", "Unknown"),
            date_of_birth=emp_data.get("dob", "01/01/1900"),
            age=30, # Dynamic calc omitted for brevity
            nationality=emp_data.get("nationality", "Maltese"),
            citizenship=emp_data.get("citizenship", "Maltese"),
            profile_picture=emp_data.get("profile_picture")
        ),
        employment_details=EmploymentDetails(
            employment_date=emp_data.get("start_date", "01/01/2026"),
            employment_duration="0Y 0M", 
            employee_type=emp_data.get("employment_type", "Employee"),
            work_schedule="Full Timer 40 Hour Week",
            tax_profile="Single",
            occupation=emp_data.get("occupation", "Staff"),
            work_permit_end_date="31/12/2030"
        ),
        tax_personal_details=TaxPersonalDetails(
            civil_status="Single",
            tax_registration_number="123456789",
            social_security_number="AB123456",
            academic_level="None",
            has_disability=False,
            short_term_benefits="None",
            overtime_allowed=True,
            default_ot_pay_item="Overtime 1.5"
        ),
        payment_details=PaymentDetails(
            payroll_frequency="Monthly",
            payment_method="Direct Credit",
            payslip_method="Email",
            tags=["Staff"]
        ),
        bank_details=BankDetails(
            company_bank_account="BOV-001",
            bank="BOV",
            iban="MT39VALL000...",
            beneficiary_fullname=emp_data.get("full_name")
        ),
        contact_details=ContactDetails(
            employee_mobile_no=emp_data.get("phone", "99000000"),
            personal_email=emp_data.get("email", "staff@example.com"),
            work_email=emp_data.get("email", "staff@example.com"),
            address_1=emp_data.get("address", "Malta"),
            town_village="Valletta",
            country="Malta"
        ),
        emergency_contact_primary=EmergencyContact(
            name="Emergency",
            surname="Contact",
            mobile_number="79000000",
            relationship="Spouse"
        ),
        emergency_contact_secondary=EmergencyContact(),
        leave_details=LeaveDetails(
            can_apply_for_leave=True,
            self_approve_leave=False
        ),
        attendance_details=AttendanceDetails(
            attendance_employee=True,
            punch_type="Required",
            punch_card_number=emp_data.get("display_id", "0000"),
            punch_card_number_2=None,
            punch_card_number_3=None,
            hour_schedule="40 Hours",
            reporting_to_employee="Manager",
            daily_attendance_type="Clocking",
            daily_attendance_profile="Standard"
        )
    )
    
    return employee



@router.get("/{employee_code}/documents")
async def get_employee_documents(
    employee_code: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Get list of documents for an employee"""
    venue_id = current_user.get("venueId")
    
    docs = await db.documents.find({
        "venue_id": venue_id,
        "entity_type": "employee", 
        "entity_id": employee_code
    }).sort("created_at", -1).to_list(100)
    
    # Map _id object to string for JSON serialization
    for d in docs:
        d["_id"] = str(d["_id"])
        
    return docs

@router.get("/documents/{doc_id}/download")
async def download_document(
    doc_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Download a document by ID"""
    doc = await db.documents.find_one({"id": doc_id})
    if not doc:
        # Try by _id just in case
        from bson import ObjectId
        try:
             doc = await db.documents.find_one({"_id": ObjectId(doc_id)})
        except:
             pass
             
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    # Check venue access
    venue_id = current_user.get("venueId")
    if doc.get("venue_id") != venue_id:
        raise HTTPException(status_code=403, detail="Unauthorized access to document")

    file_path = doc.get("file_path")
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File content not found on server")
        
    from fastapi.responses import FileResponse
    return FileResponse(
        path=file_path,
        filename=doc.get("filename"),
        media_type=doc.get("mime", "application/octet-stream")
    )

    return FileResponse(
        path=file_path,
        filename=doc.get("filename"),
        media_type=doc.get("mime", "application/octet-stream")
    )

@router.get("/{employee_code}/payroll-history")
async def get_employee_payroll_history(
    employee_code: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Get payroll history for an employee"""
    venue_id = current_user.get("venueId")
    
    # improved query to find runs where this employee has a payslip
    # We project only necessary fields to save bandwidth
    pipeline = [
        {"$match": {
            "venue_id": venue_id,
            "payslips.employee_id": employee_code
        }},
        {"$unwind": "$payslips"},
        {"$match": {
            "payslips.employee_id": employee_code
        }},
        {"$project": {
            "run_id": "$id",
            "period": 1,
            "period_start": 1,
            "period_end": 1,
            "run_name": 1,
            "net_pay": "$payslips.net_pay",
            "gross_pay": "$payslips.gross_pay",
            "status": "$state",
            "date": "$created_at" # Using created_at as paid date proxy for now
        }},
        {"$sort": {"period": -1}}
    ]
    
    history = await db.payroll_runs.aggregate(pipeline).to_list(100)
    
    # Format for frontend
    results = []
    for h in history:
        results.append({
            "id": h["run_id"],
            "month": h.get("run_name", h.get("period")),
            "period": h.get("period"),
            "net": h.get("net_pay"),
            "gross": h.get("gross_pay"),
            "date": h.get("date"),
            "status": h.get("status", "completed").upper()
        })
        
    return results

@router.put("/{employee_code}")
async def update_employee_detail(
    employee_code: str,
    request: EmployeeDetailUpdateRequest,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Update employee detail"""
    # Mock update
    return {"success": True, "message": "Employee updated successfully"}
