"""Verify E2E order flow — check orders, KDS tickets, print jobs in MongoDB"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'restin_v2')

async def verify():
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    venue_id = "7c41d143-da18-4a23-b8db-d1792f7dde65"
    
    # Orders
    orders = await db.orders.find({"venue_id": venue_id}, {"_id": 0, "id": 1, "status": 1, "table_id": 1, "table_name": 1}).sort("created_at", -1).to_list(10)
    print(f"📋 ORDERS ({len(orders)}):")
    for o in orders:
        print(f"  id={o.get('id','?')[:12]}... status={o.get('status')} table={o.get('table_name','?')} table_id={o.get('table_id','?')}")
    
    # KDS Tickets
    tickets = await db.kds_tickets.find({"venue_id": venue_id}, {"_id": 0, "id": 1, "status": 1, "table_name": 1, "prep_area": 1}).to_list(20)
    print(f"\n🍳 KDS TICKETS ({len(tickets)}):")
    for t in tickets:
        print(f"  id={t.get('id','?')[:12]}... status={t.get('status')} table={t.get('table_name','?')} prep={t.get('prep_area','?')}")
    
    # Print Jobs
    pjobs = await db.print_jobs.find({"venue_id": venue_id}, {"_id": 0, "id": 1, "status": 1, "printer_zone": 1}).to_list(20)
    print(f"\n🖨️  PRINT JOBS ({len(pjobs)}):")
    for p in pjobs:
        print(f"  id={p.get('id','?')[:12]}... status={p.get('status')} zone={p.get('printer_zone','?')}")
    
    # Audit Logs
    logs = await db.audit_logs.find({"venue_id": venue_id}, {"_id": 0, "action": 1, "resource_type": 1}).sort("created_at", -1).to_list(5)
    print(f"\n📝 AUDIT LOGS (last 5):")
    for l in logs:
        print(f"  {l.get('action')} {l.get('resource_type')}")
    
    # Inventory transactions
    inv = await db.inventory_transactions.count_documents({"venue_id": venue_id})
    print(f"\n📦 INVENTORY TRANSACTIONS: {inv}")
    
    client.close()

asyncio.run(verify())
