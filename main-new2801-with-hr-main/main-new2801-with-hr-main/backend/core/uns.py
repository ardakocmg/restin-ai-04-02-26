"""Universal Naming System (UNS) for display IDs"""
from core.errors import conflict

PREFIX = {
    "supplier": "SUP-",
    "sku": "SKU-",
    "recipe": "RCP-",
    "batch": "BATCH-",
    "waste": "WST-",
    "print": "PRN-",
    "po": "PO-",
    "grn": "GRN-",
    "invoice": "INV-"
}

class IDService:
    def __init__(self, db):
        self.col = db.uns_counters
    
    def next(self, venue_id: str, entity: str):
        p = PREFIX.get(entity)
        if not p:
            raise conflict(f"Unknown UNS entity: {entity}")
        
        d = self.col.find_one_and_update(
            {"venue_id": venue_id, "entity": entity},
            {"$inc": {"seq": 1}},
            upsert=True,
            return_document=True
        )
        
        seq = d.get("seq", 1)
        return f"{p}{seq}"
