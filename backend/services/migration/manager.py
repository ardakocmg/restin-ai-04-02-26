from typing import Dict, Any, List
from models.migration import MigrationLog
from .apicbase import ApicbaseAdapter
from .lightspeed import LightspeedAdapter
from .shireburn import ShireburnAdapter

class MigrationManager:
    def __init__(self, venue_id: str, user_id: str):
        self.venue_id = venue_id
        self.user_id = user_id
        self.adapters = {
            "apicbase": ApicbaseAdapter(venue_id, user_id),
            "lightspeed": LightspeedAdapter(venue_id, user_id),
            "shireburn": ShireburnAdapter(venue_id, user_id)
        }

    def get_adapter(self, source: str):
        if source not in self.adapters:
            raise ValueError(f"Unknown migration source: {source}")
        return self.adapters[source]

    def validate(self, source: str, data: Any) -> bool:
        return self.get_adapter(source).validate(data)

    async def preview(self, source: str, data: Any) -> Dict[str, Any]:
        return await self.get_adapter(source).preview(data)

    async def execute(self, source: str, data: Any, mode: str = "migrate", options: Dict = None, filename: str = None) -> MigrationLog:
        adapter = self.get_adapter(source)
        result = await adapter.execute(data, mode, options)
        
        # Save to DB
        from core.database import get_database
        from datetime import datetime, timezone
        
        db = get_database()
        
        log = MigrationLog(
            venue_id=self.venue_id,
            source=source,
            mode=mode,
            status=result.get("status", "completed"),
            summary=result.get("summary"),
            details=result.get("details"),
            created_by=self.user_id,
            started_at=datetime.now(timezone.utc).isoformat(),
            completed_at=datetime.now(timezone.utc).isoformat(),
            filename=filename  # Track source filename
        )
        
        await db.migration_logs.insert_one(log.model_dump())
        return log
