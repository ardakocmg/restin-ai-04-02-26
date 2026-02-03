"""Malta SSC Tables (versioned)"""
from pydantic import BaseModel

class MaltaSSCTable(BaseModel):
    version: str
    effective_from: str
    effective_to: str
    employee_rate: float = 0.10  # 10% Class 1
    employer_rate: float = 0.10
    created_at: str
