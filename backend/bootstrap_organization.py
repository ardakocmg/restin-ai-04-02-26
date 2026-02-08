
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from pprint import pprint

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = "restin_v2"

async def bootstrap():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("Bootstrapping Organization Hierarchy...")
    
    # Check if Organization exists
    org = await db.organizations.find_one({})
    if org:
        print(f"Organization already exists: {org.get('name')} ({org['_id']})")
        org_id = org["_id"]
    else:
        print("Creating Default Organization...")
        res = await db.organizations.insert_one({
            "name": "MG Group",
            "slug": "mg-group",
            "plan": "ENTERPRISE"
        })
        org_id = res.inserted_id
        print(f"Created Organization: {org_id}")

    # Check if Brand exists
    brand = await db.brands.find_one({"organizationId": org_id})
    if brand:
        print(f"Brand already exists: {brand.get('name')} ({brand['_id']})")
        brand_id = brand["_id"]
    else:
        print("Creating Default Brand...")
        res = await db.brands.insert_one({
            "organizationId": org_id,
            "name": "Restin Core"
        })
        brand_id = res.inserted_id
        print(f"Created Brand: {brand_id}")

    # Check if Branch exists
    branch = await db.branches.find_one({"brandId": brand_id})
    if branch:
        print(f"Branch already exists: {branch.get('name')} ({branch['_id']})")
    else:
        print("Creating Default Branch...")
        res = await db.branches.insert_one({
            "brandId": brand_id,
            "name": "Main HQ",
            "currency": "EUR",
            "timezone": "Europe/Malta"
        })
        print(f"Created Branch: {res.inserted_id}")

    print("Bootstrap Complete.")

if __name__ == "__main__":
    asyncio.run(bootstrap())
