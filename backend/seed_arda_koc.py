"""
Seed Arda KOC employee data with complete HR information
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime, date
import uuid

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'restinai')]

async def seed_arda_koc_employee():
    """Create complete employee record for Arda KOC"""
    print("🚀 Creating Arda KOC employee record...")
    
    # Check if already exists
    existing = await db.employees.find_one({"id_number": "0307741A"})
    if existing:
        print("✓ Arda KOC employee already exists")
        return existing["id"]
    
    employee_id = f"emp-{uuid.uuid4()}"
    
    employee = {
        "id": employee_id,
        "display_id": "EMP-00001",
        "venue_id": "venue-caviar-bull",
        
        # Personal Information
        "name": "ARDA KOC",
        "short_name": "KOC",
        "email": "arda.koc@corinthiahotel.com",
        "phone": "+356 99999999",
        
        # Address
        "address": {
            "line1": "23",
            "line2": "Triq In-Noxagha",
            "city": "Mellieha",
            "country": "Malta",
            "full_address": "23, Triq In-Noxagha, Mellieha, Malta"
        },
        
        # Official IDs
        "id_number": "0307741A",
        "ss_number": "D70158083",
        "pe_number": "456398",
        
        # Employment Details
        "department": "OTHER",
        "section": "-",
        "unit": "-",
        "grade": "-",
        "occupation": "IN HOUSE STRATEGIST",
        "occupation_roll": "Dec 25 (2025-5/12)",
        
        # Company Information
        "company": {
            "name": "Corinthia Hotel",
            "address": "St. Georges Bay",
            "city": "St. Julians",
            "postal_code": "STJ 3301",
            "country": "MT"
        },
        
        # Employment Status
        "employment_type": "part_time",
        "status": "active",
        "hire_date": "2025-12-01",
        "contract_start": "2025-12-01",
        
        # Payroll Information
        "payroll": {
            "basic_salary": 32.00,
            "hourly_rate": 25.1300000,
            "currency": "EUR",
            "payment_method": "bank_transfer",
            "bank_account": "MT99VALL22013000000040012345678"
        },
        
        # Benefits
        "benefits": {
            "category_1": 0.00,
            "category_2": 0.00,
            "category_3": 0.00,
            "share_opt": 0.00
        },
        
        # Tax Information
        "tax": {
            "tax_rate": "Part Time Standard Tax Rate",
            "social_security": True,
            "tax_number": "0307741A"
        },
        
        # Manager
        "manager_name": "Marvin Gauci",
        "manager_email": "marvin.gauci@corinthiahotel.com",
        
        # Metadata
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
        "created_by": "system"
    }
    
    await db.employees.insert_one(employee)
    print("✅ Arda KOC employee created successfully!")
    print(f"   Employee ID: {employee_id}")
    print(f"   Name: ARDA KOC (KOC)")
    print(f"   ID Number: 0307741A")
    print(f"   SS Number: D70158083")
    print(f"   PE Number: 456398")
    print(f"   Department: OTHER")
    print(f"   Occupation: IN HOUSE STRATEGIST")
    print(f"   Manager: Marvin Gauci")
    
    return employee_id

async def seed_arda_koc_payslip():
    """Create sample payslip for Arda KOC (Dec 2025)"""
    print("\n🚀 Creating Arda KOC payslip (Dec'25)...")
    
    # Get employee
    employee = await db.employees.find_one({"id_number": "0307741A"})
    if not employee:
        print("❌ Employee not found. Create employee first.")
        return
    
    # Check if payslip exists
    existing = await db.payslips.find_one({
        "employee_id": employee["id"],
        "period_month": 12,
        "period_year": 2025
    })
    if existing:
        print("✓ Payslip already exists")
        return
    
    payslip_id = f"payslip-{uuid.uuid4()}"
    
    payslip = {
        "id": payslip_id,
        "employee_id": employee["id"],
        "employee_name": "ARDA KOC (KOC)",
        "employee_id_number": "0307741A",
        
        # Period
        "period_start": "2025-12-01",
        "period_end": "2025-12-31",
        "period_month": 12,
        "period_year": 2025,
        "pay_date": "2026-01-05",
        
        # Earnings
        "basic_salary": {
            "hours": 32.00,
            "rate": 25.1300000,
            "amount": 804.16
        },
        
        "adjustments": [
            {
                "type": "Government Bonus",
                "date": "1.00 December",
                "rate": 25.6287817,
                "amount": 25.63
            }
        ],
        
        "gross_total": 829.99,
        
        # Deductions
        "tax": {
            "type": "Part Time Standard Tax Rate",
            "amount": 83.00
        },
        
        "social_security": 0.00,
        
        # Net Pay
        "net_pay": 746.99,
        
        # Totals to Date
        "totals_to_date": {
            "gross": 9987.00,
            "ot_con_gross": 0.00,
            "ot_con_hours": 0.00,
            "social_security": 0.00,
            "tax_fs5": 999.00,
            "tax_ot_con": 0.00,
            "tax_arrears": 0.00,
            "tax_share_opt": 0.00
        },
        
        # Leave Type
        "leave_type": "",
        
        # Status
        "status": "finalized",
        "pdf_generated": False,
        "email_sent": False,
        
        # Metadata
        "created_at": datetime.utcnow().isoformat(),
        "created_by": "system"
    }
    
    await db.payslips.insert_one(payslip)
    print("✅ Payslip created successfully!")
    print(f"   Payslip ID: {payslip_id}")
    print(f"   Period: Dec 2025 (01/12/2025 - 31/12/2025)")
    print(f"   Pay Date: 05/01/2026")
    print(f"   Gross Total: € 829.99")
    print(f"   Net Pay: € 746.99")

async def main():
    """Run all seed operations"""
    employee_id = await seed_arda_koc_employee()
    await seed_arda_koc_payslip()
    print("\n✅ All seed operations completed!")

if __name__ == "__main__":
    asyncio.run(main())
