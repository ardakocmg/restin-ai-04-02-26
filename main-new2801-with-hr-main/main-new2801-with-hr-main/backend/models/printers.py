from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
import uuid

class PrinterType(str, Enum):
    RECEIPT = "Receipt"
    KITCHEN = "Kitchen"
    BAR = "Bar"
    LABEL = "Label"

class PrinterStatus(str, Enum):
    ONLINE = "Online"
    OFFLINE = "Offline"
    ERROR = "Error"
    BUSY = "Busy"

class PrintJobStatus(str, Enum):
    PENDING = "PENDING"
    PRINTING = "PRINTING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"

class PrinterBase(BaseModel):
    name: str
    type: PrinterType
    location: Optional[str] = None
    ip_address: Optional[str] = None
    port: int = 9100
    is_active: bool = True
    default_template_id: Optional[str] = None

class PrinterCreate(PrinterBase):
    pass

class PrinterUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[PrinterType] = None
    location: Optional[str] = None
    ip_address: Optional[str] = None
    port: Optional[int] = None
    is_active: Optional[bool] = None
    default_template_id: Optional[str] = None
    status: Optional[PrinterStatus] = None

class Printer(PrinterBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: PrinterStatus = PrinterStatus.OFFLINE
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# --- Templates ---

class PrinterTemplateBase(BaseModel):
    name: str
    type: PrinterType
    content_format: Dict[str, Any] = Field(default_factory=dict) # JSON describing layout
    is_default: bool = False

class PrinterTemplateCreate(PrinterTemplateBase):
    pass

class PrinterTemplate(PrinterTemplateBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)

# --- Jobs ---

class PrintJobCreate(BaseModel):
    printer_id: str
    template_id: Optional[str] = None
    context_data: Dict[str, Any] = Field(default_factory=dict) # Data to fill template (e.g. order details)
    raw_content: Optional[str] = None # Direct ESC/POS or text if not using template

class PrintJob(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str
    printer_id: str
    status: PrintJobStatus = PrintJobStatus.PENDING
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    content_snapshot: Optional[str] = None # What was actually sent to printer
