from fastapi import APIRouter
from core.database import db
from core.security import hash_pin
from models import UserRole
from datetime import datetime, timezone
import random

router = APIRouter(tags=["Admin"])

async def force_seed_employees():
    """Force delete and reseeding of employees (Mock Compatible)"""
    print("Force Seeding sample employees (Mock Mode)...")
    
    # MockCollection trick: direct list clear since delete_many isn't implemented
    if hasattr(db.employees, 'data'):
        db.employees.data = []
    # If using Real Mongo, this attribute won't exist, so we try standard method
    elif hasattr(db.employees, 'delete_many'):
        await db.employees.delete_many({})
    
    # Sample employees matching our Venues
    employees = [
        # Caviar & Bull Team
        {"id": "emp-cb-001", "venue_id": "venue-caviar-bull", "name": "Maria Vella", "full_name": "Maria Vella", "email": "maria@caviarbull.com", "role": "server", "employment_status": "active"},
        {"id": "emp-cb-002", "venue_id": "venue-caviar-bull", "name": "David Borg", "full_name": "David Borg", "email": "david@caviarbull.com", "role": "server", "employment_status": "active"},
        {"id": "emp-cb-003", "venue_id": "venue-caviar-bull", "name": "Chef Marco", "full_name": "Marco Rossi", "email": "marco@caviarbull.com", "role": "chef", "employment_status": "active"},
        
        # Don Royale Team
        {"id": "emp-dr-001", "venue_id": "venue-don-royale", "name": "Paul Grech", "full_name": "Paul Grech", "email": "paul@donroyale.com", "role": "server", "employment_status": "active"},
        {"id": "emp-dr-002", "venue_id": "venue-don-royale", "name": "Lisa Farrugia", "full_name": "Lisa Farrugia", "email": "lisa@donroyale.com", "role": "server", "employment_status": "active"},
        
        # Sole Team
        {"id": "emp-st-001", "venue_id": "venue-sole-tarragon", "name": "Mark Galea", "full_name": "Mark Galea", "email": "mark@soletarragon.com", "role": "server", "employment_status": "active"},
    ]
    
    # Use loop for insert since insert_many might fail on mock
    for emp in employees:
         await db.employees.insert_one(emp)
         
    print(f"Reset and Seeded {len(employees)} employees")
    return len(employees)

async def generate_unique_pin(venue_id: str) -> str:
    """Generate a unique 4-digit PIN for the given venue"""
    for _ in range(100):
        pin = f"{random.randint(0, 9999):04d}"
        pin_hash = hash_pin(pin)
        
        existing = await db.users.find_one({
            "venue_id": venue_id,
            "pin_hash": pin_hash
        }, {"_id": 1})
        
        if not existing:
            return pin
            
    return f"{random.randint(0, 99999):05d}"

@router.get("/admin/sync-users-now")
async def sync_users_endpoint():
    """Sync Employees to Users with UNIQUE PINs"""
    print("Starting User Sync with Unique PINs...")
    
    # Always force seed for this recovery tool
    seeded_count = await force_seed_employees()
    
    # Query all active
    employees = await db.employees.find({"employment_status": "active"}).to_list(2000)
    
    users_created = []
    users_updated = 0
    
    for emp in employees:
        emp_id = emp["id"]
        email = emp.get("email") or f"{emp['id']}@placeholder.com"
        name = emp["name"]
        venue_id = emp.get("venue_id")
        
        existing_user = await db.users.find_one({
            "$or": [
                {"employee_id": emp_id}, 
                {"email": email}
            ]
        })
        
        if existing_user:
            if "employee_id" not in existing_user:
                await db.users.update_one({"id": existing_user["id"]}, {"$set": {"employee_id": emp_id}})
                users_updated += 1
        else:
            # Generate Unique PIN
            plain_pin = await generate_unique_pin(venue_id)
            pin_hash = hash_pin(plain_pin)
            
            user_doc = {
                "id": emp_id,
                "venue_id": venue_id,
                "name": name,
                "email": email,
                "role": UserRole.STAFF,
                "pin_hash": pin_hash,
                "employee_id": emp_id,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "is_active": True,
                "allowed_venue_ids": [venue_id] if venue_id else []
            }
            await db.users.insert_one(user_doc)
            users_created.append({
                "name": name,
                "pin": plain_pin,
                "venue_id": venue_id
            })

    print(f"Generated {len(users_created)} new users from {len(employees)} employees.")

    return {
        "message": "Sync complete",
        "debug_seed_count": seeded_count,
        "debug_employees_found_count": len(employees),
        "created_count": len(users_created),
        "updated_count": users_updated,
        "new_credentials": users_created 
    }

def create_user_sync_router():
    return router
