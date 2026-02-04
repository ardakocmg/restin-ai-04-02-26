"""Unified Action Context for Trust Platform"""
from datetime import datetime, timezone
from typing import List, Optional

class ActionContext:
    def __init__(
        self,
        request_id: str,
        venue_id: str,
        identity_id: str,
        device_id: Optional[str],
        ip_address: Optional[str],
        action_key: str,
        entity_type: str,
        entity_id: str,
        payload_summary: dict,
        permissions_snapshot: List[str],
        risk_tags: List[str] = None
    ):
        self.request_id = request_id
        self.venue_id = venue_id
        self.identity_id = identity_id
        self.device_id = device_id
        self.ip_address = ip_address
        self.action_key = action_key
        self.entity_type = entity_type
        self.entity_id = entity_id
        self.payload_summary = payload_summary
        self.permissions_snapshot = permissions_snapshot
        self.risk_tags = risk_tags or []
        self.ts = datetime.now(timezone.utc).isoformat()
    
    def to_dict(self):
        return {
            "request_id": self.request_id,
            "venue_id": self.venue_id,
            "identity_id": self.identity_id,
            "device_id": self.device_id,
            "ip_address": self.ip_address,
            "action_key": self.action_key,
            "entity_type": self.entity_type,
            "entity_id": self.entity_id,
            "payload_summary": self.payload_summary,
            "permissions_snapshot": self.permissions_snapshot,
            "risk_tags": self.risk_tags,
            "ts": self.ts
        }
