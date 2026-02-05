import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

async def check_logs():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["restin_os"]
    logs = await db.migration_logs.find().to_list(length=10)
    for log in logs:
        print(f"Log ID: {log.get('_id')}, Source: {log.get('source')}, Started: {log.get('started_at')}")

if __name__ == "__main__":
    asyncio.run(check_logs())
