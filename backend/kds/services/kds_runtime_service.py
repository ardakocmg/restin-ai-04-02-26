from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any
from kds.models import (
    KdsTicketState, KdsTicketStateCreate, TicketStatus,
    KdsItemState, KdsItemStateCreate, ItemStatus
)
from core.events_outbox import Outbox

class KdsRuntimeService:
    def __init__(self, db):
        self.db = db
        self.ticket_col = db.kds_ticket_states
        self.item_col = db.kds_item_states
        self.outbox = Outbox(db)

    async def create_ticket(self, ticket_data: KdsTicketStateCreate, actor_id: str) -> KdsTicketState:
        ticket_dict = ticket_data.model_dump()
        ticket_dict["last_action_by"] = actor_id
        
        ticket = KdsTicketState(**ticket_dict)
        await self.ticket_col.insert_one(ticket.model_dump())
        
        self.outbox.emit(
            venue_id=ticket.venue_id,
            topic="kds.ticket_created",
            key=ticket.order_id,
            payload={"ticket_id": ticket.id, "station_key": ticket.station_key}
        )
        
        return ticket

    async def get_ticket(self, ticket_id: str, venue_id: str) -> Optional[KdsTicketState]:
        doc = await self.ticket_col.find_one(
            {"id": ticket_id, "venue_id": venue_id},
            {"_id": 0}
        )
        return KdsTicketState(**doc) if doc else None

    async def get_tickets_by_station(self, station_key: str, venue_id: str, status: Optional[str] = None) -> List[KdsTicketState]:
        query = {"station_key": station_key, "venue_id": venue_id}
        if status:
            query["status"] = status
        else:
            query["status"] = {"$ne": "COMPLETED"}
        
        cursor = self.ticket_col.find(query, {"_id": 0}).sort("created_at", 1)
        docs = await cursor.to_list(1000)
        return [KdsTicketState(**doc) for doc in docs]

    async def get_completed_tickets(self, station_key: str, venue_id: str, hours: int = 4) -> List[KdsTicketState]:
        since = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
        
        cursor = self.ticket_col.find({
            "station_key": station_key,
            "venue_id": venue_id,
            "status": "COMPLETED",
            "completed_at": {"$gte": since}
        }, {"_id": 0}).sort("completed_at", -1)
        
        docs = await cursor.to_list(1000)
        return [KdsTicketState(**doc) for doc in docs]

    async def bump_ticket(self, ticket_id: str, venue_id: str, new_status: TicketStatus, actor_id: str, undo_window_sec: int = 30):
        now = datetime.now(timezone.utc)
        undo_until = (now + timedelta(seconds=undo_window_sec)).isoformat()
        
        update_fields = {
            "status": new_status.value,
            "last_action_by": actor_id,
            "last_action_at": now.isoformat(),
            "undo_until": undo_until
        }
        
        if new_status == TicketStatus.PREPARING:
            update_fields["preparing_at"] = now.isoformat()
        elif new_status == TicketStatus.READY:
            update_fields["ready_at"] = now.isoformat()
        elif new_status == TicketStatus.ON_HOLD:
            update_fields["on_hold_at"] = now.isoformat()
        elif new_status == TicketStatus.COMPLETED:
            update_fields["completed_at"] = now.isoformat()
        
        result = await self.ticket_col.update_one(
            {"id": ticket_id, "venue_id": venue_id},
            {"$set": update_fields}
        )
        
        if result.modified_count:
            ticket = await self.get_ticket(ticket_id, venue_id)
            if ticket:
                self.outbox.emit(
                    venue_id=venue_id,
                    topic="kds.ticket_status_changed",
                    key=ticket.order_id,
                    payload={
                        "ticket_id": ticket_id,
                        "station_key": ticket.station_key,
                        "new_status": new_status.value,
                        "actor_id": actor_id
                    }
                )

    async def create_item_state(self, item_data: KdsItemStateCreate, actor_id: str) -> KdsItemState:
        item_dict = item_data.model_dump()
        item_dict["last_action_by"] = actor_id
        
        item = KdsItemState(**item_dict)
        await self.item_col.insert_one(item.model_dump())
        return item

    async def bump_item(self, item_id: str, venue_id: str, new_status: ItemStatus, actor_id: str):
        now = datetime.now(timezone.utc)
        
        update_fields = {
            "status": new_status.value,
            "last_action_by": actor_id,
            "last_action_at": now.isoformat()
        }
        
        if new_status == ItemStatus.PREPARING:
            update_fields["preparing_at"] = now.isoformat()
        elif new_status == ItemStatus.READY:
            update_fields["ready_at"] = now.isoformat()
        elif new_status == ItemStatus.COMPLETED:
            update_fields["completed_at"] = now.isoformat()
        
        result = await self.item_col.update_one(
            {"item_id": item_id, "venue_id": venue_id},
            {"$set": update_fields}
        )
        
        if result.modified_count:
            item_doc = await self.item_col.find_one({"item_id": item_id, "venue_id": venue_id}, {"_id": 0})
            if item_doc:
                self.outbox.emit(
                    venue_id=venue_id,
                    topic="kds.item_status_changed",
                    key=item_doc["order_id"],
                    payload={
                        "item_id": item_id,
                        "station_key": item_doc["station_key"],
                        "new_status": new_status.value,
                        "actor_id": actor_id
                    }
                )

    async def get_items_by_station(self, station_key: str, venue_id: str, status: Optional[str] = None) -> List[KdsItemState]:
        query = {"station_key": station_key, "venue_id": venue_id}
        if status:
            query["status"] = status
        
        cursor = self.item_col.find(query, {"_id": 0}).sort("created_at", 1)
        docs = await cursor.to_list(5000)
        return [KdsItemState(**doc) for doc in docs]
