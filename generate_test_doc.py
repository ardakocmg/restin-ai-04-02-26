import os
import sys
from pathlib import Path
from datetime import date

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from services.pdf_generation_service import pdf_service

def generate_test_pdf():
    # Mock Data matching Arda Koc's profile and the Indigo style we targeted
    mock_data = {
        "employer_name": "Caviar & Bull / Buddhamann Ltd",
        "employee_name": "ARDA KOC",
        "employee_number": "KOC",
        "id_card": "0307741A",
        "period_start": "01/01/2026",
        "period_end": "31/01/2026",
        "basic_pay": 2166.67,
        "gross_pay": 2166.67,
        "tax_amount": 185.40,
        "total_deductions": 395.40, # Tax + SSC (approx)
        "net_pay": 1771.27,
        "iban": "MT55HSBC0000000000000",
        "lines": [
            {'name': 'Basic Pay', 'qty': 173.33, 'rate': 12.50, 'earn': 2166.67, 'deduct': 0.0},
            {'name': 'FSS Tax', 'qty': 0, 'rate': 0, 'earn': 0.0, 'deduct': 185.40},
            {'name': 'SSC Contribution', 'qty': 0, 'rate': 0, 'earn': 0.0, 'deduct': 210.00},
        ]
    }
    
    print("Generating PDF...")
    try:
        pdf_bytes = pdf_service.generate_payslip_reportlab(mock_data)
        
        output_path = "test_payslip_indigo.pdf"
        with open(output_path, "wb") as f:
            f.write(pdf_bytes)
            
        print(f"Success! PDF saved to: {os.path.abspath(output_path)}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    generate_test_pdf()
