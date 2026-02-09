"""
Seed script for sample operational data.
Creates orders, KDS tickets, reservations, and guests
so the dashboard shows real numbers.

Usage: python scripts/seed_operations.py
"""
import asyncio
import os
import random
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.environ.get("MONGO_URL", "mongodb+srv://ardakoc:TSDfkm8788.@main-cluster.kznqr.mongodb.net/?retryWrites=true&w=majority&appName=main-cluster")
DB_NAME = os.environ.get("DB_NAME", "restin_v2")

VENUES = ["venue-caviar-bull", "venue-don-royale", "venue-sole-tarragon"]

STATUSES = ["open", "in_progress", "completed", "closed", "paid"]
TABLE_NAMES = [f"T{i}" for i in range(1, 21)]
GUEST_NAMES = [
    "Marco Borg", "Sarah Camilleri", "John Vella", "Maria Grech",
    "Paul Farrugia", "Lisa Zammit", "David Attard", "Anna Debono",
    "James Azzopardi", "Elena Micallef", "Thomas Spiteri", "Rita Galea",
    "Mark Calleja", "Sophie Pace", "Daniel Mifsud", "Claire Schembri",
    "Alex Bonnici", "Nina Cassar", "Robert Fenech", "Julia Abela"
]

MENU_ITEMS_CB = [
    ("Oscietra Caviar", 9500), ("Beef Tartare", 2800), ("Wagyu Ribeye", 8500),
    ("Dover Sole", 7200), ("Lobster Thermidor", 6800), ("Grand Marnier Soufflé", 1800),
    ("Espresso Martini", 1600), ("Dom Pérignon 2012", 38000),
]

MENU_ITEMS_DR = [
    ("Filet Mignon 8oz", 5200), ("Ribeye 14oz", 5800), ("NY Strip 12oz", 4800),
    ("Tomahawk 32oz", 9500), ("Truffle Fries", 1400), ("Old Fashioned", 1600),
]

MENU_ITEMS_ST = [
    ("Spaghetti alle Vongole", 2600), ("Lobster Linguine", 3800),
    ("Grilled Sea Bass", 3800), ("Seafood Risotto", 3200),
    ("Aperol Spritz", 1200), ("Tiramisu", 1200),
]


async def seed():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    now = datetime.now(timezone.utc)

    # ---- ORDERS ----
    orders = []
    for day_offset in range(7):
        day = now - timedelta(days=day_offset)
        num_orders = random.randint(15, 40) if day_offset < 3 else random.randint(8, 20)

        for i in range(num_orders):
            venue = random.choice(VENUES)
            items_pool = (
                MENU_ITEMS_CB if venue == "venue-caviar-bull"
                else MENU_ITEMS_DR if venue == "venue-don-royale"
                else MENU_ITEMS_ST
            )
            num_items = random.randint(1, 5)
            selected_items = random.sample(items_pool, min(num_items, len(items_pool)))

            order_items = []
            total_cents = 0
            for item_name, price in selected_items:
                qty = random.randint(1, 3)
                order_items.append({
                    "name": item_name,
                    "price_cents": price,
                    "quantity": qty,
                    "subtotal_cents": price * qty,
                })
                total_cents += price * qty

            status = "completed" if day_offset > 0 else random.choice(STATUSES)
            table = random.choice(TABLE_NAMES)
            hour = random.randint(11, 23)
            minute = random.randint(0, 59)
            order_time = day.replace(hour=hour, minute=minute, second=0, microsecond=0)

            orders.append({
                "id": f"ord-{day.strftime('%m%d')}-{i+1:03d}",
                "venue_id": venue,
                "display_id": f"#{random.randint(100, 999)}",
                "table_name": table,
                "table_id": f"table-{table.lower()}",
                "status": status,
                "items": order_items,
                "total_cents": total_cents,
                "total": round(total_cents / 100, 2),
                "guest_name": random.choice(GUEST_NAMES),
                "guest_count": random.randint(1, 6),
                "payment_method": random.choice(["card", "cash", "split"]),
                "created_at": order_time.isoformat(),
                "updated_at": order_time.isoformat(),
            })

    if orders:
        await db.orders.delete_many({})
        await db.orders.insert_many(orders)
        print(f"✅ Seeded {len(orders)} orders")

    # ---- KDS TICKETS ----
    kds_tickets = []
    for order in orders[:30]:
        for item in order["items"]:
            kds_tickets.append({
                "id": f"kds-{order['id']}-{item['name'][:3].lower()}",
                "order_id": order["id"],
                "venue_id": order["venue_id"],
                "item_name": item["name"],
                "quantity": item["quantity"],
                "station": random.choice(["kitchen", "bar", "grill", "cold"]),
                "status": random.choice(["new", "in_progress", "completed", "served"]),
                "priority": random.choice(["normal", "rush", "vip"]),
                "created_at": order["created_at"],
                "completed_at": order["created_at"] if order["status"] == "completed" else None,
            })

    if kds_tickets:
        await db.kds_tickets.delete_many({})
        await db.kds_tickets.insert_many(kds_tickets)
        print(f"✅ Seeded {len(kds_tickets)} KDS tickets")

    # ---- KDS STATIONS ----
    stations = [
        {"id": "station-kitchen", "name": "Kitchen", "venue_id": "venue-caviar-bull", "type": "kitchen", "status": "active"},
        {"id": "station-bar", "name": "Bar", "venue_id": "venue-caviar-bull", "type": "bar", "status": "active"},
        {"id": "station-grill", "name": "Grill", "venue_id": "venue-don-royale", "type": "kitchen", "status": "active"},
        {"id": "station-cold", "name": "Cold Station", "venue_id": "venue-sole-tarragon", "type": "cold", "status": "active"},
    ]
    await db.kds_stations.delete_many({})
    await db.kds_stations.insert_many(stations)
    print(f"✅ Seeded {len(stations)} KDS stations")

    # ---- RESERVATIONS ----
    reservations = []
    for day_offset in range(-1, 14):
        day = now + timedelta(days=day_offset)
        num_res = random.randint(3, 10)
        for i in range(num_res):
            hour = random.choice([12, 13, 18, 19, 20, 21])
            reservations.append({
                "id": f"res-{day.strftime('%m%d')}-{i+1:02d}",
                "venue_id": random.choice(VENUES),
                "guest_name": random.choice(GUEST_NAMES),
                "guest_count": random.randint(2, 8),
                "date": day.strftime("%Y-%m-%d"),
                "time": f"{hour:02d}:00",
                "status": "confirmed" if day_offset >= 0 else random.choice(["completed", "no_show", "cancelled"]),
                "notes": random.choice(["", "Birthday celebration", "Anniversary", "Business dinner", "Window seat preferred", ""]),
                "phone": f"+356 {random.randint(7900, 7999)} {random.randint(1000, 9999)}",
                "created_at": (now - timedelta(days=random.randint(1, 7))).isoformat(),
            })

    if reservations:
        await db.reservations.delete_many({})
        await db.reservations.insert_many(reservations)
        print(f"✅ Seeded {len(reservations)} reservations")

    # ---- GUESTS (CRM) ----
    guests = []
    for i, name in enumerate(GUEST_NAMES):
        visit_count = random.randint(1, 50)
        total_spent = random.randint(5000, 250000)
        guests.append({
            "id": f"guest-{i+1:03d}",
            "name": name,
            "email": f"{name.lower().replace(' ', '.')}@example.com",
            "phone": f"+356 {random.randint(7900, 7999)} {random.randint(1000, 9999)}",
            "visit_count": visit_count,
            "total_spent_cents": total_spent,
            "average_spend_cents": total_spent // max(visit_count, 1),
            "preferred_venue": random.choice(VENUES),
            "tags": random.sample(["VIP", "Regular", "Birthday", "Allergies", "Wine Lover", "Vegetarian"], random.randint(0, 3)),
            "last_visit": (now - timedelta(days=random.randint(0, 60))).isoformat(),
            "first_visit": (now - timedelta(days=random.randint(90, 365))).isoformat(),
            "churn_risk": random.choice(["low", "medium", "high"]),
            "created_at": (now - timedelta(days=random.randint(90, 365))).isoformat(),
        })

    if guests:
        await db.guests.delete_many({})
        await db.guests.insert_many(guests)
        print(f"✅ Seeded {len(guests)} guest profiles")

    # ---- SUPPLIERS ----
    suppliers = [
        {"id": "sup-seafood-ltd", "name": "Mediterranean Seafood Ltd", "category": "Seafood", "contact": "John Mifsud", "email": "orders@medseafood.mt", "phone": "+356 2123 4567", "rating": 4.8, "status": "active"},
        {"id": "sup-meat-masters", "name": "Meat Masters Malta", "category": "Meat", "contact": "Paul Borg", "email": "supply@meatmasters.mt", "phone": "+356 2134 5678", "rating": 4.5, "status": "active"},
        {"id": "sup-specialty-foods", "name": "Specialty Foods Import", "category": "Pantry", "contact": "Maria Camilleri", "email": "info@specialtyfoods.mt", "phone": "+356 2145 6789", "rating": 4.7, "status": "active"},
        {"id": "sup-wine-cellar", "name": "Grand Wine Cellar", "category": "Beverages", "contact": "David Vella", "email": "orders@grandwine.mt", "phone": "+356 2156 7890", "rating": 4.9, "status": "active"},
        {"id": "sup-dairy-fresh", "name": "Dairy Fresh Co", "category": "Dairy", "contact": "Lisa Grech", "email": "supply@dairyfresh.mt", "phone": "+356 2167 8901", "rating": 4.3, "status": "active"},
        {"id": "sup-produce-farm", "name": "Golden Farm Produce", "category": "Vegetables", "contact": "Alex Zammit", "email": "orders@goldenfarm.mt", "phone": "+356 2178 9012", "rating": 4.6, "status": "active"},
    ]
    await db.suppliers.delete_many({})
    await db.suppliers.insert_many(suppliers)
    print(f"✅ Seeded {len(suppliers)} suppliers")

    # ---- WASTE LOG ----
    waste_logs = []
    for day_offset in range(14):
        day = now - timedelta(days=day_offset)
        num_waste = random.randint(1, 5)
        for i in range(num_waste):
            waste_logs.append({
                "id": f"waste-{day.strftime('%m%d')}-{i+1:02d}",
                "venue_id": random.choice(VENUES),
                "item_name": random.choice(["Salmon Fillet", "Mixed Greens", "Bread", "Cream", "Chicken Breast", "Tomatoes"]),
                "quantity": round(random.uniform(0.2, 3.0), 1),
                "unit": random.choice(["kg", "pieces", "litres"]),
                "reason": random.choice(["expired", "damaged", "overproduction", "quality", "customer_return"]),
                "cost_cents": random.randint(200, 5000),
                "recorded_by": random.choice(GUEST_NAMES[:5]),
                "created_at": day.isoformat(),
            })

    if waste_logs:
        await db.waste_logs.delete_many({})
        await db.waste_logs.insert_many(waste_logs)
        print(f"✅ Seeded {len(waste_logs)} waste log entries")

    # ---- TABLE STATUS UPDATE ----
    tables = await db.tables.find({}).to_list(length=100)
    if tables:
        for i, table in enumerate(tables):
            status = "occupied" if i % 3 == 0 else "available"
            await db.tables.update_one(
                {"_id": table["_id"]},
                {"$set": {"status": status}}
            )
        print(f"✅ Updated {len(tables)} table statuses")

    client.close()
    print("\n🎉 All operational data seeded successfully!")


if __name__ == "__main__":
    asyncio.run(seed())
