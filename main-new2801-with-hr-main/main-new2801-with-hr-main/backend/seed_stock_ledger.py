import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime, timezone, timedelta
import hashlib

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'restinai')]

def compute_hash(data: dict, prev_hash: str) -> str:
    combined = f"{data}{prev_hash}"
    return hashlib.sha256(combined.encode()).hexdigest()

async def seed_stock_ledger():
    print("Seeding stock ledger with IN entries (FIFO ready)...")
    
    venue_id = "venue-caviar-bull"
    user_id = "user-cb-owner"
    
    # Get inventory items
    inventory_items = await db.inventory_items.find({"venue_id": venue_id}, {"_id": 0}).to_list(100)
    
    await db.stock_ledger.delete_many({"venue_id": venue_id})
    
    ledger_entries = []
    
    for idx, item in enumerate(inventory_items):
        current_stock = item.get("current_stock", 0)
        if current_stock <= 0:
            continue
        
        # Create 2 lots per item for FIFO testing
        lots = [
            {
                "lot_number": f"LOT-2025-{idx+1:03d}-A",
                "expiry_date": (datetime.now(timezone.utc) + timedelta(days=30)).strftime("%Y-%m-%d"),
                "quantity": current_stock * 0.6  # 60% in older lot
            },
            {
                "lot_number": f"LOT-2026-{idx+1:03d}-B",
                "expiry_date": (datetime.now(timezone.utc) + timedelta(days=90)).strftime("%Y-%m-%d"),
                "quantity": current_stock * 0.4  # 40% in newer lot
            }
        ]
        
        prev_hash = "GENESIS"
        
        for lot in lots:
            entry_data = {
                "item_id": item["id"],
                "action": "in",
                "quantity": lot["quantity"],
                "lot_number": lot["lot_number"],
                "expiry_date": lot["expiry_date"]
            }
            entry_hash = compute_hash(entry_data, prev_hash)
            
            ledger_entry = {
                "id": f"ledger-{item['id']}-{lot['lot_number']}",
                "venue_id": venue_id,
                "item_id": item["id"],
                "action": "in",
                "quantity": lot["quantity"],
                "lot_number": lot["lot_number"],
                "expiry_date": lot["expiry_date"],
                "reason": "Initial stock",
                "po_id": None,
                "user_id": user_id,
                "prev_hash": prev_hash,
                "entry_hash": entry_hash,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            ledger_entries.append(ledger_entry)
            prev_hash = entry_hash
    
    if ledger_entries:
        await db.stock_ledger.insert_many(ledger_entries)
        print(f"✓ Created {len(ledger_entries)} stock ledger IN entries")
        print(f"✓ FIFO ready: Lots with expiry dates 30 days and 90 days from now")
    
    print("✓ Stock ledger seeding complete!")

if __name__ == "__main__":
    asyncio.run(seed_stock_ledger())
