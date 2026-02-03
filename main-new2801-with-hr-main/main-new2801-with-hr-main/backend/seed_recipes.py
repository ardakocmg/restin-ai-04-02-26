import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'restinai')]

async def seed_recipes():
    print("Seeding recipes for menu items...")
    
    venue_id = "venue-caviar-bull"
    
    # Get inventory items
    inv_caviar = await db.inventory_items.find_one({"name": {"$regex": "caviar", "$options": "i"}}, {"_id": 0, "id": 1})
    inv_beef = await db.inventory_items.find_one({"name": {"$regex": "wagyu|beef", "$options": "i"}}, {"_id": 0, "id": 1})
    
    # Get menu items
    menu_items = await db.menu_items.find({"venue_id": venue_id}, {"_id": 0, "id": 1, "name": 1}).to_list(50)
    
    recipes = []
    
    for item in menu_items:
        name_lower = item["name"].lower()
        
        # Simple mapping logic
        if "caviar" in name_lower and inv_caviar:
            recipes.append({
                "id": f"recipe-{item['id']}",
                "menu_item_id": item["id"],
                "ingredients": [
                    {"inventory_item_id": inv_caviar["id"], "quantity": 30, "unit": "g"}
                ],
                "portion_size": 1.0
            })
        elif "beef" in name_lower or "steak" in name_lower and inv_beef:
            recipes.append({
                "id": f"recipe-{item['id']}",
                "menu_item_id": item["id"],
                "ingredients": [
                    {"inventory_item_id": inv_beef["id"], "quantity": 250, "unit": "g"}
                ],
                "portion_size": 1.0
            })
    
    if recipes:
        await db.menu_item_recipes.delete_many({})
        await db.menu_item_recipes.insert_many(recipes)
        print(f"✓ Created {len(recipes)} recipes")
    else:
        print("⚠ No matching inventory items for recipes")
    
    print("✓ Recipe seeding complete!")

if __name__ == "__main__":
    asyncio.run(seed_recipes())
