import logging
from datetime import datetime
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorDatabase
from passlib.context import CryptContext

from backend.app.core.config import settings
from backend.app.core.database import db, get_db, connect_to_mongo, close_mongo_connection
from backend.app.models.schemas import (
    UserCreate, UserInDB, ProfilePublic, SecretVault, 
    SecretData, PayrollResult
)
from backend.app.core.crypto.envelope import crypto
from backend.app.services.malta_payroll import calculate_payroll

# Logging Setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("malta_hr_api")

app = FastAPI(title=settings.PROJECT_NAME)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup/Shutdown Events
app.add_event_handler("startup", connect_to_mongo)
app.add_event_handler("shutdown", close_mongo_connection)

# Password Hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --- Dependencies ---
def get_password_hash(password):
    return pwd_context.hash(password)

# --- Endpoints ---

@app.post("/auth/register", status_code=status.HTTP_201_CREATED)
async def register(user: UserCreate, db_conn: AsyncIOMotorDatabase = Depends(get_db)):
    """
    Unified Registration: Creates User + Profile + Empty Secret Vault.
    """
    # 1. Check existing
    existing = await db_conn.users.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # 2. Create User
    user_id = str(user.email) # Simplistic ID for demo, usually UUID or ObjectID
    # Better to use ObjectID but user.email is unique. Let's use ObjectID logic if possible or just generate one.
    # To keep accordance with 'schemas', UserInDB has string ID. Let's stick to generating a string ID? 
    # Or just let Mongo generate it. 
    # We'll let Mongo generate it and use that.
    
    hashed_pw = get_password_hash(user.password)
    user_doc = {
        "email": user.email,
        "hashed_password": hashed_pw,
        "role": user.role,
        "is_active": True
    }
    result = await db_conn.users.insert_one(user_doc)
    new_user_id = str(result.inserted_id)

    # 3. Create Empty Profile
    profile_doc = {
        "user_id": new_user_id,
        "name": "Pending",
        "surname": "Setup",
        "department": "TBD",
        "locality": "Malta",
        "job_title": "Employed"
    }
    await db_conn.profiles.insert_one(profile_doc)

    # 4. Create Empty Secret Vault (or initialized with dummy safe data)
    # We just create an empty record or similar. 
    # Actually, let's encrypt an empty valid structure so it exists.
    empty_secrets = {
        "salary": 0.0,
        "iban": "",
        "id_card": "",
        "medical_notes": ""
    }
    encrypted_blob = crypto.encrypt_data(empty_secrets, new_user_id)
    secret_doc = {
        "user_id": new_user_id,
        **encrypted_blob
    }
    await db_conn.secrets.insert_one(secret_doc)

    return {"msg": "User created successfully with unified profile and vault", "user_id": new_user_id}

@app.post("/hr/onboard-secrets")
async def onboard_secrets(
    user_id: str, 
    secrets: SecretData, 
    db_conn: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Encrypts & Saves sensitive data.
    """
    # Verify user exists
    user = await db_conn.users.find_one({"_id": user_id}) # Note: need to handle ObjectId conversion if we used it. 
    # Users collection uses ObjectId by default.
    from bson import ObjectId
    try: 
        oid = ObjectId(user_id)
        user = await db_conn.users.find_one({"_id": oid})
    except:
        user = None

    if not user:
         raise HTTPException(status_code=404, detail="User not found")

    encrypted_blob = crypto.encrypt_data(secrets.dict(), user_id)
    
    # Update or Insert
    await db_conn.secrets.update_one(
        {"user_id": user_id}, 
        {"$set": encrypted_blob},
        upsert=True
    )
    
    return {"msg": "Secrets securely onboarded"}

@app.get("/api/hr/feature-flags")
async def get_feature_flags(venue_id: str):
    """
    Mock feature flags for HR module.
    """
    return {
        "payroll_enabled": True,
        "shift_scheduling": True,
        "time_tracking": True,
        "performance_reviews": False,
        "recruitment": False,
        "venue_id": venue_id
    }

@app.get("/hr/profile/{user_id}", response_model=ProfilePublic)
async def get_profile(user_id: str, db_conn: AsyncIOMotorDatabase = Depends(get_db)):
    profile = await db_conn.profiles.find_one({"user_id": user_id})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile

@app.get("/hr/reveal/{user_id}", response_model=SecretData)
async def reveal_secrets(user_id: str, db_conn: AsyncIOMotorDatabase = Depends(get_db)):
    """
    Audit Log -> Decrypt Secrets -> Return JSON.
    """
    # 1. Audit Log (Simplistic print/log here, in prod strictly db table)
    logger.warning(f"AUDIT: Secrets accessed for user {user_id} at {datetime.utcnow()}")
    
    # 2. Fetch Vault
    vault = await db_conn.secrets.find_one({"user_id": user_id})
    if not vault:
        raise HTTPException(status_code=404, detail="Secrets vault not found")
        
    # 3. Decrypt
    try:
        decrypted = crypto.decrypt_data(vault, user_id)
        return decrypted
    except Exception as e:
        logger.error(f"Decryption failed: {e}")
        raise HTTPException(status_code=500, detail="Decryption integrity check failed")

@app.post("/payroll/run/{user_id}", response_model=PayrollResult)
async def run_payroll(user_id: str, db_conn: AsyncIOMotorDatabase = Depends(get_db)):
    """
    Fetch Encrypted Salary -> Decrypt -> Calculate -> Return Result.
    """
    # 1. Fetch & Decrypt Salary
    vault = await db_conn.secrets.find_one({"user_id": user_id})
    if not vault:
        raise HTTPException(status_code=404, detail="Secrets vault not found")
    
    try:
        decrypted = crypto.decrypt_data(vault, user_id)
        gross = decrypted.get("salary", 0.0)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Could not access salary data")
        
    # 2. Calculate
    result = calculate_payroll(gross)
    
    return result

@app.get("/")
async def health_check():
    return {"status": "ok", "system": "Malta HR Fortress"}

# --- Legacy/Bridge Endpoints for Frontend Compatibility ---

@app.get("/api/venues")
async def get_venues():
    """
    Mock venues list to satisfy frontend requirements.
    """
    return [
        {
            "id": "venue_1",
            "name": "The Fortress Club",
            "type": "Nightclub",
            "status": "Active",
            "currency": "EUR",
            "currency_symbol": "€",
             "pacing_enabled": True,
            "service_style": "Table Service"
        },
        {
            "id": "venue_01",
            "name": "The Fortress Club (Legacy)",
            "type": "Nightclub",
            "status": "Active"
        },
        {
            "id": "venue_02",
            "name": "Sky Bar Malta",
            "type": "Bar",
            "status": "Active"
        }
    ]

@app.get("/api/system/version")
async def get_version():
    return {"version": "2.5.0", "build": "2026.02.04"}

@app.post("/api/auth/login/pin")
async def login_pin(pin: str, app: str = None, deviceId: str = None):
    """
    Simple PIN Bridge. 
    Accepts '1111' or '1234' for admin access.
    Returns a mock token structure that the frontend expects.
    """
    if pin in ["1111", "1234"]:
        # Generate a dummy token or use a real JWT if needed. 
        # For now, we return a structure compatible with the frontend's expected 'user' object.
        return {
            "token": "mock_legacy_token_12345",
            "user": {
                "id": "legacy_admin_01",
                "name": "Admin User",
                "role": "admin",
                "permissions": ["all"]
            }
        }
    
    raise HTTPException(status_code=401, detail="Invalid PIN")

# --- Extended Mock Endpoints for Dashboard Parity ---

@app.get("/api/venues/{venue_id}/stats")
async def get_venue_stats(venue_id: str):
    return {
        "open_orders": 12,
        "occupied_tables": 8,
        "total_tables": 20,
        "pending_kds_tickets": 5,
        "low_stock_items": 2
    }

@app.get("/api/venues/{venue_id}/orders")
async def get_venue_orders(venue_id: str):
    return [
        {
            "id": "ord_123",
            "display_id": "101",
            "table_name": "T5",
            "status": "open",
            "total": 45.50
        },
         {
            "id": "ord_124",
            "display_id": "102",
            "table_name": "T2",
            "status": "printing",
            "total": 120.00
        }
    ]

@app.get("/api/venues/{venue_id}/inventory")
async def get_venue_inventory(venue_id: str):
    return {
        "items": [
             {
                "id": "prod_1",
                "name": "Beef Wellington",
                "category": "Dishes",
                "price": 28.50,
                "status": "published"
             },
             {
                "id": "prod_2",
                "name": "Chardonnay Glass",
                "category": "Drinks",
                "price": 8.50,
                "status": "published"
             }
        ]
    }

@app.get("/api/venues/{venue_id}/users")
async def get_venue_users(venue_id: str):
    return [
         {
            "id": "user_1",
            "name": "John Doe",
            "role": "Manager",
            "email": "john@example.com",
            "last_login": "2026-02-04T09:00:00"
        },
        {
            "id": "user_2",
            "name": "Jane Smith",
            "role": "Staff",
            "email": "jane@example.com",
            "last_login": null
        }
    ]

from typing import Optional

@app.get("/api/printers")
async def get_printers(venue_id: Optional[str] = None):
    return [
        {
            "id": "p1",
            "name": "Bar Printer",
            "type": "Bar",
            "location": "Bar",
            "ip": "192.168.1.100",
            "port": 9100,
            "template": "Bar",
            "status": "Online"
        }
    ]

@app.get("/api/printer-templates")
async def get_printer_templates():
    return [
        {
            "id": "1", "name": "Bar", "type": "Bar", "printer": "Bar", "backupPrinter": "",
            "titleText": "BAR", "greetingText": "", "promotionText": "",
            "fontName": "Arial", "fontSize": 35, "timesPrinted": 1,
            "bigFontName": "Arial-BoldMT", "bigFontSize": 50,
            "smallFontName": "Arial", "smallFontSize": 30,
            "itemNumberWidth": 0, "priceWidth": 0,
            "showCompany": False, "showCustomer": False, "showTotalPrice": False,
            "showWaiterTimes": True, "signalAccessory": False, "showSequenceNr": True, "showVAT": False,
            "printItemsSplit": "Don't split", "chooseLayout": "EN-MT"
        },
        {
            "id": "2", "name": "Kitchen STR", "type": "Kitchen", "printer": "Kitchen-Pass", "backupPrinter": "Kitchen-Pass",
            "titleText": "KITCHEN STR", "greetingText": "", "promotionText": "",
            "fontName": "Arial", "fontSize": 35, "timesPrinted": 2,
            "bigFontName": "Arial-BoldMT", "bigFontSize": 50,
            "smallFontName": "Arial", "smallFontSize": 25,
            "itemNumberWidth": 0, "priceWidth": 0,
            "showCompany": False, "showCustomer": False, "showTotalPrice": False,
            "showWaiterTimes": True, "signalAccessory": False, "showSequenceNr": True, "showVAT": False,
            "printItemsSplit": "Don't split", "chooseLayout": "EN-MT"
        }
    ]
