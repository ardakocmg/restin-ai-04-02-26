"""Seed Legal Entities for Marvin Gauci Group"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone


async def seed():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["restin_v2"]

    entities = [
        {
            "registered_name": "Marvin Gauci",
            "trading_name": "Caviar & Bull",
            "vat_number": "1535-5214",
            "registered_address": "Corinthia Hotel, St. George's Bay",
            "city": "St. Julians STJ3301",
            "country": "Malta",
            "pe_number": "",
            "org_id": "org-marvin-gauci-group",
            "venue_ids": [],
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
            "created_by": "system",
        },
        {
            "registered_name": "Marvin Gauci",
            "trading_name": "Don Royale",
            "vat_number": "1535-5214",
            "registered_address": "Corinthia Hotel, St. George's Bay",
            "city": "St. Julians STJ3301",
            "country": "Malta",
            "pe_number": "",
            "org_id": "org-marvin-gauci-group",
            "venue_ids": [],
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
            "created_by": "system",
        },
        {
            "registered_name": "Buddhamann Ltd.",
            "trading_name": "Sole",
            "vat_number": "2149-9818",
            "registered_address": "Corinthia Hotel, St. George's Bay",
            "city": "St. Julians STJ3301",
            "country": "Malta",
            "pe_number": "",
            "org_id": "org-marvin-gauci-group",
            "venue_ids": [],
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
            "created_by": "system",
        },
    ]

    for e in entities:
        existing = await db.legal_entities.find_one(
            {"registered_name": e["registered_name"], "trading_name": e["trading_name"]}
        )
        if existing:
            print(f"Already exists: {e['registered_name']} - {e['trading_name']}")
        else:
            result = await db.legal_entities.insert_one(e)
            print(f"Inserted: {e['registered_name']} - {e['trading_name']} -> {result.inserted_id}")

    count = await db.legal_entities.count_documents({})
    print(f"\nTotal legal entities: {count}")

    async for doc in db.legal_entities.find(
        {}, {"_id": 1, "registered_name": 1, "trading_name": 1, "vat_number": 1}
    ):
        print(f"  {doc.get('registered_name')} | {doc.get('trading_name')} | VAT: {doc.get('vat_number')}")


asyncio.run(seed())
