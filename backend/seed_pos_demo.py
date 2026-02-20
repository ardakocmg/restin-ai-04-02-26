"""
Comprehensive POS Seed Script
Seeds venues, categories, menu items, tables, and floor plans for POS testing.
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path
import uuid
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'restin_v2')

async def seed_pos_data():
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Use first venue or create one
    venue = await db.venues.find_one({}, {"_id": 0})
    if not venue:
        venue_id = "venue-caviar-bull"
        venue = {
            "id": venue_id,
            "name": "Caviar & Bull",
            "type": "fine_dining",
            "service_style": "fine_dining",
            "timezone": "Europe/Malta",
            "currency": "EUR",
            "currency_symbol": "€",
            "slug": "caviar-bull",
            "location": "St Julians",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.venues.insert_one(venue)
        print(f"✅ Created venue: {venue['name']}")
    else:
        venue_id = venue["id"]
        print(f"✅ Using existing venue: {venue['name']} (id: {venue_id})")

    # --- Categories ---
    cats_count = await db.categories.count_documents({"venue_id": venue_id})
    if cats_count == 0:
        categories = [
            {"id": f"cat-{i}", "venue_id": venue_id, "name": name, "sort_order": i, "color": color}
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
        await db.categories.insert_many(categories)
        print(f"✅ Created {len(categories)} categories")
    else:
        print(f"✅ Categories already exist ({cats_count})")
    
    # --- Menu Items ---
    items_count = await db.menu_items.count_documents({"venue_id": venue_id})
    if items_count == 0:
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
                    "currency": "EUR",
                    "available": True,
                    "sort_order": item_id,
                })
                item_id += 1
        
        await db.menu_items.insert_many(items)
        print(f"✅ Created {len(items)} menu items")
    else:
        print(f"✅ Menu items already exist ({items_count})")
    
    # --- Tables ---
    tables_count = await db.tables.count_documents({"venue_id": venue_id})
    if tables_count == 0:
        tables = []
        for i in range(1, 16):
            tables.append({
                "id": f"table-{i:02d}",
                "venue_id": venue_id,
                "name": f"Table {i}",
                "seats": 4 if i <= 10 else 6,
                "zone_id": "zone-main" if i <= 10 else "zone-terrace",
                "status": "available",
                "x": (i - 1) % 5 * 120 + 50,
                "y": ((i - 1) // 5) * 120 + 50,
            })
        # Add bar seats
        for i in range(1, 6):
            tables.append({
                "id": f"bar-{i:02d}",
                "venue_id": venue_id,
                "name": f"Bar {i}",
                "seats": 2,
                "zone_id": "zone-bar",
                "status": "available",
                "x": (i - 1) * 100 + 50,
                "y": 400,
            })
        await db.tables.insert_many(tables)
        print(f"✅ Created {len(tables)} tables")
    else:
        print(f"✅ Tables already exist ({tables_count})")
    
    # --- Floor Plan ---
    fp_count = await db.floor_plans.count_documents({"venue_id": venue_id})
    if fp_count == 0:
        floor_plan = {
            "id": "fp-main",
            "venue_id": venue_id,
            "name": "Main Floor",
            "is_active": True,
            "zones": [
                {"id": "zone-main", "name": "Main Dining", "color": "#4ECDC4"},
                {"id": "zone-terrace", "name": "Terrace", "color": "#FFE66D"},
                {"id": "zone-bar", "name": "Bar", "color": "#BB8FCE"},
            ],
            "tables": []  # POS reads tables from tables collection
        }
        await db.floor_plans.insert_one(floor_plan)
        print(f"✅ Created floor plan")
    else:
        print(f"✅ Floor plan already exists")
    
    # Store venue ID in a consistent location
    print(f"\n🎉 POS seed complete!")
    print(f"   Venue ID: {venue_id}")
    print(f"   Set localStorage 'restin_pos_venue' to '{venue_id}' in the browser")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_pos_data())
