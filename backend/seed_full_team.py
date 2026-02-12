"""
Comprehensive Employee Data Seeder — Real-linked data for all collections
Seeds: employees, users, employee_details, payroll_runs, fs3_entries,
       fs5_forms, fs7_forms, shifts, clocking_records
"""
import asyncio
import os
import uuid
import hashlib
import random
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

# Setup
BACKEND_DIR = Path(__file__).parent
load_dotenv(BACKEND_DIR / ".env")

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "restin_ai_db")
VENUE_ID = "venue-marvin-group"
MALTA_TZ = ZoneInfo("Europe/Malta")

# ── Employee Roster (10 staff from mock_data_store) ──────────────────────
EMPLOYEES = [
    {
        "code": "1001", "name": "DONALD", "surname": "AGIUS", "full_name": "DONALD AGIUS",
        "gender": "Male", "dob": "1985-05-15", "nationality": "Maltese",
        "id_number": "123456M", "ss_number": "SS-AG-001", "pe_number": "PE-001",
        "occupation": "RESTAURANT MANAGER", "cost_centre": "DON FOH",
        "department": "Front of House", "employment_type": "Full Time Standard SSC Regular",
        "employment_date": "2018-01-10", "hourly_rate": 18.50, "monthly_salary": 2960.00,
        "email": "donald.agius@marvingauci.com", "phone": "+356 99123456",
        "address": "12, Main Street, Sliema", "town": "Sliema", "post_code": "SLM 1010",
        "bank": "BOV", "iban": "MT84VALL22013000000040107823945",
        "vendor": "Don Royale", "tax_status": "Single", "ssc_cat": "A",
        "role": "manager", "punch_card": "1001", "work_schedule": "Full Timer 40 Hour Week, 7 Days",
        "tax_profile": "Single Rate", "grade": "Senior",
    },
    {
        "code": "1002", "name": "ANNE FAITH", "surname": "ALINAN", "full_name": "ANNE FAITH ALINAN",
        "gender": "Female", "dob": "1994-11-20", "nationality": "Filipino",
        "id_number": "654321A", "ss_number": "SS-AL-002", "pe_number": "PE-002",
        "occupation": "HOSTESS", "cost_centre": "C&B FOH",
        "department": "Front of House", "employment_type": "Full Time Standard SSC Regular",
        "employment_date": "2020-03-15", "hourly_rate": 12.50, "monthly_salary": 2000.00,
        "email": "anne.alinan@marvingauci.com", "phone": "+356 99654321",
        "address": "Flat 5, Tower Road, St Julians", "town": "St Julians", "post_code": "STJ 1013",
        "bank": "HSBC", "iban": "MT55HSBC0000000000000654321",
        "vendor": "Caviar and Bull", "tax_status": "Single", "ssc_cat": "A",
        "role": "staff", "punch_card": "1002", "work_schedule": "Full Timer 40 Hour Week, 7 Days",
        "tax_profile": "Single Rate", "grade": "Standard",
    },
    {
        "code": "1003", "name": "MARC", "surname": "ALPHONSI", "full_name": "MARC ALPHONSI",
        "gender": "Male", "dob": "1991-02-28", "nationality": "French",
        "id_number": "789012L", "ss_number": "SS-AP-003", "pe_number": "PE-003",
        "occupation": "CHEF DE RANG", "cost_centre": "C&B FOH",
        "department": "Front of House", "employment_type": "Full Time Standard SSC Regular",
        "employment_date": "2021-06-01", "hourly_rate": 13.00, "monthly_salary": 2080.00,
        "email": "marc.alphonsi@marvingauci.com", "phone": "+356 99789012",
        "address": "22, Republic Street, Valletta", "town": "Valletta", "post_code": "VLT 1110",
        "bank": "BOV", "iban": "MT84VALL22013000000040789012",
        "vendor": "Sole by Tarragon", "tax_status": "Single", "ssc_cat": "A",
        "role": "staff", "punch_card": "1003", "work_schedule": "Full Timer 40 Hour Week, 7 Days",
        "tax_profile": "Single Rate", "grade": "Standard",
    },
    {
        "code": "1004", "name": "BRANKO", "surname": "ANASTASOV", "full_name": "BRANKO ANASTASOV",
        "gender": "Male", "dob": "1989-07-12", "nationality": "Macedonian",
        "id_number": "345678B", "ss_number": "SS-AN-004", "pe_number": "PE-004",
        "occupation": "CHEF DE RANG", "cost_centre": "C&B FOH",
        "department": "Front of House", "employment_type": "Full Time Standard SSC Regular",
        "employment_date": "2022-01-15", "hourly_rate": 13.00, "monthly_salary": 2080.00,
        "email": "branko.anastasov@marvingauci.com", "phone": "+356 99345678",
        "address": "15, Sea View, Gzira", "town": "Gzira", "post_code": "GZR 1404",
        "bank": "BOV", "iban": "MT84VALL22013000000040345678",
        "vendor": "Don Royale", "tax_status": "Single", "ssc_cat": "A",
        "role": "staff", "punch_card": "1004", "work_schedule": "Full Timer 40 Hour Week, 7 Days",
        "tax_profile": "Single Rate", "grade": "Standard",
    },
    {
        "code": "1005", "name": "MARAM", "surname": "BEN ARBIA", "full_name": "MARAM BEN ARBIA",
        "gender": "Female", "dob": "1998-12-05", "nationality": "Tunisian",
        "id_number": "901234T", "ss_number": "SS-BA-005", "pe_number": "PE-005",
        "occupation": "HOSTESS", "cost_centre": "C&B FOH",
        "department": "Front of House", "employment_type": "Part Time Standard SSC Regular",
        "employment_date": "2023-09-10", "hourly_rate": 11.50, "monthly_salary": 1380.00,
        "email": "maram.benarbia@marvingauci.com", "phone": "+356 99901234",
        "address": "8, Church Street, Mosta", "town": "Mosta", "post_code": "MST 1150",
        "bank": "HSBC", "iban": "MT55HSBC0000000000000901234",
        "vendor": "Caviar and Bull", "tax_status": "Single", "ssc_cat": "A",
        "role": "staff", "punch_card": "1005", "work_schedule": "Part Timer 24 Hour Week, 5 Days",
        "tax_profile": "Part Time Standard", "grade": "Standard",
    },
    {
        "code": "HEMIDA", "name": "MOHAMED HASSAN", "surname": "MABRO HEMIDA",
        "full_name": "(HAMU) MOHAMED HASSAN MABRO",
        "gender": "Male", "dob": "1983-10-25", "nationality": "Egyptian",
        "id_number": "198310A", "ss_number": "SS-MH-006", "pe_number": "PE-006",
        "occupation": "COMMIS CHEF", "cost_centre": "C&B KTCH",
        "department": "Kitchen", "employment_type": "Full Time Regular SSC Regular",
        "employment_date": "2019-11-20", "hourly_rate": 14.50, "monthly_salary": 2320.00,
        "email": "mhhs1800@gmail.com", "phone": "+356 99352936",
        "address": "Triq Il-Qanpiena, Swatar", "town": "Swatar", "post_code": "MST 2023",
        "bank": "BOV", "iban": "MT84VALL22013000000040198310",
        "vendor": "Sole by Tarragon", "tax_status": "Married", "ssc_cat": "A",
        "role": "staff", "punch_card": "1009", "work_schedule": "Full Timer 40 Hour Week, 7 Days",
        "tax_profile": "Married Rate", "grade": "Standard",
    },
    {
        "code": "1006", "name": "AMAL", "surname": "ASHOKAN", "full_name": "AMAL ASHOKAN",
        "gender": "Male", "dob": "1995-04-18", "nationality": "Indian",
        "id_number": "567890X", "ss_number": "SS-AS-007", "pe_number": "PE-007",
        "occupation": "F&B SERVER", "cost_centre": "DON FOH",
        "department": "Front of House", "employment_type": "Full Time Standard SSC Regular",
        "employment_date": "2020-05-22", "hourly_rate": 11.00, "monthly_salary": 1760.00,
        "email": "amal.ashokan@marvingauci.com", "phone": "+356 99567890",
        "address": "1, High St, Hamrun", "town": "Hamrun", "post_code": "HMR 1400",
        "bank": "BOV", "iban": "MT84VALL22013000000040567890",
        "vendor": "Don Royale", "tax_status": "Single", "ssc_cat": "A",
        "role": "staff", "punch_card": "1006", "work_schedule": "Full Timer 40 Hour Week, 7 Days",
        "tax_profile": "Single Rate", "grade": "Standard",
    },
    {
        "code": "1007", "name": "NIKOL", "surname": "AVGUSTOVA", "full_name": "NIKOL AVGUSTOVA",
        "gender": "Female", "dob": "2004-08-30", "nationality": "Bulgarian",
        "id_number": "112233K", "ss_number": "SS-AV-008", "pe_number": "PE-008",
        "occupation": "KITCHEN INTERN", "cost_centre": "C&B KTCH",
        "department": "Kitchen", "employment_type": "Internship",
        "employment_date": "2024-01-15", "hourly_rate": 9.00, "monthly_salary": 1080.00,
        "email": "nikol.avgustova@marvingauci.com", "phone": "+356 99112233",
        "address": "St Pauls Bay", "town": "St Pauls Bay", "post_code": "SPB 1432",
        "bank": "HSBC", "iban": "MT55HSBC0000000000000112233",
        "vendor": "Caviar and Bull", "tax_status": "Single", "ssc_cat": "C",
        "role": "staff", "punch_card": "1007", "work_schedule": "Part Timer 24 Hour Week, 5 Days",
        "tax_profile": "Student Special Rate", "grade": "Intern",
    },
    {
        "code": "1008", "name": "BHIM", "surname": "BAHADUR", "full_name": "BHIM BAHADUR",
        "gender": "Male", "dob": "1992-06-21", "nationality": "Nepali",
        "id_number": "778899N", "ss_number": "SS-BH-009", "pe_number": "PE-009",
        "occupation": "CLEANER", "cost_centre": "DON KTCH",
        "department": "Kitchen", "employment_type": "Full Time Standard SSC Regular",
        "employment_date": "2022-08-10", "hourly_rate": 10.50, "monthly_salary": 1680.00,
        "email": "bhim.bahadur@marvingauci.com", "phone": "+356 99778899",
        "address": "Qormi", "town": "Qormi", "post_code": "QRM 2120",
        "bank": "BOV", "iban": "MT84VALL22013000000040778899",
        "vendor": "Sole by Tarragon", "tax_status": "Single", "ssc_cat": "A",
        "role": "staff", "punch_card": "1008", "work_schedule": "Full Timer 40 Hour Week, 7 Days",
        "tax_profile": "Single Rate", "grade": "Standard",
    },
    {
        "code": "1009", "name": "MAHESH PRASAD", "surname": "BHATTARAI",
        "full_name": "MAHESH PRASAD BHATTARAI",
        "gender": "Male", "dob": "1996-01-30", "nationality": "Nepali",
        "id_number": "334455P", "ss_number": "SS-BT-010", "pe_number": "PE-010",
        "occupation": "F&B SERVER", "cost_centre": "C&B FOH",
        "department": "Front of House", "employment_type": "Full Time Standard SSC Regular",
        "employment_date": "2021-10-12", "hourly_rate": 11.00, "monthly_salary": 1760.00,
        "email": "mahesh.prasad@marvingauci.com", "phone": "+356 99334455",
        "address": "Msida", "town": "Msida", "post_code": "MSD 1120",
        "bank": "BOV", "iban": "MT84VALL22013000000040334455",
        "vendor": "Don Royale", "tax_status": "Single", "ssc_cat": "A",
        "role": "staff", "punch_card": "1009", "work_schedule": "Full Timer 40 Hour Week, 7 Days",
        "tax_profile": "Single Rate", "grade": "Standard",
    },
]


def _pin_hash(pin: str) -> str:
    return hashlib.sha256(pin.encode()).hexdigest()


def _age(dob_str: str) -> int:
    dob = datetime.strptime(dob_str, "%Y-%m-%d")
    today = datetime(2026, 2, 12)
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))


def _employment_duration(start_str: str) -> str:
    start = datetime.strptime(start_str, "%Y-%m-%d")
    today = datetime(2026, 2, 12)
    years = today.year - start.year
    months = today.month - start.month
    if months < 0:
        years -= 1
        months += 12
    return f"{years}Y {months}M"


async def seed():
    print("=" * 70)
    print("  RESTIN.AI — Full Team Seeder")
    print("=" * 70)

    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    # ── 1. EMPLOYEES ─────────────────────────────────────────────────────
    print("\n[1/8] Seeding employees...")
    emp_ids = {}  # code -> generated UUID
    for e in EMPLOYEES:
        emp_id = str(uuid.uuid4())
        emp_ids[e["code"]] = emp_id

        doc = {
            "id": emp_id,
            "display_id": f"EMP-{e['code']}",
            "venue_id": VENUE_ID,
            "name": e["full_name"],
            "full_name": e["full_name"],
            "short_name": e["surname"],
            "email": e["email"],
            "phone": e["phone"],
            "address": {
                "full_address": e["address"],
                "city": e["town"],
                "country": "Malta",
                "post_code": e["post_code"],
            },
            "id_number": e["id_number"],
            "ss_number": e["ss_number"],
            "pe_number": e["pe_number"],
            "occupation": e["occupation"],
            "cost_centre": e["cost_centre"],
            "department": e["department"],
            "employment_type": e["employment_type"],
            "employment_status": "active",
            "employment_date": e["employment_date"],
            "status": "active",
            "role": e["role"],
            "vendor": e["vendor"],
            "hourly_rate": e["hourly_rate"],
            "monthly_salary": e["monthly_salary"],
            "payroll": {
                "hourly_rate": e["hourly_rate"],
                "monthly_salary": e["monthly_salary"],
                "currency": "EUR",
                "tax_rate_type": e["tax_profile"],
                "iban": e["iban"],
            },
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.employees.update_one(
            {"display_id": f"EMP-{e['code']}", "venue_id": VENUE_ID},
            {"$set": doc},
            upsert=True,
        )
    print(f"    ✓ {len(EMPLOYEES)} employees upserted")

    # ── 2. USERS (Login accounts) ────────────────────────────────────────
    print("\n[2/8] Seeding user accounts...")
    PIN_MAP = {"1001": "1111", "1002": "2222", "1003": "3333", "1004": "4444",
               "1005": "5555", "HEMIDA": "6666", "1006": "7777", "1007": "8888",
               "1008": "9999", "1009": "1010"}

    for e in EMPLOYEES:
        pin = PIN_MAP.get(e["code"], "1234")
        role_upper = e["role"].upper()
        # Auth system expects "OWNER" for managers (maps to UserRole.OWNER)
        if role_upper == "MANAGER":
            role_upper = "OWNER"

        user_doc = {
            "id": emp_ids[e["code"]],
            "name": e["full_name"],
            "fullName": e["full_name"],
            "email": e["email"],
            "pin": pin,
            "pin_hash": _pin_hash(pin),
            "role": role_upper,
            "venue_id": VENUE_ID,
            "venueId": VENUE_ID,
            "venueName": "Marvin Gauci Group",
            "department": e["department"],
            "employeeCode": e["code"],
            "active": True,
            "allowed_venue_ids": [VENUE_ID],
            "default_venue_id": VENUE_ID,
            "profilePicture": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.users.update_one(
            {"email": e["email"]},
            {"$set": user_doc},
            upsert=True,
        )
    print(f"    ✓ {len(EMPLOYEES)} user accounts upserted")

    # ── 3. EMPLOYEE_DETAILS (Full Shireburn-style profiles) ──────────────
    print("\n[3/8] Seeding employee_details...")
    for e in EMPLOYEES:
        detail = {
            "id": emp_ids[e["code"]],
            "venue_id": VENUE_ID,
            "personal_details": {
                "code": e["code"],
                "id_number": e["id_number"],
                "title": "Mr" if e["gender"] == "Male" else "Ms",
                "surname": e["surname"],
                "name": e["name"],
                "middle_name": None,
                "also_known_as": None,
                "sex": e["gender"],
                "date_of_birth": e["dob"],
                "age": _age(e["dob"]),
                "nationality": e["nationality"],
                "citizenship": e["nationality"],
                "profile_picture": None,
            },
            "employment_details": {
                "employment_date": e["employment_date"],
                "employment_duration": _employment_duration(e["employment_date"]),
                "termination_date": None,
                "termination_reason": None,
                "original_employment_date": e["employment_date"],
                "original_employment_duration": _employment_duration(e["employment_date"]),
                "contract_expiry_date": None,
                "probation_end_date": None,
                "employee_type": "Employee",
                "employment_type": e["employment_type"],
                "work_schedule": e["work_schedule"],
                "tax_profile": e["tax_profile"],
                "occupation": e["occupation"],
                "grade": e["grade"],
                "work_permit_end_date": None,
            },
            "tax_personal_details": {
                "civil_status": e["tax_status"],
                "partner_id_number": None,
                "tax_registration_number": e["pe_number"],
                "social_security_number": e["ss_number"],
                "academic_level": None,
                "has_disability": False,
                "short_term_benefits": None,
                "overtime_allowed": True,
                "default_ot_pay_item": "OT 1.5x",
                "no_maternity_leave_fund_deduction": None,
                "work_permit_reference": None,
            },
            "payment_details": {
                "payroll_frequency": "Monthly",
                "payment_method": "Direct Credits",
                "payslip_method": "Email (Attachment)",
                "tags": [],
            },
            "bank_details": {
                "company_bank_account": "Marvin Gauci Group Main",
                "bank": e["bank"],
                "iban": e["iban"],
                "beneficiary_fullname": e["full_name"],
            },
            "contact_details": {
                "employee_mobile_no": e["phone"],
                "personal_email": e["email"],
                "work_email": e["email"],
                "address_1": e["address"],
                "address_2": None,
                "town_village": e["town"],
                "post_code": e["post_code"],
                "country": "Malta",
            },
            "emergency_contact_primary": {
                "name": "Emergency", "surname": "Contact",
                "mobile_number": "+356 21000000",
                "tel_number": None, "relationship": "Family", "email": None,
            },
            "emergency_contact_secondary": {
                "name": None, "surname": None, "mobile_number": None,
                "tel_number": None, "relationship": None, "email": None,
            },
            "leave_details": {
                "can_apply_for_leave": True,
                "self_approve_leave": e["role"] == "manager",
            },
            "attendance_details": {
                "attendance_employee": True,
                "punch_type": "Required",
                "tags": [],
                "punch_card_number": e["punch_card"],
                "punch_card_number_2": None,
                "punch_card_number_3": None,
                "entitlement_profile": "Standard",
                "standard_leave_entitlement": "24 days",
                "leave_calendar_view": "Monthly",
                "hour_schedule": "8 Hours per Day",
                "reporting_to_employee": "DONALD AGIUS" if e["code"] != "1001" else None,
                "daily_attendance_type": "Scheduler",
                "daily_attendance_profile": "Scheduler",
            },
            "external_links": [{"source": "shireburn_indigo", "id": e["code"]}],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.employee_details.update_one(
            {"id": emp_ids[e["code"]]},
            {"$set": detail},
            upsert=True,
        )
    print(f"    ✓ {len(EMPLOYEES)} employee details created")

    # ── 4. PAYROLL RUNS (Jan 2026) ───────────────────────────────────────
    print("\n[4/8] Seeding payroll runs...")

    # Malta 2026 tax brackets (Single)
    def calc_tax(monthly_gross: float, status: str) -> float:
        annual = monthly_gross * 12
        if status == "Married":
            if annual <= 12700: return 0
            if annual <= 21200: return (annual - 12700) * 0.15 / 12
            if annual <= 28700: return ((21200 - 12700) * 0.15 + (annual - 21200) * 0.25) / 12
            return ((21200 - 12700) * 0.15 + (28700 - 21200) * 0.25 + (annual - 28700) * 0.35) / 12
        else:  # Single
            if annual <= 9100: return 0
            if annual <= 14500: return (annual - 9100) * 0.15 / 12
            if annual <= 19500: return ((14500 - 9100) * 0.15 + (annual - 14500) * 0.25) / 12
            if annual <= 60000: return ((14500 - 9100) * 0.15 + (19500 - 14500) * 0.25 + (annual - 19500) * 0.35) / 12
            return ((14500 - 9100) * 0.15 + (19500 - 14500) * 0.25 + (60000 - 19500) * 0.35 + (annual - 60000) * 0.35) / 12

    def calc_ssc(monthly_gross: float) -> float:
        return round(min(monthly_gross * 0.10, 210.00), 2)  # 10% capped

    def calc_maternity(monthly_gross: float) -> float:
        return round(monthly_gross * 0.002, 2)  # 0.2% maternity fund

    run_id = "run_jan_2026"
    payslips = []
    total_gross = total_tax = total_ssc_emp = total_ssc_employer = total_maternity = 0

    for e in EMPLOYEES:
        gross = e["monthly_salary"]
        tax = round(calc_tax(gross, e["tax_status"]), 2)
        ssc = calc_ssc(gross)
        ssc_er = round(min(gross * 0.10, 210.00), 2)
        maternity = calc_maternity(gross)
        net = round(gross - tax - ssc - maternity, 2)

        payslip = {
            "employee_id": emp_ids[e["code"]],
            "employee_name": e["full_name"],
            "employee_number": e["code"],
            "id_card": e["id_number"],
            "occupation": e["occupation"],
            "department": e["department"],
            "gross_pay": gross,
            "net_pay": net,
            "tax_amount": tax,
            "ssc_employee": ssc,
            "ssc_employer": ssc_er,
            "maternity_fund": maternity,
            "total_deductions": round(tax + ssc + maternity, 2),
            "basic_pay": gross,
            "iban": e["iban"],
            "components": [
                {"component_name": "Basic Pay", "amount": gross, "type": "earning"},
                {"component_name": "FSS Tax", "amount": tax, "type": "deduction"},
                {"component_name": "Social Security (Employee)", "amount": ssc, "type": "deduction"},
                {"component_name": "Social Security (Employer)", "amount": ssc_er, "type": "employer_cost"},
                {"component_name": "Maternity Fund", "amount": maternity, "type": "deduction"},
            ],
        }
        payslips.append(payslip)
        total_gross += gross
        total_tax += tax
        total_ssc_emp += ssc
        total_ssc_employer += ssc_er
        total_maternity += maternity

    run_doc = {
        "id": run_id,
        "venue_id": VENUE_ID,
        "run_name": "January 2026",
        "period": "2026-01",
        "period_start": "01/01/2026",
        "period_end": "31/01/2026",
        "state": "approved",
        "employee_count": len(EMPLOYEES),
        "total_gross": round(total_gross, 2),
        "total_tax": round(total_tax, 2),
        "total_ssc_employee": round(total_ssc_emp, 2),
        "total_ssc_employer": round(total_ssc_employer, 2),
        "total_maternity": round(total_maternity, 2),
        "total_net": round(total_gross - total_tax - total_ssc_emp - total_maternity, 2),
        "payslips": payslips,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": "system_seeder",
    }
    await db.payroll_runs.update_one(
        {"id": run_id}, {"$set": run_doc}, upsert=True
    )
    print(f"    ✓ Payroll run '{run_id}' created ({len(payslips)} payslips)")

    # ── 5. FS3 ENTRIES (Annual per-employee) ─────────────────────────────
    print("\n[5/8] Seeding FS3 entries...")
    for e in EMPLOYEES:
        gross_annual = e["monthly_salary"] * 12
        tax_annual = round(calc_tax(e["monthly_salary"], e["tax_status"]) * 12, 2)
        ssc_annual = round(calc_ssc(e["monthly_salary"]) * 12, 2)
        mat_annual = round(calc_maternity(e["monthly_salary"]) * 12, 2)

        fs3 = {
            "id": f"fs3-2025-{e['code']}",
            "employee_id": emp_ids[e["code"]],
            "employee_name": e["full_name"],
            "employee_code": e["code"],
            "id_number": e["id_number"],
            "ss_number": e["ss_number"],
            "venue_id": VENUE_ID,
            "year": 2025,
            "gross_emoluments": round(gross_annual, 2),
            "tax_deducted": tax_annual,
            "ssc_employee": ssc_annual,
            "maternity_fund": mat_annual,
            "status": "submitted",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.fs3_entries.update_one(
            {"id": fs3["id"]}, {"$set": fs3}, upsert=True
        )
    print(f"    ✓ {len(EMPLOYEES)} FS3 entries (2025)")

    # ── 6. FS5 FORMS (Monthly SSC return) ────────────────────────────────
    print("\n[6/8] Seeding FS5 forms...")
    for month in range(1, 13):
        fs5 = {
            "id": f"fs5-2025-{month:02d}",
            "venue_id": VENUE_ID,
            "month": month,
            "year": 2025,
            "number_of_payees": len(EMPLOYEES),
            "total_gross_emoluments": round(total_gross, 2),
            "total_tax_deducted": round(total_tax, 2),
            "total_ssc_contributions": round(total_ssc_emp + total_ssc_employer, 2),
            "total_maternity_fund": round(total_maternity, 2),
            "date_submitted": datetime(2025, month, 28, 12, 0, 0, tzinfo=timezone.utc).isoformat(),
            "status": "submitted",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.fs5_forms.update_one(
            {"id": fs5["id"]}, {"$set": fs5}, upsert=True
        )
    print("    ✓ 12 FS5 monthly forms (2025)")

    # ── 7. FS7 FORM (Annual reconciliation) ──────────────────────────────
    print("\n[7/8] Seeding FS7 form...")
    total_fs5_payments = round((total_tax + total_ssc_emp + total_ssc_employer + total_maternity) * 12, 2)
    fs7 = {
        "id": "fs7-2025",
        "venue_id": VENUE_ID,
        "year": 2025,
        "total_gross_emoluments": round(total_gross * 12, 2),
        "total_tax_deducted": round(total_tax * 12, 2),
        "total_ssc_contributions": round((total_ssc_emp + total_ssc_employer) * 12, 2),
        "total_maternity_fund": round(total_maternity * 12, 2),
        "total_fs5_payments": total_fs5_payments,
        "balance_due": 0.00,
        "status": "reconciled",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.fs7_forms.update_one(
        {"id": fs7["id"]}, {"$set": fs7}, upsert=True
    )
    print("    ✓ FS7 annual reconciliation (2025)")

    # ── 8. SHIFTS + CLOCKING RECORDS (Jan-Feb 2026) ──────────────────────
    print("\n[8/8] Seeding shifts & clocking records...")

    # Clean old data
    await db.shifts.delete_many({"venue_id": VENUE_ID})
    await db.clocking_records.delete_many({"venue_id": VENUE_ID})

    # Shift patterns per department
    SHIFT_PATTERNS = {
        "Front of House": [
            {"start": "10:00", "end": "18:00", "label": "Morning"},
            {"start": "16:00", "end": "00:00", "label": "Evening"},
            {"start": "18:00", "end": "02:00", "label": "Night"},
        ],
        "Kitchen": [
            {"start": "07:00", "end": "15:00", "label": "Morning Prep"},
            {"start": "14:00", "end": "22:00", "label": "Service"},
            {"start": "08:00", "end": "16:00", "label": "Day"},
        ],
    }

    base_date = datetime(2026, 1, 5)  # Monday
    num_days = 38  # Jan 5 → Feb 11
    shifts_inserted = 0
    clocking_inserted = 0

    for e in EMPLOYEES:
        dept = e["department"]
        patterns = SHIFT_PATTERNS.get(dept, SHIFT_PATTERNS["Front of House"])
        is_part_time = "Part Time" in e["employment_type"]

        for d in range(num_days):
            day = base_date + timedelta(days=d)

            # Rest days
            if day.weekday() == 6:  # Sunday off
                continue
            if is_part_time and day.weekday() in (2, 4):  # Wed/Fri off for PT
                continue
            if random.random() < 0.08:  # Random day off (~8%)
                continue

            # Pick a shift pattern
            pattern = patterns[d % len(patterns)]
            start_h, start_m = map(int, pattern["start"].split(":"))
            end_h, end_m = map(int, pattern["end"].split(":"))

            # Calculate hours
            start_total = start_h * 60 + start_m
            end_total = end_h * 60 + end_m
            if end_total <= start_total:
                end_total += 24 * 60
            hours = round((end_total - start_total) / 60, 2)

            shift_id = str(uuid.uuid4())
            shift_doc = {
                "id": shift_id,
                "venue_id": VENUE_ID,
                "employee_id": emp_ids[e["code"]],
                "employee_name": e["full_name"],
                "role": e["occupation"],
                "department": dept,
                "cost_centre": e["cost_centre"],
                "vendor": e["vendor"],
                "start_time": day.replace(hour=start_h, minute=start_m).isoformat(),
                "end_time": day.replace(hour=end_h if end_h < 24 else end_h - 24, minute=end_m).isoformat(),
                "date": day.strftime("%Y-%m-%d"),
                "shift_label": pattern["label"],
                "hours_planned": hours,
                "hourly_rate": e["hourly_rate"],
                "total_cost": round(hours * e["hourly_rate"], 2),
                "status": "completed" if day < datetime(2026, 2, 12) else "scheduled",
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            await db.shifts.insert_one(shift_doc)
            shifts_inserted += 1

            # Clocking record (only for completed shifts)
            if day < datetime(2026, 2, 12):
                # Add slight variance for realism
                var_in = random.randint(-5, 10)
                var_out = random.randint(-10, 15)
                actual_start = f"{start_h:02d}:{max(0, start_m + var_in):02d}"
                if end_h >= 24:
                    actual_end_h = end_h - 24
                else:
                    actual_end_h = end_h
                actual_end = f"{actual_end_h:02d}:{max(0, min(59, end_m + var_out)):02d}"

                actual_hours = round(hours + (var_out - var_in) / 60, 2)

                clocking_doc = {
                    "id": f"clk-{e['code']}-{day.strftime('%Y%m%d')}",
                    "venue_id": VENUE_ID,
                    "employee_id": emp_ids[e["code"]],
                    "day_of_week": day.strftime("%A"),
                    "date": day.strftime("%d/%m/%Y"),
                    "clocking_in": actual_start,
                    "clocking_out": actual_end,
                    "hours_worked": max(0, actual_hours),
                    "status": "completed",
                    "employee_name": e["full_name"],
                    "employee_designation": e["occupation"],
                    "cost_centre": e["cost_centre"],
                    "work_area": e["department"],
                    "source_device": "terminal",
                    "device_name": "Term_01",
                    "shift_id": shift_id,
                    "ip_address": "192.168.1.100",
                    "modified_by": "System",
                    "created_by": "Term_01",
                    "remark": "Regular Duty",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                }
                await db.clocking_records.insert_one(clocking_doc)
                clocking_inserted += 1

    print(f"    ✓ {shifts_inserted} shifts inserted")
    print(f"    ✓ {clocking_inserted} clocking records inserted")

    # ── SUMMARY ──────────────────────────────────────────────────────────
    print("\n" + "=" * 70)
    print("  SEEDING COMPLETE!")
    print("=" * 70)
    print(f"  Employees:        {len(EMPLOYEES)}")
    print(f"  Users:            {len(EMPLOYEES)}")
    print(f"  Employee Details: {len(EMPLOYEES)}")
    print(f"  Payroll Runs:     1 (Jan 2026)")
    print(f"  FS3 Entries:      {len(EMPLOYEES)} (2025)")
    print(f"  FS5 Forms:        12 (2025)")
    print(f"  FS7 Form:         1 (2025)")
    print(f"  Shifts:           {shifts_inserted}")
    print(f"  Clocking Records: {clocking_inserted}")
    print(f"  Venue:            {VENUE_ID}")
    print("=" * 70)

    client.close()


if __name__ == "__main__":
    asyncio.run(seed())
