import pytest
from datetime import datetime
from decimal import Decimal
from app.domains.reporting.service.summary_report_service import generate_summary_report_data
from app.domains.reporting.renderers.summary_report_csv_v1 import render_csv_v1
from app.domains.reporting.renderers.summary_report_pdf_v1 import render_pdf_v1

GOLDEN_CSV_CONTENT = """RESTAURANT SUMMARY REPORT 31/01/26 - 01/02/26,
from: 31/01/26 04:00 +0100," ",to: 01/02/26 04:00 +0100,

----------------------------,

Caviar & Bull,
Company ID:,46272,
Triq Ix Xatt," ",St. George's Bay,
St. Julians,", ",Malta,

----------------------------,

REVENUES:,
restaurant revenue:,5047.19,
Service charges:,10.00,
----------------------------------------,
Total revenue:,5057.19,

+ Revenue without discounts:,5151.69,
- Total discounts:,94.50,
= Total revenue:,5057.19,

VAT,
VAT RATE,NET REVENUE,VAT,TOTAL REVENUE,
18%,4285.77,771.42,5057.19,

TOTALS:,
Gross Sales:,5057.19,
Customers:,48,(105.36 avg),
Tickets:,22,(229.87 avg),
Tables Served:,22,(turnover 0.00),(229.87 avg per table),
Voided Tickets:,0,(0.00 total),
Corrected Items:,3,(46.00 vat incl.),

PAYMENTS AND TIPS,
TYPE,,,AMOUNT,TIPS,TOTAL,
Cash,,,254.50,0.00,254.50,
,Cash,,254.50,0.00,254.50,
Credit Card,,,4602.69,0.00,4602.69,
,VivaWallet,,4602.69,0.00,4602.69,
Other,,,200.00,0.00,200.00,
,Gift Vouchers,,200.00,0.00,200.00,
TOTAL,,,5057.19,0.00,5057.19,

DISCOUNTS BY PRODUCT TYPE,
TYPE,#,TOTAL,%,
Beverage,1,59.50,1.15%,
Cigars,1,35.00,0.68%,
TOTAL,2,94.50,1.83%,

REVENUES BY PRODUCT TYPE,
TYPE,#,TOTAL,DISC EXCL,
Beverage,90,1657.25,1716.75,
Caviar & Bull: Food,203,3339.94,3339.94,
Cigars,2,50.00,85.00,
TOTAL,295,5047.19,5141.69,
""".replace('\n', '\r\n') # Match windows line endings as encoded in renderers

def test_csv_byte_equality():
    # Golden dates: 2026-01-31 04:00 to 2026-02-01 04:00
    from_dt = datetime(2026, 1, 31, 4, 0)
    to_dt = datetime(2026, 2, 1, 4, 0)
    venue_id = "Caviar & Bull"
    
    data = generate_summary_report_data(from_dt, to_dt, venue_id, "UTC", {})
    csv_bytes = render_csv_v1(data)
    
    assert csv_bytes == GOLDEN_CSV_CONTENT.encode('utf-8')

def test_pdf_generation_smoke():
    from_dt = datetime(2026, 1, 31, 4, 0)
    to_dt = datetime(2026, 2, 1, 4, 0)
    venue_id = "Caviar & Bull"
    
    data = generate_summary_report_data(from_dt, to_dt, venue_id, "UTC", {})
    pdf_bytes = render_pdf_v1(data)
    
    assert pdf_bytes.startswith(b'%PDF-1.4')
    # More complex checks like text extraction could be added here
