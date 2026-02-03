"""Finance Provider Settings (vendor-agnostic)"""
from pydantic import BaseModel

class FinanceProviderSettings(BaseModel):
    venue_id: str
    enabled: bool = False
    mode: str = "EXPORT_ONLY"  # EXPORT_ONLY | API_PUSH | API_PULL | HYBRID
    provider_label: str = "External Finance Provider"  # User-defined name
    base_url: str = ""
    auth_ref: str = ""  # secret://...
    company_code: str = ""
    sync_schedule: str = "MANUAL"  # MANUAL | DAILY | WEEKLY
    created_at: str
    updated_at: str
