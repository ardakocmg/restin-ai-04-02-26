"""FilterSchema model - Allowed filters per page"""
from pydantic import BaseModel
from typing import List

class FilterField(BaseModel):
    field: str
    ops: List[str]  # ["eq", "in", "gte", "lte"]
    type: str  # "string", "date", "number", "boolean"

class FilterSection(BaseModel):
    key: str
    label: str
    fields: List[str]

class FilterSchema(BaseModel):
    page_key: str
    allowed_fields: List[FilterField]
    default_state: dict
    sections: List[FilterSection]
