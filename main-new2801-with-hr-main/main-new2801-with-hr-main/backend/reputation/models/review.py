"""Review model (normalized from all sources)"""
from pydantic import BaseModel, Field
from datetime import datetime, timezone
from uuid import uuid4

class Review(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    venue_id: str
    source: str  # GOOGLE | TRIPADVISOR | META | YELP
    external_review_id: str
    rating: int  # 1-5
    author_name: str
    text: str
    reply_text: str = ""
    replied_at: str = ""
    published_at: str
    status: str = "NEW"  # NEW | TICKET_CREATED | REPLIED | HIGHLIGHTED
    linked_ticket_id: str = ""
    linked_guest_id: str = ""
    sentiment: str = ""  # POSITIVE | NEUTRAL | NEGATIVE
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
