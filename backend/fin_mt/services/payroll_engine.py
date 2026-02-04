"""Payroll Engine - Malta specific calculations"""

class PayrollEngine:
    
    def calculate_net_from_gross(self, gross: float, tax_table: dict, ssc_rate: float = 0.10):
        """Calculate net from gross using Malta tax rules"""
        
        # Tax calculation
        tax = 0.0
        for band in tax_table.get("bands", []):
            if gross > band["min"]:
                taxable = min(gross, band["max"]) - band["min"]
                tax += taxable * (band["rate"] / 100)
        
        # SSC
        ssc = gross * ssc_rate
        
        # Net
        net = gross - tax - ssc
        
        return {
            "gross": gross,
            "tax": tax,
            "ssc": ssc,
            "net": net,
            "effective_rate": ((tax + ssc) / gross * 100) if gross > 0 else 0
        }

payroll_engine = PayrollEngine()
