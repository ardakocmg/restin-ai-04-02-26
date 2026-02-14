"""
Arda KOC — Complete HR Data Seed
=================================
1. Cleans duplicate uploads (keeps 1 of each unique file)
2. Seeds clocking_records aligned with payslip gross amounts
3. Seeds shifts (approved, matching clocking)
4. Seeds payroll_runs per month (Aug 2024 → Jan 2026)
5. Seeds fs3_entries, fs5_forms, fs7_forms for compliance
6. Ensures end-to-end: clocking → shifts → payroll → FS3/FS5/FS7

Run:  python seed_arda_complete.py
"""
import asyncio
import os
import hashlib
import uuid
import random
import calendar
from datetime import datetime, date, timedelta, timezone
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "restin_ai_db")
VENUE_ID = "venue-caviar-bull"
EMPLOYEE_ID = "0307741A"
EMPLOYEE_CODE = "AKO01"
EMPLOYEE_NAME = "ARDA KOC"
HOURLY_RATE = 25.13
UPLOAD_DIR = ROOT_DIR.parent / "data" / "uploads" / VENUE_ID

# ─────────────────────────────────────────────────────────────────
# Payslip data derived from actual documents (seed_hr_documents.py + seed_arda_koc.py)
# Format: (year, month, basic_pay, gov_bonus, gross, tax, net, hours)
# hours = basic_pay / HOURLY_RATE (rounded)
# ─────────────────────────────────────────────────────────────────
MONTHLY_DATA = [
    # 2024 — Arda started 22/08/2024 (FS3 2024 total: €9,995 gross, €1,000 tax)
    # Spread across Aug-Dec 2024 with realistic hours
    (2024, 8,  1800.00, 0.00,   1800.00, 180.00, 1620.00,  72),  # Aug (partial, started 22nd)
    (2024, 9,  2100.00, 0.00,   2100.00, 210.00, 1890.00,  84),  # Sep
    (2024, 10, 2050.00, 0.00,   2050.00, 205.00, 1845.00,  82),  # Oct
    (2024, 11, 2000.00, 0.00,   2000.00, 200.00, 1800.00,  80),  # Nov
    (2024, 12, 2045.00, 0.00,   2045.00, 205.00, 1840.00,  81),  # Dec (FS3 total ~€9,995)

    # 2025 — Part-time arrangement (32 hrs/month at €25.13)
    (2025, 1,  804.16, 0.00,    804.16,  80.00,  724.16,   32),
    (2025, 2,  804.16, 0.00,    804.16,  80.00,  724.16,   32),
    (2025, 3,  804.16, 25.83,   829.99,  83.00,  746.99,   32),  # Gov bonus (March)
    (2025, 4,  804.16, 0.00,    804.16,  80.00,  724.16,   32),
    (2025, 5,  804.16, 0.00,    804.16,  80.00,  724.16,   32),
    (2025, 6,  804.16, 25.83,   829.99,  83.00,  746.99,   32),  # Gov bonus (June)
    (2025, 7,  804.16, 0.00,    804.16,  80.00,  724.16,   32),
    (2025, 8,  804.16, 0.00,    804.16,  80.00,  724.16,   32),
    (2025, 9,  850.00, 25.83,   875.83,  88.00,  787.83,   34),  # Sep (from payslip)
    (2025, 10, 870.00, 0.00,    870.00,  75.00,  795.00,   35),  # Oct (from payslip)
    (2025, 11, 900.00, 0.00,    900.00,  80.00,  820.00,   36),  # Nov (from payslip)
    (2025, 12, 804.16, 25.83,   829.99,  83.00,  746.99,   32),  # Dec (from payslip)

    # 2026 — Current year
    (2026, 1,  804.16, 0.00,    804.16,  80.00,  724.16,   32),
]


async def main():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    print("=" * 70)
    print("  ARDA KOC — COMPLETE HR DATA SEED")
    print("=" * 70)

    # ── STEP 1: Clean Duplicate Uploads ───────────────────────────────
    await clean_duplicate_uploads(db)

    # ── STEP 2: Ensure Employee Record ────────────────────────────────
    await ensure_employee(db)

    # ── STEP 3: Seed Clocking Records ─────────────────────────────────
    await seed_clocking_records(db)

    # ── STEP 4: Seed Shifts ───────────────────────────────────────────
    await seed_shifts(db)

    # ── STEP 5: Seed Payroll Runs ─────────────────────────────────────
    await seed_payroll_runs(db)

    # ── STEP 6: Seed FS3 Entries ──────────────────────────────────────
    await seed_fs3_entries(db)

    # ── STEP 7: Seed FS5 Forms ────────────────────────────────────────
    await seed_fs5_forms(db)

    # ── STEP 8: Seed FS7 Forms ────────────────────────────────────────
    await seed_fs7_forms(db)

    print("\n" + "=" * 70)
    print("  ✅ ALL DONE — Full HR pipeline seeded for Arda KOC")
    print("=" * 70)
    await print_summary(db)

    client.close()


# ═══════════════════════════════════════════════════════════════════
# STEP 1: CLEAN DUPLICATE UPLOADS
# ═══════════════════════════════════════════════════════════════════
async def clean_duplicate_uploads(db):
    print("\n[1/8] Cleaning duplicate uploads...")

    if not UPLOAD_DIR.exists():
        print("  ⚠ Upload directory not found, skipping cleanup")
        return

    # Group files by content hash
    hash_map: dict[str, list[Path]] = {}
    for f in UPLOAD_DIR.iterdir():
        if not f.is_file():
            continue
        try:
            content = f.read_bytes()
            h = hashlib.sha256(content).hexdigest()
            hash_map.setdefault(h, []).append(f)
        except Exception:
            pass

    removed = 0
    for h, files in hash_map.items():
        if len(files) <= 1:
            continue
        # Keep the first file, remove duplicates
        for dup in files[1:]:
            dup_uuid = dup.name.split("_")[0]
            # Remove from DB documents collection too
            await db.documents.delete_many({"id": dup_uuid})
            dup.unlink()
            removed += 1

    print(f"  ✓ Removed {removed} duplicate files")
    remaining = len(list(UPLOAD_DIR.iterdir()))
    print(f"  ✓ {remaining} unique files remain")


# ═══════════════════════════════════════════════════════════════════
# STEP 2: ENSURE EMPLOYEE EXISTS
# ═══════════════════════════════════════════════════════════════════
async def ensure_employee(db):
    print("\n[2/8] Ensuring employee record...")

    employee = {
        "id": EMPLOYEE_ID,
        "display_id": f"EMP-{EMPLOYEE_ID}",
        "venue_id": VENUE_ID,
        "name": EMPLOYEE_NAME,
        "short_name": "KOC",
        "email": "arda.koc@corinthiahotel.com",
        "phone": "+356 99999999",
        "address": {
            "line1": "23",
            "line2": "Triq In-Nixxiegha",
            "city": "Mellieha",
            "country": "Malta",
            "full_address": "23, Triq In-Nixxiegha, Mellieha, Malta"
        },
        "id_number": "0307741A",
        "ss_number": "D70158083",
        "pe_number": "456398",
        "department": "Management",
        "occupation": "IN HOUSE STRATEGIST",
        "role": "branch_manager",
        "employment_type": "part_time",
        "status": "active",
        "hire_date": "2024-08-22",
        "contract_start": "2024-08-22",
        "payroll": {
            "hourly_rate": HOURLY_RATE,
            "currency": "EUR",
            "tax_rate_type": "Part Time Standard Tax Rate",
            "payment_method": "bank_transfer",
            "bank_account": "MT99VALL22013000000040012345678",
            "iban": "MT55HSBC0000000000000"
        },
        "tax": {
            "tax_rate": "Part Time Standard Tax Rate",
            "tax_number": "0307741A",
            "social_security": True
        },
        "benefits": {
            "category_1": 0.00,
            "category_2": 0.00,
            "category_3": 0.00,
        },
        "company": {
            "name": "Corinthia Hotel",
            "address": "St. Georges Bay",
            "city": "St. Julians",
            "postal_code": "STJ 3301",
            "country": "MT"
        },
        "manager_name": "Marvin Gauci",
        "manager_email": "marvin.gauci@corinthiahotel.com",
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    await db.employees.update_one(
        {"id": EMPLOYEE_ID},
        {"$set": employee},
        upsert=True
    )
    print(f"  ✓ Employee '{EMPLOYEE_NAME}' — role: branch_manager")


# ═══════════════════════════════════════════════════════════════════
# STEP 3: SEED CLOCKING RECORDS
# ═══════════════════════════════════════════════════════════════════
async def seed_clocking_records(db):
    print("\n[3/8] Seeding clocking records...")

    # Clear old Arda clockings
    deleted = await db.clocking_records.delete_many({
        "employee_id": EMPLOYEE_ID, "venue_id": VENUE_ID
    })
    print(f"  ↻ Cleared {deleted.deleted_count} old clocking records")

    all_records = []

    for year, month, basic, bonus, gross, tax, net, target_hours in MONTHLY_DATA:
        records = _generate_month_clockings(year, month, target_hours)
        all_records.extend(records)

    if all_records:
        await db.clocking_records.insert_many(all_records)
    print(f"  ✓ Inserted {len(all_records)} clocking records ({MONTHLY_DATA[0][0]}/{MONTHLY_DATA[0][1]:02d} → {MONTHLY_DATA[-1][0]}/{MONTHLY_DATA[-1][1]:02d})")


def _generate_month_clockings(year: int, month: int, target_hours: int) -> list:
    """Generate realistic clocking records for a month matching target hours."""
    records = []
    _, days_in_month = calendar.monthrange(year, month)

    # Part-time: work ~8 shifts per month, each ~4 hours
    # For months with more hours (2024), more shifts or longer shifts
    if target_hours >= 70:
        # Full-time-ish: ~20 shifts × ~4 hrs
        num_shifts = min(20, days_in_month - 4)
        hrs_per_shift = target_hours / num_shifts
    else:
        # Part-time: ~8 shifts × ~4 hrs
        num_shifts = max(4, round(target_hours / 4))
        hrs_per_shift = target_hours / num_shifts

    # Pick working days (skip Sundays mostly)
    working_days = []
    for d in range(1, days_in_month + 1):
        dt = date(year, month, d)
        if dt.weekday() != 6:  # Skip Sundays
            working_days.append(d)

    # Special: Aug 2024, started 22nd
    if year == 2024 and month == 8:
        working_days = [d for d in working_days if d >= 22]

    # Pick random subset of working days
    random.seed(year * 100 + month)  # Deterministic per month
    shift_days = sorted(random.sample(working_days, min(num_shifts, len(working_days))))

    hours_remaining = target_hours
    for i, day in enumerate(shift_days):
        if i == len(shift_days) - 1:
            # Last shift gets remaining hours
            shift_hrs = round(hours_remaining, 2)
        else:
            # Vary between 3-5 hrs (part-time) or 6-9 hrs (full-time)
            if target_hours >= 70:
                shift_hrs = round(random.uniform(max(3, hrs_per_shift - 1.5), min(9, hrs_per_shift + 1.5)), 2)
            else:
                shift_hrs = round(random.uniform(max(2, hrs_per_shift - 1), min(6, hrs_per_shift + 1)), 2)
            shift_hrs = min(shift_hrs, hours_remaining)
        hours_remaining -= shift_hrs

        # Clock-in time: between 09:00-11:00
        clock_in_hour = random.choice([9, 9, 10, 10, 10, 11])
        clock_in_min = random.randint(0, 45)
        clock_in = datetime(year, month, day, clock_in_hour, clock_in_min, 0, tzinfo=timezone.utc)

        # Clock-out = clock-in + shift hours
        total_minutes = int(shift_hrs * 60)
        clock_out = clock_in + timedelta(minutes=total_minutes)

        record_id = f"clk-arda-{year}{month:02d}{day:02d}"
        records.append({
            "id": record_id,
            "employee_id": EMPLOYEE_ID,
            "employee_name": EMPLOYEE_NAME,
            "venue_id": VENUE_ID,
            "date": f"{year}-{month:02d}-{day:02d}",
            "clock_in": clock_in.isoformat(),
            "clock_out": clock_out.isoformat(),
            "hours_worked": round(shift_hrs, 2),
            "work_area": random.choice(["Management", "Floor", "Office"]),
            "status": "approved",
            "approval_status": "approved",
            "approved_by": "system",
            "source": "manual",
            "geo_location": {"lat": 35.9122, "lng": 14.5042},
            "notes": "",
            "created_at": clock_in.isoformat(),
            "updated_at": clock_out.isoformat(),
        })

    return records


# ═══════════════════════════════════════════════════════════════════
# STEP 4: SEED SHIFTS (mirrors clocking records for payroll)
# ═══════════════════════════════════════════════════════════════════
async def seed_shifts(db):
    print("\n[4/8] Seeding shifts...")

    deleted = await db.shifts.delete_many({
        "employee_id": EMPLOYEE_ID, "venue_id": VENUE_ID
    })
    print(f"  ↻ Cleared {deleted.deleted_count} old shifts")

    all_shifts = []

    for year, month, basic, bonus, gross, tax, net, target_hours in MONTHLY_DATA:
        _, days_in_month = calendar.monthrange(year, month)

        # Re-derive the same clocking pattern (same random seed)
        clockings = _generate_month_clockings(year, month, target_hours)

        for clk in clockings:
            shift_id = clk["id"].replace("clk-", "shift-")
            cost = round(clk["hours_worked"] * HOURLY_RATE, 2)

            all_shifts.append({
                "id": shift_id,
                "employee_id": EMPLOYEE_ID,
                "employee_name": EMPLOYEE_NAME,
                "venue_id": VENUE_ID,
                "date": clk["date"],
                "start_time": clk["clock_in"],
                "end_time": clk["clock_out"],
                "hours_worked": clk["hours_worked"],
                "hourly_rate": HOURLY_RATE,
                "total_cost": cost,
                "status": "completed",
                "role": "branch_manager",
                "work_area": clk["work_area"],
                "clocking_id": clk["id"],
                "created_at": clk["clock_in"],
                "period": f"{year}-{month:02d}",
            })

    if all_shifts:
        await db.shifts.insert_many(all_shifts)
    print(f"  ✓ Inserted {len(all_shifts)} shift records")


# ═══════════════════════════════════════════════════════════════════
# STEP 5: SEED PAYROLL RUNS (one per month)
# ═══════════════════════════════════════════════════════════════════
async def seed_payroll_runs(db):
    print("\n[5/8] Seeding payroll runs...")

    # Remove old Arda-only runs (keep team runs from seed_full_team)
    deleted = await db.payroll_runs.delete_many({
        "payslips.employee_id": EMPLOYEE_ID,
        "employee_count": 1  # Only single-employee runs (Arda's individual)
    })
    print(f"  ↻ Cleared {deleted.deleted_count} old individual payroll runs")

    runs = []
    for year, month, basic, bonus, gross, tax, net, hours in MONTHLY_DATA:
        _, last_day = calendar.monthrange(year, month)
        run_id = f"run-arda-{year}-{month:02d}"
        period_start = f"{year}-{month:02d}-01"
        period_end = f"{year}-{month:02d}-{last_day}"

        ssc_amount = round(gross * 0.10, 2) if year == 2024 else 0.00
        actual_net = round(gross - tax - ssc_amount, 2)

        payslip = {
            "employee_id": EMPLOYEE_ID,
            "employee_name": EMPLOYEE_NAME,
            "employee_number": EMPLOYEE_CODE,
            "id_card": "0307741A",
            "gross_pay": gross,
            "basic_pay": basic,
            "net_pay": actual_net,
            "tax_amount": tax,
            "total_deductions": round(tax + ssc_amount, 2),
            "hours_worked": hours,
            "hourly_rate": HOURLY_RATE,
            "iban": "MT55HSBC0000000000000",
            "components": [
                {"component_name": "Basic Pay", "component_type": "earning", "amount": basic, "is_taxable": True},
            ]
        }
        if bonus > 0:
            payslip["components"].append({
                "component_name": "Government Bonus", "component_type": "earning",
                "amount": bonus, "is_taxable": True
            })
        payslip["components"].extend([
            {"component_name": "FSS Tax", "component_type": "tax", "amount": tax, "is_taxable": False},
            {"component_name": "Social Security", "component_type": "deduction", "amount": ssc_amount, "is_taxable": False},
        ])

        run_data = {
            "id": run_id,
            "venue_id": VENUE_ID,
            "run_name": f"{calendar.month_name[month]} {year}",
            "run_number": f"PR-{year}{month:02d}-ARDA",
            "period": f"{year}-{month:02d}",
            "period_start": period_start,
            "period_end": period_end,
            "state": "approved",
            "employee_count": 1,
            "total_gross": gross,
            "total_tax": tax,
            "total_net": actual_net,
            "payslips": [payslip],
            "created_at": datetime(year, month, last_day, 18, 0, 0, tzinfo=timezone.utc).isoformat(),
            "created_by": "system_seed",
        }
        runs.append(run_data)

    for run in runs:
        await db.payroll_runs.update_one(
            {"id": run["id"]},
            {"$set": run},
            upsert=True
        )
    print(f"  ✓ Upserted {len(runs)} payroll runs")


# ═══════════════════════════════════════════════════════════════════
# STEP 6: SEED FS3 ENTRIES (Annual Tax Certificate per employee)
# ═══════════════════════════════════════════════════════════════════
async def seed_fs3_entries(db):
    print("\n[6/8] Seeding FS3 entries...")

    years = {}
    for year, month, basic, bonus, gross, tax, net, hours in MONTHLY_DATA:
        if year not in years:
            years[year] = {"gross": 0, "tax": 0, "ssc": 0, "months": 0}
        years[year]["gross"] += gross
        years[year]["tax"] += tax
        years[year]["months"] += 1

    entries = []
    for year, totals in years.items():
        fs3_id = f"fs3-arda-{year}"
        entry = {
            "id": fs3_id,
            "employee_id": EMPLOYEE_ID,
            "employee_code": EMPLOYEE_CODE,
            "employee_name": EMPLOYEE_NAME,
            "venue_id": VENUE_ID,
            "year": year,
            "period_start": f"22/08/2024" if year == 2024 else f"01/01/{year}",
            "period_end": f"31/12/{year}" if year < 2026 else f"31/01/{year}",
            "payee": {
                "surname": "KOC",
                "firstName": "ARDA",
                "address": "23, Triq In-Nixxiegha, Mellieha",
                "locality": "Mellieha",
                "idNumber": "0307741A",
                "ssNumber": "D70158083",
            },
            "payer": {
                "name": "Caviar & Bull",
                "address": "Corinthia Hotel, St. Georges Bay",
                "locality": "St. Julians, STJ 3301, MT",
                "peNumber": "456398",
            },
            "total_gross": round(totals["gross"], 2),
            "total_tax": round(totals["tax"], 2),
            "total_ssc": round(totals["ssc"], 2),
            "gross_emoluments": round(totals["gross"], 2),
            "fss_tax_deducted": round(totals["tax"], 2),
            "ssc_employee": round(totals["ssc"], 2),
            "maternity_fund": 0,
            "months_count": totals["months"],
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        entries.append(entry)

    for e in entries:
        await db.fs3_entries.update_one(
            {"id": e["id"]},
            {"$set": e},
            upsert=True
        )
    print(f"  ✓ Upserted {len(entries)} FS3 entries ({', '.join(str(y) for y in years)})")


# ═══════════════════════════════════════════════════════════════════
# STEP 7: SEED FS5 FORMS (Monthly SSC/Tax Return)
# ═══════════════════════════════════════════════════════════════════
async def seed_fs5_forms(db):
    print("\n[7/8] Seeding FS5 forms...")

    forms = []
    for year, month, basic, bonus, gross, tax, net, hours in MONTHLY_DATA:
        fs5_id = f"fs5-arda-{year}-{month:02d}"
        ssc_emp = round(gross * 0.10, 2) if year == 2024 else 0.00
        ssc_er = round(gross * 0.10, 2) if year == 2024 else 0.00
        maternity = round(gross * 0.002, 2)

        form = {
            "id": fs5_id,
            "venue_id": VENUE_ID,
            "month": f"{month:02d}",
            "year": str(year),
            "period": f"{year}-{month:02d}",
            "number_of_payees": 1,
            "total_gross_emoluments": gross,
            "total_fss_tax": tax,
            "total_ssc_employee": ssc_emp,
            "total_ssc_employer": ssc_er,
            "total_maternity_fund": maternity,
            "total_payment_due": round(tax + ssc_emp + ssc_er + maternity, 2),
            "payroll_run_id": f"run-arda-{year}-{month:02d}",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        forms.append(form)

    for f in forms:
        await db.fs5_forms.update_one(
            {"id": f["id"]},
            {"$set": f},
            upsert=True
        )
    print(f"  ✓ Upserted {len(forms)} FS5 monthly forms")


# ═══════════════════════════════════════════════════════════════════
# STEP 8: SEED FS7 FORMS (Annual Reconciliation)
# ═══════════════════════════════════════════════════════════════════
async def seed_fs7_forms(db):
    print("\n[8/8] Seeding FS7 forms...")

    years = {}
    for year, month, basic, bonus, gross, tax, net, hours in MONTHLY_DATA:
        if year not in years:
            years[year] = {"gross": 0, "tax": 0, "ssc": 0, "maternity": 0, "months": 0}
        ssc = round(gross * 0.10, 2) if year == 2024 else 0.00
        maternity = round(gross * 0.002, 2)
        years[year]["gross"] += gross
        years[year]["tax"] += tax
        years[year]["ssc"] += ssc
        years[year]["maternity"] += maternity
        years[year]["months"] += 1

    forms = []
    for year, t in years.items():
        fs7_id = f"fs7-arda-{year}"
        form = {
            "id": fs7_id,
            "venue_id": VENUE_ID,
            "year": str(year),
            "total_sheets_attached": 1,
            "total_gross_emoluments": round(t["gross"], 2),
            "total_fss_tax": round(t["tax"], 2),
            "total_ssc": round(t["ssc"] * 2, 2),  # Employee + Employer
            "total_maternity_fund": round(t["maternity"], 2),
            "total_due": round(t["tax"] + t["ssc"] * 2 + t["maternity"], 2),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        forms.append(form)

    for f in forms:
        await db.fs7_forms.update_one(
            {"id": f["id"]},
            {"$set": f},
            upsert=True
        )
    print(f"  ✓ Upserted {len(forms)} FS7 annual forms")


# ═══════════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════════
async def print_summary(db):
    clk_count = await db.clocking_records.count_documents({"employee_id": EMPLOYEE_ID})
    shift_count = await db.shifts.count_documents({"employee_id": EMPLOYEE_ID})
    run_count = await db.payroll_runs.count_documents({"payslips.employee_id": EMPLOYEE_ID})
    fs3_count = await db.fs3_entries.count_documents({"employee_id": EMPLOYEE_ID})
    fs5_count = await db.fs5_forms.count_documents({"venue_id": VENUE_ID, "id": {"$regex": "arda"}})
    fs7_count = await db.fs7_forms.count_documents({"venue_id": VENUE_ID, "id": {"$regex": "arda"}})

    print(f"""
┌─────────────────────────────────────────┐
│  ARDA KOC — Data Summary               │
├─────────────────────────────────────────┤
│  Clocking Records:  {clk_count:>5}               │
│  Shifts:            {shift_count:>5}               │
│  Payroll Runs:      {run_count:>5}               │
│  FS3 Entries:       {fs3_count:>5}               │
│  FS5 Forms:         {fs5_count:>5}               │
│  FS7 Forms:         {fs7_count:>5}               │
├─────────────────────────────────────────┤
│  Pipeline: Clocking → Shift → Payroll   │
│            → FS3 → FS5 → FS7  ✅        │
└─────────────────────────────────────────┘
""")


if __name__ == "__main__":
    asyncio.run(main())
