"""
Fix POS Seed — Move data to correct collections
Backend uses: menu_categories (not categories), menu_items with is_active field
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'restin_v2')

async def fix_seed():
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Get first venue
    venue = await db.venues.find_one({}, {"_id": 0})
    if not venue:
        print("❌ No venues found!")
        return
    
    venue_id = venue["id"]
    print(f"Using venue: {venue['name']} (id: {venue_id})")
    
    # --- Fix Categories: move from 'categories' to 'menu_categories' ---
    old_cats = await db.categories.find({"venue_id": venue_id}, {"_id": 0}).to_list(100)
    if old_cats:
        print(f"Moving {len(old_cats)} categories from 'categories' to 'menu_categories'...")
        # Clear wrong collection
        await db.categories.delete_many({"venue_id": venue_id})
    
    # Clear and reseed menu_categories
    await db.menu_categories.delete_many({"venue_id": venue_id})
    categories = [
        {"id": f"cat-{i}", "venue_id": venue_id, "name": name, "sort_order": i, "color": color, "is_active": True}
        for i, (name, color) in enumerate([
            ("Starters", "#FF6B6B"),
            ("Mains", "#4ECDC4"),
            ("Pasta", "#FFE66D"),
            ("Fish", "#45B7D1"),
            ("Desserts", "#F7DC6F"),
            ("Drinks", "#BB8FCE"),
            ("Wine", "#E74C3C"),
            ("Sides", "#27AE60"),
        ], 1)
    ]
    await db.menu_categories.insert_many(categories)
    print(f"✅ Created {len(categories)} menu_categories")
    
    # --- Fix Menu Items: ensure is_active field ---
    await db.menu_items.delete_many({"venue_id": venue_id})
    items = []
    menu_data = {
        "cat-1": [  # Starters
            ("Beef Carpaccio", 16.50),
            ("Burrata & Tomato", 14.00),
            ("Tuna Tartare", 18.00),
            ("Octopus Salad", 15.50),
            ("Foie Gras Terrine", 22.00),
            ("Prawn Cocktail", 16.00),
        ],
        "cat-2": [  # Mains
            ("Wagyu Steak 300g", 58.00),
            ("Rack of Lamb", 42.00),
            ("Duck Breast", 36.00),
            ("Chicken Supreme", 28.00),
            ("Pork Belly", 32.00),
            ("Veal Osso Buco", 38.00),
        ],
        "cat-3": [  # Pasta
            ("Spaghetti Carbonara", 18.00),
            ("Risotto ai Funghi", 22.00),
            ("Ravioli di Ricotta", 20.00),
            ("Tagliatelle Ragu", 19.00),
            ("Gnocchi al Tartufo", 24.00),
            ("Linguine Vongole", 22.00),
        ],
        "cat-4": [  # Fish
            ("Grilled Sea Bass", 34.00),
            ("Pan-Seared Salmon", 30.00),
            ("Lobster Thermidor", 55.00),
            ("Swordfish Steak", 32.00),
            ("Seafood Platter", 65.00),
        ],
        "cat-5": [  # Desserts
            ("Tiramisu", 12.00),
            ("Chocolate Fondant", 14.00),
            ("Panna Cotta", 10.00),
            ("Creme Brulee", 11.00),
            ("Affogato", 8.00),
        ],
        "cat-6": [  # Drinks
            ("Espresso", 3.00),
            ("Cappuccino", 4.00),
            ("Fresh Orange Juice", 5.00),
            ("Coca Cola", 3.50),
            ("San Pellegrino", 4.00),
            ("Gin & Tonic", 12.00),
            ("Aperol Spritz", 11.00),
            ("Mojito", 13.00),
        ],
        "cat-7": [  # Wine
            ("House Red (glass)", 8.00),
            ("House White (glass)", 8.00),
            ("Prosecco (glass)", 9.00),
            ("Champagne (glass)", 18.00),
            ("Barolo (bottle)", 65.00),
        ],
        "cat-8": [  # Sides
            ("Truffle Fries", 8.00),
            ("Garden Salad", 7.00),
            ("Grilled Vegetables", 9.00),
            ("Mashed Potatoes", 6.00),
            ("Bread Basket", 5.00),
        ],
    }
    
    item_id = 1
    for cat_id, cat_items in menu_data.items():
        for name, price in cat_items:
            items.append({
                "id": f"item-{item_id:03d}",
                "venue_id": venue_id,
                "category_id": cat_id,
                "name": name,
                "price": price,
                "price_cents": int(price * 100),
                "currency": "EUR",
                "is_active": True,  # Required by backend query filter
                "sort_order": item_id,
            })
            item_id += 1
    
    await db.menu_items.insert_many(items)
    print(f"✅ Created {len(items)} menu_items (with is_active=True)")
    
    # Verify
    cat_count = await db.menu_categories.count_documents({"venue_id": venue_id})
    item_count = await db.menu_items.count_documents({"venue_id": venue_id, "is_active": True})
    print(f"\n🎉  Verification: {cat_count} categories, {item_count} active items")
    print(f"   Venue ID: {venue_id}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(fix_seed())
