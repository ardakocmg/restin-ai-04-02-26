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

async def seed_modifiers():
    print("Seeding modifiers for Caviar & Bull...")
    
    venue_id = "venue-caviar-bull"
    
    # Clear existing
    await db.modifier_groups.delete_many({"venue_id": venue_id})
    await db.modifier_options.delete_many({})
    await db.menu_item_modifiers.delete_many({})
    
    # Create modifier groups
    groups_data = [
        {
            "id": "mod-group-size",
            "venue_id": venue_id,
            "name": "Size",
            "selection_type": "single",
            "required": True,
            "sort_order": 1
        },
        {
            "id": "mod-group-doneness",
            "venue_id": venue_id,
            "name": "Doneness",
            "selection_type": "single",
            "required": True,
            "sort_order": 2
        },
        {
            "id": "mod-group-toppings",
            "venue_id": venue_id,
            "name": "Toppings",
            "selection_type": "multiple",
            "required": False,
            "sort_order": 3
        },
        {
            "id": "mod-group-sides",
            "venue_id": venue_id,
            "name": "Side",
            "selection_type": "single",
            "required": False,
            "sort_order": 4
        }
    ]
    
    await db.modifier_groups.insert_many(groups_data)
    print(f"✓ Created {len(groups_data)} modifier groups")
    
    # Create modifier options
    options_data = [
        # Size options
        {"id": "opt-size-small", "group_id": "mod-group-size", "name": "Small", "price_adjustment": -2.0, "is_default": False, "sort_order": 1},
        {"id": "opt-size-regular", "group_id": "mod-group-size", "name": "Regular", "price_adjustment": 0.0, "is_default": True, "sort_order": 2},
        {"id": "opt-size-large", "group_id": "mod-group-size", "name": "Large", "price_adjustment": 3.0, "is_default": False, "sort_order": 3},
        
        # Doneness options
        {"id": "opt-done-rare", "group_id": "mod-group-doneness", "name": "Rare", "price_adjustment": 0.0, "is_default": False, "sort_order": 1},
        {"id": "opt-done-medium-rare", "group_id": "mod-group-doneness", "name": "Medium Rare", "price_adjustment": 0.0, "is_default": False, "sort_order": 2},
        {"id": "opt-done-medium", "group_id": "mod-group-doneness", "name": "Medium", "price_adjustment": 0.0, "is_default": True, "sort_order": 3},
        {"id": "opt-done-medium-well", "group_id": "mod-group-doneness", "name": "Medium Well", "price_adjustment": 0.0, "is_default": False, "sort_order": 4},
        {"id": "opt-done-well", "group_id": "mod-group-doneness", "name": "Well Done", "price_adjustment": 0.0, "is_default": False, "sort_order": 5},
        
        # Toppings options
        {"id": "opt-top-cheese", "group_id": "mod-group-toppings", "name": "Extra Cheese", "price_adjustment": 2.0, "is_default": False, "sort_order": 1},
        {"id": "opt-top-bacon", "group_id": "mod-group-toppings", "name": "Bacon", "price_adjustment": 3.0, "is_default": False, "sort_order": 2},
        {"id": "opt-top-mushroom", "group_id": "mod-group-toppings", "name": "Mushrooms", "price_adjustment": 2.0, "is_default": False, "sort_order": 3},
        {"id": "opt-top-truffle", "group_id": "mod-group-toppings", "name": "Truffle Oil", "price_adjustment": 5.0, "is_default": False, "sort_order": 4},
        
        # Sides options
        {"id": "opt-side-fries", "group_id": "mod-group-sides", "name": "Fries", "price_adjustment": 0.0, "is_default": True, "sort_order": 1},
        {"id": "opt-side-salad", "group_id": "mod-group-sides", "name": "Garden Salad", "price_adjustment": 1.0, "is_default": False, "sort_order": 2},
        {"id": "opt-side-veg", "group_id": "mod-group-sides", "name": "Grilled Vegetables", "price_adjustment": 2.0, "is_default": False, "sort_order": 3},
    ]
    
    await db.modifier_options.insert_many(options_data)
    print(f"✓ Created {len(options_data)} modifier options")
    
    # Link modifiers to menu items (example: link to steak items)
    # Get some menu items to link
    steak_items = await db.menu_items.find(
        {"venue_id": venue_id, "name": {"$regex": "steak|beef|burger", "$options": "i"}},
        {"_id": 0, "id": 1}
    ).to_list(10)
    
    links = []
    for item in steak_items:
        links.extend([
            {"id": f"link-{item['id']}-size", "menu_item_id": item["id"], "modifier_group_id": "mod-group-size"},
            {"id": f"link-{item['id']}-done", "menu_item_id": item["id"], "modifier_group_id": "mod-group-doneness"},
            {"id": f"link-{item['id']}-top", "menu_item_id": item["id"], "modifier_group_id": "mod-group-toppings"},
            {"id": f"link-{item['id']}-side", "menu_item_id": item["id"], "modifier_group_id": "mod-group-sides"},
        ])
    
    if links:
        await db.menu_item_modifiers.insert_many(links)
        print(f"✓ Linked modifiers to {len(steak_items)} menu items")
    
    print("✓ Modifier seeding complete!")

if __name__ == "__main__":
    asyncio.run(seed_modifiers())
