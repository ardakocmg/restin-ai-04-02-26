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
        Matches Shireburn Indigo layout (Arda Koc reference).
        """
        if not REPORTLAB_AVAILABLE:
            raise ImportError("ReportLab not installed")
            
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=A4)
        width, height = A4
        
        # --- Constants & Helpers ---
        LINE_H = 12
        MARGIN_L = 15*mm
        MARGIN_R = 195*mm
        CONTENT_W = MARGIN_R - MARGIN_L
        
        def draw_box_label_value(x, y, w, title, value):
            c.setLineWidth(0.5)
            c.rect(x, y-10, w, 25)
            c.setFont("Helvetica-Bold", 7)
            c.drawString(x+2, y+8, title.upper())
            c.setFont("Helvetica", 9)
            c.drawString(x+2, y-2, str(value or ""))
            
        # --- Header (Logo & Company) ---
        # Mock Logo Place
        c.setFillColorRGB(0.9, 0.9, 0.9)
        c.rect(MARGIN_L, height-25*mm, 40*mm, 15*mm, fill=1, stroke=0) 
        c.setFillColorRGB(0,0,0)
        c.setFont("Helvetica-BoldOblique", 12)
        c.drawCentredString(MARGIN_L+20*mm, height-18*mm, "LOGO")
        
        c.setFont("Helvetica-Bold", 14)
        c.drawRightString(MARGIN_R, height-15*mm, "PAY ADVICE")
        
        c.setFont("Helvetica-Bold", 10)
        c.drawString(MARGIN_L, height-35*mm, "Caviar & Bull / Buddhamann Ltd")
        c.setFont("Helvetica", 9)
        c.drawString(MARGIN_L, height-40*mm, "St Georges Bay, St Julians, Malta")
        c.drawString(MARGIN_L, height-45*mm, "PE: 456398") # Mock PE from Arda seed

        # --- Top Metadata Row (Period, Date, Run) ---
        y_meta = height - 55*mm
        c.line(MARGIN_L, y_meta+15, MARGIN_R, y_meta+15)
        
        c.setFont("Helvetica-Bold", 8)
        c.drawString(MARGIN_L, y_meta, "PERIOD:")
        c.setFont("Helvetica", 9)
        c.drawString(MARGIN_L+15*mm, y_meta, f"{payslip_data.get('period_start')} - {payslip_data.get('period_end')}")
        
        c.setFont("Helvetica-Bold", 8)
        c.drawString(MARGIN_L+70*mm, y_meta, "RUN DATE:")
        c.setFont("Helvetica", 9)
        c.drawString(MARGIN_L+90*mm, y_meta, date.today().strftime("%d-%m-%Y"))
        
        c.setFont("Helvetica-Bold", 8)
        c.drawString(MARGIN_L+130*mm, y_meta, "RUN TYPE:")
        c.setFont("Helvetica", 9)
        c.drawString(MARGIN_L+150*mm, y_meta, "Main Payroll")
        
        c.line(MARGIN_L, y_meta-5, MARGIN_R, y_meta-5)
        
        # --- Employee Details ---
        y_emp = y_meta - 15*mm
        
        c.setFont("Helvetica-Bold", 9)
        # Row 1
        c.drawString(MARGIN_L, y_emp, "Code:")
        c.setFont("Helvetica", 9)
        c.drawString(MARGIN_L+25*mm, y_emp, payslip_data.get('employee_number', ''))
        
        c.setFont("Helvetica-Bold", 9)
        c.drawString(MARGIN_L+60*mm, y_emp, "ID Card:")
        c.setFont("Helvetica", 9)
        c.drawString(MARGIN_L+80*mm, y_emp, payslip_data.get('id_card', '0307741A')) # Mock if missing
        
        c.setFont("Helvetica-Bold", 9)
        c.drawString(MARGIN_L+120*mm, y_emp, "Tax Output:")
        c.setFont("Helvetica", 9)
        c.drawString(MARGIN_L+150*mm, y_emp, "Single")
        
        # Row 2
        y_emp -= 6*mm
        c.setFont("Helvetica-Bold", 9)
        c.drawString(MARGIN_L, y_emp, "Name:")
        c.setFont("Helvetica", 9)
        c.drawString(MARGIN_L+25*mm, y_emp, payslip_data.get('employee_name', ''))
        
        c.setFont("Helvetica-Bold", 9)
        c.drawString(MARGIN_L+60*mm, y_emp, "Department:")
        c.setFont("Helvetica", 9)
        c.drawString(MARGIN_L+80*mm, y_emp, "Operations") # Mock
        
        c.setFont("Helvetica-Bold", 9)
        c.drawString(MARGIN_L+120*mm, y_emp, "NI Cat:")
        c.setFont("Helvetica", 9)
        c.drawString(MARGIN_L+150*mm, y_emp, "A")

        # --- Main Table Header ---
        y_table = y_emp - 15*mm
        c.setFillColorRGB(0.9, 0.9, 0.9)
        c.setLineWidth(0.5)
        c.rect(MARGIN_L, y_table-2, CONTENT_W, 12, fill=1, stroke=1)
        c.setFillColorRGB(0,0,0)
        c.setFont("Helvetica-Bold", 8)
        
        col_desc = MARGIN_L + 2*mm
        col_qty = MARGIN_L + 60*mm
        col_rate = MARGIN_L + 80*mm
        col_earn = MARGIN_L + 105*mm
        col_deduct = MARGIN_L + 130*mm
        col_ytd = MARGIN_L + 155*mm
        
        c.drawString(col_desc, y_table+2, "DESCRIPTION")
        c.drawString(col_qty, y_table+2, "HOURS")
        c.drawString(col_rate, y_table+2, "RATE")
        c.drawString(col_earn, y_table+2, "EARNINGS")
        c.drawString(col_deduct, y_table+2, "DEDUCTIONS")
        c.drawString(col_ytd, y_table+2, "YTD TOTAL")
        
        y_curr = y_table - 6*mm
        
        # --- Body Items ---
        items = payslip_data.get('lines', []) # Assuming refined 'lines' structure, else fallback
        if not items:
            # Fallback generator if 'lines' missing
            items = []
            if payslip_data.get('basic_pay', 0):
                items.append({'name': 'Basic Pay', 'qty': 173.33, 'rate': 12.50, 'earn': payslip_data['basic_pay'], 'deduct': 0.0})
            if payslip_data.get('tax_amount', 0):
                items.append({'name': 'FSS Tax', 'qty': 0, 'rate': 0, 'earn': 0.0, 'deduct': payslip_data['tax_amount']})
            ssc = payslip_data.get('total_deductions', 0) - payslip_data.get('tax_amount', 0)
            if ssc > 0:
                items.append({'name': 'SSC Contribution', 'qty': 0, 'rate': 0, 'earn': 0.0, 'deduct': ssc})
                
        c.setFont("Helvetica", 8)
        for item in items:
            c.drawString(col_desc, y_curr, item.get('name', ''))
            if item.get('qty'):
                c.drawString(col_qty, y_curr, f"{item['qty']:.2f}")
            if item.get('rate'):
                c.drawString(col_rate, y_curr, f"{item['rate']:.2f}")
            if item.get('earn'):
                c.drawString(col_earn, y_curr, f"€{item['earn']:.2f}")
            if item.get('deduct'):
                c.drawString(col_deduct, y_curr, f"€{item['deduct']:.2f}")
                
            y_curr -= 5*mm
            
        # Draw separator
        c.line(MARGIN_L, y_curr, MARGIN_R, y_curr)
        y_curr -= 5 * mm
        
        # --- Totals Section ---
        c.setFont("Helvetica-Bold", 9)
        c.drawString(col_desc, y_curr, "TOTALS")
        c.drawString(col_earn, y_curr, f"€{payslip_data.get('gross_pay', 0.0):.2f}")
        c.drawString(col_deduct, y_curr, f"€{payslip_data.get('total_deductions', 0.0):.2f}")
        
        # --- Leave Balances Boxes (Indigo Style) ---
        y_balances = 65*mm
        c.line(MARGIN_L, y_balances+5, MARGIN_R, y_balances+5)
        
        box_w = 25*mm
        c.setFont("Helvetica-Bold", 8)
        c.drawString(MARGIN_L, y_balances-2, "LEAVE DETAILS")
        
        # Mock Leave Data
        vac_ent = 192.0
        vac_taken = 24.0
        vac_bal = 168.0
        
        draw_box_label_value(MARGIN_L, y_balances-15, box_w, "Annual Ent.", f"{vac_ent} hrs")
        draw_box_label_value(MARGIN_L+30*mm, y_balances-15, box_w, "Taken YTD", f"{vac_taken} hrs")
        draw_box_label_value(MARGIN_L+60*mm, y_balances-15, box_w, "Balance", f"{vac_bal} hrs")
        
        # --- Bank Details ---
        y_bank = 45*mm
        c.setFont("Helvetica", 7)
        c.drawString(MARGIN_L, y_bank, "Payment Method: Direct Credit")
        c.drawString(MARGIN_L, y_bank-3*mm, f"IBAN: {payslip_data.get('iban', 'MT55HSBC0000000000000')}")
        
        # --- Net Pay Bottom Right ---
        c.setLineWidth(1)
        c.rect(130*mm, 30*mm, 50*mm, 15*mm)
        c.setFont("Helvetica-Bold", 11)
        c.drawString(135*mm, 39*mm, "NET PAY")
        c.setFont("Helvetica-Bold", 14)
        c.drawRightString(175*mm, 34*mm, f"€{payslip_data.get('net_pay', 0.0):.2f}")
        
        # --- Footer ---
        c.setFont("Helvetica", 6)
        c.drawCentredString(width/2, 10*mm, "Printed from Restin.ai | Shireburn Indigo Parity Edition")
        
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
            <h1>{{ title }}</h1>
            {{ content }}
        </body>
        </html>
        """
        
        return self.generate_from_html(html)


pdf_service = PDFGenerationService()
