
import asyncio
import os
import sys
import json
from dotenv import load_dotenv

# Load env
load_dotenv()

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

# Bypass Prisma for now, use Connector directly with hardcoded check first if DB fails, 
# but we prefer DB config if setup_meross.py works.
# Let's try DB first for the test script this time as environment is fixed.
from app.services.prisma import prisma
from app.domains.integrations.connectors.meross import MerossConnector

async def main():
    print("Connecting to DB...")
    await prisma.connect()
    
    # 1. Get Org & Config
    org = await prisma.organization.find_first()
    if not org:
        print("❌ No Organization found.")
        return

    config = await prisma.integrationconfig.find_unique(
        where={
            "organizationId_provider": {
                "organizationId": org.id,
                "provider": "MEROSS"
            }
        }
    )
    
    if not config:
        print("❌ Meross Config not found.")
        return

    print(f"🔹 Found Config for Org {org.name}")
    
    # 2. Instantiate Connector
    connector = MerossConnector(org.id, config.credentials, config.settings)
    
    # 3. Validate
    print("🔍 Validating Credentials...")
    is_valid = await connector.validate_credentials()
    if is_valid:
        print("✅ Credentials Valid!")
    else:
        print("❌ Credentials Invalid!")
        await prisma.disconnect()
        return

    # 4. Discover
    print("\n🔍 Discovering Devices...")
    result = await connector.discover()
    
    if "error" in result:
        print(f"❌ Error: {result['error']}")
    else:
        devices = result.get("devices", [])
        print(f"✅ Found {len(devices)} devices:")
        for i, dev in enumerate(devices):
            status_text = "ONLINE" if dev.get('online') else "OFFLINE"
            print(f"  [{i+1}] {dev.get('name')} (UUID: {dev.get('uuid')}) - {status_text}")
            
    await prisma.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
