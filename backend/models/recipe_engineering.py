"""Recipe Engineering Models - Cost, Nutrition, Versioning"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any, Literal
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


class RecipeChangeRecord(BaseModel):
    """Audit trail for recipe changes"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    version: int
    change_type: Literal["created", "updated", "archived", "restored", "deleted", "imported", "restored_from_trash"]
    change_method: Literal["manual_edit", "excel_upload", "api", "bulk_action", "system"]
    change_summary: str  # e.g., "Updated ingredients", "Imported from Apicbase"
    user_id: str
    user_name: str
    device_info: Optional[str] = None  # e.g., "Chrome on Windows", "API Client"
    ip_address: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    # Snapshot of key values before/after (for rollback capability)
    previous_values: Optional[Dict[str, Any]] = None
    new_values: Optional[Dict[str, Any]] = None


class RecipeEngineered(BaseModel):
    """Engineered recipe with cost and nutrition"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str
    item_id: Optional[str] = None  # SKU/Item code
    recipe_name: str
    description: Optional[str] = None
    version: int = 1
    ingredients: List[RecipeIngredientDetail] = []
    servings: float = 1
    prep_time_minutes: Optional[int] = None
    cook_time_minutes: Optional[int] = None
    cost_analysis: Optional[RecipeCostAnalysis] = None
    nutrition: Optional[NutritionInfo] = None
    instructions: List[str] = []
    category: Optional[str] = None
    tags: List[str] = []
    raw_import_data: Dict[str, Any] = {}
    
    # Status Fields
    active: bool = True
    deleted_at: Optional[str] = None  # ISO timestamp when moved to trash
    deleted_by: Optional[str] = None  # User ID who deleted
    
    # Audit Trail - Full Change History
    change_history: List[RecipeChangeRecord] = []
    
    # Quick Access - Last Modifier Info (denormalized for easy display)
    last_modified_by: Optional[str] = None  # User ID
    last_modified_by_name: Optional[str] = None  # User display name
    last_modified_method: Optional[str] = None  # "manual_edit", "excel_upload", etc.
    last_modified_device: Optional[str] = None  # Device/browser info
    
    parent_recipe_id: Optional[str] = None  # for versioning/cloning
    created_by: str
    created_by_name: Optional[str] = None  # User display name
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class RecipeEngineeredRequest(BaseModel):
    """Request to create engineered recipe"""
    recipe_name: str
    description: Optional[str] = None
    ingredients: List[Dict[str, Any]] = []
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
    raw_import_data: Dict[str, Any] = {}


class RecipeVersion(BaseModel):
    """Recipe version history - Legacy, now using change_history embedded"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    recipe_id: str
    version: int
    changes: str
    change_type: str = "manual_edit"  # excel_upload, api, etc.
    cost_change: float = 0
    user_id: str
    user_name: Optional[str] = None
    device_info: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
