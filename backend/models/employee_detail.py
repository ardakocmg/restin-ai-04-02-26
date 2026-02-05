"""Employee Detail Models - Complete Employee Profile"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
import uuid


class PersonalDetails(BaseModel):
    """Personal details section"""
    code: str
    id_number: Optional[str] = None
    title: Optional[str] = None
    surname: str
    name: str
    middle_name: Optional[str] = None
    also_known_as: Optional[str] = None
    sex: str  # "Male", "Female"
    date_of_birth: str
    age: int
    nationality: Optional[str] = None
    citizenship: Optional[str] = None
    profile_picture: Optional[str] = None


class EmploymentDetails(BaseModel):
    """Employment details section"""
    employment_date: str
    employment_duration: str  # "7Y 4M"
    termination_date: Optional[str] = None
    termination_reason: Optional[str] = None
    original_employment_date: Optional[str] = None
    original_employment_duration: Optional[str] = None
    contract_expiry_date: Optional[str] = None
    probation_end_date: Optional[str] = None
    employee_type: str  # "Employee"
    employment_type: str  # "Full Time Standard SSC Regular"
    work_schedule: str  # "Full Timer 40 Hour Week, 7 Days"
    tax_profile: str
    occupation: str
    grade: Optional[str] = None
    work_permit_end_date: Optional[str] = None


class TaxPersonalDetails(BaseModel):
    """Tax and personal status details"""
    civil_status: str  # "Single", "Married"
    partner_id_number: Optional[str] = None
    tax_registration_number: Optional[str] = None
    social_security_number: Optional[str] = None
    academic_level: Optional[str] = None
    has_disability: bool = False
    short_term_benefits: Optional[str] = None
    overtime_allowed: bool = True
    default_ot_pay_item: Optional[str] = None
    no_maternity_leave_fund_deduction: Optional[str] = None
    work_permit_reference: Optional[str] = None


class PaymentDetails(BaseModel):
    """Payment details section"""
    payroll_frequency: str  # "Monthly"
    payment_method: str  # "Direct Credits"
    payslip_method: str  # "Email (Attachment)"
    tags: List[str] = []


class BankDetails(BaseModel):
    """Bank details"""
    company_bank_account: Optional[str] = None
    bank: Optional[str] = None
    iban: Optional[str] = None
    beneficiary_fullname: Optional[str] = None


class EmergencyContact(BaseModel):
    """Emergency contact"""
    name: Optional[str] = None
    surname: Optional[str] = None
    mobile_number: Optional[str] = None
    tel_number: Optional[str] = None
    relationship: Optional[str] = None
    email: Optional[str] = None


class LeaveDetails(BaseModel):
    """Leave details"""
    can_apply_for_leave: bool = True
    self_approve_leave: bool = False


class AttendanceDetails(BaseModel):
    """Attendance details"""
    attendance_employee: bool = True
    punch_type: str  # "Required"
    tags: List[str] = []
    punch_card_number: Optional[str] = None
    punch_card_number_2: Optional[str] = None
    punch_card_number_3: Optional[str] = None
    entitlement_profile: Optional[str] = None
    standard_leave_entitlement: Optional[str] = None
    leave_calendar_view: Optional[str] = None
    hour_schedule: str  # "8 Hours per Day"
    reporting_to_employee: Optional[str] = None
    daily_attendance_type: str  # "Scheduler"
    daily_attendance_profile: str  # "Scheduler"


class ContactDetails(BaseModel):
    """Contact details"""
    employee_mobile_no: Optional[str] = None
    personal_email: Optional[str] = None
    work_email: Optional[str] = None
    address_1: Optional[str] = None
    address_2: Optional[str] = None
    town_village: Optional[str] = None
    post_code: Optional[str] = None
    country: Optional[str] = None


class EmployeeDetailComplete(BaseModel):
    """Complete employee detail"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str
    personal_details: PersonalDetails
    employment_details: EmploymentDetails
    tax_personal_details: TaxPersonalDetails
    payment_details: PaymentDetails
    bank_details: BankDetails
    contact_details: ContactDetails
    emergency_contact_primary: EmergencyContact
    emergency_contact_secondary: EmergencyContact
    leave_details: LeaveDetails
    attendance_details: AttendanceDetails
    external_links: Optional[List[dict]] = None  # [{source: "shireburn", id: "123"}]
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class EmployeeDetailUpdateRequest(BaseModel):
    """Request to update employee details"""
    personal_details: Optional[PersonalDetails] = None
    employment_details: Optional[EmploymentDetails] = None
    tax_personal_details: Optional[TaxPersonalDetails] = None
    payment_details: Optional[PaymentDetails] = None
    bank_details: Optional[BankDetails] = None
    contact_details: Optional[ContactDetails] = None
    emergency_contact_primary: Optional[EmergencyContact] = None
    emergency_contact_secondary: Optional[EmergencyContact] = None
    leave_details: Optional[LeaveDetails] = None
    attendance_details: Optional[AttendanceDetails] = None
