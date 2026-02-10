
import asyncio
import os
import sys


# Load env
from dotenv import load_dotenv
load_dotenv()

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from app.services.prisma import prisma
from app.domains.integrations.models import IntegrationProvider

async def main():
    print("Connecting to DB...")
    await prisma.connect()
    
    # 1. Get Default Org
    org = await prisma.organization.find_first()
    if not org:
        print("❌ No Organization found! Please run seed first.")
        return

    print(f"Found Org: {org.name} ({org.id})")

    # 2. Config Data
    creds = {
        "access_id": "nxf5urua4fa5gxfknyfh",
        "access_secret": "1b0fd259fa764b37acbe4df516f63789",
        "endpoint": "https://openapi.tuyaeu.com" # Default EU
    }

    # 3. Upsert
    print("Configuring Tuya...")
    config = await prisma.integrationconfig.upsert(
        where={
            "organizationId_provider": {
                "organizationId": org.id,
                "provider": "TUYA" # Using string to avoid enum import issues if mismatched
            }
        },
        create={
            "organizationId": org.id,
            "provider": "TUYA",
            "isEnabled": True,
            "credentials": creds,
            "settings": {"auto_sync": True},
            "status": "CONNECTED"
        },
        update={
            "isEnabled": True,
            "credentials": creds,
            "status": "CONNECTED"
        }
    )
    
    print(f"✅ Tuya Configuration Saved! ID: {config.id}")
    
    # Trigger Discovery (Optional, just to test connection)
    # We won't trigger full sync here to keep script simple, 
    # but the status is set to CONNECTED.

    await prisma.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
