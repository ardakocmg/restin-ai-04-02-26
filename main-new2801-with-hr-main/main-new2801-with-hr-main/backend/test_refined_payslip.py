from services.pdf_generation_service import pdf_service
import os

# Mock data based on Arda's Dec 2025 pay
payslip_data = {
    "employee_name": "ARDA KOC",
    "employee_number": "0307741A",
    "period_start": "01/12/2025",
    "period_end": "31/12/2025",
    "basic_pay": 2200.0,
    "gross_pay": 2200.0,
    "tax_amount": 220.0,
    "net_pay": 1930.0,
    "total_deductions": 270.0, # tax + ssc
    "components": [
        {"component_name": "Basic Pay", "amount": 2200.0, "type": "earning"},
        {"component_name": "FSS Tax", "amount": 220.0, "type": "tax"},
        {"component_name": "Social Security", "amount": 50.0, "type": "deduction"}
    ]
}

def test_pdf():
    print("Generating refined payslip...")
    pdf_bytes = pdf_service.generate_payslip_reportlab(payslip_data)
    with open("arda_refined_payslip.pdf", "wb") as f:
        f.write(pdf_bytes)
    print("PDF saved to arda_refined_payslip.pdf")

if __name__ == "__main__":
    test_pdf()
