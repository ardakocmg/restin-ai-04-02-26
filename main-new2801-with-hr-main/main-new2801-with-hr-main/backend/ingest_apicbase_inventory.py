import pandas as pd
import motor.motor_asyncio
import asyncio
import os
from datetime import datetime, timezone
from pathlib import Path
import sys

# Add backend to path to import core
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from core.config import MONGO_URL, DB_NAME

DOWNLOADS_DIR = Path(r"C:\Users\MG Group\Downloads")
VENUE_CB = "venue-caviar-bull"
VENUE_DR = "venue-don-royale"

async def get_db():
    client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URL)
    return client[DB_NAME]

def get_venue_id(filename: str):
    if "don royale" in filename.lower() or "don_royale" in filename.lower():
        return VENUE_DR
    return VENUE_CB

async def ingest_ingredients():
    db = await get_db()
    file_path = DOWNLOADS_DIR / "ingredient_list_export.xlsx"
    if not file_path.exists():
        print("Ingredient export not found.")
        return

    print("Ingesting Ingredients...")
    df = pd.read_excel(file_path)
    # Mapping based on Apicbase Export Headers observed in inspection
    # Item UID, Name, Category, Price, Unit
    count = 0
    for _, row in df.iterrows():
        sku = str(row.get('Item UID', ''))
        name = str(row.get('Name', ''))
        category = str(row.get('Category', 'General'))
        price = float(row.get('Price', 0))
        unit = str(row.get('Unit', 'kg'))
        
        # Determine venue based on name or category if needed, but here we assume general or specific
        # Typically ingredients are shared or tagged. For now, we'll mark as belonging to both or specific.
        # User said "donroyali donroyale işle", so we'll check if ingredient name has DR context or apply to both
        venue_id = get_venue_id(name) if "Don Royale" in name else VENUE_CB

        ingredient = {
            "sku": sku,
            "name": name,
            "category": category,
            "cost_price": price,
            "unit": unit,
            "venue_id": venue_id,
            "status": "active",
            "source": "apicbase",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.inventory_items.update_one(
            {"sku": sku, "venue_id": venue_id},
            {"$set": ingredient},
            upsert=True
        )
        count += 1
    print(f"Ingested {count} ingredients.")

async def ingest_qc_recipes():
    db = await get_db()
    file_path = DOWNLOADS_DIR / "Don_Royale_QC_REPORT_v2.xlsx"
    if not file_path.exists():
        print("QC Report not found.")
        return

    print("Ingesting QC Recipes for Don Royale...")
    df = pd.read_excel(file_path)
    count = 0
    for _, row in df.iterrows():
        name = str(row.get('Menu_Item', ''))
        category = str(row.get('Category', 'General'))
        description = str(row.get('Menu_Description', ''))
        method = str(row.get('Method_Block', ''))
        ingredients_text = str(row.get('Ingredients_Standardized', ''))
        price = float(row.get('Menu_Price_EUR', 0))
        cost = float(row.get('Total_Cost_EUR', 0))
        allergens = str(row.get('Allergens', ''))
        
        venue_id = VENUE_DR # This is the Don Royale QC Report

        recipe = {
            "name": name,
            "category": category,
            "description": description,
            "instructions": method,
            "ingredients_raw": ingredients_text,
            "sale_price": price,
            "cost_price": cost,
            "allergens": allergens.split(','),
            "venue_id": venue_id,
            "status": "active",
            "source": "qc_report",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.recipes.update_one(
            {"name": name, "venue_id": venue_id},
            {"$set": recipe},
            upsert=True
        )
        count += 1
    print(f"Ingested {count} recipes from QC report.")

async def main():
    await ingest_ingredients()
    await ingest_qc_recipes()
    print("Ingestion complete.")

if __name__ == "__main__":
    asyncio.run(main())
