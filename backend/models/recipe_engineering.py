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
    """Detailed ingredient in recipe — supports both raw ingredients and sub-recipes"""
    item_id: Optional[str] = None
    item_name: str = ""
    type: Literal["ingredient", "sub_recipe"] = "ingredient"
    name: str = ""
    quantity: float = 0
    net_qty: float = 0
    unit: str = "g"
    waste_pct: float = 0
    cost_per_unit: float = Field(default=0, alias='unit_cost')
    total_cost: float = 0
    supplier_id: Optional[str] = None
    nutrition: Optional[NutritionInfo] = None
    remarks: str = ""
    sub_recipe_id: Optional[str] = None  # Link to another RecipeEngineered.id

    model_config = ConfigDict(populate_by_name=True)


class RecipeCostAnalysis(BaseModel):
    """Cost breakdown for recipe"""
    total_cost: float = 0
    cost_per_serving: float = 0
    ingredient_costs: List[Dict[str, Any]] = []
    labor_cost: Optional[float] = None
    overhead_cost: Optional[float] = None
    markup_percentage: Optional[float] = None
    suggested_price: Optional[float] = None
    food_cost_pct: Optional[float] = None  # total_cost / sell_price * 100


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


class RecipeOutlet(BaseModel):
    """Outlet availability for a recipe"""
    id: str
    name: str = ""
    linked: bool = False


class RecipeEngineered(BaseModel):
    """Engineered recipe with cost and nutrition"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str
    item_id: Optional[str] = None  # SKU/Item code
    recipe_name: str
    description: Optional[str] = None
    version: int = 1

    # ── Ingredients ──
    ingredients: List[Dict[str, Any]] = []  # Flexible to accept both formats
    servings: float = 1

    # ── Classification ──
    category: Optional[str] = None
    subcategory: Optional[str] = None
    cuisine: Optional[str] = None
    recipe_type: Optional[str] = None  # Main course, Starter, etc.
    stage: Optional[str] = "Draft"  # Draft, In Development, Testing, Complete, Archived
    seasons: List[str] = []
    product_class: Optional[str] = None  # Finished Product, Semi-Finished, Preparation, Base Recipe
    product_type: Optional[str] = None

    # ── Production Times ──
    prep_time_minutes: Optional[int] = None
    prep_time_min: Optional[int] = None  # Frontend alias
    cook_time_minutes: Optional[int] = None
    cook_time_min: Optional[int] = None  # Frontend alias
    plate_time_min: Optional[int] = None

    # ── Portioning ──
    portion_weight_g: Optional[float] = None
    portion_volume_ml: Optional[float] = None
    yield_pct: float = 100
    manual_weight: bool = False
    difficulty: int = 1

    # ── Allergens & Dietary ──
    allergens: Dict[str, bool] = {}  # {"Celery": true, "Eggs": false, ...}
    dietary: Dict[str, bool] = {}  # {"halal": false, "vegan": true, ...}

    # ── Financial ──
    sell_price: float = 0  # Inclusive of tax (cents or currency units)
    tax_pct: float = 18
    target_margin: float = 70

    # ── Content ──
    composition: Optional[str] = None  # How to compose the recipe
    steps: Optional[str] = None  # Step-by-step instructions
    remarks: Optional[str] = None
    reference_nr: Optional[str] = None
    url: Optional[str] = None
    kitchen_utensils: Optional[str] = None
    storage_conditions: Optional[str] = None
    shelf_life_days: Optional[int] = None
    is_perishable: bool = False
    instructions: List[str] = []  # Legacy format

    # ── Outlets ──
    outlets: List[Dict[str, Any]] = []

    # ── Images ──
    images: List[str] = []

    # ── Cost Analysis ──
    cost_analysis: Optional[RecipeCostAnalysis] = None
    nutrition: Optional[NutritionInfo] = None
    tags: List[str] = []
    raw_import_data: Dict[str, Any] = {}

    # ── Status Fields ──
    active: bool = True
    deleted_at: Optional[str] = None  # ISO timestamp when moved to trash
    deleted_by: Optional[str] = None  # User ID who deleted

    # ── Audit Trail ──
    change_history: List[RecipeChangeRecord] = []

    # ── Last Modifier (denormalized) ──
    last_modified_by: Optional[str] = None
    last_modified_by_name: Optional[str] = None
    last_modified_method: Optional[str] = None
    last_modified_device: Optional[str] = None

    parent_recipe_id: Optional[str] = None  # for versioning/cloning
    created_by: str
    created_by_name: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class RecipeEngineeredRequest(BaseModel):
    """Request to create/update engineered recipe"""
    recipe_name: str
    description: Optional[str] = None
    ingredients: List[Dict[str, Any]] = []
    servings: float = 1

    # ── Classification ──
    category: Optional[str] = None
    subcategory: Optional[str] = None
    cuisine: Optional[str] = None
    recipe_type: Optional[str] = None
    stage: Optional[str] = "Draft"
    seasons: List[str] = []
    product_class: Optional[str] = None
    product_type: Optional[str] = None

    # ── Production Times ──
    prep_time_minutes: Optional[int] = None
    prep_time_min: Optional[int] = None
    cook_time_minutes: Optional[int] = None
    cook_time_min: Optional[int] = None
    plate_time_min: Optional[int] = None

    # ── Portioning ──
    portion_weight_g: Optional[float] = None
    portion_volume_ml: Optional[float] = None
    yield_pct: float = 100
    manual_weight: bool = False
    difficulty: int = 1

    # ── Allergens & Dietary ──
    allergens: Dict[str, bool] = {}
    dietary: Dict[str, bool] = {}

    # ── Financial ──
    sell_price: float = 0
    tax_pct: float = 18
    target_margin: float = 70

    # ── Content ──
    composition: Optional[str] = None
    steps: Optional[str] = None
    remarks: Optional[str] = None
    reference_nr: Optional[str] = None
    url: Optional[str] = None
    kitchen_utensils: Optional[str] = None
    storage_conditions: Optional[str] = None
    shelf_life_days: Optional[int] = None
    is_perishable: bool = False
    instructions: List[str] = []

    # ── Outlets & Images ──
    outlets: List[Dict[str, Any]] = []
    images: List[str] = []

    # ── Cost inputs ──
    labor_cost: Optional[float] = None
    overhead_cost: Optional[float] = None
    markup_percentage: Optional[float] = None
    nutrition: Optional[Dict[str, Any]] = None
    tags: List[str] = []
    raw_import_data: Dict[str, Any] = {}
    active: bool = True


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

