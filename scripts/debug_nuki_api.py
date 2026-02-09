import httpx
import asyncio
import os

# Hardcoded from .env for debugging
TOKEN = "81a5c80dfb1eaa8c8146527312842a50c9328162c0b89ccba8e47957c69f967209c67e5d06b17dcf"

async def main():
    print(f"Checking Nuki API with token: {TOKEN[:10]}...")
    
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(
                "https://api.nuki.io/smartlock",
                headers={"Authorization": f"Bearer {TOKEN}"}
            )
            print(f"Status: {resp.status_code}")
            if resp.status_code == 200:
                data = resp.json()
                print(f"Found {len(data)} devices:")
                for d in data:
                    print(f"- {d.get('name')} (ID: {d.get('smartlockId')})")
            else:
                print(f"Error: {resp.text}")
        except Exception as e:
            print(f"Exception: {e}")

if __name__ == "__main__":
    asyncio.run(main())
