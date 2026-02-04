from dataclasses import dataclass
from typing import List, Optional
from decimal import Decimal

@dataclass
class VatRow:
    rate: str
    net: Decimal
    vat: Decimal
    total: Decimal

@dataclass
class PaymentRow:
    type_name: str
    kind: str  # "group" or "child"
    amount: Decimal
    tips: Decimal
    total: Decimal
    provider: Optional[str] = None

@dataclass
class DiscRow:
    type_name: str
    count: int
    total: Decimal
    percentage: str

@dataclass
class RevTypeRow:
    type_name: str
    count: int
    total: Decimal
    disc_excl: Decimal

@dataclass
class SummaryReportData:
    title: str
    date_range_str: str
    from_str: str
    to_str: str
    venue_name: str
    company_id: str
    address_line1: str
    address_line2: str
    address_line3: str
    
    restaurant_revenue: Decimal
    service_charges: Decimal
    total_revenue: Decimal
    
    revenue_without_discounts: Decimal
    total_discounts: Decimal
    
    gross_sales: Decimal
    customers: int
    customers_avg: Decimal
    tickets: int
    tickets_avg: Decimal
    tables_served: int
    tables_turnover: Decimal
    tables_avg: Decimal
    voided_tickets: int
    voided_total: Decimal
    corrected_items: int
    corrected_total: Decimal
    
    vat_rows: List[VatRow]
    payment_rows: List[PaymentRow]
    discount_rows: List[DiscRow]
    revenue_type_rows: List[RevTypeRow]
