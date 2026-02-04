"""Venue configuration with defaults"""
from core.database import db

DEFAULTS = {
    "features": {
        "inventory": True,
        "inventory_detail_drawer": True,
        "inventory_suppliers": True,
        "inventory_recipes": True,
        "inventory_production": True,
        "inventory_waste": True,
        "inventory_reporting": True,
        "accounting_mt": True,
        "KDS_ENABLED": False,
        "KDS_WAIT_TIMES_ENABLED": False,
        "KDS_ITEMS_LIST_ENABLED": False,
        "DEVICES_PAIRING_ENABLED": False,
        "PRICING_PRICEBOOKS_ENABLED": False,
        "POS_ENABLED": False,
        "POS_TABLE_SERVICE_ENABLED": False,
        "POS_SEAT_COURSE_ENABLED": False,
        "POS_SPLIT_MERGE_ENABLED": False,
        "POS_OFFLINE_ENABLED": False,
        "POS_CASH_CONTROL_ENABLED": False,
        "POS_MULTI_TENDER_ENABLED": False
    },
    "rules": {
        "po_requires_approval": True,
        "stock_deduction_trigger": "ORDER_CLOSED",
        "invoice_matching": "THREE_WAY",
        "negative_stock_policy": "WARN",
        "fifo_enforced": True
    }
}

class VenueConfigRepo:
    def __init__(self, db):
        self.col = db.venue_config
    
    async def get(self, venue_id: str):
        doc = await self.col.find_one({"venue_id": venue_id}) or {}
        return {
            "venue_id": venue_id,
            "features": {**DEFAULTS["features"], **doc.get("features", {})},
            "rules": {**DEFAULTS["rules"], **doc.get("rules", {})}
        }
    
    async def upsert(self, venue_id: str, features: dict = None, rules: dict = None, user_id: str = None):
        await self.col.update_one(
            {"venue_id": venue_id},
            {"$set": {
                "features": features or {},
                "rules": rules or {},
                "updated_by": user_id
            }},
            upsert=True
        )
        return await self.get(venue_id)

async def get_venue_config(venue_id: str) -> dict:
    """Helper function to get venue config"""
    repo = VenueConfigRepo(db)
    return await repo.get(venue_id)
