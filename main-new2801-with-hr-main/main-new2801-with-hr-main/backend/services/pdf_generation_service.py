import os
from io import BytesIO
from typing import Optional
try:
    from weasyprint import HTML, CSS
    WEASYPRINT_AVAILABLE = True
except (ImportError, OSError):
    WEASYPRINT_AVAILABLE = False
    HTML = None
    CSS = None

try:
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas
    from reportlab.lib.units import mm
    from reportlab.lib.utils import ImageReader
    from datetime import date
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False


class PDFGenerationService:
    """Generate PDFs from HTML"""
    
    def __init__(self):
        if not WEASYPRINT_AVAILABLE:
            pass
            # print("WeasyPrint not available. Install: pip install weasyprint")
    
    def generate_from_html(self, html_content: str, css_content: Optional[str] = None) -> bytes:
        """Generate PDF from HTML string"""
        if not WEASYPRINT_AVAILABLE:
            raise ImportError("WeasyPrint not installed")
        
        html = HTML(string=html_content)
        
        if css_content:
            css = CSS(string=css_content)
            pdf_bytes = html.write_pdf(stylesheets=[css])
        else:
            pdf_bytes = html.write_pdf()
        
        return pdf_bytes
    
        return self.generate_from_html(html)

    def generate_fs5_pdf(self, data: dict) -> bytes:
        """Generate official-style Malta FS5 Monthly Return PDF"""
        if not REPORTLAB_AVAILABLE:
            raise ImportError("ReportLab not installed")
            
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=A4)
        width, height = A4
        
        # --- Form Title ---
        c.setFont("Helvetica-Bold", 14)
        c.drawCentredString(width/2, height-20*mm, "FS5 — MONTHLY FSS TAX & NI RETURN")
        c.setFont("Helvetica", 10)
        c.drawCentredString(width/2, height-25*mm, "Commissioner for Revenue — Malta")
        
        # --- Employer Section ---
        c.rect(20*mm, height-55*mm, 170*mm, 25*mm)
        c.setFont("Helvetica-Bold", 8)
        c.drawString(22*mm, height-34*mm, "EMPLOYER DETAILS")
        c.setFont("Helvetica", 10)
        c.drawString(25*mm, height-42*mm, f"Name: {data.get('employer_name', 'N/A')}")
        c.drawString(25*mm, height-47*mm, f"PE Number: {data.get('pe_number', 'N/A')}")
        c.drawString(110*mm, height-42*mm, f"Period: {data.get('month', 'MM')}/{data.get('year', 'YYYY')}")
        
        # --- Data Table ---
        y = height - 70*mm
        c.setFont("Helvetica-Bold", 10)
        c.drawString(20*mm, y, "Description")
        c.drawRightString(180*mm, y, "Amount (EUR)")
        c.line(20*mm, y-2*mm, 190*mm, y-2*mm)
        
        y -= 10*mm
        rows = [
            ("Total Gross Emoluments", data.get('total_gross_emoluments', 0.0)),
            ("Tax Deducted (FSS)", data.get('total_fss_tax', 0.0)),
            ("Social Security (Employee)", data.get('total_ssc_employee', 0.0)),
            ("Social Security (Employer)", data.get('total_ssc_employer', 0.0)),
            ("Maternity Fund Contribution", data.get('total_maternity_fund', 0.0)),
        ]
        
        c.setFont("Helvetica", 10)
        for label, val in rows:
            c.drawString(20*mm, y, label)
            c.drawRightString(180*mm, y, f"{val:.2f}")
            y -= 8*mm
            
        c.line(20*mm, y, 190*mm, y)
        y -= 8*mm
        c.setFont("Helvetica-Bold", 11)
        c.drawString(20*mm, y, "TOTAL PAYMENT DUE")
        c.drawRightString(180*mm, y, f"EUR {data.get('total_payment_due', 0.0):.2f}")
        
        # --- Signatures ---
        c.setFont("Helvetica", 8)
        c.drawString(20*mm, 40*mm, "I certify that the above information is correct.")
        c.line(20*mm, 30*mm, 100*mm, 30*mm)
        c.drawString(20*mm, 25*mm, "Signature of Employer / Representative")
        
        c.showPage()
        c.save()
        pdf_bytes = buffer.getvalue()
        buffer.close()
        return pdf_bytes

    def generate_fs3_pdf(self, data: dict) -> bytes:
        """Generate official-style Malta FS3 Annual Summary PDF"""
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=A4)
        width, height = A4
        c.setFont("Helvetica-Bold", 12)
        c.drawCentredString(width/2, height-20*mm, f"FS3 — ANNUAL PAY STATEMENT {data.get('year')}")
        
        # Box layout
        c.rect(20*mm, height-60*mm, 170*mm, 35*mm)
        c.setFont("Helvetica-Bold", 8)
        c.drawString(22*mm, height-29*mm, "EMPLOYEE INFORMATION")
        c.setFont("Helvetica", 10)
        c.drawString(25*mm, height-38*mm, f"Name: {data.get('employee_name')}")
        c.drawString(25*mm, height-43*mm, f"ID Card: {data.get('id_card')}")
        c.drawString(25*mm, height-48*mm, f"SSC Number: {data.get('ssc_number', 'N/A')}")
        
        # Totals
        y = height - 80*mm
        c.setFont("Helvetica-Bold", 10)
        c.drawString(20*mm, y, "ANNUAL TOTALS")
        c.line(20*mm, y-2*mm, 190*mm, y-2*mm)
        y -= 10*mm
        
        stats = [
            ("Gross Emoluments", data.get('gross_emoluments', 0.0)),
            ("Tax Deducted", data.get('fss_tax_deducted', 0.0)),
            ("SSC (Employee Share)", data.get('ssc_employee', 0.0)),
            ("Maternity Fund", data.get('maternity_fund', 0.0)),
        ]
        
        for label, val in stats:
            c.setFont("Helvetica", 10)
            c.drawString(25*mm, y, label)
            c.drawRightString(180*mm, y, f"{val:.2f}")
            y -= 8*mm
            
        c.showPage()
        c.save()
        pdf_bytes = buffer.getvalue()
        buffer.close()
        return pdf_bytes

    def generate_payslip_reportlab(self, payslip_data: dict) -> bytes:
        """
        Generate a refined Maltese payslip using ReportLab.
        Mimics the Indigo/Shireburn layout structure.
        """
        if not REPORTLAB_AVAILABLE:
            raise ImportError("ReportLab not installed")
            
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=A4)
        width, height = A4
        
        # --- Header Section ---
        c.setFont("Helvetica-Bold", 16)
        c.drawString(20*mm, height-20*mm, "PAY ADVICE")
        
        c.setFont("Helvetica-Bold", 10)
        c.drawString(20*mm, height-30*mm, "Caviar & Bull / Buddhamann Ltd")
        c.setFont("Helvetica", 9)
        c.drawString(20*mm, height-35*mm, "St Georges Bay, St Julians, Malta")
        
        # --- Employee & Period Boxes ---
        c.setLineWidth(0.2)
        c.rect(20*mm, height-65*mm, 80*mm, 20*mm) # Left box
        c.rect(110*mm, height-65*mm, 80*mm, 20*mm) # Right box
        
        c.setFont("Helvetica-Bold", 8)
        c.drawString(22*mm, height-50*mm, "EMPLOYEE")
        c.drawString(112*mm, height-50*mm, "PAYROLL PERIOD")
        
        c.setFont("Helvetica", 10)
        c.drawString(25*mm, height-58*mm, payslip_data.get('employee_name', 'N/A'))
        c.drawString(25*mm, height-63*mm, f"ID: {payslip_data.get('employee_number', 'N/A')}")
        
        c.drawString(115*mm, height-58*mm, f"{payslip_data.get('period_start', '')} to {payslip_data.get('period_end', '')}")
        
        # --- Earnings & Deductions Table ---
        # Headers
        c.line(20*mm, height-75*mm, 190*mm, height-75*mm)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(20*mm, height-82*mm, "Description")
        c.drawRightString(140*mm, height-82*mm, "Earnings (EUR)")
        c.drawRightString(185*mm, height-82*mm, "Deductions (EUR)")
        c.line(20*mm, height-85*mm, 190*mm, height-85*mm)
        
        # Rows
        y = height - 95*mm
        c.setFont("Helvetica", 10)
        
        # Basic Pay
        c.drawString(20*mm, y, "Basic Pay")
        c.drawRightString(140*mm, y, f"{payslip_data.get('basic_pay', 0.0):.2f}")
        y -= 10*mm
        
        # Taxes & SSC (Mocking from components or summary)
        tax = payslip_data.get('tax_amount', 0.0)
        if tax > 0:
            c.drawString(20*mm, y, "FSS Tax")
            c.drawRightString(185*mm, y, f"{tax:.2f}")
            y -= 8*mm
            
        ssc = payslip_data.get('total_deductions', 0.0) - tax
        if ssc > 0:
            c.drawString(20*mm, y, "Social Security")
            c.drawRightString(185*mm, y, f"{ssc:.2f}")
            y -= 8*mm

        # --- Totals Section ---
        c.line(20*mm, 50*mm, 190*mm, 50*mm)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(20*mm, 43*mm, "TOTAL GROSS")
        c.drawRightString(140*mm, 43*mm, f"EUR {payslip_data.get('gross_pay', 0.0):.2f}")
        
        c.drawString(20*mm, 35*mm, "TOTAL DEDUCTIONS")
        c.drawRightString(185*mm, 35*mm, f"EUR {payslip_data.get('total_deductions', 0.0):.2f}")
        
        # --- Net Pay Highlight ---
        c.setFillColorRGB(0.95, 0.95, 0.95)
        c.rect(110*mm, 15*mm, 80*mm, 15*mm, fill=1)
        c.setFillColorRGB(0, 0, 0)
        c.setFont("Helvetica-Bold", 12)
        c.drawString(115*mm, 22*mm, "NET PAY")
        c.drawRightString(185*mm, 22*mm, f"EUR {payslip_data.get('net_pay', 0.0):.2f}")
        
        # Footer
        c.setFont("Helvetica-Oblique", 8)
        c.drawString(20*mm, 10*mm, "This is a computer generated document. Restin.ai HR Module.")
        
        # Finalize
        c.showPage()
        c.save()
        
        pdf_bytes = buffer.getvalue()
        buffer.close()
        return pdf_bytes
    
    def generate_technical_doc(self, content: str, title: str = "Technical Documentation") -> bytes:
        """Generate technical documentation PDF"""
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: 'Helvetica', Arial, sans-serif; padding: 40px; line-height: 1.6; }}
                h1 {{ color: #1e40af; border-bottom: 3px solid #1e40af; padding-bottom: 10px; }}
                h2 {{ color: #3b82f6; margin-top: 30px; }}
                h3 {{ color: #60a5fa; }}
                pre {{ background: #f3f4f6; padding: 15px; border-radius: 5px; overflow-x: auto; }}
                code {{ background: #e5e7eb; padding: 2px 6px; border-radius: 3px; }}
            </style>
        </head>
        <body>
            <h1>{title}</h1>
            {content}
        </body>
        </html>
        """
        
        return self.generate_from_html(html)


pdf_service = PDFGenerationService()
