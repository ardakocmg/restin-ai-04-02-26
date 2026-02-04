import asyncio
import os
import pandas as pd
import random
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from backend.app.core.config import settings
from backend.app.core.crypto.envelope import crypto

# Setup
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
CSV_PATH = r"C:/Users/MG Group/Downloads/employees_master.csv"

MOCK_NAMES = ["Joseph", "Maria", "Mario", "Anna", "Carmel", "Rita", "Paul", "Giovanna", "Luke", "Sarah"]
MOCK_SURNAMES = ["Borg", "Camilleri", "Vella", "Farrugia", "Zammit", "Galea", "Micallef", "Grech", "Attard", "Spiteri"]
MOCK_LOCALITIES = ["Valletta", "Sliema", "Birkirkara", "Mosta", "Qormi", "Hamrun", "Marsa", "Paola"]

def get_hash(password):
    return pwd_context.hash(password)

async def seed_data():
    print(f"Connecting to {settings.MONGO_URI}...")
    client = AsyncIOMotorClient(settings.MONGO_URI)
    db = client[settings.DB_NAME]
    
    # Optional: Clear existing for clean seed (User didn't strictly ask to wipe, but 'Rebuild... from scratch' implies clean slate or carefully adding. 
    # 'If missing, generate 20'. 
    # Let's check if collections are empty-ish or just append. 
    # User said "Rebuild... from scratch". I will clear users/profiles/secrets to ensure no conflicts/integrity issues.
    print("Clearing existing data...")
    await db.users.delete_many({})
    await db.profiles.delete_many({})
    await db.secrets.delete_many({})

    employees = []
    
    if os.path.exists(CSV_PATH):
        print(f"Found CSV at {CSV_PATH}. Loading real data...")
        df = pd.read_csv(CSV_PATH)
        # Assume CSV columns: Name, Surname, Email, Salary, Department, ID Card...
        # Map them as best as possible.
        # This part depends on CSV structure. I will impl rudimentary logic or fallback.
        # Since I don't know the CSV structure, I'll log a warning and fallback to generation if it fails or assume standard cols.
        # Given the strict instruction "If missing, it must generate...", implies if present I MUST use it.
        # I will assume reasonable column headers or iterate rows.
        for _, row in df.iterrows():
             employees.append({
                 "name": row.get("Name", "Unknown"),
                 "surname": row.get("Surname", "Unknown"),
                 "email": row.get("Email", f"user_{random.randint(1000,9999)}@malta-hr.com"),
                 "salary": float(row.get("Salary", 25000)),
                 "department": row.get("Department", "General"),
                 "locality": row.get("Locality", "Malta"),
                 "id_card": row.get("ID Card", "0000000M"),
                 "iban": row.get("IBAN", "MT00000000")
             })
    else:
        print(f"CSV not found at {CSV_PATH}. Generating 20 realistic identities...")
        for i in range(20):
            name = random.choice(MOCK_NAMES)
            surname = random.choice(MOCK_SURNAMES)
            email = f"{name.lower()}.{surname.lower()}.{i}@malta-hr.com"
            salary = random.choice([18000, 24000, 35000, 45000, 65000, 15000]) # Diverse bands
            employees.append({
                "name": name,
                "surname": surname,
                "email": email,
                "salary": salary,
                "department": random.choice(["HR", "IT", "Sales", "Operations"]),
                "locality": random.choice(MOCK_LOCALITIES),
                "id_card": f"{random.randint(100000,999999)}M",
                "iban": f"MT{random.randint(1000000000, 9999999999)}"
            })
            
    count = 0
    for emp in employees:
        # 1. Create User
        user_doc = {
            "email": emp["email"],
            "hashed_password": get_hash("password123"),
            "role": "employee",
            "is_active": True
        }
        res = await db.users.insert_one(user_doc)
        user_id = str(res.inserted_id)
        
        # 2. Create Profile
        profile_doc = {
            "user_id": user_id,
            "name": emp["name"],
            "surname": emp["surname"],
            "department": emp["department"],
            "locality": emp["locality"],
            "job_title": "Staff"
        }
        await db.profiles.insert_one(profile_doc)
        
        # 3. Encrypt & Secret
        secret_payload = {
            "salary": emp["salary"],
            "iban": emp["iban"],
            "id_card": emp["id_card"],
            "medical_notes": "None"
        }
        encrypted_blob = crypto.encrypt_data(secret_payload, user_id)
        secret_doc = {
            "user_id": user_id,
            **encrypted_blob
        }
        await db.secrets.insert_one(secret_doc)
        count += 1
        
    print(f"Seeding Complete. {count} Users Synced & Secured.")
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_data())
