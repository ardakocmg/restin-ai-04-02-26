from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import black
from decimal import Decimal
from io import BytesIO
from app.domains.reporting.models.summary_report import SummaryReportData

def format_decimal(d):
    return "{:.2f}".format(d)

def render_pdf_v1(data: SummaryReportData) -> bytes:
    buffer = BytesIO()
    
    # Create canvas
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    
    # Freeze Metadata for determinism
    c.setTitle("Restaurant Summary Report")
    c.setAuthor("restin.ai")
    c.setSubject("Summary Report")
    c.setCreator("restin.ai reporting-v1")
    # For creation date, ideally we use a fixed one or a deterministic one if reportlab supports it
    # c._doc.info.creationDate = ... # Reportlab internals might be tricky
    
    y = height - 20*mm
    margin = 20*mm
    
    # Helper to write line and advance y
    def draw_text(text, font="Helvetica", size=10, x=margin, dy=5*mm):
        nonlocal y
        c.setFont(font, size)
        c.drawString(x, y, text)
        y -= dy

    def draw_line(dy=5*mm):
        nonlocal y
        c.setStrokeColor(black)
        c.line(margin, y + size/2, width - margin, y + size/2) # Simplified
        y -= dy

    # Title & Range
    draw_text(f"{data.title} {data.date_range_str}", font="Helvetica-Bold", size=12)
    draw_text(f"from: {data.from_str}       to: {data.to_str}", size=9)
    y -= 5*mm
    
    # Separator
    c.setDash(1, 1)
    c.line(margin, y, margin + 50*mm, y)
    c.setDash()
    y -= 8*mm
    
    # Venue Block
    draw_text(data.venue_name, font="Helvetica-Bold")
    draw_text(f"Company ID: {data.company_id}")
    draw_text(data.address_line1)
    draw_text(data.address_line2)
    draw_text(data.address_line3)
    y -= 5*mm
    
    # Separator
    c.setDash(1, 1)
    c.line(margin, y, margin + 50*mm, y)
    c.setDash()
    y -= 10*mm
    
    # REVENUES Section
    draw_text("REVENUES:", font="Helvetica-Bold")
    draw_text(f"restaurant revenue: {format_decimal(data.restaurant_revenue)}", x=margin+5*mm)
    draw_text(f"Service charges: {format_decimal(data.service_charges)}", x=margin+5*mm)
    
    # Exact dashed line
    c.setDash(2, 2)
    c.line(margin+5*mm, y+2*mm, margin+60*mm, y+2*mm)
    c.setDash()
    
    draw_text(f"Total revenue: {format_decimal(data.total_revenue)}", font="Helvetica-Bold", x=margin+5*mm)
    y -= 5*mm
    
    draw_text(f"+ Revenue without discounts: {format_decimal(data.revenue_without_discounts)}", x=margin+5*mm)
    draw_text(f"- Total discounts: {format_decimal(data.total_discounts)}", x=margin+5*mm)
    draw_text(f"= Total revenue: {format_decimal(data.total_revenue)}", font="Helvetica-Bold", x=margin+5*mm)
    y -= 10*mm
    
    # VAT Table
    draw_text("VAT", font="Helvetica-Bold")
    header_y = y + 2*mm
    c.setFont("Helvetica-Bold", 8)
    c.drawString(margin, y, "VAT RATE")
    c.drawString(margin+30*mm, y, "NET REVENUE")
    c.drawString(margin+60*mm, y, "VAT")
    c.drawString(margin+90*mm, y, "TOTAL REVENUE")
    y -= 5*mm
    c.setFont("Helvetica", 8)
    for row in data.vat_rows:
        c.drawString(margin, y, row.rate)
        c.drawString(margin+30*mm, y, format_decimal(row.net))
        c.drawString(margin+60*mm, y, format_decimal(row.vat))
        c.drawString(margin+90*mm, y, format_decimal(row.total))
        y -= 5*mm
    y -= 5*mm
    
    # TOTALS Section
    draw_text("TOTALS:", font="Helvetica-Bold")
    draw_text(f"Gross Sales: {format_decimal(data.gross_sales)}", x=margin+5*mm)
    draw_text(f"Customers: {data.customers} ({format_decimal(data.customers_avg)} avg)", x=margin+5*mm)
    draw_text(f"Tickets: {data.tickets} ({format_decimal(data.tickets_avg)} avg)", x=margin+5*mm)
    draw_text(f"Tables Served: {data.tables_served} (turnover {format_decimal(data.tables_turnover)}) ({format_decimal(data.tables_avg)} avg per table)", x=margin+5*mm)
    draw_text(f"Voided Tickets: {data.voided_tickets} ({format_decimal(data.voided_total)} total)", x=margin+5*mm)
    draw_text(f"Corrected Items: {data.corrected_items} ({format_decimal(data.corrected_total)} vat incl.)", x=margin+5*mm)
    y -= 10*mm
    
    # PAYMENTS AND TIPS Table
    draw_text("PAYMENTS AND TIPS", font="Helvetica-Bold")
    c.setFont("Helvetica-Bold", 8)
    c.drawString(margin, y, "TYPE")
    c.drawString(margin+60*mm, y, "AMOUNT")
    c.drawString(margin+80*mm, y, "TIPS")
    c.drawString(margin+100*mm, y, "TOTAL")
    y -= 5*mm
    c.setFont("Helvetica", 8)
    for p in data.payment_rows:
        if p.kind == "total":
            c.setFont("Helvetica-Bold", 8)
            y -= 2*mm
            c.line(margin, y+4*mm, margin+120*mm, y+4*mm)
        
        name = p.type_name
        if p.kind == "child":
            name = f"    {p.provider}"
            
        c.drawString(margin, y, name)
        c.drawString(margin+60*mm, y, format_decimal(p.amount))
        c.drawString(margin+80*mm, y, format_decimal(p.tips))
        c.drawString(margin+100*mm, y, format_decimal(p.total))
        y -= 5*mm
        c.setFont("Helvetica", 8)
    y -= 10*mm
    
    # DISCOUNTS BY PRODUCT TYPE Table
    draw_text("DISCOUNTS BY PRODUCT TYPE", font="Helvetica-Bold")
    c.setFont("Helvetica-Bold", 8)
    c.drawString(margin, y, "TYPE")
    c.drawString(margin+40*mm, y, "#")
    c.drawString(margin+60*mm, y, "TOTAL")
    c.drawString(margin+80*mm, y, "%")
    y -= 5*mm
    c.setFont("Helvetica", 8)
    for d in data.discount_rows:
        if d.type_name == "TOTAL":
            c.setFont("Helvetica-Bold", 8)
        c.drawString(margin, y, d.type_name)
        c.drawString(margin+40*mm, y, str(d.count))
        c.drawString(margin+60*mm, y, format_decimal(d.total))
        c.drawString(margin+80*mm, y, d.percentage)
        y -= 5*mm
    y -= 10*mm
    
    # REVENUES BY PRODUCT TYPE Table
    draw_text("REVENUES BY PRODUCT TYPE", font="Helvetica-Bold")
    c.setFont("Helvetica-Bold", 8)
    c.drawString(margin, y, "TYPE")
    c.drawString(margin+40*mm, y, "#")
    c.drawString(margin+60*mm, y, "TOTAL")
    c.drawString(margin+80*mm, y, "DISC EXCL")
    y -= 5*mm
    c.setFont("Helvetica", 8)
    for r in data.revenue_type_rows:
        if r.type_name == "TOTAL":
            c.setFont("Helvetica-Bold", 8)
        c.drawString(margin, y, r.type_name)
        c.drawString(margin+40*mm, y, str(r.count))
        c.drawString(margin+60*mm, y, format_decimal(r.total))
        c.drawString(margin+80*mm, y, format_decimal(r.disc_excl))
        y -= 5*mm

    c.showPage()
    c.save()
    
    return buffer.getvalue()
