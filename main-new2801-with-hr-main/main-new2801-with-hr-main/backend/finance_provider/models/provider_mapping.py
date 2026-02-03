"""Provider Mapping models"""
from pydantic import BaseModel

class ProviderEmployeeMap(BaseModel):
    venue_id: str
    identity_id: str  # Internal identity
    external_employee_id: str  # Provider's employee ID
    external_employee_code: str = ""
    sync_enabled: bool = True

class ProviderCOAMap(BaseModel):
    venue_id: str
    internal_account_code: str  # e.g., "SALES", "COGS", "WAGES"
    external_account_code: str  # Provider's account code
    external_account_name: str = ""
    sync_enabled: bool = True

class ProviderVATMap(BaseModel):
    venue_id: str
    internal_vat_rate: float  # e.g., 0.18 (Malta 18%)
    external_vat_code: str  # Provider's VAT code
    external_vat_name: str = ""
    sync_enabled: bool = True
