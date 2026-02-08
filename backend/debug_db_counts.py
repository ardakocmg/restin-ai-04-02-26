
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "restin_v2")

async def check_counts():
    print(f"Connecting to {MONGO_URL}...")
    try:
        client = AsyncIOMotorClient(MONGO_URL)
        
        dbs_to_check = ["restin_v2", "restin_ai_db", "malta_hr_db", "restin_pos_db"]
        
        all_counts = {}
        
        # 1. Get counts for all DBs
        for db_name in dbs_to_check:
            print(f"\n--- Analyzing {db_name} ---")
            db = client[db_name]
            cols = await db.list_collection_names()
            all_counts[db_name] = {}
            
            for col in cols:
                count = await db[col].count_documents({})
                all_counts[db_name][col] = count
                print(f"  {col}: {count}")

        # 2. Compare restin_v2 vs restin_ai_db (Legacy Master)
        print("\n" + "="*40)
        print("MISSING DATA ANALYSIS (restin_ai_db -> restin_v2)")
        print("="*40)
        
        legacy = all_counts.get("restin_ai_db", {})
        current = all_counts.get("restin_v2", {})
        
        for col, count in legacy.items():
            if count > 0:
                current_count = current.get(col, 0)
                diff = count - current_count
                if diff > 0:
                    print(f"[MISSING] {col} (Legacy: {count} | Current: {current_count} | Diff: -{diff})")
                elif diff < 0:
                    print(f"[MORE] {col} (Current has {abs(diff)} more)")
                else:
                    print(f"[OK] {col} (Match)")
                    
    except Exception as e:
        print(f"[ERROR] {e}")

if __name__ == "__main__":
    asyncio.run(check_counts())
