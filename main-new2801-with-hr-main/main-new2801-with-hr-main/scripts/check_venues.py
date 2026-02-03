import asyncio
import motor.motor_asyncio

async def main():
    client = motor.motor_asyncio.AsyncIOMotorClient('mongodb://localhost:27017')
    db = client.restin
    try:
        venues = await db.venues.find().to_list(10)
        print(f"found {len(venues)} venues")
        for v in venues:
            print(f"ID: {v.get('id')} - Name: {v.get('name')}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(main())
