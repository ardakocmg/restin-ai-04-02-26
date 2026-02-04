"""Drilldown model - Dashboard cell to detail mapping"""
from pydantic import BaseModel
from typing import Optional

class DrilldownDefinition(BaseModel):
    tile_id: str
    page_key_source: str
    target_page_key: str
    fixed_filters: dict = {}
    mapping_rules: dict = {}  # {"bucket": "date"}
    default_sort: Optional[str] = None
