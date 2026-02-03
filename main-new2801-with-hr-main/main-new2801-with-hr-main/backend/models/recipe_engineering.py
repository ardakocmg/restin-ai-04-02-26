"""Recipe Engineering Models - Cost, Nutrition, Versioning"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid


class NutritionInfo(BaseModel):
    """Nutrition information per serving"""
    calories: Optional[float] = None
    protein_g: Optional[float] = None
    carbs_g: Optional[float] = None
    fat_g: Optional[float] = None
    fiber_g: Optional[float] = None
    sodium_mg: Optional[float] = None
    allergens: List[str] = []


class RecipeIngredientDetail(BaseModel):
    """Detailed ingredient in recipe"""
    item_id: str
    item_name: str
    quantity: float
    unit: str
    cost_per_unit: float = Field(alias='unit_cost')
    total_cost: float
    supplier_id: Optional[str] = None
    nutrition: Optional[NutritionInfo] = None
    
    model_config = ConfigDict(populate_by_name=True)


class RecipeCostAnalysis(BaseModel):
    """Cost breakdown for recipe"""
    total_cost: float
    cost_per_serving: float
    ingredient_costs: List[Dict[str, Any]]
    labor_cost: Optional[float] = None
    overhead_cost: Optional[float] = None
    markup_percentage: Optional[float] = None
    suggested_price: Optional[float] = None


class RecipeEngineered(BaseModel):
    """Engineered recipe with cost and nutrition"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str
    recipe_name: str
    description: Optional[str] = None
    version: int = 1
    ingredients: List[RecipeIngredientDetail]
    servings: float
    prep_time_minutes: Optional[int] = None
    cook_time_minutes: Optional[int] = None
    cost_analysis: RecipeCostAnalysis
    nutrition: Optional[NutritionInfo] = None
    instructions: List[str] = []
    category: Optional[str] = None
    tags: List[str] = []
    active: bool = True
    parent_recipe_id: Optional[str] = None  # for versioning
    created_by: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class RecipeEngineeredRequest(BaseModel):
    """Request to create engineered recipe"""
    recipe_name: str
    description: Optional[str] = None
    ingredients: List[Dict[str, Any]]
    servings: float = 1
    prep_time_minutes: Optional[int] = None
    cook_time_minutes: Optional[int] = None
    labor_cost: Optional[float] = None
    overhead_cost: Optional[float] = None
    markup_percentage: Optional[float] = None
    nutrition: Optional[Dict[str, Any]] = None
    instructions: List[str] = []
    category: Optional[str] = None
    tags: List[str] = []


class RecipeVersion(BaseModel):
    """Recipe version history"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    recipe_id: str
    version: int
    changes: str
    cost_change: float
    created_by: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
