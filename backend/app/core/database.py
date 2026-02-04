from motor.motor_asyncio import AsyncIOMotorClient
from backend.app.core.config import settings

class Database:
    client: AsyncIOMotorClient = None

db = Database()

async def get_db():
    return db.client[settings.DB_NAME]

async def connect_to_mongo():
    db.client = AsyncIOMotorClient(settings.MONGO_URI)
    
    # Initialize Indexes
    database = db.client[settings.DB_NAME]
    
    # User Email Unique Index
    await database.users.create_index("email", unique=True)
    
    # Profile & Secret UserID Indexes
    await database.profiles.create_index("user_id", unique=True)
    await database.secrets.create_index("user_id", unique=True)
    
    print("Connected to MongoDB & Indexes Verified.")

async def close_mongo_connection():
    db.client.close()
