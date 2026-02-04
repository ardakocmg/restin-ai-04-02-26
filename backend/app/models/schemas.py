from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Any, Dict
from datetime import datetime

# --- Auth Models ---
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    role: str = "employee"

class UserInDB(BaseModel):
    id: str = Field(alias="_id")
    email: EmailStr
    role: str
    is_active: bool = True
    hashed_password: str

class Token(BaseModel):
    access_token: str
    token_type: str

# --- Profile Models ---
class ProfilePublic(BaseModel):
    user_id: str
    name: str
    surname: str
    department: str
    locality: str
    job_title: str

# --- Secret Models ---
class SecretVault(BaseModel):
    user_id: str
    v: int
    algo: str
    nonce: str
    blob: str

class SecretData(BaseModel):
    salary: float
    iban: str
    id_card: str
    medical_notes: Optional[str] = None

# --- Payroll Models ---
class PayrollResult(BaseModel):
    gross_salary: float
    tax_due: float
    ssc_due: float
    cola: float
    net_salary: float
    year: int = 2025
