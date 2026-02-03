from datetime import datetime, timezone
from typing import Optional
import hashlib
import json
from pos.models import PosSession, PosSessionCreate, MenuSnapshot

class PosSessionService:
    def __init__(self, db):
        self.db = db
        self.col = db.pos_sessions

    async def open_session(self, data: PosSessionCreate, user_id: str) -> PosSession:
        # Generate menu snapshot
        menu_items = await self.db.menu_items.find({"venue_id": data.venue_id}, {"_id": 0}).to_list(1000)
        categories = await self.db.menu_categories.find({"venue_id": data.venue_id}, {"_id": 0}).to_list(100)
        
        snapshot_payload = {
            "items": menu_items,
            "categories": categories,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        snapshot_id = f"snap_{int(datetime.now(timezone.utc).timestamp())}"
        checksum = hashlib.sha256(json.dumps(snapshot_payload, sort_keys=True).encode()).hexdigest()
        
        # Store snapshot
        await self.db.pos_menu_snapshots.insert_one({
            "snapshot_id": snapshot_id,
            "venue_id": data.venue_id,
            "payload": snapshot_payload,
            "checksum": checksum,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        # Create session
        session_count = await self.col.count_documents({"venue_id": data.venue_id})
        display_id = f"POS-{session_count + 1:06d}"
        
        session = PosSession(
            display_id=display_id,
            venue_id=data.venue_id,
            device_id=data.device_id,
            user_id=user_id,
            menu_snapshot=MenuSnapshot(
                snapshot_id=snapshot_id,
                version="1.0",
                created_at=datetime.now(timezone.utc).isoformat(),
                checksum=checksum
            ),
            created_by=user_id
        )
        
        await self.col.insert_one(session.model_dump())
        return session

    async def close_session(self, session_id: str, venue_id: str, user_id: str) -> Optional[PosSession]:
        result = await self.col.update_one(
            {"id": session_id, "venue_id": venue_id, "status": "OPEN"},
            {"$set": {
                "status": "CLOSED",
                "closed_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        if result.modified_count:
            doc = await self.col.find_one({"id": session_id}, {"_id": 0})
            return PosSession(**doc) if doc else None
        return None

    async def get_session(self, session_id: str, venue_id: str) -> Optional[PosSession]:
        doc = await self.col.find_one({"id": session_id, "venue_id": venue_id}, {"_id": 0})
        return PosSession(**doc) if doc else None

    async def get_active_session(self, device_id: str, venue_id: str) -> Optional[PosSession]:
        doc = await self.col.find_one(
            {"device_id": device_id, "venue_id": venue_id, "status": "OPEN"},
            {"_id": 0}
        )
        return PosSession(**doc) if doc else None
