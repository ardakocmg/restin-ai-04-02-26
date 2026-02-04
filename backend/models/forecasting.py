"""Demand Forecasting Models"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid


class ForecastMethod(str, Enum):
    MOVING_AVERAGE = "moving_average"
    EXPONENTIAL_SMOOTHING = "exponential_smoothing"
    SEASONAL = "seasonal"
    AI_BASED = "ai_based"


class ForecastGranularity(str, Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"


class HistoricalDataPoint(BaseModel):
    """Historical consumption data"""
    date: str
    quantity: float
    revenue: Optional[float] = None
    weather: Optional[str] = None
    events: List[str] = []


class ForecastDataPoint(BaseModel):
    """Forecasted data point"""
    date: str
    predicted_quantity: float
    confidence_lower: float
    confidence_upper: float
    confidence_level: float  # 0-1


class DemandForecast(BaseModel):
    """Demand forecast for an item"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str
    item_id: str
    item_name: str
    method: ForecastMethod
    granularity: ForecastGranularity
    historical_data: List[HistoricalDataPoint]
    forecast_data: List[ForecastDataPoint]
    accuracy_score: Optional[float] = None
    ai_insights: Optional[str] = None
    recommended_order_quantity: Optional[float] = None
    recommended_order_date: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    valid_until: str


class ForecastRequest(BaseModel):
    """Request to generate forecast"""
    item_id: str
    item_name: Optional[str] = None
    method: str = "moving_average"
    days: int = 30
    use_ai: bool = False


class SeasonalPattern(BaseModel):
    """Seasonal pattern detection"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str
    pattern_name: str
    description: str
    affected_items: List[str]  # item_ids
    peak_periods: List[str]  # date ranges
    low_periods: List[str]
    multiplier: float
    detected_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
