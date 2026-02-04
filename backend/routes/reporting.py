"""Reporting Routes"""
from fastapi import APIRouter, Depends
from models.reporting import EmployeeDetailReport, TrainingCertification, BirthdayAnniversary
from core.dependencies import get_current_user, get_database
from typing import List
from datetime import datetime

router = APIRouter(prefix="/reporting", tags=["Reporting"])


@router.get("/employee-details", response_model=List[EmployeeDetailReport])
async def get_employee_details_report(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Get employee details report"""
    return [
        EmployeeDetailReport(
            employee_id="emp_001",
            name="John Doe",
            occupation="Chef de Rang",
            department="Front of House",
            employment_date="2020-01-15",
            status="Active"
        ),
        EmployeeDetailReport(
            employee_id="emp_002",
            name="Jane Smith",
            occupation="Commis Chef",
            department="Kitchen",
            employment_date="2021-03-20",
            status="Active"
        )
    ]


@router.get("/training-expiring-soon", response_model=List[TrainingCertification])
async def get_training_expiring_soon(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Get training & certifications expiring soon"""
    venue_id = current_user.get("venueId")
    return [
        TrainingCertification(
            venue_id=venue_id,
            employee_id="emp_001",
            employee_name="John Doe",
            certification_name="Food Safety Certificate",
            expiry_date="2026-03-15",
            status="expiring_soon"
        )
    ]


@router.get("/training-starting-soon", response_model=List[TrainingCertification])
async def get_training_starting_soon(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Get training & certifications starting soon"""
    venue_id = current_user.get("venueId")
    return [
        TrainingCertification(
            venue_id=venue_id,
            employee_id="emp_002",
            employee_name="Jane Smith",
            certification_name="Advanced Culinary Course",
            start_date="2026-02-10",
            status="starting_soon"
        )
    ]


@router.get("/training-ongoing", response_model=List[TrainingCertification])
async def get_training_ongoing(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Get ongoing training & certifications"""
    venue_id = current_user.get("venueId")
    return [
        TrainingCertification(
            venue_id=venue_id,
            employee_id="emp_003",
            employee_name="Bob Johnson",
            certification_name="Wine Sommelier",
            start_date="2026-01-05",
            expiry_date="2026-06-05",
            status="ongoing"
        )
    ]


@router.get("/birthdays-anniversaries", response_model=List[BirthdayAnniversary])
async def get_birthdays_anniversaries(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Get upcoming birthdays & anniversaries"""
    return [
        BirthdayAnniversary(
            employee_id="emp_001",
            employee_name="John Doe",
            event_type="birthday",
            date="2026-02-15"
        ),
        BirthdayAnniversary(
            employee_id="emp_002",
            employee_name="Jane Smith",
            event_type="work_anniversary",
            date="2026-03-20",
            years=5
        )
    ]


@router.get("/indigo/{report_slug}")
async def get_indigo_report(
    report_slug: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Factory for all Indigo-parity reports"""
    title = report_slug.replace("-", " ").title()
    
    # Common mock columns
    columns = [
        {"key": "employee", "label": "Employee"},
        {"key": "date", "label": "Date"},
        {"key": "value", "label": "Status/Value"},
        {"key": "dept", "label": "Department"}
    ]
    
    # Mock data varied by slug count
    mock_data = [
        {"employee": "MARVIN GAUCI", "date": "2026-02-01", "value": "COMPLIANT", "dept": "MANAGEMENT"},
        {"employee": "KEITH SAID", "date": "2026-02-01", "value": "PENDING", "dept": "OPERATIONS"},
        {"employee": "MOHAMED HEMIDA", "date": "2026-01-28", "value": "REVIEW", "dept": "KITCHEN"}
    ]
    
    return {
        "title": f"Indigo {title}",
        "slug": report_slug,
        "data": mock_data,
        "columns": columns
    }
