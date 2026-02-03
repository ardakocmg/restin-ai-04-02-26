from datetime import datetime, timezone
from typing import Optional
from kds.models import KdsTicketState, TicketStatus
from core.events_outbox import Outbox

class KdsUndoService:
    """Handle undo operations for KDS state changes"""
    
    def __init__(self, db):
        self.db = db
        self.ticket_col = db.kds_ticket_states
        self.outbox = Outbox(db)

    async def can_undo_ticket(self, ticket_id: str, venue_id: str) -> bool:
        """Check if a ticket action can be undone (within time window)"""
        ticket_doc = await self.ticket_col.find_one(
            {"id": ticket_id, "venue_id": venue_id},
            {"_id": 0}
        )
        
        if not ticket_doc:
            return False
        
        undo_until = ticket_doc.get("undo_until")
        if not undo_until:
            return False
        
        now = datetime.now(timezone.utc).isoformat()
        return now <= undo_until

    async def undo_ticket_status(self, ticket_id: str, venue_id: str, actor_id: str) -> Optional[KdsTicketState]:
        """Revert ticket to previous status if within undo window"""
        if not await self.can_undo_ticket(ticket_id, venue_id):
            return None
        
        ticket_doc = await self.ticket_col.find_one(
            {"id": ticket_id, "venue_id": venue_id},
            {"_id": 0}
        )
        
        if not ticket_doc:
            return None
        
        # Determine previous status
        current_status = ticket_doc["status"]
        previous_status = self._get_previous_status(current_status)
        
        if not previous_status:
            return None
        
        # Update to previous status
        await self.ticket_col.update_one(
            {"id": ticket_id, "venue_id": venue_id},
            {"$set": {
                "status": previous_status,
                "last_action_by": actor_id,
                "last_action_at": datetime.now(timezone.utc).isoformat(),
                "undo_until": None  # Clear undo window
            }}
        )
        
        self.outbox.emit(
            venue_id=venue_id,
            topic="kds.ticket_undone",
            key=ticket_doc["order_id"],
            payload={
                "ticket_id": ticket_id,
                "station_key": ticket_doc["station_key"],
                "from_status": current_status,
                "to_status": previous_status,
                "actor_id": actor_id
            }
        )
        
        updated_doc = await self.ticket_col.find_one(
            {"id": ticket_id, "venue_id": venue_id},
            {"_id": 0}
        )
        
        return KdsTicketState(**updated_doc) if updated_doc else None

    def _get_previous_status(self, current_status: str) -> Optional[str]:
        """Determine the previous status in the workflow"""
        status_flow = {
            TicketStatus.PREPARING.value: TicketStatus.NEW.value,
            TicketStatus.READY.value: TicketStatus.PREPARING.value,
            TicketStatus.COMPLETED.value: TicketStatus.READY.value,
            TicketStatus.ON_HOLD.value: None  # ON_HOLD can be from any state, don't auto-undo
        }
        return status_flow.get(current_status)
