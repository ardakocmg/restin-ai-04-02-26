from io import StringIO
import csv
from app.domains.reporting.models.summary_report import SummaryReportData

def format_decimal(d):
    return "{:.2f}".format(d)

def render_csv_v1(data: SummaryReportData) -> bytes:
    output = StringIO()
    # The user wants exact byte matching. CSV library might add quotes unexpectedly.
    # We might need to write manually if csv.writer doesn't match the specific sample.
    # Sample line: RESTAURANT SUMMARY REPORT 31/01/26 - 01/02/26, 
    # Note the trailing comma in many lines of the sample.
    
    def wl(line):
        output.write(line + "\r\n") # Windows line endings usually in CSV

    wl(f"{data.title} {data.date_range_str},")
    wl(f"from: {data.from_str},\" \",to: {data.to_str},")
    wl("")
    wl("----------------------------,")
    wl("")
    wl(f"{data.venue_name},")
    wl(f"Company ID:,{data.company_id},")
    wl(f"{data.address_line1},\" \",{data.address_line2},")
    wl(f"{data.address_line3},\", \",Malta,") # Note the specific ", " in sample
    wl("")
    wl("----------------------------,")
    wl("")
    wl("REVENUES:,")
    wl(f"restaurant revenue:,{format_decimal(data.restaurant_revenue)},")
    wl(f"Service charges:,{format_decimal(data.service_charges)},")
    wl("----------------------------------------,")
    wl(f"Total revenue:,{format_decimal(data.total_revenue)},")
    wl("")
    wl(f"+ Revenue without discounts:,{format_decimal(data.revenue_without_discounts)},")
    wl(f"- Total discounts:,{format_decimal(data.total_discounts)},")
    wl(f"= Total revenue:,{format_decimal(data.total_revenue)},")
    wl("")
    wl("VAT,")
    wl("VAT RATE,NET REVENUE,VAT,TOTAL REVENUE,")
    for row in data.vat_rows:
        wl(f"{row.rate},{format_decimal(row.net)},{format_decimal(row.vat)},{format_decimal(row.total)},")
    wl("")
    wl("TOTALS:,")
    wl(f"Gross Sales:,{format_decimal(data.gross_sales)},")
    wl(f"Customers:,{data.customers},({format_decimal(data.customers_avg)} avg),")
    wl(f"Tickets:,{data.tickets},({format_decimal(data.tickets_avg)} avg),")
    wl(f"Tables Served:,{data.tables_served},(turnover {format_decimal(data.tables_turnover)}),({format_decimal(data.tables_avg)} avg per table),")
    wl(f"Voided Tickets:,{data.voided_tickets},({format_decimal(data.voided_total)} total),")
    wl(f"Corrected Items:,{data.corrected_items},({format_decimal(data.corrected_total)} vat incl.),")
    wl("")
    wl("PAYMENTS AND TIPS,")
    wl("TYPE,,,AMOUNT,TIPS,TOTAL,")
    for p in data.payment_rows:
        if p.kind == "total":
            wl(f"{p.type_name},,,{format_decimal(p.amount)},{format_decimal(p.tips)},{format_decimal(p.total)},")
        elif p.kind == "group":
            wl(f"{p.type_name},,,{format_decimal(p.amount)},{format_decimal(p.tips)},{format_decimal(p.total)},")
        elif p.kind == "child":
            wl(f",{p.provider},,{format_decimal(p.amount)},{format_decimal(p.tips)},{format_decimal(p.total)},")
    wl("")
    wl("DISCOUNTS BY PRODUCT TYPE,")
    wl("TYPE,#,TOTAL,%,")
    for d in data.discount_rows:
        wl(f"{d.type_name},{d.count},{format_decimal(d.total)},{d.percentage},")
    wl("")
    wl("REVENUES BY PRODUCT TYPE,")
    wl("TYPE,#,TOTAL,DISC EXCL,")
    for r in data.revenue_type_rows:
        wl(f"{r.type_name},{r.count},{format_decimal(r.total)},{format_decimal(r.disc_excl)},")

    return output.getvalue().encode('utf-8')
