
import asyncio
import os
import sys

# Load env
from dotenv import load_dotenv
env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(env_path)
print(f"Loaded env from {env_path}")
print(f"DATABASE_URL: {os.environ.get('DATABASE_URL')}")

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
        "email": "arda@marvingauci.com",
        "password": "Mg2026"
    }

    # 3. Upsert
    print("Configuring Meross...")
    # Note: Provider enum "MEROSS"
    config = await prisma.integrationconfig.upsert(
        where={
            "organizationId_provider": {
                "organizationId": org.id,
                "provider": "MEROSS" 
            }
        },
        create={
            "organizationId": org.id,
            "provider": "MEROSS",
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
    
    print(f"✅ Meross Configuration Saved! ID: {config.id}")

    await prisma.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
