"""External Menu Mapping model"""
from pydantic import BaseModel
from typing import List

class ExternalMenuMap(BaseModel):
    venue_id: str
    connector_key: str
    sku_id: str
    pos_id: str  # Internal POS ID
    external_id: str  # Connector's menu item ID
    name_override: str = ""
    modifier_mappings: List[dict] = []  # [{"internal_id": "...", "external_id": "...", "name": "..."}]
    tax_group: str = ""
    enabled: bool = True
    sync_status: str = "OK"  # OK | VALIDATION_ERROR | SYNC_PENDING
    last_synced_at: str = ""
