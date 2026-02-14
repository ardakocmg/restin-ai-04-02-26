import httpx
import asyncio
import os

TOKEN = os.environ.get("NUKI_API_TOKEN")
if not TOKEN:
    print("❌ NUKI_API_TOKEN env var not set. Aborting.")
    exit(1)

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
