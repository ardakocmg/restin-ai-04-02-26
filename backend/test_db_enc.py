import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from core.pii_encryption import encrypt_sensitive_dict, decrypt_sensitive_dict

async def test_encryption():
    # 1. Connection
    db_client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = db_client["restin_v2"]
    
    # 2. Pick a venue
    venue = await db.venues.find_one({"id": "venue-caviar-bull"})
    if not venue:
        print("No venue found")
        return
        
    print(f"Testing on venue: {venue['name']}")
    
    # 3. Encrypt payload
    settings_update = {
        "stripe_secret_key": "sk_live_verysecret123",
        "adyen_api_key": "adyen_555"
    }
    sensitive_fields = ["stripe_secret_key", "adyen_api_key", "adyen_merchant_account", "square_access_token"]
    
    encrypted_payload = encrypt_sensitive_dict(settings_update, sensitive_fields)
    
    print("\n--- Encrypted Payload to insert into MongoDB ---")
    print(encrypted_payload)
    
    # 4. Save to DB
    current_settings = venue.get("settings", {})
    current_settings.update(encrypted_payload)
    
    await db.venues.update_one(
        {"id": "venue-caviar-bull"},
        {"$set": {"settings": current_settings}}
    )
    
    # 5. Fetch from DB
    raw_venue = await db.venues.find_one({"id": "venue-caviar-bull"})
    raw_settings = raw_venue.get("settings", {})
    
    print("\n--- Raw DB Fetch (Should be encrypted) ---")
    print("Stripe:", raw_settings.get("stripe_secret_key"))
    print("Adyen:", raw_settings.get("adyen_api_key"))
    
    # 6. Decrypt for API 
    decrypted_settings = decrypt_sensitive_dict(raw_settings, sensitive_fields)
    print("\n--- Decrypted for API Response ---")
    print("Stripe:", decrypted_settings.get("stripe_secret_key"))
    print("Adyen:", decrypted_settings.get("adyen_api_key"))

if __name__ == "__main__":
    asyncio.run(test_encryption())
