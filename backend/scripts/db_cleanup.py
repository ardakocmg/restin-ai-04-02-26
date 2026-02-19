"""Drop legacy recipe collections: RecipesEngineered and recipes_engineered"""
import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from motor.motor_asyncio import AsyncIOMotorClient

URI = os.getenv(
    "MONGO_URL",
    "mongodb+srv://restinai:lTxLH4ncbKTocAwl@cluster0.5ndlsdd.mongodb.net/restin_v2?retryWrites=true&w=majority&appName=Cluster0",
)


async def main():
    client = AsyncIOMotorClient(URI)
    db = client.restin_v2

    active_count = await db.recipes.count_documents({})
    print(f"Active 'recipes' collection: {active_count} docs (NOT touching this)")

    for col_name in ["RecipesEngineered", "recipes_engineered"]:
        exists = col_name in await db.list_collection_names()
        if not exists:
            print(f"'{col_name}' already gone, skipping.")
            continue
        count = await db[col_name].count_documents({})
        print(f"Dropping '{col_name}' ({count} docs)...")
        await db.drop_collection(col_name)
        print(f"  DONE - Dropped '{col_name}'")

    # Verify
    cols = await db.list_collection_names()
    print(f"\nVerification:")
    print(f"  'RecipesEngineered' exists: {'RecipesEngineered' in cols}")
    print(f"  'recipes_engineered' exists: {'recipes_engineered' in cols}")
    print(f"  'recipes' count: {await db.recipes.count_documents({})}")
    print(f"  Total collections now: {len(cols)}")

    client.close()


if __name__ == "__main__":
    asyncio.run(main())
