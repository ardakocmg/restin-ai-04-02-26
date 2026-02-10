
import asyncio
import os
import sys
from dotenv import load_dotenv

# Path setup
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

# Load env (for Prisma)
env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(env_path)

from app.services.prisma import prisma
from app.domains.integrations.service import SyncEngine
from app.domains.integrations.models import IntegrationProvider

# Fix for Windows Asyncio Loop
if os.name == 'nt':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

async def main():
    print("Connecting to DB...")
    await prisma.connect()
    
    org_id = "698896440bc2eddbf9cac672" # MG Group
    
    engine = SyncEngine()
    
    print("\n--- Triggering Tuya Sync ---")
    try:
        res = await engine.trigger_sync(org_id, IntegrationProvider.TUYA, job_type="SYNC")
        print(f"Result: {res}")
    except Exception as e:
        print(f"Error: {e}")

    print("\n--- Triggering Meross Sync ---")
    try:
        res = await engine.trigger_sync(org_id, IntegrationProvider.MEROSS, job_type="SYNC")
        print(f"Result: {res}")
    except Exception as e:
        print(f"Error: {e}")
        
    await prisma.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
