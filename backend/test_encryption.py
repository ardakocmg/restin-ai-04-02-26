import asyncio
import httpx
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    async with httpx.AsyncClient(base_url="http://127.0.0.1:8000/api") as client:
        # Login
        r = await client.post("/auth/login?venue_id=venue-caviar-bull&pin=1234")
        print("Login Response:", r.json())
        token = r.json()["token"]
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # 1. Update Settings with sensitive keys
        payload = {
            "stripe_secret_key": "sk_test_SECRET_12345",
            "adyen_api_key": "adyen_SUPER_SECRET_KEY"
        }
        res = await client.patch("/venues/venue-caviar-bull/settings", json=payload, headers=headers)
        print("PATCH API Response:", res.json())
        
        # 2. Get Settings from API (should be decrypted)
        res = await client.get("/venues/venue-caviar-bull/settings", headers=headers)
        api_data = res.json()["settings"]
        print("\nAPI Response (Decrypted):")
        print(f"Stripe: {api_data.get('stripe_secret_key')}")
        print(f"Adyen: {api_data.get('adyen_api_key')}")
        
    # 3. Get Settings from DB (should be encrypted)
    db_client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = db_client["restin_v2"]
    venue = await db.venues.find_one({"id": "venue-caviar-bull"})
    db_settings = venue.get("settings", {})
    print("\nDatabase (Encrypted):")
    print(f"Stripe: {db_settings.get('stripe_secret_key')}")
    print(f"Adyen: {db_settings.get('adyen_api_key')}")

asyncio.run(main())


