"""Audit data relationships across all Apicbase collections."""
import asyncio
import os
from dotenv import load_dotenv
load_dotenv()
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.getenv("MONGO_URL")

async def audit():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client["restin_v2"]

    # 1. Venues
    print("=== VENUES ===")
    venues = {}
    async for v in db.venues.find({}, {"name": 1}):
        oid = str(v["_id"])
        name = v.get("name", "")
        venues[name] = oid
        print(f"  {name} -> {oid}")

    # 2. Ingredient-Supplier links
    print("\n=== INGREDIENT-SUPPLIER LINKS ===")
    pkg_suppliers = set(s for s in await db.ingredient_packages.distinct("supplier_name") if s)
    sup_names = set(await db.suppliers.distinct("name"))
    matched = pkg_suppliers & sup_names
    unmatched = pkg_suppliers - sup_names
    print(f"  Package suppliers: {len(pkg_suppliers)}")
    print(f"  Supplier collection: {len(sup_names)}")
    print(f"  Matched: {len(matched)}")
    print(f"  Unmatched: {len(unmatched)}")
    if unmatched:
        for u in sorted(unmatched)[:10]:
            print(f"    MISSING: {u}")

    # 3. Ingredient names cross-check
    print("\n=== INGREDIENT CROSS-REFS ===")
    ing_names = set(await db.ingredients.distinct("name"))
    pkg_names = set(s for s in await db.ingredient_packages.distinct("ingredient_name") if s)
    ss_names = set(s for s in await db.stock_snapshots.distinct("ingredient_name") if s)
    sc_names = set(s for s in await db.stock_counts.distinct("ingredient_name") if s)
    vr_names = set(s for s in await db.variance_reports.distinct("ingredient_name") if s)
    proc_names = set(s for s in await db.procurement_history.distinct("ingredient_name") if s)

    print(f"  ingredients collection: {len(ing_names)}")
    print(f"  ingredient_packages names: {len(pkg_names)}")
    print(f"  stock_snapshots names: {len(ss_names)}")
    print(f"  stock_counts names: {len(sc_names)}")
    print(f"  variance_reports names: {len(vr_names)}")
    print(f"  procurement names: {len(proc_names)}")

    # Cross match
    pkg_in_ing = len(pkg_names & ing_names)
    ss_in_ing = len(ss_names & ing_names)
    print(f"  packages matching ingredients: {pkg_in_ing}/{len(pkg_names)}")
    print(f"  stock matching ingredients: {ss_in_ing}/{len(ss_names)}")

    # 4. Sell prices vs recipes
    print("\n=== SELL PRICES VS RECIPES ===")
    sp_recipes = set(s for s in await db.outlet_sell_prices.distinct("recipe_name") if s)
    re_names = set(s for s in await db.recipes.distinct("name") if s)
    eng_names = set(s for s in await db.recipes.distinct("recipe_name") if s)
    sp_in_re = len(sp_recipes & re_names)
    sp_in_eng = len(sp_recipes & eng_names)
    print(f"  sell price recipes: {len(sp_recipes)}")
    print(f"  matched in recipes: {sp_in_re}/{len(sp_recipes)}")
    print(f"  matched in recipes_engineered: {sp_in_eng}/{len(sp_recipes)}")

    # 5. Venue_id usage
    print("\n=== VENUE_ID MAPPING ===")
    for coll_name in ["outlet_sell_prices", "procurement_history", "stock_snapshots", "stock_counts", "variance_reports", "sales_history"]:
        coll = db[coll_name]
        vid = await coll.distinct("venue_id")
        count = await coll.count_documents({})
        no_vid = await coll.count_documents({"venue_id": None})
        print(f"  {coll_name}: {count} docs, venue_ids={vid}, no_venue={no_vid}")

    # 6. Sample data quality
    print("\n=== SAMPLE DATA QUALITY ===")
    ing = await db.ingredients.find_one({"allergens": {"$ne": {}}})
    if ing:
        print(f"  Ingredient with allergens: {ing['name']}")
        print(f"    allergens: {ing.get('allergens', {})}")
        print(f"    nutrition: {ing.get('nutrition', {})}")

    client.close()

asyncio.run(audit())
