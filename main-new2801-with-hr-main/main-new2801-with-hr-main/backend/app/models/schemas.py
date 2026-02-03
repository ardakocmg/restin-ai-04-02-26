from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from uuid import uuid4

class EmployeeCore(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()), alias="_id")
    first_name: str
    last_name: str
    work_email: EmailStr
    department: str
    job_title: str
    locality: str       
    status: str = "Active"

class EmployeeSecrets(BaseModel):
    employee_id: str
    encrypted_blob: dict 

class PayrollRequest(BaseModel):
    gross_annual: float
    cola_eligible: bool = True
    tax_category: str = "Single"
