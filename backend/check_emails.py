import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    db = AsyncIOMotorClient("mongodb://localhost:27017")["restin_v2"]
    users = await db.users.find(
        {"email": {"$exists": True}},
        {"_id": 0, "name": 1, "email": 1, "role": 1, "google_id": 1}
    ).to_list(100)
    
    seen = set()
    for u in users:
        email = u.get("email", "")
        if email in seen:
            continue
        seen.add(email)
        gid = u.get("google_id", "")
        name = str(u.get("name", "?"))[:30].ljust(30)
        role = str(u.get("role", "?"))[:15].ljust(15)
        print(f"{name} {role} {email:40s} google_id={gid}")
    
    print(f"\nUnique emails: {len(seen)}")

asyncio.run(main())
