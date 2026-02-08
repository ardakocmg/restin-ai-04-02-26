
import asyncio
import aiohttp
import sys

# Change to your backend URL
BASE_URL = "http://localhost:8000"

async def test_waste_endpoint():
    async with aiohttp.ClientSession() as session:
        # 1. Login to get token (if needed) - Mocking a header for now assuming validation is permeable or use a test user
        # For this quick test we might need a valid token. 
        # Let's assume we can hit it if we disable auth or have a token.
        # Actually, let's just checking if it 404s or 401s (which means route exists).
        
        print(f"Testing POST {BASE_URL}/api/inventory/waste...")
        try:
            async with session.post(f"{BASE_URL}/api/inventory/waste", json={}) as resp:
                print(f"Status: {resp.status}")
                print(f"Status: {resp.status}")
                if resp.status == 404:
                    print("X Route NOT FOUND")
                elif resp.status in [401, 403, 422, 200, 201]:
                    print("V Route EXISTS (Auth/Validation active)")
                else:
                    print(f"WARN Unexpected status: {resp.status}")
        except Exception as e:
            print(f"Connection error: {e}")

async def test_production_endpoint():
    async with aiohttp.ClientSession() as session:
        print(f"Testing GET {BASE_URL}/api/inventory/production-batches...")
        try:
            async with session.get(f"{BASE_URL}/api/inventory/production-batches") as resp:
                print(f"Status: {resp.status}")
                if resp.status == 404:
                    print("X Route NOT FOUND")
                elif resp.status in [401, 403, 422, 200]:
                    print("V Route EXISTS")
        except Exception as e:
            print(f"Connection error: {e}")

async def test_pos_session_endpoint():
    async with aiohttp.ClientSession() as session:
        print(f"Testing POST {BASE_URL}/api/pos/sessions/open...")
        try:
            # Empty body should trigger 422 or 401, not 404
            async with session.post(f"{BASE_URL}/api/pos/sessions/open", json={}) as resp:
                print(f"Status: {resp.status}")
                if resp.status == 404:
                    print("X Route NOT FOUND")
                elif resp.status in [401, 403, 422, 200, 201]:
                    print("V Route EXISTS")
                else:
                    print(f"WARN Unexpected status: {resp.status}")
        except Exception as e:
            print(f"Connection error: {e}")

async def main():
    await test_waste_endpoint()
    await test_production_endpoint()
    await test_pos_session_endpoint()

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
