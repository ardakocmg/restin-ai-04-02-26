"""Negative Stock Diagnosis Read Model"""
from datetime import datetime, timezone

from core.database import db


async def build_neg_stock_diagnosis(venue_id: str, sku_id: str):
    """Analyze why stock is negative"""
    # Get current balance
    balance_rm = await db.rm_stock_on_hand.find_one(
        {"venue_id": venue_id, "sku_id": sku_id},
        {"_id": 0}
    )
    balance = balance_rm.get("balance", 0) if balance_rm else 0
    
    if balance >= 0:
        return  # Not negative
    
    # Get last 20 movements
    movements = await db.stock_ledger.find(
        {"venue_id": venue_id, "item_id": sku_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(20).to_list(20)
    
    # Analyze causes
    causes = []
    
    # Check for missing GRNs
    out_movements = [m for m in movements if m["action"] == "OUT"]
    in_movements = [m for m in movements if m["action"] == "IN"]
    
    if len(out_movements) > len(in_movements):
        causes.append({
            "type": "MISSING_RECEIPTS",
            "confidence": "HIGH",
            "evidence": f"{len(out_movements)} OUT vs {len(in_movements)} IN movements"
        })
    
    # Store diagnosis
    await db.rm_neg_stock_diagnosis.update_one(
        {"venue_id": venue_id, "sku_id": sku_id},
        {"$set": {
            "balance": balance,
            "causes": causes,
            "last_20_movements": movements,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
