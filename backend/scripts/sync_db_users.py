import sys
import os
import asyncio
from datetime import datetime, timezone

# Add backend directory to sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
sys.path.append(backend_dir)

from core.database import db, client
from core.security import hash_pin
from models import UserRole

async def sync_users():
    print("Starting Employee -> User Sync...")
    
    # 1. Fetch all employees
    employees = await db.employees.find({"employment_status": "active"}).to_list(1000)
    print(f"Found {len(employees)} active employees.")
    
    users_created = 0
    users_updated = 0
    
    for emp in employees:
        emp_id = emp["id"]
        email = emp.get("email") or f"{emp['id']}@placeholder.com"
        name = emp["name"]
        venue_id = emp.get("venue_id")
        
        # Check if user exists by Employee ID or Email
        existing_user = await db.users.find_one({
            "$or": [
                {"employee_id": emp_id}, 
                {"email": email}
            ]
        })
        
        default_pin_hash = hash_pin("1234")
        
        if existing_user:
            # OPTIONAL: Reset PIN if requested? No, user said "fill missing parts", not overwrite existing users.
            # But let's ensure employee_id is linked if missing.
            update_data = {}
            if "employee_id" not in existing_user:
                 update_data["employee_id"] = emp_id
            
            if update_data:
                await db.users.update_one({"id": existing_user["id"]}, {"$set": update_data})
                print(f"   Updated existing user for {name}")
                users_updated += 1
            else:
                print(f"   User exists for {name}")
        else:
            # Create NEW User
            user_doc = {
                "id": emp_id, # Reuse ID for simplicity if possible, or new UUID. Let's use Emp ID as User ID for 1:1 map if valid UUID.
                # Actually, auth system might expect specific ID format. Let's use emp["id"] as user["id"] to keep them tight.
                "venue_id": venue_id,
                "name": name,
                "email": email,
                "role": UserRole.STAFF,
                "pin_hash": default_pin_hash,
                "employee_id": emp_id,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "is_active": True,
                # Default permissions? Role based.
            }
            try:
                # Check if ID collision in users (unlikely if UUID)
                await db.users.insert_one(user_doc)
                print(f"   Created user for {name} (PIN: 1234)")
                users_created += 1
            except Exception as e:
                print(f"   Error creating user for {name}: {e}")

    print(f"\nSync Complete.")
    print(f"   - Created: {users_created}")
    print(f"   - Updated: {users_updated}")

if __name__ == "__main__":
    try:
        if "MONGO_URL" not in os.environ:
             os.environ["MONGO_URL"] = "mongodb://localhost:27017"
        
        try:
             # Just try to print it, if fails, assume mock or connection okay but no address prop
             if hasattr(db, "client"):
                 print(f"Connection Status: {db.client.address if hasattr(db.client, 'address') else 'Connected (No Address)'}")
        except Exception as e:
             print(f"Connection Warning: {e}")
             
        asyncio.run(sync_users())
    except KeyboardInterrupt:
        print("\nCancelled.")
    except Exception as e:
        print(f"\nFatal Error: {e}")
