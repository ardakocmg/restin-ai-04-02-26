from datetime import datetime, timezone
from typing import List, Optional
from kds.models import KdsStation, KdsStationCreate, KdsStationUpdate

class KdsStationService:
    def __init__(self, db):
        self.db = db
        self.col = db.kds_stations

    async def create_station(self, station_data: KdsStationCreate, created_by: str) -> KdsStation:
        # Check if station_key already exists for this venue
        existing = await self.col.find_one({
            "venue_id": station_data.venue_id,
            "station_key": station_data.station_key
        })
        
        if existing:
            from core.errors import http_error
            raise http_error(409, "STATION_KEY_EXISTS", "Station key already exists for this venue")
        
        station_dict = station_data.model_dump()
        station_dict["created_by"] = created_by
        station_dict["updated_by"] = created_by
        
        station = KdsStation(**station_dict)
        await self.col.insert_one(station.model_dump())
        return station

    async def get_station(self, station_key: str, venue_id: str) -> Optional[KdsStation]:
        doc = await self.col.find_one(
            {"station_key": station_key, "venue_id": venue_id},
            {"_id": 0}
        )
        return KdsStation(**doc) if doc else None

    async def list_stations(self, venue_id: str, enabled_only: bool = False) -> List[KdsStation]:
        query = {"venue_id": venue_id}
        if enabled_only:
            query["enabled"] = True
        
        cursor = self.col.find(query, {"_id": 0}).sort("created_at", 1)
        docs = await cursor.to_list(1000)
        return [KdsStation(**doc) for doc in docs]

    async def update_station(self, station_key: str, venue_id: str, update_data: KdsStationUpdate, updated_by: str) -> Optional[KdsStation]:
        update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
        if not update_dict:
            return await self.get_station(station_key, venue_id)
        
        update_dict["updated_by"] = updated_by
        update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        result = await self.col.update_one(
            {"station_key": station_key, "venue_id": venue_id},
            {"$set": update_dict}
        )
        
        if result.modified_count:
            return await self.get_station(station_key, venue_id)
        return None

    async def update_routing(self, station_key: str, venue_id: str, routing_rules: list, updated_by: str):
        await self.col.update_one(
            {"station_key": station_key, "venue_id": venue_id},
            {"$set": {
                "routing_rules": routing_rules,
                "updated_by": updated_by,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )

    async def reset_station(self, station_key: str, venue_id: str, updated_by: str):
        # Archive completed tickets, clear all active tickets
        from core.events_outbox import Outbox
        outbox = Outbox(self.db)
        
        # Move to completed
        await self.db.kds_ticket_states.update_many(
            {"station_key": station_key, "venue_id": venue_id, "status": {"$ne": "COMPLETED"}},
            {"$set": {
                "status": "COMPLETED",
                "completed_at": datetime.now(timezone.utc).isoformat(),
                "last_action_by": updated_by,
                "last_action_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        outbox.emit(
            venue_id=venue_id,
            topic="kds.station_reset",
            key=station_key,
            payload={"station_key": station_key, "reset_by": updated_by}
        )
