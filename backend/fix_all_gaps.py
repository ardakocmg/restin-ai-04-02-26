"""Fix stock items with unit suffixes and handle remaining gaps."""
import asyncio, os, re
from dotenv import load_dotenv
load_dotenv()
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.getenv("MONGO_URL")

async def main():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client["restin_v2"]

    # Build ingredient name lookup (lowercase)
    ing_lookup = {}
    async for ing in db.ingredients.find({}, {"name": 1, "id": 1}):
        ing_lookup[ing["name"].lower().strip()] = ing["id"]

    # ── FIX STOCK: aggressive name cleaning ──
    print("=== FIXING STOCK ITEMS ===")
    fixed = 0
    still_unmatched = []

    async for ss in db.stock_snapshots.find(
        {"ingredient_id": None, "source": "apicbase"},
        {"ingredient_name": 1}
    ):
        raw = ss.get("ingredient_name", "")
        matched = False

        # Strategy 1: Remove everything after common unit patterns
        # e.g., "Alois Lageder Gewurztraminer AM Sand 2018  btl (75 cl)" -> try without btl/bottle part
        patterns = [
            r'\s+btl\s*\(.*\)$',      # btl (75 cl)
            r'\s+bottle\s*\(.*\)$',    # bottle (75 cl)
            r'\s+\d+\s*(?:cl|ml|l|kg|g)$',  # 70 cl, 1.5 l
            r'\s+\(\d+\s*(?:cl|ml|l)\)$',    # (75 cl)
        ]

        for pattern in patterns:
            clean = re.sub(pattern, '', raw, flags=re.IGNORECASE).strip()
            iid = ing_lookup.get(clean.lower())
            if iid:
                await db.stock_snapshots.update_one(
                    {"_id": ss["_id"]},
                    {"$set": {"ingredient_id": iid}}
                )
                fixed += 1
                matched = True
                print(f"  MATCHED: '{raw}' -> '{clean}'")
                break

        # Strategy 2: Try removing double spaces and trailing whitespace
        if not matched:
            clean2 = re.sub(r'\s+', ' ', raw).strip()
            # Remove unit suffix more aggressively
            clean3 = re.sub(r'\s+(?:btl|bottle|can|tin|jar|box|pack|bag|keg|drum|tub|each|per|PET).*$', '', clean2, flags=re.IGNORECASE).strip()
            iid = ing_lookup.get(clean3.lower())
            if iid:
                await db.stock_snapshots.update_one(
                    {"_id": ss["_id"]},
                    {"$set": {"ingredient_id": iid}}
                )
                fixed += 1
                matched = True
                print(f"  MATCHED: '{raw}' -> '{clean3}'")

        # Strategy 3: partial match - find ingredient that starts with first N chars
        if not matched:
            partial_name = re.sub(r'\s+', ' ', raw).strip()
            # Take the first 20+ chars and look for a match
            for length in [30, 25, 20, 15]:
                if len(partial_name) >= length:
                    prefix = partial_name[:length].lower()
                    matches = [name for name in ing_lookup if name.startswith(prefix)]
                    if len(matches) == 1:
                        await db.stock_snapshots.update_one(
                            {"_id": ss["_id"]},
                            {"$set": {"ingredient_id": ing_lookup[matches[0]]}}
                        )
                        fixed += 1
                        matched = True
                        print(f"  PARTIAL MATCH: '{raw}' -> '{matches[0]}'")
                        break

        if not matched:
            still_unmatched.append(raw)

    print(f"\nFixed: {fixed}")
    print(f"Still unmatched: {len(still_unmatched)}")
    for u in still_unmatched:
        print(f"  X '{u}'")

    # ── FINAL AUDIT ──
    print("\n" + "=" * 60)
    print("FINAL STATUS AFTER ALL FIXES")
    print("=" * 60)

    checks = [
        ("suppliers", "id", "All have ID"),
        ("suppliers", "venue_id", "All have venue"),
        ("ingredients", "id", "All have ID"),
        ("ingredients", "supplier_id", "Supplier link"),
        ("ingredient_packages", "supplier_id", "Supplier link"),
        ("ingredient_packages", "ingredient_id", "Ingredient link"),
        ("outlet_sell_prices", "venue_id", "Venue mapping"),
        ("stock_snapshots", "ingredient_id", "Ingredient link"),
        ("procurement_history", "venue_id", "Venue mapping"),
        ("stock_counts", "venue_id", "Venue mapping"),
        ("variance_reports", "venue_id", "Venue mapping"),
        ("sales_history", "venue_id", "Venue mapping"),
    ]

    for coll_name, field, label in checks:
        total = await db[coll_name].count_documents({})
        has = await db[coll_name].count_documents({field: {"$exists": True, "$ne": None}})
        gap = total - has
        pct = (has / total * 100) if total else 0
        mark = "100%" if gap == 0 else f"{pct:.1f}%"
        print(f"  {coll_name}.{field}: {has}/{total} ({mark})")

    client.close()

asyncio.run(main())
