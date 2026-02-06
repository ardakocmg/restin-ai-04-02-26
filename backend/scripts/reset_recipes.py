import asyncio
import os
import sys

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.database import get_database, db

async def reset_recipes():
    print("Connecting to database...")
    # Initialize DB logic if required by the framework
    if hasattr(db, "initialize"):
        await db.initialize()
    
    database = get_database()
    
    # 1. Clear RecipesEngineered
    print("Deleting all Engineered Recipes...")
    result = await database.RecipesEngineered.delete_many({})
    print(f"Deleted {result.deleted_count} recipes.")
    
    # 2. Clear RecipeVersions (History)
    print("Deleting Recipe Versions...")
    result_v = await database.RecipeVersions.delete_many({})
    print(f"Deleted {result_v.deleted_count} version records.")
    
    print("\n[OK] Reset Complete! The database is clean. You can now re-import from Excel.")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(reset_recipes())
