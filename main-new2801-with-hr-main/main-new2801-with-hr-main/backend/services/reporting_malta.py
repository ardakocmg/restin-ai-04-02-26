from datetime import datetime
import motor.motor_asyncio
from typing import List, Optional
import os

class MaltaReportingService:
    def __init__(self, db):
        self.db = db

    async def get_employee_annual_summary(self, venue_id: str, employee_id: str, year: int):
        """Aggregate all payroll runs for an employee in a specific year for FS3."""
        start_date = f"{year}-01-01"
        end_date = f"{year}-12-31"
        
        cursor = self.db.payroll_runs.find({
            "venue_id": venue_id,
            "period_start": {"$gte": start_date},
            "period_end": {"$lte": end_date}
        })
        
        total_gross = 0
        total_tax = 0
        total_ssc = 0
        
        async for run in cursor:
            for ps in run.get("payslips", []):
                if ps.get("employee_id") == employee_id:
                    total_gross += ps.get("gross_pay", 0)
                    total_tax += ps.get("tax_amount", 0)
                    # Deductions include tax + ssc, so subtract tax
                    total_ssc += (ps.get("total_deductions", 0) - ps.get("tax_amount", 0))
                    
        return {
            "year": year,
            "gross_pay": round(total_gross, 2),
            "tax_deducted": round(total_tax, 2),
            "ssc_deducted": round(total_ssc, 2),
            "net_pay": round(total_gross - total_tax - total_ssc, 2)
        }

    async def generate_fs5_data(self, venue_id: str, month: int, year: int):
        """Aggregate totals for all employees in a month for FS5."""
        month_str = f"{month:02d}"
        
        # Support both YYYY-MM-DD and DD/MM/YYYY formats if they exist
        cursor = self.db.payroll_runs.find({
            "venue_id": venue_id,
            "period_end": {"$regex": f"({month_str}/{year}$|{year}-{month_str})"},
            "state": {"$in": ["approved", "locked", "dispatched", "validated"]}
        })
        
        total_gross = 0
        total_tax = 0
        total_ssc_employee = 0
        total_ssc_employer = 0
        employee_count = 0
        
        async for run in cursor:
            total_gross += run.get("total_gross", 0)
            total_tax += run.get("total_tax", 0)
            employee_count += run.get("employee_count", 0)
            for ps in run.get("payslips", []):
                # Robustly find SSC in components
                emp_ssc = 0
                for comp in ps.get("components", []):
                    if "social security" in comp.get("component_name", "").lower():
                        emp_ssc += comp.get("amount", 0)
                
                total_ssc_employee += emp_ssc
                total_ssc_employer += emp_ssc # Mock 1:1
                
        return {
            "period": f"{month_str}/{year}",
            "month": month_str,
            "year": str(year),
            "gross_wages": round(total_gross, 2),
            "tax": round(total_tax, 2),
            "ssc_employee": round(total_ssc_employee, 2),
            "ssc_employer": round(total_ssc_employer, 2),
            "total_maternity_fund": round(total_gross * 0.003, 2),
            "total_payment": round(total_tax + total_ssc_employee + total_ssc_employer + (total_gross * 0.003), 2),
            "employee_count": employee_count
        }
