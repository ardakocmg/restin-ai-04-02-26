"""
Fix all data relationships for Apicbase-imported data in MongoDB.
Phase 1: Fix supplier IDs, venue_ids, outlet_sell_prices mapping, stock name normalization.
"""
import asyncio
import os
from datetime import datetime, timezone

from dotenv import load_dotenv
load_dotenv()

from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.getenv("MONGO_URL")
DB_NAME = "restin_v2"


async def main():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    # ── 0. Get venue ObjectIds ──────────────────────────────
    print("=== VENUE MAPPING ===")
    venue_oids = {}
    async for v in db.venues.find({}, {"name": 1}):
        name = v.get("name", "")
        oid = str(v["_id"])
        venue_oids[name] = oid
        print(f"  {name} -> {oid}")

    # Map outlet names to venue ObjectIds
    OUTLET_TO_VENUE = {}
    for name, oid in venue_oids.items():
        OUTLET_TO_VENUE[name] = oid
        if "Caviar" in name:
            OUTLET_TO_VENUE["Caviar&Bull"] = oid
            OUTLET_TO_VENUE["Caviar & Bull"] = oid
            OUTLET_TO_VENUE["venue-caviar-bull"] = oid
        elif "Don Royale" in name:
            OUTLET_TO_VENUE["Don Royale"] = oid
            OUTLET_TO_VENUE["venue-don-royale"] = oid
        elif "Sole" in name or "Tarragon" in name:
            OUTLET_TO_VENUE["Sole by Tarragon"] = oid
            OUTLET_TO_VENUE["venue-sole-tarragon"] = oid

    print(f"  Mapping: {OUTLET_TO_VENUE}")

    # ── 1. FIX SUPPLIERS ────────────────────────────────────
    print("\n=== FIX SUPPLIERS ===")
    # Check existing non-apicbase supplier schema
    existing_sup = await db.suppliers.find_one({"source": {"$ne": "apicbase"}})
    if existing_sup:
        print("  Existing supplier schema:")
        for k in sorted(existing_sup.keys()):
            if k != "_id":
                print(f"    {k}: {type(existing_sup[k]).__name__} = {str(existing_sup[k])[:60]}")

    # Get all venues for multi-assignment
    all_venue_ids = list(venue_oids.values())
    first_venue = all_venue_ids[0] if all_venue_ids else "unknown"

    # Update apicbase suppliers with proper id, venue_id, is_active
    counter = 0
    async for sup in db.suppliers.find({"source": "apicbase"}):
        counter += 1
        sup_id = f"SUP-{counter:04d}"

        update = {
            "id": sup_id,
            "display_id": sup_id,
            "venue_id": first_venue,  # Primary venue
            "venues": all_venue_ids,  # Shared across all venues
            "is_active": True,
            "status": "active",
            "contact_email": sup.get("contact_email", ""),
            "contact_phone": sup.get("contact_phone", ""),
            "payment_terms": "Net 30",
            "lead_time_days": 3,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

        await db.suppliers.update_one({"_id": sup["_id"]}, {"$set": update})

    print(f"  Fixed {counter} suppliers with id/venue_id/is_active")

    # Build supplier name -> id lookup
    supplier_lookup = {}
    async for sup in db.suppliers.find({"source": "apicbase"}, {"name": 1, "id": 1}):
        supplier_lookup[sup["name"]] = sup["id"]

    # ── 2. FIX INGREDIENTS ──────────────────────────────────
    print("\n=== FIX INGREDIENTS ===")
    ing_counter = 0
    async for ing in db.ingredients.find({"source": "apicbase", "id": {"$exists": False}}):
        ing_counter += 1
        ing_id = f"ING-{ing_counter:04d}"

        # Link supplier from packages
        supplier_name = None
        supplier_id = None
        pkg = await db.ingredient_packages.find_one({
            "apicbase_id": ing.get("apicbase_id"),
            "supplier_name": {"$ne": None}
        })
        if pkg:
            supplier_name = pkg.get("supplier_name")
            supplier_id = supplier_lookup.get(supplier_name)

        update_fields = {
            "id": ing_id,
            "display_id": ing_id,
            "venue_id": first_venue,
            "venues": all_venue_ids,
            "is_active": True,
            "supplier_name": supplier_name,
            "supplier_id": supplier_id,
        }

        await db.ingredients.update_one({"_id": ing["_id"]}, {"$set": update_fields})

    print(f"  Fixed {ing_counter} ingredients with id/venue_id/supplier links")

    # Build ingredient name -> id lookup
    ing_lookup = {}
    async for ing in db.ingredients.find({"source": "apicbase"}, {"name": 1, "id": 1, "apicbase_id": 1}):
        ing_lookup[ing["name"].lower()] = ing["id"]
        if ing.get("apicbase_id"):
            ing_lookup[ing["apicbase_id"]] = ing["id"]

    # ── 3. FIX OUTLET SELL PRICES ───────────────────────────
    print("\n=== FIX OUTLET SELL PRICES ===")
    fixed_osp = 0
    async for osp in db.outlet_sell_prices.find({"venue_id": None}):
        outlet_name = osp.get("outlet_name", "")
        venue_id = OUTLET_TO_VENUE.get(outlet_name)

        if not venue_id:
            # Try to match by Apicbase outlet ID
            apic_oid = osp.get("apicbase_outlet_id", "")
            for name, vid in OUTLET_TO_VENUE.items():
                if apic_oid and name in apic_oid:
                    venue_id = vid
                    break

        if venue_id:
            await db.outlet_sell_prices.update_one(
                {"_id": osp["_id"]},
                {"$set": {"venue_id": venue_id}}
            )
            fixed_osp += 1

    # Also fix non-None string venue_ids
    for str_vid, real_vid in OUTLET_TO_VENUE.items():
        if str_vid.startswith("venue-"):
            result = await db.outlet_sell_prices.update_many(
                {"venue_id": str_vid},
                {"$set": {"venue_id": real_vid}}
            )
            if result.modified_count > 0:
                fixed_osp += result.modified_count

    remaining_null = await db.outlet_sell_prices.count_documents({"venue_id": None})
    print(f"  Fixed {fixed_osp} sell prices, remaining null: {remaining_null}")

    # ── 4. FIX STOCK SNAPSHOTS ──────────────────────────────
    print("\n=== FIX STOCK SNAPSHOTS ===")
    # Normalize stock names to match ingredient names
    # Stock uses "1776 Bourbon Whiskey  bottle (0.7L)" format
    # Ingredients use "1776 Bourbon Whiskey"
    matched_stock = 0
    unmatched_stock = 0
    async for ss in db.stock_snapshots.find({"source": "apicbase"}):
        raw_name = ss.get("ingredient_name", "")
        # Try direct match first
        normalized = raw_name.lower().strip()
        ing_id = ing_lookup.get(normalized)

        # Strip package info: "Name  package (size)" -> "Name"
        if not ing_id:
            # Try removing everything after double space or parenthesis
            clean = raw_name.split("  ")[0].strip()
            ing_id = ing_lookup.get(clean.lower())

        # Try partial match
        if not ing_id:
            for ing_name, iid in ing_lookup.items():
                if not ing_name.startswith("ING-") and normalized.startswith(ing_name):
                    ing_id = iid
                    break

        # Fix venue_id from string to ObjectId
        venue_id = OUTLET_TO_VENUE.get(ss.get("venue_id", ""), ss.get("venue_id"))

        update = {
            "venue_id": venue_id,
            "ingredient_id": ing_id,
        }

        if ing_id:
            matched_stock += 1
        else:
            unmatched_stock += 1

        await db.stock_snapshots.update_one({"_id": ss["_id"]}, {"$set": update})

    print(f"  Matched: {matched_stock}, Unmatched: {unmatched_stock}")

    # ── 5. FIX PROCUREMENT, STOCK COUNTS, VARIANCE ─────────
    print("\n=== FIX OTHER COLLECTIONS ===")
    for coll_name in ["procurement_history", "stock_counts", "variance_reports", "sales_history"]:
        coll = db[coll_name]
        fixed = 0
        async for doc in coll.find({"source": "apicbase"}):
            old_vid = doc.get("venue_id", "")
            new_vid = OUTLET_TO_VENUE.get(old_vid, old_vid)

            update = {"venue_id": new_vid}

            # Link ingredient if available
            ing_name = doc.get("ingredient_name", "")
            if ing_name:
                iid = ing_lookup.get(ing_name.lower())
                if iid:
                    update["ingredient_id"] = iid

            await coll.update_one({"_id": doc["_id"]}, {"$set": update})
            fixed += 1

        print(f"  {coll_name}: fixed {fixed} records")

    # ── 6. FIX INGREDIENT PACKAGES ──────────────────────────
    print("\n=== FIX INGREDIENT PACKAGES ===")
    pkg_fixed = 0
    async for pkg in db.ingredient_packages.find({"source": "apicbase"}):
        update = {}

        # Link supplier_id
        sup_name = pkg.get("supplier_name")
        if sup_name and sup_name in supplier_lookup:
            update["supplier_id"] = supplier_lookup[sup_name]

        # Link ingredient_id
        ing_name = pkg.get("ingredient_name", "")
        iid = ing_lookup.get(ing_name.lower())
        if iid:
            update["ingredient_id"] = iid

        if update:
            await db.ingredient_packages.update_one({"_id": pkg["_id"]}, {"$set": update})
            pkg_fixed += 1

    print(f"  Fixed {pkg_fixed} packages with supplier_id/ingredient_id links")

    # ── 7. CREATE INDEXES ───────────────────────────────────
    print("\n=== CREATING INDEXES ===")
    await db.suppliers.create_index("id", unique=True, sparse=True)
    await db.suppliers.create_index("venue_id")
    await db.suppliers.create_index("name")
    await db.ingredients.create_index("id", unique=True, sparse=True)
    await db.ingredients.create_index("venue_id")
    await db.ingredients.create_index("supplier_id")
    await db.ingredient_packages.create_index("ingredient_id")
    await db.ingredient_packages.create_index("supplier_id")
    await db.outlet_sell_prices.create_index("venue_id")
    await db.outlet_sell_prices.create_index("recipe_name")
    await db.stock_snapshots.create_index("venue_id")
    await db.stock_snapshots.create_index("ingredient_id")
    await db.procurement_history.create_index("venue_id")
    await db.procurement_history.create_index("supplier_name")
    await db.stock_counts.create_index("venue_id")
    await db.variance_reports.create_index("venue_id")
    await db.sales_history.create_index("venue_id")
    print("  All indexes created")

    # ── FINAL AUDIT ─────────────────────────────────────────
    print("\n" + "=" * 60)
    print("FINAL RELATIONSHIP AUDIT")
    print("=" * 60)

    # Suppliers
    sup_with_id = await db.suppliers.count_documents({"id": {"$exists": True}})
    sup_with_vid = await db.suppliers.count_documents({"venue_id": {"$exists": True, "$ne": None}})
    sup_total = await db.suppliers.count_documents({})
    print(f"  Suppliers: {sup_total} total, {sup_with_id} with id, {sup_with_vid} with venue_id")

    # Ingredients
    ing_with_id = await db.ingredients.count_documents({"id": {"$exists": True}})
    ing_with_sup = await db.ingredients.count_documents({"supplier_id": {"$exists": True, "$ne": None}})
    ing_total = await db.ingredients.count_documents({})
    print(f"  Ingredients: {ing_total} total, {ing_with_id} with id, {ing_with_sup} with supplier_id")

    # Outlet sell prices
    osp_total = await db.outlet_sell_prices.count_documents({})
    osp_null = await db.outlet_sell_prices.count_documents({"venue_id": None})
    print(f"  Outlet Sell Prices: {osp_total} total, {osp_null} with null venue_id")

    # Stock
    ss_matched = await db.stock_snapshots.count_documents({"ingredient_id": {"$ne": None}})
    ss_total = await db.stock_snapshots.count_documents({})
    print(f"  Stock Snapshots: {ss_total} total, {ss_matched} linked to ingredients")

    # Packages
    pkg_with_sup = await db.ingredient_packages.count_documents({"supplier_id": {"$exists": True, "$ne": None}})
    pkg_with_ing = await db.ingredient_packages.count_documents({"ingredient_id": {"$exists": True, "$ne": None}})
    pkg_total = await db.ingredient_packages.count_documents({})
    print(f"  Packages: {pkg_total} total, {pkg_with_sup} with supplier_id, {pkg_with_ing} with ingredient_id")

    print("=" * 60)

    client.close()
    print("\nAll fixes applied!")


if __name__ == "__main__":
    asyncio.run(main())
