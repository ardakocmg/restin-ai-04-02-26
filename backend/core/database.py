# from motor.motor_asyncio import AsyncIOMotorClient
# from .config import MONGO_URL, DB_NAME
# 
# # MongoDB connection
# # client = AsyncIOMotorClient(MONGO_URL)
# # db = client[DB_NAME]
# 
from .mock_database import MockDatabase, MockClient

print("WARNING: Using Mock Database (MongoDB not found)")
db = MockDatabase()
client = MockClient(db)

def get_database():
    """Return database instance"""
    return db
