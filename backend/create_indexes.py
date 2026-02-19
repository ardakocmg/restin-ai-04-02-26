"""Create MongoDB indexes for core collections — run once."""
import asyncio
import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()

async def main():
    client = AsyncIOMotorClient(os.getenv("MONGO_URL"))
    db = client.get_default_database()

    print("Creating indexes...")

    # Users — most queried collection
    await db.users.create_index("id", unique=True, name="idx_users_id")
    await db.users.create_index("venue_id", name="idx_users_venue")
    await db.users.create_index("email", sparse=True, name="idx_users_email")
    await db.users.create_index("pin_hash", sparse=True, name="idx_users_pin_hash")
    await db.users.create_index("pin_index", sparse=True, name="idx_users_pin_index")
    print("  [OK] users (5 indexes)")

    # Venues
    await db.venues.create_index("id", unique=True, name="idx_venues_id")
    print("  [OK] venues (1 index)")

    # Orders — compound for listing + sorting
    await db.orders.create_index([("venue_id", 1), ("created_at", -1)], name="idx_orders_venue_date")
    await db.orders.create_index("id", unique=True, sparse=True, name="idx_orders_id")
    print("  [OK] orders (2 indexes)")

    # Audit logs — always queried with venue_id + sorted by timestamp
    await db.audit_logs.create_index([("venue_id", 1), ("timestamp", -1)], name="idx_audit_venue_ts")
    print("  [OK] audit_logs (1 index)")

    # Shifts — queried by user_id for login check
    await db.shifts.create_index([("user_id", 1), ("start_time", 1), ("end_time", 1)], name="idx_shifts_user_time")
    print("  [OK] shifts (1 index)")

    # Login attempts — queried for rate limiting
    await db.login_attempts.create_index([("device_id", 1), ("timestamp", -1)], name="idx_login_device_ts")
    print("  [OK] login_attempts (1 index)")

    # System logs
    await db.logs.create_index([("venue_id", 1), ("ts", -1)], name="idx_logs_venue_ts")
    print("  [OK] logs (1 index)")

    # ─── Performance: Menu & Recipe queries ────────────────────────────
    await db.menu_items.create_index(
        [("venue_id", 1), ("is_active", 1), ("name", 1)],
        name="idx_menu_venue_active_name"
    )
    await db.menu_items.create_index(
        [("venue_id", 1), ("category", 1)],
        name="idx_menu_venue_category"
    )
    print("  [OK] menu_items (2 indexes)")

    await db.recipes.create_index(
        [("venue_id", 1), ("active", 1), ("name", 1)],
        name="idx_recipes_venue_active_name"
    )
    await db.recipes.create_index(
        [("venue_id", 1), ("category", 1), ("deleted_at", 1)],
        name="idx_recipes_venue_cat_del"
    )
    print("  [OK] recipes (2 indexes)")

    # ─── Performance: HR & Clocking ────────────────────────────────────
    await db.clocking_entries.create_index(
        [("venue_id", 1), ("employee_id", 1), ("date", -1)],
        name="idx_clocking_venue_emp_date"
    )
    await db.clocking_entries.create_index(
        [("venue_id", 1), ("status", 1), ("date", -1)],
        name="idx_clocking_venue_status_date"
    )
    print("  [OK] clocking_entries (2 indexes)")

    await db.employees.create_index(
        [("venue_id", 1), ("status", 1)],
        name="idx_employees_venue_status"
    )
    print("  [OK] employees (1 index)")

    # ─── Performance: Reservations ─────────────────────────────────────
    await db.reservations.create_index(
        [("venue_id", 1), ("date", 1), ("status", 1)],
        name="idx_reserv_venue_date_status"
    )
    print("  [OK] reservations (1 index)")

    # ─── Performance: AI Conversations ─────────────────────────────────
    await db.ai_conversations.create_index(
        [("venue_id", 1), ("created_at", -1)],
        name="idx_ai_conv_venue_date"
    )
    print("  [OK] ai_conversations (1 index)")

    print(f"\n[DONE] All indexes created successfully!")

asyncio.run(main())
