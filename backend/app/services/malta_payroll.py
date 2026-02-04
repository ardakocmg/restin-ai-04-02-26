import logging

logger = logging.getLogger(__name__)

class MaltaPayrollEngine:
    # 2025 Tax Bands (Single)
    # 0 - 12,000 : 0%
    # 12,001 - 16,000 : 15% (Subtract 1,800)
    # 16,001 - 60,000 : 25% (Subtract 3,400)
    # 60,001+ : 35% (Subtract 9,400)
    TAX_BANDS = {
        "Single": [
            {"limit": 12000, "rate": 0.00, "sub": 0},
            {"limit": 16000, "rate": 0.15, "sub": 1800},
            {"limit": 60000, "rate": 0.25, "sub": 3400},
            {"limit": float('inf'), "rate": 0.35, "sub": 9400},
        ]
    }
    
    # Constants 2025
    SSC_WEEKLY_CAP = 54.43
    SSC_THRESHOLD_WEEKLY = 544.29
    SSC_RATE = 0.10
    
    COLA_WEEKLY = 5.24
    GOV_BONUS_ANNUAL = 512.52

    @staticmethod
    def calculate(gross_annual: float, category: str = "Single", cola_eligible: bool = True):
        logger.info(f"Calculating payroll for Gross: {gross_annual}, Category: {category}")
        
        # 1. SSC Calculation (Category D)
        weekly_gross = gross_annual / 52.0
        
        if weekly_gross >= MaltaPayrollEngine.SSC_THRESHOLD_WEEKLY:
            ssc_weekly = MaltaPayrollEngine.SSC_WEEKLY_CAP
        else:
            ssc_weekly = weekly_gross * MaltaPayrollEngine.SSC_RATE
            
        ssc_annual = ssc_weekly * 52.0

        # 2. Tax Calculation
        # Taxable income = Gross - SSC
        taxable_income = gross_annual - ssc_annual
        if taxable_income < 0:
            taxable_income = 0
            
        annual_tax = 0.0
        
        # Select Bands
        bands = MaltaPayrollEngine.TAX_BANDS.get(category, MaltaPayrollEngine.TAX_BANDS["Single"])
        
        # Apply Tax Bands
        for band in bands:
            if taxable_income <= band["limit"]:
                annual_tax = (taxable_income * band["rate"]) - band["sub"]
                break
            if band["limit"] == float('inf'):
                annual_tax = (taxable_income * band["rate"]) - band["sub"]
        
        if annual_tax < 0:
            annual_tax = 0.0

        # 3. Additions (COLA, Bonuses)
        # Included in payload as requested
        
        # Net Classification
        net_annual = gross_annual - annual_tax - ssc_annual
        
        result = {
            "gross_annual": round(gross_annual, 2),
            "ssc_annual": round(ssc_annual, 2),
            "tax_annual": round(annual_tax, 2),
            "net_annual": round(net_annual, 2),
            "net_monthly": round(net_annual / 12, 2),
            "meta": {
                "cola_weekly": MaltaPayrollEngine.COLA_WEEKLY,
                "gov_bonus_annual": MaltaPayrollEngine.GOV_BONUS_ANNUAL,
                "tax_category": category,
                "ssc_category": "D (Post-1962)"
            }
        }
        
        return result
