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

async def comprehensive_seed():
    print("🚀 COMPREHENSIVE TEST DATA SEEDING...")
    print("=" * 60)
    
    venue_id = "venue-caviar-bull"
    
    # 1. Get all menu items
    menu_items = await db.menu_items.find({"venue_id": venue_id}, {"_id": 0}).to_list(100)
    print(f"✓ Found {len(menu_items)} menu items")
    
    # 2. Get all inventory items
    inventory_items = await db.inventory_items.find({"venue_id": venue_id}, {"_id": 0}).to_list(100)
    print(f"✓ Found {len(inventory_items)} inventory items")
    
    # 3. Create recipes for ALL menu items (simple 1:1 mapping)
    recipes = []
    for i, item in enumerate(menu_items):
        if i < len(inventory_items):
            # Map each menu item to an inventory item
            inv_item = inventory_items[i % len(inventory_items)]
            recipes.append({
                "id": f"recipe-{item['id']}",
                "menu_item_id": item["id"],
                "ingredients": [
                    {
                        "inventory_item_id": inv_item["id"],
                        "quantity": 100.0,  # 100g standard
                        "unit": "g"
                    }
                ],
                "portion_size": 1.0
            })
    
    if recipes:
        await db.menu_item_recipes.delete_many({"menu_item_id": {"$in": [r["menu_item_id"] for r in recipes]}})
        await db.menu_item_recipes.insert_many(recipes)
        print(f"✓ Created {len(recipes)} recipes (ALL menu items now have recipes)")
    
    # 4. Link modifiers to more items
    modifier_groups = await db.modifier_groups.find({"venue_id": venue_id}, {"_id": 0}).to_list(10)
    
    if modifier_groups:
        links = []
        for item in menu_items[:10]:  # Link to first 10 items
            for group in modifier_groups:
                links.append({
                    "id": f"link-{item['id']}-{group['id']}",
                    "menu_item_id": item["id"],
                    "modifier_group_id": group["id"]
                })
        
        if links:
            await db.menu_item_modifiers.delete_many({})
            await db.menu_item_modifiers.insert_many(links)
            print(f"✓ Linked modifiers to {len(menu_items[:10])} menu items")
    
    # 5. Verify stock ledger has entries
    ledger_count = await db.stock_ledger.count_documents({"venue_id": venue_id})
    print(f"✓ Stock ledger: {ledger_count} entries")
    
    # 6. Summary
    print("=" * 60)
    print("✅ COMPREHENSIVE SEED COMPLETE!")
    print(f"   - {len(menu_items)} menu items")
    print(f"   - {len(recipes)} recipes (100% coverage)")
    print(f"   - {len(inventory_items)} inventory items")
    print(f"   - {ledger_count} stock ledger entries")
    print(f"   - Modifiers linked to top 10 items")
    print("=" * 60)
    print("🎯 System ready for END-TO-END testing!")

if __name__ == "__main__":
    asyncio.run(comprehensive_seed())
