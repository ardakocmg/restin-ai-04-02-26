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
    employees = await db.employees.find({"$or": [{"employment_status": "active"}, {"status": "active"}]}).to_list(1000)
    print(f"Found {len(employees)} active employees.")
    
    users_created = 0
    users_updated = 0
    
    # Pre-load existing PINs per venue to avoid collisions
    existing_users_list = await db.users.find({}, {"_id": 0, "venue_id": 1, "pin_hash": 1}).to_list(10000)
    used_pins_per_venue: dict[str, set] = {}
    for u in existing_users_list:
        vid = u.get("venue_id", "")
        if vid not in used_pins_per_venue:
            used_pins_per_venue[vid] = set()
        used_pins_per_venue[vid].add(u.get("pin_hash", ""))
    
    def generate_unique_pin(venue_id: str) -> str:
        """Generate a unique 4-digit PIN not already used in this venue."""
        import random
        used = used_pins_per_venue.get(venue_id, set())
        for _ in range(9000):  # Max attempts
            pin = str(random.randint(1000, 9999))
            pin_h = hash_pin(pin)
            if pin_h not in used:
                used.add(pin_h)
                if venue_id not in used_pins_per_venue:
                    used_pins_per_venue[venue_id] = set()
                used_pins_per_venue[venue_id].add(pin_h)
                return pin
        # Fallback: 5-digit
        return str(random.randint(10000, 99999))
    
    for emp in employees:
        emp_id = emp["id"]
        email = emp.get("email") or f"{emp['id']}@placeholder.com"
        name = emp.get("name") or f"{emp.get('first_name', '')} {emp.get('last_name', '')}".strip()
        venue_id = emp.get("venue_id") or emp.get("venueId")
        
        # Check if user exists by Employee ID or Email
        existing_user = await db.users.find_one({
            "$or": [
                {"employee_id": emp_id}, 
                {"email": email}
            ]
        })
        
        if existing_user:
            # Ensure employee_id is linked if missing.
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
            # Create NEW User with UNIQUE PIN
            unique_pin = generate_unique_pin(venue_id or "")
            user_doc = {
                "id": emp_id,
                "venue_id": venue_id,
                "name": name,
                "email": email,
                "role": UserRole.STAFF,
                "pin_hash": hash_pin(unique_pin),
                "employee_id": emp_id,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "is_active": True,
            }
            try:
                await db.users.insert_one(user_doc)
                print(f"   Created user for {name} (PIN: {unique_pin})")
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
