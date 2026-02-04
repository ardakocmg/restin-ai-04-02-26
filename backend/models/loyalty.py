"""Loyalty models"""
from pydantic import BaseModel
from typing import List

class LoyaltyAccount(BaseModel):
    guest_id: str
    venue_id: str
    points: float = 0.0
    tier: str = "BRONZE"
    updated_at: str

class LoyaltyTransaction(BaseModel):
    id: str
    guest_id: str
    type: str  # EARN | REDEEM | ADJUST
    points: float
    ref_type: str
    ref_id: str
    ts: str
    idempotency_key: str
