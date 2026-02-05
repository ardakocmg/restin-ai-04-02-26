import os
import hashlib
from motor.motor_asyncio import AsyncIOMotorClient
from .config import MONGO_URL, DB_NAME
import logging

logger = logging.getLogger(__name__)

class MongoDatabase:
    def __init__(self):
        if not MONGO_URL:
             raise RuntimeError("MONGO_URL not set in environment or config.")
        
        logger.info(f"Connecting to MongoDB at {MONGO_URL}...")
        self.client = AsyncIOMotorClient(MONGO_URL)
        self.db = self.client[DB_NAME]
        logger.info(f"Connected to database: {DB_NAME}")
        
    def __getattr__(self, name):
        """Dynamic access to collections, e.g., db.users -> self.db['users']"""
        return self.db[name]

    def __getitem__(self, name):
        """Dictionary-style access to collections"""
        return self.db[name]

    async def initialize(self):
        """
        Perform initial setup, index creation, and seeding if empty.
        Must be called on server startup.
        """
        try:
            # Check connection
            await self.client.admin.command('ping')
            logger.info("MongoDB PING successful.")
            
            # Auto-Seed Admin User if users collection is empty
            user_count = await self.db.users.count_documents({})
            if user_count == 0:
                logger.warning("No users found. Seeding initial Admin User (PIN: 1111)...")
                await self.seed_admin_user()
            else:
                logger.info(f"Found {user_count} users. Skipping seed.")
                
        except Exception as e:
            logger.error(f"MongoDB Initialization Failed: {e}")
            raise e

    async def seed_admin_user(self):
        pin_hash = hashlib.sha256("1111".encode()).hexdigest()
        admin_user = {
            "id": "admin_user",
            # MongoDB uses _id, but our app logic relies on 'id' string often.
            # We store both for compatibility.
            "_id": "admin_user", 
            "name": "Admin User",
            "role": "OWNER",
            "venue_id": "venue_1",
            "pin_hash": pin_hash,
            "allowed_venue_ids": ["venue_1"],
            "mfa_enabled": False,
            "status": "active",
            "created_at": "2026-01-27T00:00:00Z"
        }
        
        venue = {
            "id": "venue_1",
            "_id": "venue_1",
            "name": "Malta Head Office",
            "type": "fine_dining",
            "slug": "malta-head-office",
            "location": "Valletta",
            "currency": "EUR"
        }

        await self.db.users.insert_one(admin_user)
        logger.info("Admin User seeded.")
        
        # Check venue too
        if await self.db.venues.count_documents({}) == 0:
            await self.db.venues.insert_one(venue)
            logger.info("Default Venue seeded.")
