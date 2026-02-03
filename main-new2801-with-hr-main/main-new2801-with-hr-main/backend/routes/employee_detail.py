"""Employee Detail Routes"""
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
    
    # Mock data lookup
    from mock_data_store import MOCK_EMPLOYEES
    
    # Default to HEMIDA if code not found (for safety in demo)
    emp_data = MOCK_EMPLOYEES.get(employee_code) or MOCK_EMPLOYEES.get("HEMIDA")
    
    if not emp_data:
        raise HTTPException(status_code=404, detail="Employee not found")

    employee = EmployeeDetailComplete(
        venue_id=venue_id,
        personal_details=PersonalDetails(
            code=emp_data["code"],
            id_number=emp_data.get("id_number", "123456M"),
            surname=emp_data["surname"],
            name=emp_data["name"],
            sex="Male", # Simplified for mock
            date_of_birth="01/01/1990",
            age=34,
            nationality="Maltese",
            citizenship="Maltese",
            profile_picture=emp_data.get("profile_picture")
        ),
        employment_details=EmploymentDetails(
            employment_date="01/01/2020",
            employment_duration="4Y 1M",
            employee_type="Employee",
            employment_type=emp_data.get("employment_type", "Full Time"),
            work_schedule="Full Timer 40 Hour Week",
            tax_profile="Single",
            occupation=emp_data["occupation"],
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
            beneficiary_fullname=emp_data["full_name"]
        ),
        contact_details=ContactDetails(
            employee_mobile_no=emp_data.get("mobile", "99000000"),
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
            punch_card_number=emp_data.get("punch_card", "0000"),
            punch_card_number_2=emp_data.get("punch_card_2"),
            punch_card_number_3=emp_data.get("punch_card_3"),
            hour_schedule="40 Hours",
            reporting_to_employee="Manager",
            daily_attendance_type="Clocking",
            daily_attendance_profile="Standard"
        )
    )
    
    return employee


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
