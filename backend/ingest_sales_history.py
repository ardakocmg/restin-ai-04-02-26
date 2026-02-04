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

async def ingest_receipts():
    db = await get_db()
    # Find all receipt CSVs
    receipt_files = list(DOWNLOADS_DIR.glob("receipts-*.csv"))
    if not receipt_files:
        print("No receipt CSVs found.")
        return

    for file_path in receipt_files:
        print(f"Ingesting Receipts from {file_path.name}...")
        df = pd.read_csv(file_path)
        
        count = 0
        for _, row in df.iterrows():
            receipt_id = str(row.get('Receipt ID', ''))
            company_name = str(row.get('Company Name', ''))
            
            # Venue mapping based on Company Name
            # Caviar & Bull usually associated with Buddhamann Ltd or similar in this context?
            # Looking at previous inspection, Buddhamann Ltd was there.
            venue_id = VENUE_CB if "Buddhamann" in company_name or "Caviar" in company_name else VENUE_DR
            
            order_data = {
                "id": receipt_id,
                "venue_id": venue_id,
                "table_name": str(row.get('Table Name', '')),
                "waiter_name": str(row.get('Username', '')),
                "status": str(row.get('Status', '')).lower(),
                "type": str(row.get('Type', '')).lower(),
                "net_total": float(row.get('Net Total', 0)),
                "tax_total": float(str(row.get('Taxes', '0')).split('=')[-1] if '=' in str(row.get('Taxes', '')) else 0),
                "total": float(row.get('Total', 0)),
                "tip": float(row.get('Tip', 0)),
                "pax": int(row.get('Number of Seats', 0)),
                "created_at": str(row.get('Creation Date', '')),
                "finalized_at": str(row.get('Finalized Date', '')),
                "source": "pos_export",
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.orders.update_one(
                {"id": receipt_id, "venue_id": venue_id},
                {"$set": order_data},
                upsert=True
            )
            count += 1
        print(f"Ingested {count} orders from {file_path.name}.")

async def ingest_sales_summaries():
    db = await get_db()
    # "Caviar and Bull Sales Reports 10.11.25 till 17.11.25.xlsx"
    files = list(DOWNLOADS_DIR.glob("*Sales Reports*.xlsx"))
    for file_path in files:
        print(f"Ingesting Sales Summary from {file_path.name}...")
        df = pd.read_excel(file_path)
        # Columns: PRODUCT, Sales Amount, CATEGORY TYPE
        # This is more for catalog / ranking
        count = 0
        for _, row in df.iterrows():
            product = str(row.get('PRODUCT', ''))
            if not product or product == 'nan': continue
            
            sale_amount = float(row.get('Sales Amount', 0))
            category = str(row.get('CATEGORY TYPE', 'General'))
            
            item_stats = {
                "product_name": product,
                "venue_id": VENUE_CB,
                "total_sold": sale_amount,
                "category": category,
                "report_period": file_path.name,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.product_sales_stats.update_one(
                {"product_name": product, "venue_id": VENUE_CB, "report_period": file_path.name},
                {"$set": item_stats},
                upsert=True
            )
            count += 1
        print(f"Ingested {count} product stats.")

async def main():
    await ingest_receipts()
    await ingest_sales_summaries()

if __name__ == "__main__":
    asyncio.run(main())
