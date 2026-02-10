
import asyncio
import os
import sys
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(env_path)

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from app.services.prisma import prisma

async def main():
    await prisma.connect()
    
    org = await prisma.organization.find_first()
    print(f"Org: {org.name}")
    
    configs = await prisma.integrationconfig.find_many(
        where={"organizationId": org.id}
    )
    
    print(f"Found {len(configs)} configs:")
    for c in configs:
        print(f" - {c.provider}: {c.status} (Enabled: {c.isEnabled})")
        
    await prisma.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
