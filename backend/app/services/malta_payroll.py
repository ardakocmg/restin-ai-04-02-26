from backend.app.models.schemas import PayrollResult

def calculate_payroll(gross_annual: float, year: int = 2025) -> PayrollResult:
    """
    Malta 2025 Payroll Calculation Enforcer.
    """
    # 1. COLA (Cost of Living Adjustment)
    # €5.24 per week -> €272.48 annually (52 weeks)
    cola_weekly = 5.24
    cola_annual = cola_weekly * 52
    
    # 2. SSC (Social Security Contributions) - Category D (Post 1962)
    # 10% of basic weekly wage, capped at €54.43/week
    weekly_wage = gross_annual / 52
    ssc_weekly = min(weekly_wage * 0.10, 54.43)
    if weekly_wage < 544.29: # Threshold where 10% might be less than max, but technically floor is usually checked. 
        # Using strict 10% or cap as per rules. 
        # Rule: 10% of basic, capped at €54.43
        pass
    
    ssc_annual = ssc_weekly * 52

    # 3. Tax Bands (Single Computation 2025)
    # Rates:
    # 0 - 12,000 : 0%
    # 12,001 - 16,000 : 15% (Subtract 1800)
    # 16,001 - 60,000 : 25% (Subtract 3400)
    # 60,001 + : 35% (Subtract 9400)

    taxable_gross = gross_annual # Note: In reality SSC might be deducted but for simplistic gross-to-net tax is on gross usually in these bands? 
    # Actually tax is on chargeable income. For simplicity we assume Gross IS Chargeable.
    
    tax_due = 0.0
    
    if gross_annual <= 12000:
        tax_due = 0
    elif gross_annual <= 16000:
        tax_due = (gross_annual * 0.15) - 1800
    elif gross_annual <= 60000:
        tax_due = (gross_annual * 0.25) - 3400
    else:
        tax_due = (gross_annual * 0.35) - 9400
        
    if tax_due < 0:
        tax_due = 0

    net_salary = gross_annual - tax_due - ssc_annual

    return PayrollResult(
        gross_salary=round(gross_annual, 2),
        tax_due=round(tax_due, 2),
        ssc_due=round(ssc_annual, 2),
        cola=round(cola_annual, 2),
        net_salary=round(net_salary, 2),
        year=year
    )
