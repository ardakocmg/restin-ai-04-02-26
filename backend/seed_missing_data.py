"""
Seed: CRM Guests, Inventory Items, Suppliers
Fills empty collections with realistic restaurant data.
"""
import asyncio
import os
from datetime import datetime, timezone, timedelta
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get("DB_NAME", "restinai")]

VENUE = "venue-caviar-bull"


async def seed_crm_guests():
    """Seed CRM guest profiles."""
    print("Seeding CRM guests...")

    guests = [
        {
            "id": "guest-maria-grech",
            "venue_id": VENUE,
            "name": "Maria Grech",
            "email": "maria.grech@gmail.com",
            "phone": "+356 7712 3456",
            "tags": ["VIP", "Wine Enthusiast"],
            "allergens": [],
            "preferences": "Prefers table near the window, loves Barolo",
            "visit_count": 24,
            "total_spend": 4850.00,
            "total_spent_cents": 485000,
            "avg_spend": 202.08,
            "churn_risk": "low",
            "last_visit": (datetime.now(timezone.utc) - timedelta(days=4)).isoformat(),
            "first_visit": (datetime.now(timezone.utc) - timedelta(days=365)).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat(),
        },
        {
            "id": "guest-james-borg",
            "venue_id": VENUE,
            "name": "James Borg",
            "email": "james.borg@yahoo.com",
            "phone": "+356 9934 5678",
            "tags": ["Regular", "Business Lunches"],
            "allergens": ["gluten"],
            "preferences": "Gluten-free options, private dining preferred",
            "visit_count": 18,
            "total_spend": 6200.00,
            "total_spent_cents": 620000,
            "avg_spend": 344.44,
            "churn_risk": "low",
            "last_visit": (datetime.now(timezone.utc) - timedelta(days=2)).isoformat(),
            "first_visit": (datetime.now(timezone.utc) - timedelta(days=200)).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat(),
        },
        {
            "id": "guest-sophie-attard",
            "venue_id": VENUE,
            "name": "Sophie Attard",
            "email": "sophie.attard@outlook.com",
            "phone": "+356 7900 1234",
            "tags": ["Birthday", "Seafood Lover"],
            "allergens": ["nuts"],
            "preferences": "Celebrates birthday every March, loves lobster",
            "visit_count": 7,
            "total_spend": 1120.00,
            "total_spent_cents": 112000,
            "avg_spend": 160.00,
            "churn_risk": "medium",
            "last_visit": (datetime.now(timezone.utc) - timedelta(days=21)).isoformat(),
            "first_visit": (datetime.now(timezone.utc) - timedelta(days=150)).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat(),
        },
        {
            "id": "guest-thomas-zammit",
            "venue_id": VENUE,
            "name": "Thomas Zammit",
            "email": "thomas.z@gmail.com",
            "phone": "+356 7945 6789",
            "tags": ["Corporate", "Large Party"],
            "allergens": [],
            "preferences": "Books for 8-12 people, needs AV equipment",
            "visit_count": 3,
            "total_spend": 5400.00,
            "total_spent_cents": 540000,
            "avg_spend": 1800.00,
            "churn_risk": "high",
            "last_visit": (datetime.now(timezone.utc) - timedelta(days=45)).isoformat(),
            "first_visit": (datetime.now(timezone.utc) - timedelta(days=90)).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat(),
        },
        {
            "id": "guest-anna-camilleri",
            "venue_id": VENUE,
            "name": "Anna Camilleri",
            "email": "anna.c@icloud.com",
            "phone": "+356 9912 0000",
            "tags": ["Vegetarian", "Dessert Fan"],
            "allergens": ["dairy"],
            "preferences": "Strictly vegetarian, adores tiramisu",
            "visit_count": 11,
            "total_spend": 1650.00,
            "total_spent_cents": 165000,
            "avg_spend": 150.00,
            "churn_risk": "low",
            "last_visit": (datetime.now(timezone.utc) - timedelta(days=6)).isoformat(),
            "first_visit": (datetime.now(timezone.utc) - timedelta(days=180)).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat(),
        },
    ]

    await db.guests.delete_many({"venue_id": VENUE})
    await db.guests.insert_many(guests)
    print(f"  ✓ {len(guests)} CRM guests seeded")


async def seed_inventory_items():
    """Seed inventory items (SKUs)."""
    print("Seeding inventory items...")

    items = [
        {"sku_id": "SKU-OLIVE-OIL-001", "venue_id": VENUE, "name": "Extra Virgin Olive Oil",
         "category": "Oils & Vinegars", "unit": "L", "current_stock": 45.0, "par_level": 20.0,
         "cost_per_unit": 8.50, "supplier_id": "sup-mediterranean-foods", "storage_type": "dry",
         "allergens": [], "created_at": datetime.now(timezone.utc).isoformat()},
        {"sku_id": "SKU-SALMON-001", "venue_id": VENUE, "name": "Atlantic Salmon Fillet",
         "category": "Seafood", "unit": "kg", "current_stock": 12.5, "par_level": 8.0,
         "cost_per_unit": 22.00, "supplier_id": "sup-fresh-catch", "storage_type": "refrigerated",
         "allergens": ["fish"], "created_at": datetime.now(timezone.utc).isoformat()},
        {"sku_id": "SKU-FLOUR-001", "venue_id": VENUE, "name": "Italian 00 Flour",
         "category": "Dry Goods", "unit": "kg", "current_stock": 80.0, "par_level": 30.0,
         "cost_per_unit": 1.80, "supplier_id": "sup-mediterranean-foods", "storage_type": "dry",
         "allergens": ["gluten"], "created_at": datetime.now(timezone.utc).isoformat()},
        {"sku_id": "SKU-TOMATO-001", "venue_id": VENUE, "name": "San Marzano Tomatoes (Tin)",
         "category": "Canned Goods", "unit": "tin", "current_stock": 120, "par_level": 50,
         "cost_per_unit": 2.40, "supplier_id": "sup-mediterranean-foods", "storage_type": "dry",
         "allergens": [], "created_at": datetime.now(timezone.utc).isoformat()},
        {"sku_id": "SKU-BEEF-TENDER-001", "venue_id": VENUE, "name": "Beef Tenderloin",
         "category": "Meat", "unit": "kg", "current_stock": 8.0, "par_level": 5.0,
         "cost_per_unit": 38.00, "supplier_id": "sup-premium-meats", "storage_type": "refrigerated",
         "allergens": [], "created_at": datetime.now(timezone.utc).isoformat()},
        {"sku_id": "SKU-PARMESAN-001", "venue_id": VENUE, "name": "Parmigiano Reggiano 24M",
         "category": "Dairy", "unit": "kg", "current_stock": 6.0, "par_level": 3.0,
         "cost_per_unit": 28.00, "supplier_id": "sup-mediterranean-foods", "storage_type": "refrigerated",
         "allergens": ["dairy"], "created_at": datetime.now(timezone.utc).isoformat()},
        {"sku_id": "SKU-WINE-BAROLO-001", "venue_id": VENUE, "name": "Barolo DOCG 2019",
         "category": "Wine", "unit": "btl", "current_stock": 24, "par_level": 12,
         "cost_per_unit": 32.00, "supplier_id": "sup-wine-direct", "storage_type": "cellar",
         "allergens": ["sulphites"], "created_at": datetime.now(timezone.utc).isoformat()},
        {"sku_id": "SKU-BUTTER-001", "venue_id": VENUE, "name": "French Unsalted Butter",
         "category": "Dairy", "unit": "kg", "current_stock": 15.0, "par_level": 8.0,
         "cost_per_unit": 9.50, "supplier_id": "sup-mediterranean-foods", "storage_type": "refrigerated",
         "allergens": ["dairy"], "created_at": datetime.now(timezone.utc).isoformat()},
        {"sku_id": "SKU-TRUFFLE-001", "venue_id": VENUE, "name": "Black Truffle (Fresh)",
         "category": "Premium", "unit": "g", "current_stock": 200, "par_level": 100,
         "cost_per_unit": 4.50, "supplier_id": "sup-premium-meats", "storage_type": "refrigerated",
         "allergens": [], "created_at": datetime.now(timezone.utc).isoformat()},
        {"sku_id": "SKU-ESPRESSO-001", "venue_id": VENUE, "name": "Espresso Blend Beans",
         "category": "Beverages", "unit": "kg", "current_stock": 20.0, "par_level": 10.0,
         "cost_per_unit": 18.00, "supplier_id": "sup-caffee-malta", "storage_type": "dry",
         "allergens": [], "created_at": datetime.now(timezone.utc).isoformat()},
    ]

    await db.inventory_items.delete_many({"venue_id": VENUE})
    await db.inventory_items.insert_many(items)
    print(f"  ✓ {len(items)} inventory items seeded")


async def seed_suppliers():
    """Seed supplier records."""
    print("Seeding suppliers...")

    suppliers = [
        {
            "id": "sup-mediterranean-foods",
            "venue_id": VENUE,
            "name": "Mediterranean Foods Ltd",
            "contact_person": "Giuseppe Rossi",
            "email": "orders@medfoodsmt.com",
            "phone": "+356 2123 4567",
            "categories": ["Dry Goods", "Oils & Vinegars", "Dairy", "Canned Goods"],
            "payment_terms": "Net 30",
            "min_order_value": 150.00,
            "delivery_days": ["Monday", "Wednesday", "Friday"],
            "rating": 4.8,
            "status": "active",
            "created_at": datetime.now(timezone.utc).isoformat(),
        },
        {
            "id": "sup-fresh-catch",
            "venue_id": VENUE,
            "name": "Fresh Catch Fisheries",
            "contact_person": "Mario Vella",
            "email": "sales@freshcatch.mt",
            "phone": "+356 2134 5678",
            "categories": ["Seafood"],
            "payment_terms": "Net 14",
            "min_order_value": 200.00,
            "delivery_days": ["Tuesday", "Thursday", "Saturday"],
            "rating": 4.5,
            "status": "active",
            "created_at": datetime.now(timezone.utc).isoformat(),
        },
        {
            "id": "sup-premium-meats",
            "venue_id": VENUE,
            "name": "Premium Meats & Delicatessen",
            "contact_person": "Paul Galea",
            "email": "info@premiummeats.mt",
            "phone": "+356 2156 7890",
            "categories": ["Meat", "Premium"],
            "payment_terms": "Net 21",
            "min_order_value": 300.00,
            "delivery_days": ["Monday", "Thursday"],
            "rating": 4.9,
            "status": "active",
            "created_at": datetime.now(timezone.utc).isoformat(),
        },
        {
            "id": "sup-wine-direct",
            "venue_id": VENUE,
            "name": "Wine Direct Malta",
            "contact_person": "Claudia Abela",
            "email": "orders@winedirect.mt",
            "phone": "+356 2145 6789",
            "categories": ["Wine", "Spirits", "Beverages"],
            "payment_terms": "Net 45",
            "min_order_value": 500.00,
            "delivery_days": ["Wednesday"],
            "rating": 4.7,
            "status": "active",
            "created_at": datetime.now(timezone.utc).isoformat(),
        },
        {
            "id": "sup-caffee-malta",
            "venue_id": VENUE,
            "name": "Caffè Malta Roasters",
            "contact_person": "Anton Micallef",
            "email": "b2b@caffemalta.com",
            "phone": "+356 2167 8901",
            "categories": ["Beverages", "Coffee"],
            "payment_terms": "Net 30",
            "min_order_value": 100.00,
            "delivery_days": ["Tuesday", "Friday"],
            "rating": 4.6,
            "status": "active",
            "created_at": datetime.now(timezone.utc).isoformat(),
        },
    ]

    # Write to both collections for compatibility
    for s in suppliers:
        s["is_active"] = True
    await db.suppliers.delete_many({"venue_id": VENUE})
    await db.suppliers.insert_many(suppliers)
    # Also write a copy to inventory_suppliers for any code referencing that
    suppliers_copy = [{k: v for k, v in s.items() if k != "_id"} for s in suppliers]
    await db.inventory_suppliers.delete_many({"venue_id": VENUE})
    await db.inventory_suppliers.insert_many(suppliers_copy)
    print(f"  ✓ {len(suppliers)} suppliers seeded (both collections)")


async def main():
    print("=" * 50)
    print("  RESTIN.AI — Data Seed (CRM + Inventory)")
    print("=" * 50)

    await seed_crm_guests()
    await seed_inventory_items()
    await seed_suppliers()

    print()
    print("✅ All seed data inserted successfully!")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
