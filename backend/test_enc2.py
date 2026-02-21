import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from core.pii_encryption import encrypt_sensitive_dict, decrypt_sensitive_dict

async def main():
    db_client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = db_client['restin_v2']
    venue = await db.venues.find_one({})
    if not venue:
        print('DB empty')
        return
    
    vid = venue['id']
    print(f'Using venue: {vid}')
    
    payload = {'stripe_secret_key': 'sk_test_123', 'adyen_api_key': 'adyen_444'}
    fields = ['stripe_secret_key', 'adyen_api_key']
    enc = encrypt_sensitive_dict(payload, fields)
    
    await db.venues.update_one({'id': vid}, {'$set': {'settings': enc}})
    
    raw = await db.venues.find_one({'id': vid})
    print('Raw from DB:')
    print('Stripe:', raw.get('settings', {}).get('stripe_secret_key'))
    
    dec = decrypt_sensitive_dict(raw.get('settings', {}), fields)
    print('Decrypted:')
    print('Stripe:', dec.get('stripe_secret_key'))

asyncio.run(main())
