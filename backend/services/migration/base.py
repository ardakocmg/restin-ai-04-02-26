from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from models.migration import MigrationLog

class BaseMigrationAdapter(ABC):
    def __init__(self, venue_id: str, user_id: str):
        self.venue_id = venue_id
        self.user_id = user_id
        self.logs = []

    @abstractmethod
    def validate(self, data: Any) -> bool:
        """Validate input data format (CSV headers, JSON schema)"""
        pass

    @abstractmethod
    def preview(self, data: Any) -> Dict[str, Any]:
        """
        Dry-run: Check for conflicts, new items, and updates.
        Returns: {
            "new": 10,
            "update": 5,
            "conflict": 2,
            "details": [...]
        }
        """
        pass

    @abstractmethod
    async def execute(self, data: Any, mode: str = "migrate", options: Dict = None) -> MigrationLog:
        """Execute the migration or linking process"""
        pass

    def log(self, message: str, level: str = "info"):
        self.logs.append({"timestamp": None, "level": level, "message": message})
