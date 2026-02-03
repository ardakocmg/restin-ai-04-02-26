"""Employee Setup Routes"""
from fastapi import APIRouter, Depends, HTTPException
from models.employee_setup import (
    Bank, Department, Country, Location, Occupation, Grade,
    EmploymentType, WorkScheduleProfile, CostCentre, TerminationReason
)
from core.dependencies import get_current_user, get_database
from typing import List

router = APIRouter(prefix="/employee-setup", tags=["Employee Setup"])


# Banks
@router.get("/banks", response_model=List[Bank])
async def get_banks(current_user: dict = Depends(get_current_user), db = Depends(get_database)):
    venue_id = current_user.get("venueId")
    return [
        Bank(venue_id=venue_id, bank_name="Bank of Valletta", bank_code="BOV", swift_code="VALLMTMT"),
        Bank(venue_id=venue_id, bank_name="HSBC Malta", bank_code="HSBC", swift_code="MMEBMTMT")
    ]

@router.post("/banks", response_model=Bank)
async def create_bank(bank: Bank, current_user: dict = Depends(get_current_user), db = Depends(get_database)):
    bank.venue_id = current_user.get("venueId")
    return bank


# Departments
@router.get("/departments", response_model=List[Department])
async def get_departments(current_user: dict = Depends(get_current_user), db = Depends(get_database)):
    venue_id = current_user.get("venueId")
    return [
        Department(venue_id=venue_id, department_name="Front of House", department_code="FOH"),
        Department(venue_id=venue_id, department_name="Kitchen", department_code="KTCH")
    ]

@router.post("/departments", response_model=Department)
async def create_department(dept: Department, current_user: dict = Depends(get_current_user), db = Depends(get_database)):
    dept.venue_id = current_user.get("venueId")
    return dept


# Countries
@router.get("/countries", response_model=List[Country])
async def get_countries():
    return [
        Country(country_name="Malta", country_code="MT", currency="EUR"),
        Country(country_name="United Kingdom", country_code="UK", currency="GBP")
    ]


# Locations
@router.get("/locations", response_model=List[Location])
async def get_locations(current_user: dict = Depends(get_current_user), db = Depends(get_database)):
    venue_id = current_user.get("venueId")
    return [
        Location(venue_id=venue_id, location_name="Main Restaurant", address="123 Main St"),
        Location(venue_id=venue_id, location_name="Bar", address="456 Bar St")
    ]

@router.post("/locations", response_model=Location)
async def create_location(location: Location, current_user: dict = Depends(get_current_user), db = Depends(get_database)):
    location.venue_id = current_user.get("venueId")
    return location


# Occupations
@router.get("/occupations", response_model=List[Occupation])
async def get_occupations(current_user: dict = Depends(get_current_user), db = Depends(get_database)):
    venue_id = current_user.get("venueId")
    return [
        Occupation(venue_id=venue_id, occupation_name="Chef de Rang", occupation_code="CDR"),
        Occupation(venue_id=venue_id, occupation_name="Commis Chef", occupation_code="CC")
    ]

@router.post("/occupations", response_model=Occupation)
async def create_occupation(occ: Occupation, current_user: dict = Depends(get_current_user), db = Depends(get_database)):
    occ.venue_id = current_user.get("venueId")
    return occ


# Employment Types
@router.get("/employment-types", response_model=List[EmploymentType])
async def get_employment_types(current_user: dict = Depends(get_current_user), db = Depends(get_database)):
    venue_id = current_user.get("venueId")
    return [
        EmploymentType(venue_id=venue_id, type_name="Full Time", type_code="FT"),
        EmploymentType(venue_id=venue_id, type_name="Part Time", type_code="PT")
    ]

@router.post("/employment-types", response_model=EmploymentType)
async def create_employment_type(emp_type: EmploymentType, current_user: dict = Depends(get_current_user), db = Depends(get_database)):
    emp_type.venue_id = current_user.get("venueId")
    return emp_type


# Work Schedule Profiles
@router.get("/work-schedules", response_model=List[WorkScheduleProfile])
async def get_work_schedules(current_user: dict = Depends(get_current_user), db = Depends(get_database)):
    venue_id = current_user.get("venueId")
    return [
        WorkScheduleProfile(venue_id=venue_id, profile_name="Full Timer 40 Hour Week", hours_per_week=40, days_per_week=5),
        WorkScheduleProfile(venue_id=venue_id, profile_name="Part Timer 20 Hour Week", hours_per_week=20, days_per_week=3)
    ]

@router.post("/work-schedules", response_model=WorkScheduleProfile)
async def create_work_schedule(schedule: WorkScheduleProfile, current_user: dict = Depends(get_current_user), db = Depends(get_database)):
    schedule.venue_id = current_user.get("venueId")
    return schedule


# Cost Centres
@router.get("/cost-centres", response_model=List[CostCentre])
async def get_cost_centres(current_user: dict = Depends(get_current_user), db = Depends(get_database)):
    venue_id = current_user.get("venueId")
    return [
        CostCentre(venue_id=venue_id, cost_centre_name="DON FOH", cost_centre_code="DON-FOH"),
        CostCentre(venue_id=venue_id, cost_centre_name="C&B FOH", cost_centre_code="CB-FOH")
    ]

@router.post("/cost-centres", response_model=CostCentre)
async def create_cost_centre(cc: CostCentre, current_user: dict = Depends(get_current_user), db = Depends(get_database)):
    cc.venue_id = current_user.get("venueId")
    return cc


# Termination Reasons
@router.get("/termination-reasons", response_model=List[TerminationReason])
async def get_termination_reasons(current_user: dict = Depends(get_current_user), db = Depends(get_database)):
    venue_id = current_user.get("venueId")
    return [
        TerminationReason(venue_id=venue_id, reason_name="Resignation", reason_code="RES"),
        TerminationReason(venue_id=venue_id, reason_name="Retirement", reason_code="RET")
    ]

@router.post("/termination-reasons", response_model=TerminationReason)
async def create_termination_reason(reason: TerminationReason, current_user: dict = Depends(get_current_user), db = Depends(get_database)):
    reason.venue_id = current_user.get("venueId")
    return reason
