from datetime import datetime
from typing import Dict, Any

# Malta Tax Bands 2024 (Simplified for Single/Married/Parent)
TAX_BANDS_2024 = {
    "Single": [
        {"limit": 9100, "rate": 0.0, "subtract": 0},
        {"limit": 14500, "rate": 0.15, "subtract": 1365},
        {"limit": 19500, "rate": 0.25, "subtract": 2815},
        {"limit": 60000, "rate": 0.25, "subtract": 2725}, 
        {"limit": float('inf'), "rate": 0.35, "subtract": 8725}
    ],
    "Married": [
        {"limit": 12700, "rate": 0.0, "subtract": 0},
        {"limit": 21200, "rate": 0.15, "subtract": 1905},
        {"limit": 28700, "rate": 0.25, "subtract": 4025},
        {"limit": 60000, "rate": 0.25, "subtract": 3905},
        {"limit": float('inf'), "rate": 0.35, "subtract": 9905}
    ],
    "Parent": [
        {"limit": 10500, "rate": 0.0, "subtract": 0},
        {"limit": 15800, "rate": 0.15, "subtract": 1575},
        {"limit": 21200, "rate": 0.25, "subtract": 3155},
        {"limit": 60000, "rate": 0.25, "subtract": 3050},
        {"limit": float('inf'), "rate": 0.35, "subtract": 9050}
    ]
}

# SSC Rates 2024 (Category A - Standard Employee < 18 or > 18)
# Simplified: 10% capped at specific weekly amounts
SSC_WEEKLY_CAP_2024 = 51.60 # Approximate max for high earners
SSC_RATE = 0.10

class MaltaPayrollEngine:
    @staticmethod
    def calculate_tax(gross_annual: float, status: str = "Single") -> float:
        """Calculate annual tax based on gross income and status"""
        bands = TAX_BANDS_2024.get(status, TAX_BANDS_2024["Single"])
        tax = 0.0
        
        for band in bands:
            if gross_annual <= band["limit"]:
                tax = (gross_annual * band["rate"]) - band["subtract"]
                break
            # If gross exceeds band, check next. 
            # Actually, standard formula is (Income * Rate) - Subtract.
            # Using the last band that income falls into.
        
        # Correct logic: Find the band where income falls
        target_band = None
        for band in bands:
            if gross_annual <= band["limit"]:
                target_band = band
                break
        
        if not target_band:
            target_band = bands[-1] # Fallback to top band
            
        tax_calc = (gross_annual * target_band["rate"]) - target_band["subtract"]
        return max(0.0, tax_calc)

    @staticmethod
    def calculate_ssc(basic_weekly_wage: float, category: str = "A") -> float:
        """Calculate weekly SSC (Employee Share)"""
        # Simplified logic for Category A (Basic Employee)
        # 10% of basic weekly wage, Min/Max caps apply
        ssc = basic_weekly_wage * SSC_RATE
        
        # Max cap (approx for 2024)
        if ssc > SSC_WEEKLY_CAP_2024:
            ssc = SSC_WEEKLY_CAP_2024
            
        # Min cap check (approx 19.46 for 2024)
        if ssc < 19.46:
            ssc = 19.46
            
        return round(ssc, 2)
        
    @staticmethod
    def calculate_net_salary(gross_monthly: float, status: str = "Single") -> Dict[str, Any]:
        """Simple monthly net calculator"""
        gross_annual = gross_monthly * 12
        annual_tax = MaltaPayrollEngine.calculate_tax(gross_annual, status)
        monthly_tax = annual_tax / 12
        
        # SSC (approximate monthly from weekly)
        weekly_wage = (gross_annual / 52)
        weekly_ssc = MaltaPayrollEngine.calculate_ssc(weekly_wage)
        monthly_ssc = (weekly_ssc * 52) / 12
        
        net = gross_monthly - monthly_tax - monthly_ssc
        
        return {
            "gross": round(gross_monthly, 2),
            "tax": round(monthly_tax, 2),
            "ssc": round(monthly_ssc, 2),
            "net": round(net, 2)
        }
