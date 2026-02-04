from datetime import datetime
from typing import List, Dict
import uuid
from .models import Employee, Payslip, PayslipStatus, TaxStatus

# Malta Tax Rates 2024 (Simplified for standard computation)
TAX_BANDS = {
    TaxStatus.SINGLE: [
        (9100, 0), (14500, 15), (19500, 25), (60000, 25), (float('inf'), 35)
    ],
    TaxStatus.MARRIED: [
        (12700, 0), (21200, 15), (28700, 25), (60000, 25), (float('inf'), 35)
    ],
    TaxStatus.PARENT: [
        (10500, 0), (15800, 15), (21200, 25), (60000, 25), (float('inf'), 35)
    ]
}

SSC_RATE = 0.10

class PayrollService:
    @staticmethod
    def calculate_pay(employee: Employee, period_start: datetime, period_end: datetime) -> Payslip:
        annual_gross = employee.gross_salary_cents / 100
        
        # Calculate Annual Tax
        tax_payable = 0
        bands = TAX_BANDS.get(employee.tax_status, TAX_BANDS[TaxStatus.SINGLE])
        
        last_limit = 0
        for limit, rate in bands:
            taxable_amount = min(annual_gross, limit) - last_limit
            if taxable_amount > 0:
                tax_payable += taxable_amount * (rate / 100)
            last_limit = limit
            if annual_gross <= limit:
                break
                
        # Annual SSC
        ssc_payable = annual_gross * SSC_RATE
        
        # Monthly equivalents (assuming 12 periods)
        monthly_gross_cents = int((annual_gross / 12) * 100)
        monthly_tax_cents = int((tax_payable / 12) * 100)
        monthly_ssc_cents = int((ssc_payable / 12) * 100)
        monthly_net_cents = monthly_gross_cents - monthly_tax_cents - monthly_ssc_cents
        
        return Payslip(
            id=f"pay-{uuid.uuid4()}",
            employee_id=employee.id,
            period_start=period_start,
            period_end=period_end,
            gross_pay_cents=monthly_gross_cents,
            tax_cents=monthly_tax_cents,
            ssc_cents=monthly_ssc_cents,
            net_pay_cents=monthly_net_cents,
            status=PayslipStatus.DRAFT
        )

    @staticmethod
    def run_payroll_batch(employees: List[Employee], period_start: datetime, period_end: datetime) -> List[Payslip]:
        payslips = []
        for emp in employees:
            if emp.status == "active":
                payslips.append(PayrollService.calculate_pay(emp, period_start, period_end))
        return payslips
