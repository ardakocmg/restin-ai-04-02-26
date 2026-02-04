
class StockCountStatus(str, Enum):
    DRAFT = "DRAFT"
    REVIEW = "REVIEW"
    APPROVED = "APPROVED"

class StockCountItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    stock_count_id: str
    ingredient_id: str
    expected_base: float
    actual_base: float
    variance: float
    cost_impact: Optional[int] = None  # in cents

class StockCount(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    branch_id: str
    status: StockCountStatus = StockCountStatus.DRAFT
    performed_by_id: str
    items: List[StockCountItem] = []
    started_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    completed_at: Optional[str] = None
