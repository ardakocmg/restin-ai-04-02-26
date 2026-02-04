from enum import Enum

class UserRole(str, Enum):
    OWNER = "owner"
    GENERAL_MANAGER = "general_manager"
    MANAGER = "manager"
    SUPERVISOR = "supervisor"
    WAITER = "waiter"
    RUNNER = "runner"
    BARTENDER = "bartender"
    KITCHEN = "kitchen"
    FINANCE = "finance"
    IT_ADMIN = "it_admin"
    STAFF = "staff"
    HOST = "host"
    PRODUCT_OWNER = "product_owner"  # Immutable superuser

class StationType(str, Enum):
    POS = "pos"
    KDS = "kds"
    EXPO = "expo"
    HOST = "host"

class OrderStatus(str, Enum):
    OPEN = "open"
    SENT = "sent"
    IN_PROGRESS = "in_progress"
    READY = "ready"
    SERVED = "served"
    CLOSED = "closed"
    VOIDED = "voided"

class KDSItemStatus(str, Enum):
    NEW = "new"
    PREPARING = "preparing"
    READY = "ready"
    DONE = "done"  # PASS confirmed, ready to serve
    RECALLED = "recalled"
    HELD = "held"

class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class ResultType(str, Enum):
    ALLOW = "ALLOW"
    DENY = "DENY"

class LedgerAction(str, Enum):
    IN = "in"
    OUT = "out"
    ADJUST = "adjust"
    WASTE = "waste"

class DocumentStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    QUARANTINE = "quarantine"
    FAILED = "failed"

class ServiceStyle(str, Enum):
    FINE_DINING = "fine_dining"
    CASUAL = "casual"
    BAR = "bar"
    STEAKHOUSE = "steakhouse"
    MEDITERRANEAN = "mediterranean"

class EntityType(str, Enum):
    MENU_ITEM = "menu_item"
    RECIPE = "recipe"
    INGREDIENT = "ingredient"
    INVENTORY_ITEM = "inventory_item"

class GuideKind(str, Enum):
    PREP = "prep"
    RECIPE = "recipe"
    PLATING = "plating"
    SERVICE = "service"
    MAINTENANCE = "maintenance"

class AssetLabel(str, Enum):
    PHOTO = "photo"
    ILLUSTRATION = "illustration"
    VIDEO = "video"
    DOCUMENT = "document"
    AUDIO = "audio"
    OTHER = "other"

class DeviceType(str, Enum):
    POS = "pos"
    KDS = "kds"
    EXPO = "expo"
    TABLET = "tablet"
    MOBILE = "mobile"

class ReservationStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    SEATED = "seated"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"
    COMPLETED = "completed"

class EmploymentStatus(str, Enum):
    ACTIVE = "active"
    ON_LEAVE = "on_leave"
    TERMINATED = "terminated"
    SUSPENDED = "suspended"

class ShiftStatus(str, Enum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"

class AttendanceAction(str, Enum):
    CLOCK_IN = "clock_in"
    CLOCK_OUT = "clock_out"
    BREAK_START = "break_start"
    BREAK_END = "break_end"

class LeaveType(str, Enum):
    ANNUAL = "annual"
    SICK = "sick"
    UNPAID = "unpaid"
    PARENTAL = "parental"
    BEREAVEMENT = "bereavement"
    OTHER = "other"

class LeaveStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"

class HRDocumentType(str, Enum):
    CONTRACT = "contract"
    ID = "id"
    RESUME = "resume"
    CERTIFICATE = "certificate"
    PAYSLIP = "payslip"
    OTHER = "other"

class HRDocumentVisibility(str, Enum):
    EMPLOYEE = "employee"
    HR_ONLY = "hr_only"
    PUBLIC = "public"

class UnitType(str, Enum):
    WEIGHT = "weight"
    VOLUME = "volume"
    COUNT = "count"
    LENGTH = "length"
