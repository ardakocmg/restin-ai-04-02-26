"""
Central MongoDB connection module.
Single source of truth for database access across all domains.
"""
from motor.motor_asyncio import AsyncIOMotorClient
import os

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "restin_v2")

_client: AsyncIOMotorClient = None
_db = None


def get_database():
    """Get the MongoDB database instance (singleton)."""
    global _client, _db
    if _db is None:
        _client = AsyncIOMotorClient(MONGO_URL)
        _db = _client[DB_NAME]
    return _db


def get_client():
    """Get the raw MongoDB client."""
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(MONGO_URL)
    return _client
