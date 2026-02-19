import asyncio
import os
import sys

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.database import get_database, db

async def check_data_status():
    print("Connecting to database...")
    if hasattr(db, "initialize"):
        await db.initialize()
    
    database = get_database()
    
    total = await database.recipes.count_documents({})
    active_count = await database.recipes.count_documents({"active": True})
    archived_count = await database.recipes.count_documents({"active": False})
    missing_active_field = await database.recipes.count_documents({"active": {"$exists": False}})
    
    print(f"Total Recipes: {total}")
    print(f"Active: {active_count}")
    print(f"Archived (active=False): {archived_count}")
    print(f"Missing 'active' field: {missing_active_field}")
    
    # Sample archived item to see why
    if archived_count > 0:
        sample = await database.recipes.find_one({"active": False})
        print("\nSample Archived Item:")
        print(sample)

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(check_data_status())
