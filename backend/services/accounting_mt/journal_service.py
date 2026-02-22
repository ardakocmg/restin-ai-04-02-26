"""Accounting Service - Journal posting from events"""
from datetime import datetime, timezone

from core.database import db
from core.events_outbox import Outbox
from services.event_bus import event_handler


@event_handler("order.closed")
async def post_sales_journal(event: dict):
    """Post sales journal entry when order closes"""
    data = event["data"]
    order_id = data.get("order_id")
    venue_id = data.get("venue_id")
    total = data.get("total", 0)
    
    # Get venue config to check if accounting enabled
    from core.venue_config import VenueConfigRepo
    config_repo = VenueConfigRepo(db)
    cfg = await config_repo.get(venue_id)
    
    if not cfg.get("features", {}).get("accounting_mt"):
        return  # Feature disabled, skip
    
    # Create journal entry (idempotent)
    idempotency_key = f"ACC:POS:{order_id}"
    
    existing = await db.idempotency_keys.find_one({"key": idempotency_key})
    if existing:
        return  # Already posted
    
    # Post journal
    from models.accounting import JournalEntry, JournalLine
    
    journal = JournalEntry(
        venue_id=venue_id,
        date=datetime.now(timezone.utc).date().isoformat(),
        lines=[
            JournalLine(account_id="AR", debit=total, credit=0, memo=f"POS Order {order_id[:8]}"),
            JournalLine(account_id="SALES", debit=0, credit=total, memo=f"POS Order {order_id[:8]}")
        ],
        source_type="POS",
        source_id=order_id,
        status="POSTED"
    )
    
    await db.journal_entries.insert_one(journal.model_dump())
    await db.idempotency_keys.insert_one({"venue_id": venue_id, "key": idempotency_key})
    
    # Emit event
    outbox = Outbox(db)
    outbox.emit(venue_id, "accounting.journal.posted", f"JE:{journal.id}", {"journal_id": journal.id})
    
    print(f"📚 Accounting: Posted journal for order {order_id[:8]}")
