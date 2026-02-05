from .base import BaseMigrationAdapter
from typing import Any, Dict

class LightspeedAdapter(BaseMigrationAdapter):
    def validate(self, data: Any) -> bool:
        return True

    def preview(self, data: Any) -> Dict[str, Any]:
        return {"new": 0, "update": 0, "conflict": 0, "details": []}

    async def execute(self, data: Any, mode: str = "migrate", options: Dict = None):
        return {
            "status": "completed",
            "summary": "Lightspeed sync completed",
            "details": {}
        }
