"""Connector Capability Matrix"""
from pydantic import BaseModel
from typing import List

class ConnectorCapability(BaseModel):
    connector_key: str  # WOLT | BOLT_FOOD | DELIVEROO | UBER_EATS | GLOVO | JET
    supports: dict = {
        "order_webhooks": False,
        "order_pull_api": False,
        "menu_push_api": False,
        "menu_pull_api": False,
        "availability_updates": False,
        "store_hours_updates": False,
        "order_accept_reject": False,
        "order_ready_picked": False,
        "cancellations": False,
        "delivery_tracking": False,
        "settlement_reports": False,
        "oauth2": False,
        "hmac_signature": False
    }
    constraints: dict = {
        "async_menu_processing": False,
        "rate_limit_policy": {}
    }
    version: str = "1.0"
