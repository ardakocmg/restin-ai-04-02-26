"""Google Review model"""
from pydantic import BaseModel, Field
from datetime import datetime, timezone
from uuid import uuid4

class GoogleReview(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    venue_id: str
    external_review_id: str  # Google's review ID
    rating: int  # 1-5
    author_name: str
    text: str
    reply_text: str = ""
    replied_at: str = ""
    published_at: str
    status: str = "NEW"  # NEW | TICKET_CREATED | REPLIED | IGNORED
    linked_ticket_id: str = ""
    received_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
