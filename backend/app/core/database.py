"""
Central MongoDB connection module.
Single source of truth for database access across all domains.

Provides both async (Motor) and sync (PyMongo) connections.
Motor is used for most endpoints; PyMongo sync is used for 
large collections where Motor hangs (e.g. recipes_engineered).
"""
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient
import os

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "restin_v2")

_async_client: AsyncIOMotorClient = None
_async_db = None
_sync_client: MongoClient = None
_sync_db = None


def get_database():
    """Get the async MongoDB database instance (Motor - for most endpoints)."""
    global _async_client, _async_db
    if _async_db is None:
        _async_client = AsyncIOMotorClient(MONGO_URL)
        _async_db = _async_client[DB_NAME]
    return _async_db

# Alias for backward compatibility
get_db = get_database


def get_sync_database():
    """Get the sync MongoDB database instance (PyMongo - for large queries)."""
    global _sync_client, _sync_db
    if _sync_db is None:
        _sync_client = MongoClient(MONGO_URL)
        _sync_db = _sync_client[DB_NAME]
    return _sync_db


def get_client():
    """Get the raw async MongoDB client."""
    global _async_client
    if _async_client is None:
        _async_client = AsyncIOMotorClient(MONGO_URL)
    return _async_client
