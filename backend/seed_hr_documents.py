"""
Seed script for HR document collections:
- payslips, fs3_statements, contracts, exit_documents, skills_passes
- performance_reviews, clockings, cash_drawers

Run: python seed_hr_documents.py
"""
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'restin_ai_db')]

VENUE_ID = "venue-caviar-bull"


async def seed_payslips():
    """Seed payslips collection for Arda KOC."""
    if await db.payslips.count_documents({}) > 0:
        print("  Payslips already seeded, skipping.")
        return

    months = [
        ("December 2025", "01/12/2025", "31/12/2025", "05/01/2026", 804.16, 25.83, 829.99, 83.00, 746.99, 2025),
        ("November 2025", "01/11/2025", "30/11/2025", "05/12/2025", 900.00, 0.00, 900.00, 80.00, 820.00, 2025),
        ("October 2025", "01/10/2025", "31/10/2025", "05/11/2025", 870.00, 0.00, 870.00, 75.00, 795.00, 2025),
        ("September 2025", "01/09/2025", "30/09/2025", "05/10/2025", 850.00, 25.83, 875.83, 88.00, 787.83, 2025),
        ("August 2025", "01/08/2025", "31/08/2025", "05/09/2025", 804.16, 0.00, 804.16, 80.00, 724.16, 2025),
    ]

    payslips = []
    for i, (month, start, end, pay_date, basic, adj, gross, tax, net, year) in enumerate(months, 1):
        payslips.append({
            "id": f"payslip_{i:03d}",
            "employee_id": "AKO01",
            "venue_id": VENUE_ID,
            "month": month,
            "year": year,
            "period_start": start,
            "period_end": end,
            "pay_date": pay_date,
            "status": "PAID",
            "employee": {
                "name": "ARDA KOC (KOC)",
                "id_number": "0307741A",
                "ss_number": "D70158083",
                "pe_number": "456398",
                "address": {"line1": "23", "line2": "Triq In-Noxagha", "city": "Mellieha", "country": "Malta"},
                "department": "OTHER",
                "occupation": "IN HOUSE STRATEGIST",
                "occupation_roll": f"Dec 25 (2025-5/12)",
                "company": {"name": "Corinthia Hotel", "address": "St. Georges Bay", "city": "St. Julians", "postal_code": "STJ 3301", "country": "MT"}
            },
            "period": {"start": start, "end": end, "pay_date": pay_date, "display": month[:3] + "'" + month[-2:]},
            "basicSalary": {"hours": 32.00, "rate": 25.13, "amount": basic},
            "adjustments": [{"type": "Government Bonus", "date": "1.00", "rate": 25.63, "amount": adj}] if adj > 0 else [],
            "grossTotal": gross,
            "tax": {"type": "Part Time Standard Tax Rate", "amount": tax},
            "socialSecurity": 0.00,
            "netPay": net,
            "net": net,
            "date": pay_date,
            "totalsToDate": {"gross": gross * (6 - i), "tax_fs5": tax * (6 - i)},
            "benefits": {"category_1": 0, "category_2": 0, "category_3": 0},
            "employmentDate": "22/08/2024",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    await db.payslips.insert_many(payslips)
    print(f"  Inserted {len(payslips)} payslips")


async def seed_fs3():
    """Seed FS3 annual statements."""
    if await db.fs3_statements.count_documents({}) > 0:
        print("  FS3 statements already seeded, skipping.")
        return

    fs3s = [
        {
            "id": "fs3_2024",
            "employee_id": "AKO01",
            "venue_id": VENUE_ID,
            "year": 2024,
            "total_gross": 9995.00,
            "tax": 1000.00,
            "date": "26/02/2025",
            "payee": {"surname": "KOC", "firstName": "ARDA", "address": "23, Triq In-Nixxiegha, Mellieha", "locality": "Mellieha", "idNumber": "0307741A", "ssNumber": "D70158083"},
            "payer": {"name": "Caviar & Bull", "address": "Corinthia Hotel, St. Georges Bay", "locality": "St. Julians, STJ 3301, MT", "peNumber": "456398", "principalName": "Antoinette Corby", "principalPosition": "CFO"},
            "period": {"start": "22/08/2024", "end": "31/12/2024"},
            "emoluments": {"c1": 0, "c1a": 0, "c1b": 0, "c2": 9995, "c3": 0, "c3a": 0, "c4": 9995},
            "deductions": {"d1": 0, "d1a": 0, "d2": 1000, "d3": 0, "d3a": 0, "d4": 1000},
            "sscTable": [
                {"wage": 400.00, "number": 5.00, "category": "C", "payee": 0.00, "payer": 0.00, "total": 0.00, "maternity": 6.00},
                {"wage": 385.00, "number": 5.00, "category": "C", "payee": 0.00, "payer": 0.00, "total": 0.00, "maternity": 5.80}
            ],
            "created_at": datetime.now(timezone.utc).isoformat(),
        },
        {
            "id": "fs3_2023",
            "employee_id": "AKO01",
            "venue_id": VENUE_ID,
            "year": 2023,
            "total_gross": 8500.00,
            "tax": 850.00,
            "date": "15/02/2024",
            "payee": {"surname": "KOC", "firstName": "ARDA", "address": "23, Triq In-Nixxiegha, Mellieha", "locality": "Mellieha", "idNumber": "0307741A", "ssNumber": "D70158083"},
            "payer": {"name": "Caviar & Bull", "address": "Corinthia Hotel, St. Georges Bay", "locality": "St. Julians, STJ 3301, MT", "peNumber": "456398"},
            "period": {"start": "01/01/2023", "end": "31/12/2023"},
            "emoluments": {"c1": 0, "c2": 8500, "c4": 8500},
            "deductions": {"d2": 850, "d4": 850},
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    ]
    await db.fs3_statements.insert_many(fs3s)
    print(f"  Inserted {len(fs3s)} FS3 statements")


async def seed_contracts():
    """Seed contracts collection."""
    if await db.contracts.count_documents({}) > 0:
        print("  Contracts already seeded, skipping.")
        return

    contracts = [{
        "id": "contract_001",
        "employee_id": "AKO01",
        "venue_id": VENUE_ID,
        "title": "Letter of Engagement",
        "start_date": "2024-08-22",
        "date": "22/08/2024",
        "status": "SIGNED",
        "employeeName": "Arda Koc",
        "address": "23, Triq In-Nixxiegha, Mellieha",
        "idNumber": "0307741A",
        "ssNumber": "D70158083",
        "jobTitle": "In House Strategist",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }]
    await db.contracts.insert_many(contracts)
    print(f"  Inserted {len(contracts)} contracts")


async def seed_exit_documents():
    """Seed exit documents."""
    if await db.exit_documents.count_documents({}) > 0:
        print("  Exit documents already seeded, skipping.")
        return

    docs = [{
        "id": "exit_001",
        "employee_id": "AKO01",
        "venue_id": VENUE_ID,
        "title": "Quick Exit Settlement",
        "date": "31/01/2026",
        "status": "FINALIZED",
        "employeeName": "Arda Koc",
        "employeeId": "emp-40379",
        "exitDate": "31st January 2026",
        "reason": "Resignation",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }]
    await db.exit_documents.insert_many(docs)
    print(f"  Inserted {len(docs)} exit documents")


async def seed_skills_passes():
    """Seed skills pass documents."""
    if await db.skills_passes.count_documents({}) > 0:
        print("  Skills passes already seeded, skipping.")
        return

    passes = [{
        "id": "sp_001",
        "employee_id": "AKO01",
        "venue_id": VENUE_ID,
        "fullName": "ARDA KOC",
        "candidateNumber": "40379",
        "jobFamily": "Revenue Analyst",
        "level": "RED",
        "issuanceDate": "07-Aug-2025",
        "batchNumber": "69",
        "peNumber": "456398",
        "validUntil": "07-Aug-2027",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }]
    await db.skills_passes.insert_many(passes)
    print(f"  Inserted {len(passes)} skills passes")


async def seed_performance_reviews():
    """Seed performance reviews."""
    if await db.performance_reviews.count_documents({}) > 0:
        print("  Performance reviews already seeded, skipping.")
        return

    reviews = [
        {
            "id": "rev_001",
            "employee_name": "Emily Lloyd",
            "employee_code": "EML01",
            "manager_name": "Carrie Andrews",
            "manager_code": "AND01",
            "company_name": "Insights Hotel",
            "venue_id": VENUE_ID,
            "review_name": "Mid Year Review 2024",
            "review_date": "2024-09-30",
            "due_date": "30/09/2024",
            "published_on": "21/10/2024",
            "finalised_date": None,
            "review_status": "Pending Manager",
            "status": "pending",
            "respondent_status": {"manager_done": False, "employee_done": True},
            "created_at": datetime.now(timezone.utc).isoformat(),
        },
        {
            "id": "rev_002",
            "employee_name": "Jennifer Aniston",
            "employee_code": "JEN01",
            "manager_name": "Emily Lloyd",
            "manager_code": "EML01",
            "company_name": "Insights Hotel",
            "venue_id": VENUE_ID,
            "review_name": "Annual Review 2024",
            "review_date": "2024-06-25",
            "due_date": "25/06/2024",
            "published_on": "19/06/2024",
            "finalised_date": "10/06/2024",
            "review_status": "Closed",
            "status": "closed",
            "respondent_status": {"manager_done": True, "employee_done": True},
            "created_at": datetime.now(timezone.utc).isoformat(),
        },
        {
            "id": "rev_003",
            "employee_name": "Arda Koc",
            "employee_code": "AKO01",
            "manager_name": "Antoinette Corby",
            "manager_code": "ACO01",
            "company_name": "Caviar & Bull",
            "venue_id": VENUE_ID,
            "review_name": "Q4 Performance Review 2025",
            "review_date": "2025-12-15",
            "due_date": "31/12/2025",
            "published_on": "15/12/2025",
            "finalised_date": None,
            "review_status": "Pending Both",
            "status": "pending",
            "respondent_status": {"manager_done": False, "employee_done": False},
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    ]
    await db.performance_reviews.insert_many(reviews)
    print(f"  Inserted {len(reviews)} performance reviews")


async def seed_clockings():
    """Seed today's clockings for live HR map."""
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    # Only seed if no clockings for today exist
    existing = await db.clockings.count_documents({"clock_in": {"$gte": today.isoformat()}})
    if existing > 0:
        print("  Today's clockings already seeded, skipping.")
        return

    staff = [
        ("AKO01", "ARDA KOC", "08:55", VENUE_ID, 35.9122, 14.5042),
        ("MAL01", "MARC ALPHONSI", "09:12", VENUE_ID, 35.8989, 14.5146),
        ("AFI01", "ANNE FAITH ALINAN", "08:45", VENUE_ID, 35.9189, 14.4883),
        ("BAN01", "BRANKO ANASTASOV", "09:05", VENUE_ID, 35.9048, 14.4969),
        ("DOA01", "DONALD AGIUS", "07:30", VENUE_ID, 35.9050, 14.5100),
    ]

    clockings = []
    for emp_id, name, time_str, venue, lat, lng in staff:
        h, m = map(int, time_str.split(":"))
        clock_in = today.replace(hour=h, minute=m)
        clockings.append({
            "employee_id": emp_id,
            "user_id": emp_id,
            "venue_id": venue,
            "clock_in": clock_in.isoformat(),
            "clock_out": None,  # Still clocked in
            "location": venue,
            "lat": lat,
            "lng": lng,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    await db.clockings.insert_many(clockings)
    print(f"  Inserted {len(clockings)} clockings for today")


async def seed_cash_drawers():
    """Seed cash drawers — this is also auto-seeded by the endpoint, but explicit seed is cleaner."""
    if await db.cash_drawers.count_documents({}) > 0:
        print("  Cash drawers already seeded, skipping.")
        return

    drawers = [
        {"id": "drawer_001", "name": "Main Drawer", "venue_id": VENUE_ID, "status": "closed", "current_float": 200.00},
        {"id": "drawer_002", "name": "Bar Drawer", "venue_id": VENUE_ID, "status": "closed", "current_float": 100.00},
        {"id": "drawer_003", "name": "Terrace Drawer", "venue_id": VENUE_ID, "status": "closed", "current_float": 150.00},
    ]
    await db.cash_drawers.insert_many(drawers)
    print(f"  Inserted {len(drawers)} cash drawers")


async def main():
    print("=" * 60)
    print("  SEEDING HR DOCUMENTS & COLLECTIONS")
    print("=" * 60)

    await seed_payslips()
    await seed_fs3()
    await seed_contracts()
    await seed_exit_documents()
    await seed_skills_passes()
    await seed_performance_reviews()
    await seed_clockings()
    await seed_cash_drawers()

    print("\n[OK] All HR document collections seeded successfully!")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
