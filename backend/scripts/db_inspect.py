"""Check recipe field names and count unique recipes across all 3 collections"""
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

    for col_name in ["recipes", "RecipesEngineered", "recipes_engineered"]:
        col = db[col_name]
        count = await col.count_documents({})
        print(f"\n=== {col_name} ({count} docs) ===")

        # Get one sample doc to see the field names
        sample = await col.find_one({}, {"_id": 0})
        if sample:
            print(f"  Fields: {list(sample.keys())[:15]}")
            # Try common name fields
            for field in ["recipe_name", "name", "Name", "title"]:
                if field in sample:
                    print(f"  Name field: '{field}' = '{sample[field]}'")

            # Count unique by various name fields
            for field in ["recipe_name", "name", "Name"]:
                unique = await col.distinct(field)
                if unique:
                    print(f"  Unique '{field}': {len(unique)}")

    client.close()


if __name__ == "__main__":
    asyncio.run(main())
