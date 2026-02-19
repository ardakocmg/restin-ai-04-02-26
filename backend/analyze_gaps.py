"""Deep analysis of remaining gaps."""
import asyncio, os
from dotenv import load_dotenv
load_dotenv()
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.getenv("MONGO_URL")

async def main():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client["restin_v2"]

    # 18 unmatched stock items
    print("=== 18 UNMATCHED STOCK ITEMS ===")
    async for ss in db.stock_snapshots.find(
        {"ingredient_id": None, "source": "apicbase"},
        {"ingredient_name": 1, "_id": 0}
    ):
        name = ss.get("ingredient_name", "")
        exact = await db.ingredients.find_one({"name": name})
        partial = await db.ingredients.find_one(
            {"name": {"$regex": name[:15], "$options": "i"}}
        ) if name and len(name) >= 15 else None
        e = "YES" if exact else "NO"
        p = "YES" if partial else "NO"
        print(f"  exact:{e} partial:{p} | {name}")

    # 84 packages without supplier_id
    print("")
    print("=== PACKAGES WITHOUT SUPPLIER_ID ===")
    count = 0
    no_sup_name = 0
    has_sup_name = 0
    async for pkg in db.ingredient_packages.find(
        {"$or": [{"supplier_id": None}, {"supplier_id": {"$exists": False}}],
         "source": "apicbase"},
        {"supplier_name": 1, "ingredient_name": 1, "_id": 0}
    ):
        if pkg.get("supplier_name"):
            has_sup_name += 1
            if count < 3:
                print(f"  HAS: {pkg['supplier_name']} => {pkg.get('ingredient_name', '?')}")
        else:
            no_sup_name += 1
        count += 1
    print(f"  Total: {count} | Has supplier_name: {has_sup_name} | NO supplier_name: {no_sup_name}")

    client.close()

asyncio.run(main())
