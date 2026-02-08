"""
Seed data script for restin.ai - Stage 2
Real Marvin Gauci Group venues with realistic menus
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os
from pathlib import Path
import uuid
import hashlib
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'restinai')]

def hash_pin(pin: str) -> str:
    return hashlib.sha256(pin.encode()).hexdigest()

async def seed_database():
    print("[SEED] Seeding database with Marvin Gauci Group venues...")
    
    # Clear existing data
    collections = ['venues', 'zones', 'tables', 'users', 'menus', 'menu_categories', 'menu_items', 
                   'orders', 'kds_tickets', 'print_jobs', 'inventory_items', 'stock_ledger',
                   'purchase_orders', 'documents', 'audit_logs', 'device_bindings']
    for col in collections:
        await db[col].delete_many({})
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Load Master Seed Data
    try:
        import json
        with open(ROOT_DIR.parent / 'frontend/src/data/seed-master.json', 'r') as f:
            master_data = json.load(f)
            print("[OK] Loaded seed-master.json")
    except Exception as e:
        print(f"[ERROR] Failed to load seed-master.json: {e}")
        return

    # ==================== VENUES ====================
    venues = master_data.get('venues', [])
    # Add timestamps if missing
    for v in venues:
        v['created_at'] = now
        # Map frontend keys to backend keys if necessary (e.g. camelCase to snake_case)
        # keeping simple for now as per JSON
    
    await db.venues.insert_many(venues)
    print(f"[OK] Created {len(venues)} venues from Master Seed")
    
    # ==================== ZONES ====================
    zones = [
        # Caviar & Bull
        {"id": "zone-cb-main", "venue_id": "venue-caviar-bull", "name": "Main Dining", "type": "dining", "created_at": now},
        {"id": "zone-cb-terrace", "venue_id": "venue-caviar-bull", "name": "Terrace", "type": "dining", "created_at": now},
        {"id": "zone-cb-private", "venue_id": "venue-caviar-bull", "name": "Private Room", "type": "dining", "created_at": now},
        {"id": "zone-cb-bar", "venue_id": "venue-caviar-bull", "name": "Champagne Bar", "type": "bar", "created_at": now},
        {"id": "zone-cb-kitchen", "venue_id": "venue-caviar-bull", "name": "Main Kitchen", "type": "kitchen", "created_at": now},
        {"id": "zone-cb-pass", "venue_id": "venue-caviar-bull", "name": "Pass", "type": "pass", "created_at": now},
        
        # Don Royale
        {"id": "zone-dr-main", "venue_id": "venue-don-royale", "name": "Main Floor", "type": "dining", "created_at": now},
        {"id": "zone-dr-lounge", "venue_id": "venue-don-royale", "name": "Lounge", "type": "dining", "created_at": now},
        {"id": "zone-dr-bar", "venue_id": "venue-don-royale", "name": "Bar", "type": "bar", "created_at": now},
        {"id": "zone-dr-kitchen", "venue_id": "venue-don-royale", "name": "Grill Kitchen", "type": "kitchen", "created_at": now},
        {"id": "zone-dr-pass", "venue_id": "venue-don-royale", "name": "Pass", "type": "pass", "created_at": now},
        
        # Sole by Tarragon
        {"id": "zone-st-main", "venue_id": "venue-sole-tarragon", "name": "Main Dining", "type": "dining", "created_at": now},
        {"id": "zone-st-terrace", "venue_id": "venue-sole-tarragon", "name": "Sea Terrace", "type": "dining", "created_at": now},
        {"id": "zone-st-bar", "venue_id": "venue-sole-tarragon", "name": "Aperitivo Bar", "type": "bar", "created_at": now},
        {"id": "zone-st-kitchen", "venue_id": "venue-sole-tarragon", "name": "Kitchen", "type": "kitchen", "created_at": now},
    ]
    await db.zones.insert_many(zones)
    print(f"[OK] Created {len(zones)} zones")
    
    # ==================== TABLES ====================
    tables = []
    
    # Caviar & Bull - Main (10 tables, mixed seating)
    for i in range(1, 11):
        seats = 4 if i <= 6 else 6 if i <= 8 else 2
        tables.append({
            "id": f"table-cb-main-{i}",
            "venue_id": "venue-caviar-bull",
            "zone_id": "zone-cb-main",
            "name": f"Table {i}",
            "seats": seats,
            "status": "available",
            "current_order_id": None,
            "created_at": now
        })
    
    # Caviar & Bull - Terrace (6 tables)
    for i in range(1, 7):
        tables.append({
            "id": f"table-cb-terrace-{i}",
            "venue_id": "venue-caviar-bull",
            "zone_id": "zone-cb-terrace",
            "name": f"Terrace {i}",
            "seats": 4,
            "status": "available",
            "current_order_id": None,
            "created_at": now
        })
    
    # Caviar & Bull - Private (2 tables)
    for i in range(1, 3):
        tables.append({
            "id": f"table-cb-private-{i}",
            "venue_id": "venue-caviar-bull",
            "zone_id": "zone-cb-private",
            "name": f"Private {i}",
            "seats": 8,
            "status": "available",
            "current_order_id": None,
            "created_at": now
        })
    
    # Don Royale - Main (12 tables)
    for i in range(1, 13):
        seats = 2 if i <= 4 else 4 if i <= 10 else 6
        tables.append({
            "id": f"table-dr-main-{i}",
            "venue_id": "venue-don-royale",
            "zone_id": "zone-dr-main",
            "name": f"T{i}",
            "seats": seats,
            "status": "available",
            "current_order_id": None,
            "created_at": now
        })
    
    # Don Royale - Lounge (5 tables)
    for i in range(1, 6):
        tables.append({
            "id": f"table-dr-lounge-{i}",
            "venue_id": "venue-don-royale",
            "zone_id": "zone-dr-lounge",
            "name": f"L{i}",
            "seats": 4,
            "status": "available",
            "current_order_id": None,
            "created_at": now
        })
    
    # Don Royale - Bar (6 seats)
    for i in range(1, 7):
        tables.append({
            "id": f"table-dr-bar-{i}",
            "venue_id": "venue-don-royale",
            "zone_id": "zone-dr-bar",
            "name": f"Bar {i}",
            "seats": 1,
            "status": "available",
            "current_order_id": None,
            "created_at": now
        })
    
    # Sole by Tarragon - Main (10 tables)
    for i in range(1, 11):
        seats = 2 if i <= 3 else 4 if i <= 8 else 6
        tables.append({
            "id": f"table-st-main-{i}",
            "venue_id": "venue-sole-tarragon",
            "zone_id": "zone-st-main",
            "name": f"Table {i}",
            "seats": seats,
            "status": "available",
            "current_order_id": None,
            "created_at": now
        })
    
    # Sole by Tarragon - Terrace (8 tables)
    for i in range(1, 9):
        tables.append({
            "id": f"table-st-terrace-{i}",
            "venue_id": "venue-sole-tarragon",
            "zone_id": "zone-st-terrace",
            "name": f"Sea {i}",
            "seats": 4,
            "status": "available",
            "current_order_id": None,
            "created_at": now
        })
    
    await db.tables.insert_many(tables)
    print(f"[OK] Created {len(tables)} tables")
    
    # ==================== USERS ====================
    users = master_data.get('users', [])
    for u in users:
        u['created_at'] = now
        u['pin_hash'] = hash_pin(u.get('pin', '1111'))
        if 'pin' in u: del u['pin'] # Remove plain pin
        # Map camelCase to snake_case if needed
        if 'venueId' in u:
            u['venue_id'] = u.pop('venueId')
        
    await db.users.insert_many(users)
    print(f"[OK] Created {len(users)} users from Master Seed")
    
    # ==================== MENUS ====================
    menus = [
        {"id": "menu-cb-main", "venue_id": "venue-caviar-bull", "name": "Main Menu", "is_active": True, "created_at": now},
        {"id": "menu-dr-main", "venue_id": "venue-don-royale", "name": "Main Menu", "is_active": True, "created_at": now},
        {"id": "menu-st-main", "venue_id": "venue-sole-tarragon", "name": "Main Menu", "is_active": True, "created_at": now},
    ]
    await db.menus.insert_many(menus)
    print(f"[OK] Created {len(menus)} menus")
    
    # ==================== MENU CATEGORIES ====================
    categories = [
        # Caviar & Bull
        {"id": "cat-cb-starters", "venue_id": "venue-caviar-bull", "menu_id": "menu-cb-main", "name": "Starters", "sort_order": 1, "prep_area": "kitchen", "created_at": now},
        {"id": "cat-cb-mains", "venue_id": "venue-caviar-bull", "menu_id": "menu-cb-main", "name": "Main Courses", "sort_order": 2, "prep_area": "kitchen", "created_at": now},
        {"id": "cat-cb-desserts", "venue_id": "venue-caviar-bull", "menu_id": "menu-cb-main", "name": "Desserts", "sort_order": 3, "prep_area": "kitchen", "created_at": now},
        {"id": "cat-cb-drinks", "venue_id": "venue-caviar-bull", "menu_id": "menu-cb-main", "name": "Beverages", "sort_order": 4, "prep_area": "bar", "created_at": now},
        
        # Don Royale
        {"id": "cat-dr-starters", "venue_id": "venue-don-royale", "menu_id": "menu-dr-main", "name": "Starters", "sort_order": 1, "prep_area": "kitchen", "created_at": now},
        {"id": "cat-dr-steaks", "venue_id": "venue-don-royale", "menu_id": "menu-dr-main", "name": "Steaks", "sort_order": 2, "prep_area": "kitchen", "created_at": now},
        {"id": "cat-dr-sides", "venue_id": "venue-don-royale", "menu_id": "menu-dr-main", "name": "Sides", "sort_order": 3, "prep_area": "kitchen", "created_at": now},
        {"id": "cat-dr-desserts", "venue_id": "venue-don-royale", "menu_id": "menu-dr-main", "name": "Desserts", "sort_order": 4, "prep_area": "kitchen", "created_at": now},
        {"id": "cat-dr-drinks", "venue_id": "venue-don-royale", "menu_id": "menu-dr-main", "name": "Beverages", "sort_order": 5, "prep_area": "bar", "created_at": now},
        
        # Sole by Tarragon
        {"id": "cat-st-starters", "venue_id": "venue-sole-tarragon", "menu_id": "menu-st-main", "name": "Starters", "sort_order": 1, "prep_area": "kitchen", "created_at": now},
        {"id": "cat-st-pasta", "venue_id": "venue-sole-tarragon", "menu_id": "menu-st-main", "name": "Pasta & Risotto", "sort_order": 2, "prep_area": "kitchen", "created_at": now},
        {"id": "cat-st-seafood", "venue_id": "venue-sole-tarragon", "menu_id": "menu-st-main", "name": "Seafood", "sort_order": 3, "prep_area": "kitchen", "created_at": now},
        {"id": "cat-st-desserts", "venue_id": "venue-sole-tarragon", "menu_id": "menu-st-main", "name": "Desserts", "sort_order": 4, "prep_area": "kitchen", "created_at": now},
        {"id": "cat-st-drinks", "venue_id": "venue-sole-tarragon", "menu_id": "menu-st-main", "name": "Beverages", "sort_order": 5, "prep_area": "bar", "created_at": now},
    ]
    await db.menu_categories.insert_many(categories)
    print(f"[OK] Created {len(categories)} menu categories")
    
    # ==================== MENU ITEMS ====================
    menu_items = [
        # ===== CAVIAR & BULL =====
        # Starters
        {"id": "item-cb-1", "venue_id": "venue-caviar-bull", "category_id": "cat-cb-starters", "menu_id": "menu-cb-main", "name": "Oscietra Caviar", "price": 95.00, "price_cents": 9500, "description": "30g with traditional accompaniments, blinis, crème fraîche", "allergens": ["dairy", "gluten", "eggs"], "tags": ["signature", "luxury"], "prep_area": "kitchen", "prep_time_minutes": 8, "is_active": True, "created_at": now},
        {"id": "item-cb-2", "venue_id": "venue-caviar-bull", "category_id": "cat-cb-starters", "menu_id": "menu-cb-main", "name": "Beef Tartare", "price": 28.00, "price_cents": 2800, "description": "Hand-cut wagyu, quail egg yolk, capers, shallots", "allergens": ["eggs"], "tags": ["popular"], "prep_area": "kitchen", "prep_time_minutes": 10, "is_active": True, "created_at": now},
        {"id": "item-cb-3", "venue_id": "venue-caviar-bull", "category_id": "cat-cb-starters", "menu_id": "menu-cb-main", "name": "Burrata Caprese", "price": 24.00, "price_cents": 2400, "description": "Creamy burrata, heirloom tomatoes, aged balsamic", "allergens": ["dairy"], "tags": ["vegetarian"], "prep_area": "kitchen", "prep_time_minutes": 6, "is_active": True, "created_at": now},
        {"id": "item-cb-4", "venue_id": "venue-caviar-bull", "category_id": "cat-cb-starters", "menu_id": "menu-cb-main", "name": "Tuna Tartare", "price": 26.00, "price_cents": 2600, "description": "Yellowfin tuna, avocado, sesame, ponzu", "allergens": ["fish", "sesame", "soy"], "tags": [], "prep_area": "kitchen", "prep_time_minutes": 8, "is_active": True, "created_at": now},
        {"id": "item-cb-5", "venue_id": "venue-caviar-bull", "category_id": "cat-cb-starters", "menu_id": "menu-cb-main", "name": "Foie Gras Terrine", "price": 38.00, "price_cents": 3800, "description": "Duck liver, brioche, fig compote, Sauternes jelly", "allergens": ["gluten"], "tags": ["luxury"], "prep_area": "kitchen", "prep_time_minutes": 5, "is_active": True, "created_at": now},
        {"id": "item-cb-6", "venue_id": "venue-caviar-bull", "category_id": "cat-cb-starters", "menu_id": "menu-cb-main", "name": "Oysters (6pc)", "price": 32.00, "price_cents": 3200, "description": "Fine de Claire, champagne mignonette, lemon", "allergens": ["shellfish"], "tags": ["popular"], "prep_area": "kitchen", "prep_time_minutes": 5, "is_active": True, "created_at": now},
        
        # Main Courses
        {"id": "item-cb-7", "venue_id": "venue-caviar-bull", "category_id": "cat-cb-mains", "menu_id": "menu-cb-main", "name": "Wagyu Ribeye", "price": 85.00, "price_cents": 8500, "description": "A5 Japanese, 250g, truffle jus, bone marrow butter", "allergens": ["dairy"], "tags": ["signature", "luxury"], "prep_area": "kitchen", "prep_time_minutes": 25, "is_active": True, "created_at": now},
        {"id": "item-cb-8", "venue_id": "venue-caviar-bull", "category_id": "cat-cb-mains", "menu_id": "menu-cb-main", "name": "Dover Sole", "price": 72.00, "price_cents": 7200, "description": "Whole fish, meunière, capers, brown butter", "allergens": ["fish", "dairy"], "tags": ["popular"], "prep_area": "kitchen", "prep_time_minutes": 20, "is_active": True, "created_at": now},
        {"id": "item-cb-9", "venue_id": "venue-caviar-bull", "category_id": "cat-cb-mains", "menu_id": "menu-cb-main", "name": "Lobster Thermidor", "price": 68.00, "price_cents": 6800, "description": "Whole Maine lobster, cognac cream, gruyère gratin", "allergens": ["shellfish", "dairy", "gluten"], "tags": ["signature"], "prep_area": "kitchen", "prep_time_minutes": 22, "is_active": True, "created_at": now},
        {"id": "item-cb-10", "venue_id": "venue-caviar-bull", "category_id": "cat-cb-mains", "menu_id": "menu-cb-main", "name": "Duck Breast", "price": 48.00, "price_cents": 4800, "description": "Rohan duck, cherry gastrique, pomme purée", "allergens": ["dairy"], "tags": [], "prep_area": "kitchen", "prep_time_minutes": 18, "is_active": True, "created_at": now},
        {"id": "item-cb-11", "venue_id": "venue-caviar-bull", "category_id": "cat-cb-mains", "menu_id": "menu-cb-main", "name": "Rack of Lamb", "price": 52.00, "price_cents": 5200, "description": "Herb-crusted, ratatouille, lamb jus", "allergens": ["gluten"], "tags": [], "prep_area": "kitchen", "prep_time_minutes": 20, "is_active": True, "created_at": now},
        {"id": "item-cb-12", "venue_id": "venue-caviar-bull", "category_id": "cat-cb-mains", "menu_id": "menu-cb-main", "name": "Black Truffle Risotto", "price": 42.00, "price_cents": 4200, "description": "Carnaroli rice, parmesan, fresh black truffle", "allergens": ["dairy"], "tags": ["vegetarian"], "prep_area": "kitchen", "prep_time_minutes": 18, "is_active": True, "created_at": now},
        
        # Desserts
        {"id": "item-cb-13", "venue_id": "venue-caviar-bull", "category_id": "cat-cb-desserts", "menu_id": "menu-cb-main", "name": "Grand Marnier Soufflé", "price": 18.00, "price_cents": 1800, "description": "20-minute preparation, orange crème anglaise", "allergens": ["dairy", "eggs", "gluten"], "tags": ["signature"], "prep_area": "kitchen", "prep_time_minutes": 20, "is_active": True, "created_at": now},
        {"id": "item-cb-14", "venue_id": "venue-caviar-bull", "category_id": "cat-cb-desserts", "menu_id": "menu-cb-main", "name": "Chocolate Fondant", "price": 16.00, "price_cents": 1600, "description": "Molten Valrhona center, vanilla bean ice cream", "allergens": ["dairy", "eggs", "gluten"], "tags": ["popular"], "prep_area": "kitchen", "prep_time_minutes": 15, "is_active": True, "created_at": now},
        {"id": "item-cb-15", "venue_id": "venue-caviar-bull", "category_id": "cat-cb-desserts", "menu_id": "menu-cb-main", "name": "Crème Brûlée", "price": 14.00, "price_cents": 1400, "description": "Madagascar vanilla, caramelized sugar crust", "allergens": ["dairy", "eggs"], "tags": [], "prep_area": "kitchen", "prep_time_minutes": 5, "is_active": True, "created_at": now},
        {"id": "item-cb-16", "venue_id": "venue-caviar-bull", "category_id": "cat-cb-desserts", "menu_id": "menu-cb-main", "name": "Tiramisu", "price": 15.00, "price_cents": 1500, "description": "Classic recipe, mascarpone, espresso", "allergens": ["dairy", "eggs", "gluten"], "tags": [], "prep_area": "kitchen", "prep_time_minutes": 5, "is_active": True, "created_at": now},
        {"id": "item-cb-17", "venue_id": "venue-caviar-bull", "category_id": "cat-cb-desserts", "menu_id": "menu-cb-main", "name": "Cheese Selection", "price": 22.00, "price_cents": 2200, "description": "Artisan European cheeses, quince, crackers", "allergens": ["dairy", "gluten", "nuts"], "tags": [], "prep_area": "kitchen", "prep_time_minutes": 8, "is_active": True, "created_at": now},
        {"id": "item-cb-18", "venue_id": "venue-caviar-bull", "category_id": "cat-cb-desserts", "menu_id": "menu-cb-main", "name": "Panna Cotta", "price": 13.00, "price_cents": 1300, "description": "Vanilla, seasonal berry compote", "allergens": ["dairy"], "tags": [], "prep_area": "kitchen", "prep_time_minutes": 5, "is_active": True, "created_at": now},
        
        # Beverages
        {"id": "item-cb-19", "venue_id": "venue-caviar-bull", "category_id": "cat-cb-drinks", "menu_id": "menu-cb-main", "name": "Dom Pérignon 2012", "price": 380.00, "price_cents": 38000, "description": "Champagne, France", "allergens": [], "tags": ["luxury"], "prep_area": "bar", "prep_time_minutes": 2, "is_active": True, "created_at": now},
        {"id": "item-cb-20", "venue_id": "venue-caviar-bull", "category_id": "cat-cb-drinks", "menu_id": "menu-cb-main", "name": "Château Margaux 2015", "price": 450.00, "price_cents": 45000, "description": "Bordeaux, France", "allergens": [], "tags": ["luxury"], "prep_area": "bar", "prep_time_minutes": 2, "is_active": True, "created_at": now},
        {"id": "item-cb-21", "venue_id": "venue-caviar-bull", "category_id": "cat-cb-drinks", "menu_id": "menu-cb-main", "name": "Espresso Martini", "price": 16.00, "price_cents": 1600, "description": "Vodka, Kahlua, fresh espresso", "allergens": [], "tags": ["popular"], "prep_area": "bar", "prep_time_minutes": 3, "is_active": True, "created_at": now},
        {"id": "item-cb-22", "venue_id": "venue-caviar-bull", "category_id": "cat-cb-drinks", "menu_id": "menu-cb-main", "name": "House White Wine", "price": 8.00, "price_cents": 800, "description": "Glass, Chardonnay", "allergens": [], "tags": [], "prep_area": "bar", "prep_time_minutes": 1, "is_active": True, "created_at": now},
        {"id": "item-cb-23", "venue_id": "venue-caviar-bull", "category_id": "cat-cb-drinks", "menu_id": "menu-cb-main", "name": "House Red Wine", "price": 8.00, "price_cents": 800, "description": "Glass, Cabernet Sauvignon", "allergens": [], "tags": [], "prep_area": "bar", "prep_time_minutes": 1, "is_active": True, "created_at": now},
        {"id": "item-cb-24", "venue_id": "venue-caviar-bull", "category_id": "cat-cb-drinks", "menu_id": "menu-cb-main", "name": "Sparkling Water", "price": 6.00, "price_cents": 600, "description": "San Pellegrino 750ml", "allergens": [], "tags": [], "prep_area": "bar", "prep_time_minutes": 1, "is_active": True, "created_at": now},
        
        # ===== DON ROYALE =====
        # Starters
        {"id": "item-dr-1", "venue_id": "venue-don-royale", "category_id": "cat-dr-starters", "menu_id": "menu-dr-main", "name": "Beef Carpaccio", "price": 22.00, "price_cents": 2200, "description": "Thinly sliced beef, arugula, parmesan, truffle oil", "allergens": ["dairy"], "tags": ["popular"], "prep_area": "kitchen", "prep_time_minutes": 8, "is_active": True, "created_at": now},
        {"id": "item-dr-2", "venue_id": "venue-don-royale", "category_id": "cat-dr-starters", "menu_id": "menu-dr-main", "name": "Jumbo Shrimp Cocktail", "price": 24.00, "price_cents": 2400, "description": "6 pieces, classic cocktail sauce, lemon", "allergens": ["shellfish"], "tags": [], "prep_area": "kitchen", "prep_time_minutes": 5, "is_active": True, "created_at": now},
        {"id": "item-dr-3", "venue_id": "venue-don-royale", "category_id": "cat-dr-starters", "menu_id": "menu-dr-main", "name": "Wedge Salad", "price": 16.00, "price_cents": 1600, "description": "Iceberg, blue cheese, bacon, cherry tomatoes", "allergens": ["dairy"], "tags": [], "prep_area": "kitchen", "prep_time_minutes": 6, "is_active": True, "created_at": now},
        {"id": "item-dr-4", "venue_id": "venue-don-royale", "category_id": "cat-dr-starters", "menu_id": "menu-dr-main", "name": "French Onion Soup", "price": 14.00, "price_cents": 1400, "description": "Caramelized onions, gruyère crouton", "allergens": ["dairy", "gluten"], "tags": [], "prep_area": "kitchen", "prep_time_minutes": 8, "is_active": True, "created_at": now},
        {"id": "item-dr-5", "venue_id": "venue-don-royale", "category_id": "cat-dr-starters", "menu_id": "menu-dr-main", "name": "Steak Tartare", "price": 26.00, "price_cents": 2600, "description": "Hand-cut prime beef, classic preparation", "allergens": ["eggs"], "tags": [], "prep_area": "kitchen", "prep_time_minutes": 10, "is_active": True, "created_at": now},
        {"id": "item-dr-6", "venue_id": "venue-don-royale", "category_id": "cat-dr-starters", "menu_id": "menu-dr-main", "name": "Bone Marrow", "price": 18.00, "price_cents": 1800, "description": "Roasted, parsley gremolata, grilled bread", "allergens": ["gluten"], "tags": ["signature"], "prep_area": "kitchen", "prep_time_minutes": 12, "is_active": True, "created_at": now},
        
        # Steaks
        {"id": "item-dr-7", "venue_id": "venue-don-royale", "category_id": "cat-dr-steaks", "menu_id": "menu-dr-main", "name": "Filet Mignon 8oz", "price": 52.00, "price_cents": 5200, "description": "Center-cut, most tender", "allergens": [], "tags": ["popular"], "prep_area": "kitchen", "prep_time_minutes": 18, "is_active": True, "created_at": now},
        {"id": "item-dr-8", "venue_id": "venue-don-royale", "category_id": "cat-dr-steaks", "menu_id": "menu-dr-main", "name": "Ribeye 14oz", "price": 58.00, "price_cents": 5800, "description": "Prime, bone-in, rich marbling", "allergens": [], "tags": ["signature"], "prep_area": "kitchen", "prep_time_minutes": 22, "is_active": True, "created_at": now},
        {"id": "item-dr-9", "venue_id": "venue-don-royale", "category_id": "cat-dr-steaks", "menu_id": "menu-dr-main", "name": "NY Strip 12oz", "price": 48.00, "price_cents": 4800, "description": "Prime, classic steakhouse cut", "allergens": [], "tags": ["popular"], "prep_area": "kitchen", "prep_time_minutes": 20, "is_active": True, "created_at": now},
        {"id": "item-dr-10", "venue_id": "venue-don-royale", "category_id": "cat-dr-steaks", "menu_id": "menu-dr-main", "name": "Porterhouse 24oz", "price": 78.00, "price_cents": 7800, "description": "Prime, for two, filet + strip", "allergens": [], "tags": ["signature"], "prep_area": "kitchen", "prep_time_minutes": 28, "is_active": True, "created_at": now},
        {"id": "item-dr-11", "venue_id": "venue-don-royale", "category_id": "cat-dr-steaks", "menu_id": "menu-dr-main", "name": "Tomahawk 32oz", "price": 95.00, "price_cents": 9500, "description": "Prime, long-bone ribeye, showstopper", "allergens": [], "tags": ["luxury"], "prep_area": "kitchen", "prep_time_minutes": 30, "is_active": True, "created_at": now},
        {"id": "item-dr-12", "venue_id": "venue-don-royale", "category_id": "cat-dr-steaks", "menu_id": "menu-dr-main", "name": "Wagyu Striploin", "price": 120.00, "price_cents": 12000, "description": "A5 Japanese, 6oz, ultimate luxury", "allergens": [], "tags": ["luxury"], "prep_area": "kitchen", "prep_time_minutes": 15, "is_active": True, "created_at": now},
        
        # Sides
        {"id": "item-dr-13", "venue_id": "venue-don-royale", "category_id": "cat-dr-sides", "menu_id": "menu-dr-main", "name": "Truffle Fries", "price": 14.00, "price_cents": 1400, "description": "Parmesan, truffle oil, herbs", "allergens": ["dairy"], "tags": ["popular"], "prep_area": "kitchen", "prep_time_minutes": 8, "is_active": True, "created_at": now},
        {"id": "item-dr-14", "venue_id": "venue-don-royale", "category_id": "cat-dr-sides", "menu_id": "menu-dr-main", "name": "Creamed Spinach", "price": 12.00, "price_cents": 1200, "description": "Classic steakhouse style", "allergens": ["dairy"], "tags": [], "prep_area": "kitchen", "prep_time_minutes": 6, "is_active": True, "created_at": now},
        {"id": "item-dr-15", "venue_id": "venue-don-royale", "category_id": "cat-dr-sides", "menu_id": "menu-dr-main", "name": "Baked Potato", "price": 10.00, "price_cents": 1000, "description": "Loaded with butter, sour cream, chives", "allergens": ["dairy"], "tags": [], "prep_area": "kitchen", "prep_time_minutes": 5, "is_active": True, "created_at": now},
        {"id": "item-dr-16", "venue_id": "venue-don-royale", "category_id": "cat-dr-sides", "menu_id": "menu-dr-main", "name": "Grilled Asparagus", "price": 12.00, "price_cents": 1200, "description": "Hollandaise, lemon", "allergens": ["eggs", "dairy"], "tags": [], "prep_area": "kitchen", "prep_time_minutes": 6, "is_active": True, "created_at": now},
        {"id": "item-dr-17", "venue_id": "venue-don-royale", "category_id": "cat-dr-sides", "menu_id": "menu-dr-main", "name": "Mac & Cheese", "price": 14.00, "price_cents": 1400, "description": "Truffle, three cheese blend", "allergens": ["dairy", "gluten"], "tags": ["popular"], "prep_area": "kitchen", "prep_time_minutes": 5, "is_active": True, "created_at": now},
        {"id": "item-dr-18", "venue_id": "venue-don-royale", "category_id": "cat-dr-sides", "menu_id": "menu-dr-main", "name": "Mushroom Medley", "price": 14.00, "price_cents": 1400, "description": "Wild mushrooms, garlic butter, thyme", "allergens": ["dairy"], "tags": [], "prep_area": "kitchen", "prep_time_minutes": 8, "is_active": True, "created_at": now},
        
        # Desserts
        {"id": "item-dr-19", "venue_id": "venue-don-royale", "category_id": "cat-dr-desserts", "menu_id": "menu-dr-main", "name": "NY Cheesecake", "price": 14.00, "price_cents": 1400, "description": "Classic, strawberry compote", "allergens": ["dairy", "eggs", "gluten"], "tags": ["popular"], "prep_area": "kitchen", "prep_time_minutes": 5, "is_active": True, "created_at": now},
        {"id": "item-dr-20", "venue_id": "venue-don-royale", "category_id": "cat-dr-desserts", "menu_id": "menu-dr-main", "name": "Chocolate Lava Cake", "price": 14.00, "price_cents": 1400, "description": "Warm center, vanilla ice cream", "allergens": ["dairy", "eggs", "gluten"], "tags": ["popular"], "prep_area": "kitchen", "prep_time_minutes": 12, "is_active": True, "created_at": now},
        {"id": "item-dr-21", "venue_id": "venue-don-royale", "category_id": "cat-dr-desserts", "menu_id": "menu-dr-main", "name": "Crème Brûlée", "price": 12.00, "price_cents": 1200, "description": "Classic vanilla, caramelized", "allergens": ["dairy", "eggs"], "tags": [], "prep_area": "kitchen", "prep_time_minutes": 5, "is_active": True, "created_at": now},
        {"id": "item-dr-22", "venue_id": "venue-don-royale", "category_id": "cat-dr-desserts", "menu_id": "menu-dr-main", "name": "Apple Tart", "price": 13.00, "price_cents": 1300, "description": "Warm, caramel sauce, ice cream", "allergens": ["dairy", "gluten", "nuts"], "tags": [], "prep_area": "kitchen", "prep_time_minutes": 8, "is_active": True, "created_at": now},
        {"id": "item-dr-23", "venue_id": "venue-don-royale", "category_id": "cat-dr-desserts", "menu_id": "menu-dr-main", "name": "Ice Cream Selection", "price": 10.00, "price_cents": 1000, "description": "3 scoops, chef's selection", "allergens": ["dairy"], "tags": [], "prep_area": "kitchen", "prep_time_minutes": 3, "is_active": True, "created_at": now},
        {"id": "item-dr-24", "venue_id": "venue-don-royale", "category_id": "cat-dr-desserts", "menu_id": "menu-dr-main", "name": "Affogato", "price": 10.00, "price_cents": 1000, "description": "Espresso, vanilla gelato", "allergens": ["dairy"], "tags": [], "prep_area": "kitchen", "prep_time_minutes": 3, "is_active": True, "created_at": now},
        
        # Beverages
        {"id": "item-dr-25", "venue_id": "venue-don-royale", "category_id": "cat-dr-drinks", "menu_id": "menu-dr-main", "name": "Old Fashioned", "price": 16.00, "price_cents": 1600, "description": "Bourbon, bitters, orange", "allergens": [], "tags": ["popular"], "prep_area": "bar", "prep_time_minutes": 3, "is_active": True, "created_at": now},
        {"id": "item-dr-26", "venue_id": "venue-don-royale", "category_id": "cat-dr-drinks", "menu_id": "menu-dr-main", "name": "Manhattan", "price": 16.00, "price_cents": 1600, "description": "Rye, sweet vermouth, bitters", "allergens": [], "tags": [], "prep_area": "bar", "prep_time_minutes": 3, "is_active": True, "created_at": now},
        {"id": "item-dr-27", "venue_id": "venue-don-royale", "category_id": "cat-dr-drinks", "menu_id": "menu-dr-main", "name": "Napa Valley Cabernet", "price": 14.00, "price_cents": 1400, "description": "Glass, full-bodied red", "allergens": [], "tags": ["popular"], "prep_area": "bar", "prep_time_minutes": 1, "is_active": True, "created_at": now},
        {"id": "item-dr-28", "venue_id": "venue-don-royale", "category_id": "cat-dr-drinks", "menu_id": "menu-dr-main", "name": "Craft Beer", "price": 9.00, "price_cents": 900, "description": "Selection of local craft beers", "allergens": ["gluten"], "tags": [], "prep_area": "bar", "prep_time_minutes": 1, "is_active": True, "created_at": now},
        {"id": "item-dr-29", "venue_id": "venue-don-royale", "category_id": "cat-dr-drinks", "menu_id": "menu-dr-main", "name": "Espresso", "price": 4.00, "price_cents": 400, "description": "Double shot", "allergens": [], "tags": [], "prep_area": "bar", "prep_time_minutes": 2, "is_active": True, "created_at": now},
        {"id": "item-dr-30", "venue_id": "venue-don-royale", "category_id": "cat-dr-drinks", "menu_id": "menu-dr-main", "name": "Still Water", "price": 5.00, "price_cents": 500, "description": "Acqua Panna 750ml", "allergens": [], "tags": [], "prep_area": "bar", "prep_time_minutes": 1, "is_active": True, "created_at": now},
        
        # ===== SOLE BY TARRAGON =====
        # Starters
        {"id": "item-st-1", "venue_id": "venue-sole-tarragon", "category_id": "cat-st-starters", "menu_id": "menu-st-main", "name": "Calamari Fritti", "price": 18.00, "price_cents": 1800, "description": "Crispy fried squid, aioli, lemon", "allergens": ["shellfish", "gluten", "eggs"], "tags": ["popular"], "prep_area": "kitchen", "prep_time_minutes": 10, "is_active": True, "created_at": now},
        {"id": "item-st-2", "venue_id": "venue-sole-tarragon", "category_id": "cat-st-starters", "menu_id": "menu-st-main", "name": "Bruschetta Trio", "price": 14.00, "price_cents": 1400, "description": "Tomato basil, mushroom, ricotta honey", "allergens": ["gluten", "dairy"], "tags": [], "prep_area": "kitchen", "prep_time_minutes": 8, "is_active": True, "created_at": now},
        {"id": "item-st-3", "venue_id": "venue-sole-tarragon", "category_id": "cat-st-starters", "menu_id": "menu-st-main", "name": "Antipasto Platter", "price": 28.00, "price_cents": 2800, "description": "Prosciutto, salami, cheeses, olives, grilled vegetables", "allergens": ["dairy"], "tags": ["sharing"], "prep_area": "kitchen", "prep_time_minutes": 10, "is_active": True, "created_at": now},
        {"id": "item-st-4", "venue_id": "venue-sole-tarragon", "category_id": "cat-st-starters", "menu_id": "menu-st-main", "name": "Burrata", "price": 22.00, "price_cents": 2200, "description": "Fresh burrata, roasted tomatoes, basil pesto", "allergens": ["dairy", "nuts"], "tags": ["vegetarian"], "prep_area": "kitchen", "prep_time_minutes": 6, "is_active": True, "created_at": now},
        {"id": "item-st-5", "venue_id": "venue-sole-tarragon", "category_id": "cat-st-starters", "menu_id": "menu-st-main", "name": "Octopus Carpaccio", "price": 24.00, "price_cents": 2400, "description": "Thinly sliced, olive oil, capers, lemon", "allergens": ["shellfish"], "tags": ["signature"], "prep_area": "kitchen", "prep_time_minutes": 8, "is_active": True, "created_at": now},
        {"id": "item-st-6", "venue_id": "venue-sole-tarragon", "category_id": "cat-st-starters", "menu_id": "menu-st-main", "name": "Minestrone", "price": 12.00, "price_cents": 1200, "description": "Classic Italian vegetable soup, crusty bread", "allergens": ["gluten"], "tags": ["vegetarian"], "prep_area": "kitchen", "prep_time_minutes": 5, "is_active": True, "created_at": now},
        
        # Pasta & Risotto
        {"id": "item-st-7", "venue_id": "venue-sole-tarragon", "category_id": "cat-st-pasta", "menu_id": "menu-st-main", "name": "Spaghetti alle Vongole", "price": 26.00, "price_cents": 2600, "description": "Fresh clams, white wine, garlic, chili", "allergens": ["shellfish", "gluten"], "tags": ["signature"], "prep_area": "kitchen", "prep_time_minutes": 15, "is_active": True, "created_at": now},
        {"id": "item-st-8", "venue_id": "venue-sole-tarragon", "category_id": "cat-st-pasta", "menu_id": "menu-st-main", "name": "Lobster Linguine", "price": 38.00, "price_cents": 3800, "description": "Half lobster, cherry tomatoes, bisque sauce", "allergens": ["shellfish", "gluten"], "tags": ["luxury"], "prep_area": "kitchen", "prep_time_minutes": 18, "is_active": True, "created_at": now},
        {"id": "item-st-9", "venue_id": "venue-sole-tarragon", "category_id": "cat-st-pasta", "menu_id": "menu-st-main", "name": "Seafood Risotto", "price": 32.00, "price_cents": 3200, "description": "Mixed seafood, saffron, white wine", "allergens": ["shellfish", "dairy"], "tags": ["popular"], "prep_area": "kitchen", "prep_time_minutes": 20, "is_active": True, "created_at": now},
        {"id": "item-st-10", "venue_id": "venue-sole-tarragon", "category_id": "cat-st-pasta", "menu_id": "menu-st-main", "name": "Pappardelle Bolognese", "price": 22.00, "price_cents": 2200, "description": "Slow-cooked ragù, parmesan", "allergens": ["gluten", "dairy"], "tags": [], "prep_area": "kitchen", "prep_time_minutes": 12, "is_active": True, "created_at": now},
        {"id": "item-st-11", "venue_id": "venue-sole-tarragon", "category_id": "cat-st-pasta", "menu_id": "menu-st-main", "name": "Truffle Tagliatelle", "price": 28.00, "price_cents": 2800, "description": "Fresh egg pasta, black truffle, parmesan cream", "allergens": ["gluten", "dairy", "eggs"], "tags": ["vegetarian"], "prep_area": "kitchen", "prep_time_minutes": 14, "is_active": True, "created_at": now},
        {"id": "item-st-12", "venue_id": "venue-sole-tarragon", "category_id": "cat-st-pasta", "menu_id": "menu-st-main", "name": "Cacio e Pepe", "price": 20.00, "price_cents": 2000, "description": "Classic Roman, pecorino, black pepper", "allergens": ["gluten", "dairy"], "tags": ["vegetarian"], "prep_area": "kitchen", "prep_time_minutes": 10, "is_active": True, "created_at": now},
        
        # Seafood
        {"id": "item-st-13", "venue_id": "venue-sole-tarragon", "category_id": "cat-st-seafood", "menu_id": "menu-st-main", "name": "Grilled Sea Bass", "price": 38.00, "price_cents": 3800, "description": "Whole fish, lemon, capers, olive oil", "allergens": ["fish"], "tags": ["signature"], "prep_area": "kitchen", "prep_time_minutes": 22, "is_active": True, "created_at": now},
        {"id": "item-st-14", "venue_id": "venue-sole-tarragon", "category_id": "cat-st-seafood", "menu_id": "menu-st-main", "name": "Pan-Seared Salmon", "price": 32.00, "price_cents": 3200, "description": "Norwegian salmon, asparagus, dill cream", "allergens": ["fish", "dairy"], "tags": ["popular"], "prep_area": "kitchen", "prep_time_minutes": 16, "is_active": True, "created_at": now},
        {"id": "item-st-15", "venue_id": "venue-sole-tarragon", "category_id": "cat-st-seafood", "menu_id": "menu-st-main", "name": "Mixed Seafood Grill", "price": 48.00, "price_cents": 4800, "description": "Prawns, calamari, fish of the day, garlic butter", "allergens": ["shellfish", "fish", "dairy"], "tags": ["sharing"], "prep_area": "kitchen", "prep_time_minutes": 25, "is_active": True, "created_at": now},
        {"id": "item-st-16", "venue_id": "venue-sole-tarragon", "category_id": "cat-st-seafood", "menu_id": "menu-st-main", "name": "Grilled Prawns", "price": 36.00, "price_cents": 3600, "description": "Tiger prawns, garlic, chili, lemon", "allergens": ["shellfish"], "tags": [], "prep_area": "kitchen", "prep_time_minutes": 12, "is_active": True, "created_at": now},
        {"id": "item-st-17", "venue_id": "venue-sole-tarragon", "category_id": "cat-st-seafood", "menu_id": "menu-st-main", "name": "Catch of the Day", "price": 0.00, "price_cents": 0, "description": "Market price, ask your server", "allergens": ["fish"], "tags": [], "prep_area": "kitchen", "prep_time_minutes": 20, "is_active": True, "created_at": now},
        {"id": "item-st-18", "venue_id": "venue-sole-tarragon", "category_id": "cat-st-seafood", "menu_id": "menu-st-main", "name": "Fritto Misto", "price": 28.00, "price_cents": 2800, "description": "Mixed fried seafood, aioli, lemon", "allergens": ["shellfish", "fish", "gluten", "eggs"], "tags": ["popular"], "prep_area": "kitchen", "prep_time_minutes": 15, "is_active": True, "created_at": now},
        
        # Desserts
        {"id": "item-st-19", "venue_id": "venue-sole-tarragon", "category_id": "cat-st-desserts", "menu_id": "menu-st-main", "name": "Tiramisu", "price": 12.00, "price_cents": 1200, "description": "Classic recipe, mascarpone, espresso, cocoa", "allergens": ["dairy", "eggs", "gluten"], "tags": ["popular"], "prep_area": "kitchen", "prep_time_minutes": 5, "is_active": True, "created_at": now},
        {"id": "item-st-20", "venue_id": "venue-sole-tarragon", "category_id": "cat-st-desserts", "menu_id": "menu-st-main", "name": "Panna Cotta", "price": 10.00, "price_cents": 1000, "description": "Vanilla, mixed berry compote", "allergens": ["dairy"], "tags": [], "prep_area": "kitchen", "prep_time_minutes": 5, "is_active": True, "created_at": now},
        {"id": "item-st-21", "venue_id": "venue-sole-tarragon", "category_id": "cat-st-desserts", "menu_id": "menu-st-main", "name": "Cannoli Siciliani", "price": 11.00, "price_cents": 1100, "description": "Crispy shells, ricotta cream, pistachios", "allergens": ["dairy", "gluten", "nuts"], "tags": ["signature"], "prep_area": "kitchen", "prep_time_minutes": 5, "is_active": True, "created_at": now},
        {"id": "item-st-22", "venue_id": "venue-sole-tarragon", "category_id": "cat-st-desserts", "menu_id": "menu-st-main", "name": "Limoncello Sorbet", "price": 8.00, "price_cents": 800, "description": "Refreshing lemon sorbet, mint", "allergens": [], "tags": [], "prep_area": "kitchen", "prep_time_minutes": 3, "is_active": True, "created_at": now},
        {"id": "item-st-23", "venue_id": "venue-sole-tarragon", "category_id": "cat-st-desserts", "menu_id": "menu-st-main", "name": "Affogato", "price": 9.00, "price_cents": 900, "description": "Vanilla gelato, espresso shot", "allergens": ["dairy"], "tags": [], "prep_area": "kitchen", "prep_time_minutes": 3, "is_active": True, "created_at": now},
        {"id": "item-st-24", "venue_id": "venue-sole-tarragon", "category_id": "cat-st-desserts", "menu_id": "menu-st-main", "name": "Gelato Selection", "price": 10.00, "price_cents": 1000, "description": "3 scoops, ask for today's flavors", "allergens": ["dairy"], "tags": [], "prep_area": "kitchen", "prep_time_minutes": 3, "is_active": True, "created_at": now},
        
        # Beverages
        {"id": "item-st-25", "venue_id": "venue-sole-tarragon", "category_id": "cat-st-drinks", "menu_id": "menu-st-main", "name": "Aperol Spritz", "price": 12.00, "price_cents": 1200, "description": "Aperol, prosecco, soda, orange", "allergens": [], "tags": ["popular"], "prep_area": "bar", "prep_time_minutes": 2, "is_active": True, "created_at": now},
        {"id": "item-st-26", "venue_id": "venue-sole-tarragon", "category_id": "cat-st-drinks", "menu_id": "menu-st-main", "name": "Negroni", "price": 14.00, "price_cents": 1400, "description": "Gin, Campari, sweet vermouth", "allergens": [], "tags": [], "prep_area": "bar", "prep_time_minutes": 2, "is_active": True, "created_at": now},
        {"id": "item-st-27", "venue_id": "venue-sole-tarragon", "category_id": "cat-st-drinks", "menu_id": "menu-st-main", "name": "Prosecco", "price": 9.00, "price_cents": 900, "description": "Glass, Italian sparkling", "allergens": [], "tags": [], "prep_area": "bar", "prep_time_minutes": 1, "is_active": True, "created_at": now},
        {"id": "item-st-28", "venue_id": "venue-sole-tarragon", "category_id": "cat-st-drinks", "menu_id": "menu-st-main", "name": "Pinot Grigio", "price": 9.00, "price_cents": 900, "description": "Glass, crisp Italian white", "allergens": [], "tags": [], "prep_area": "bar", "prep_time_minutes": 1, "is_active": True, "created_at": now},
        {"id": "item-st-29", "venue_id": "venue-sole-tarragon", "category_id": "cat-st-drinks", "menu_id": "menu-st-main", "name": "Limoncello", "price": 8.00, "price_cents": 800, "description": "Chilled, traditional digestif", "allergens": [], "tags": [], "prep_area": "bar", "prep_time_minutes": 1, "is_active": True, "created_at": now},
        {"id": "item-st-30", "venue_id": "venue-sole-tarragon", "category_id": "cat-st-drinks", "menu_id": "menu-st-main", "name": "San Pellegrino", "price": 5.00, "price_cents": 500, "description": "Sparkling water 750ml", "allergens": [], "tags": [], "prep_area": "bar", "prep_time_minutes": 1, "is_active": True, "created_at": now},
    ]
    await db.menu_items.insert_many(menu_items)
    print(f"[OK] Created {len(menu_items)} menu items")
    
    # ==================== INVENTORY ITEMS ====================
    inventory_items = master_data.get('inventory', [])
    for i in inventory_items:
        i['created_at'] = now
        # Map camelCase to snake_case
        if 'venueId' in i: i['venue_id'] = i.pop('venueId')
        if 'priceCents' in i: i['price_cents'] = i.pop('priceCents')
        if 'minStock' in i: i['min_stock'] = i.pop('minStock')
        if 'currentStock' in i: i['current_stock'] = i.pop('currentStock')
        # Handle 'stock' alias from seed-master
        if 'stock' in i: i['current_stock'] = i.pop('stock')

    await db.inventory_items.insert_many(inventory_items)
    print(f"[OK] Created {len(inventory_items)} inventory items from Master Seed")
    
    print("\n[DONE] Database seeding completed!")
    print("\nTest Credentials:")
    print("   Caviar & Bull (venue-caviar-bull):")
    print("      Owner PIN: 1234 | Manager PIN: 2345 | Staff PIN: 1111")
    print("   Don Royale (venue-don-royale):")
    print("      Owner PIN: 1234 | Manager PIN: 2345 | Staff PIN: 1111")
    print("   Sole by Tarragon (venue-sole-tarragon):")
    print("      Owner PIN: 1234 | Manager PIN: 2345 | Staff PIN: 1111")

if __name__ == "__main__":
    asyncio.run(seed_database())
