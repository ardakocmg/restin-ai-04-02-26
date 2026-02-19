import asyncio
import os
import shutil
import uuid
import hashlib
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

# Setup paths
PROJ_ROOT = Path(r"c:\Users\MG Group\.gemini\antigravity\scratch\main-new2801-with-hr\main-new2801-with-hr-main\main-new2801-with-hr-main")
BACKEND_DIR = PROJ_ROOT / "backend"
DOWNLOADS_DIR = Path(r"C:\Users\MG Group\Downloads")
UPLOAD_BASE = PROJ_ROOT / "data" / "uploads"

# Load env from backend/.env
load_dotenv(BACKEND_DIR / ".env")

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "restin_v2")

VENUE_ID = "venue-caviar-bull"
EMPLOYEE_CODE = "0307741A" # Using ID No as Code

def hash_file(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()

async def seed_arda_real():
    print(f"Starting real-data migration for Arda Koc...")
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    # 1. Ensure Employee Record
    arda_data = {
        "id": EMPLOYEE_CODE,
        "display_id": f"EMP-{EMPLOYEE_CODE}",
        "venue_id": VENUE_ID,
        "name": "ARDA KOC",
        "short_name": "KOC",
        "email": "arda.koc@corinthiahotel.com",
        "phone": "+356 99999999",
        "address": {
            "full_address": "23, Triq In-Nixxiegha, Mellieha, Malta",
            "city": "Mellieha",
            "country": "Malta"
        },
        "id_number": "0307741A",
        "ss_number": "D70158083",
        "pe_number": "456398",
        "occupation": "IN HOUSE STRATEGIST",
        "employment_type": "part_time",
        "status": "active",
        "payroll": {
            "hourly_rate": 25.00,
            "currency": "EUR",
            "tax_rate_type": "Part Time Standard"
        },
        "updated_at": datetime.now(timezone.utc).isoformat()
    }

    await db.employees.update_one(
        {"id": EMPLOYEE_CODE},
        {"$set": arda_data},
        upsert=True
    )
    print(f"Employee record created/updated for Arda Koc ({EMPLOYEE_CODE})")

    # 2. Search and Upload Documents
    # Keywords to look for
    keywords = ["Arda", "Koc", "Payslip", "FS3"]
    
    # Files we definitely want if they exist
    target_files = [
        "Contract Arda Koc .pdf",
        "FS3.pdf",
        "Payslip_ARDA_KOC_(KOC)_Dec25.pdf",
    ]
    
    # Also look for any file with Arda/Koc/Payslip in the name
    all_down_files = os.listdir(DOWNLOADS_DIR)
    relevant_files = []
    
    for f in all_down_files:
        if any(kw.lower() in f.lower() for kw in keywords):
            relevant_files.append(f)
            
    # Remove duplicates
    relevant_files = list(set(relevant_files))
    print(f"Found {len(relevant_files)} potentially relevant files in Downloads.")

    upload_dir = UPLOAD_BASE / VENUE_ID
    os.makedirs(upload_dir, exist_ok=True)

    imported_count = 0
    for filename in relevant_files:
        src_path = DOWNLOADS_DIR / filename
        if not src_path.is_file(): continue
        
        try:
            with open(src_path, "rb") as f:
                content = f.read()
            
            f_hash = hash_file(content)
            
            # Identify MIME
            ext = src_path.suffix.lower()
            mime = "application/pdf" if ext == ".pdf" else "image/jpeg" if ext in [".jpg", ".jpeg"] else "application/octet-stream"
            
            # Check if exists in DB
            existing = await db.documents.find_one({"hash": f_hash, "venue_id": VENUE_ID})
            if existing:
                # Link to employee if not already linked
                await db.documents.update_one(
                    {"id": existing["id"]},
                    {"$set": {"entity_type": "employee", "entity_id": EMPLOYEE_CODE}}
                )
                print(f"  - {filename} already exists, ensuring link.")
                continue

            doc_id = str(uuid.uuid4())
            dest_filename = f"{doc_id}_{filename}"
            dest_path = upload_dir / dest_filename
            
            with open(dest_path, "wb") as f:
                f.write(content)
                
            doc_entry = {
                "id": doc_id,
                "display_id": f"DOC-{doc_id[:8].upper()}",
                "venue_id": VENUE_ID,
                "module": "HR",
                "entity_type": "employee",
                "entity_id": EMPLOYEE_CODE,
                "filename": filename,
                "mime": mime,
                "size": len(content),
                "hash": f_hash,
                "file_path": str(dest_path),
                "created_by": "system_bridge",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            # Special tags based on name
            if "payslip" in filename.lower():
                doc_entry["category"] = "PAYSLIP"
            elif "fs3" in filename.lower():
                doc_entry["category"] = "COMPLIANCE"
            elif "contract" in filename.lower():
                doc_entry["category"] = "CONTRACT"

            await db.documents.insert_one(doc_entry)
            imported_count += 1
            print(f"  + Imported {filename}")

        except Exception as e:
            print(f"  ! Error importing {filename}: {e}")

    print(f"\nMigration completed. Imported {imported_count} new files.")

if __name__ == "__main__":
    asyncio.run(seed_arda_real())
