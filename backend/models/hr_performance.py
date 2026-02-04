"""Performance Review Models"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid


class ReviewStatus(str, Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ACKNOWLEDGED = "acknowledged"


class GoalStatus(str, Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class KPI(BaseModel):
    """Key Performance Indicator"""
    kpi_name: str = Field(alias='metric')
    target: float
    actual: Optional[float] = None
    unit: str = "count"
    weight: float = 100.0  # percentage
    
    model_config = ConfigDict(populate_by_name=True)


class Goal(BaseModel):
    """Employee goal"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str
    employee_id: str
    goal_title: str
    description: str
    target_date: str
    status: GoalStatus = GoalStatus.NOT_STARTED
    progress: int = 0  # 0-100
    kpis: List[KPI] = []
    created_by: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class GoalRequest(BaseModel):
    """Request to create goal"""
    employee_id: str
    goal_title: str
    description: str
    target_date: str
    kpis: List[Dict[str, Any]] = []


class ReviewQuestion(BaseModel):
    """Review question"""
    question: str
    response: Optional[str] = None
    rating: Optional[int] = None  # 1-5


class PerformanceReview(BaseModel):
    """Performance review"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str
    employee_id: str
    employee_name: str
    review_period_start: str
    review_period_end: str
    reviewer_id: str
    reviewer_name: str
    review_type: str  # annual, quarterly, probation
    status: ReviewStatus = ReviewStatus.NOT_STARTED
    questions: List[ReviewQuestion]
    overall_rating: Optional[float] = None
    strengths: List[str] = []
    areas_for_improvement: List[str] = []
    goals_for_next_period: List[str] = []
    employee_comments: Optional[str] = None
    acknowledged_by_employee: bool = False
    acknowledged_at: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    completed_at: Optional[str] = None


class Feedback360(BaseModel):
    """360-degree feedback"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str
    employee_id: str
    review_cycle: str
    feedbacks: List[Dict[str, Any]]  # [{from_user_id, relationship, comments, rating}]
    aggregated_rating: Optional[float] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
