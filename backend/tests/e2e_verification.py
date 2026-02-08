import sys
import os
import requests
import json
import uuid
import time
from datetime import datetime

# Add backend root to path to import core modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

try:
    from core.security import create_jwt_token
    from models import UserRole
except ImportError:
    # Fallback if imports fail (e.g. env issues), though they shouldn't in this env
    print("⚠️ Could not import backend modules directly. Authentication might fail if JWT_SECRET is needed.")
    sys.exit(1)

BASE_URL = "http://localhost:8000/api"
VENUE_ID = "venue-caviar-bull"
USER_ID = "test-owner-e2e"

def get_auth_headers():
    token = create_jwt_token(
        user_id=USER_ID,
        venue_id=VENUE_ID,
        role="OWNER",
        device_id="e2e-test-script"
    )
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

def run_test_step(name, func, *args):
    print(f"\n[TEST] Testing: {name}...")
    try:
        result = func(*args)
        print(f"[PASS] {name} Passed")
        return result
    except Exception as e:
        print(f"[FAIL] {name} Failed: {str(e)}")
        # Don't exit, try to continue to see other failures
        return None

def test_health():
    resp = requests.get(f"http://localhost:8000/api/system/version")
    if resp.status_code != 200:
        raise Exception(f"Backend unhealthy: {resp.status_code}")
    print(f"   System Version: {resp.json().get('version_name')}")

def test_create_inventory_item(headers):
    # Create an ingredient to play with
    item_id = str(uuid.uuid4())
    payload = {
        "venue_id": VENUE_ID,
        "name": f"E2E Test Ingredient {item_id[:8]}",
        "sku": f"SKU-{item_id[:8]}",
        "unit": "kg",
        "min_stock": 5
    }
    # We need to inject the ID into the payload or let backend gen it?
    # Backend model `InventoryItemCreate` doesn't take ID, but `InventoryItem` does.
    # The route `create_inventory_item` uses `InventoryItemCreate`.
    # We will let backend generate ID but we need to capture it from response.
    
    resp = requests.post(f"{BASE_URL}/inventory/items", headers=headers, json=payload)
    if resp.status_code != 200:
        raise Exception(f"Create Item failed: {resp.text}")
    
    data = resp.json()
    item_id = data["id"]
    print(f"   Created Item: {data['name']} (ID: {item_id})")
    
    # Init stock via Ledger (Manual Adjustment)
    ledger_payload = {
        "item_id": item_id,
        "action": "in",
        "quantity": 100,
        "reason": "E2E Initial Stock",
        "lot_number": "LOT-E2E-001"
    }
    resp_ledger = requests.post(f"{BASE_URL}/inventory/ledger", headers=headers, json=ledger_payload)
    if resp_ledger.status_code != 200:
        raise Exception(f"Init Stock failed: {resp_ledger.text}")
    
    print(f"   Added 100kg stock")
    return item_id

def test_create_recipe(headers, item_id):
    payload = {
        "recipe_name": f"E2E Recipe {int(time.time())}",
        "description": "Created by E2E Test",
        "ingredients": [{
            "item_id": item_id,
            "item_name": "E2E Ingredient",
            "quantity": 0.5,
            "unit": "kg",
            "unit_cost": 10.0,
            "total_cost": 5.0
        }],
        "servings": 10,
        "prep_time_minutes": 15
    }
    
    resp = requests.post(f"{BASE_URL}/venues/{VENUE_ID}/recipes/engineered", headers=headers, json=payload)
    if resp.status_code != 200:
        raise Exception(f"Create Recipe failed: {resp.text}")
    
    data = resp.json()
    print(f"   Created Recipe: {data['recipe_name']} (ID: {data['id']})")
    return data['id']

def test_production_batch(headers, recipe_id):
    # Create Batch
    # We need a recipe ID. Let's use a fake one as the `ProductionBatch` doesn't strictly foreign-key check against a relational DB in this MongoDB setup unless explicitly coded.
    # The route checks `recipe_id`? `ProductionBatch` model has it.
    # The code doesn't explicitly look up the recipe to validate existence in the `create` endpoint inside `production_routes.py`... 
    # Wait, let's verify `production_routes.py`. It largely just inserts.
    
    payload = {
        "venue_id": VENUE_ID,
        "recipe_id": recipe_id,
        "batch_number": f"BATCH-E2E-{int(time.time())}",
        "planned_quantity": 10,
        "unit": "portions",
        "status": "PLANNED"
    }
    
    resp = requests.post(f"{BASE_URL}/inventory/production-batches", headers=headers, json=payload)
    if resp.status_code != 200:
        raise Exception(f"Create Batch failed: {resp.text}")
    
    data = resp.json()
    print(f"   Created Batch: {data['batch_number']} (ID: {data['id']})")
    return data['id']

def test_waste_log(headers, item_id):
    payload = {
        "venue_id": VENUE_ID,
        "item_id": item_id,
        "item_name": "E2E Test Ingredient",
        "item_type": "INGREDIENT",
        "quantity": 2.5,
        "unit": "kg",
        "reason": "SPOILAGE",
        "notes": "E2E Test Waste"
    }
    
    resp = requests.post(f"{BASE_URL}/inventory/waste", headers=headers, json=payload)
    if resp.status_code != 200:
        raise Exception(f"Log Waste failed: {resp.text}")
    
    data = resp.json()
    print(f"   Logged Waste: {data['quantity']} {data['unit']} due to {data['reason']}")

def test_stock_transfer(headers, item_id):
    # We need a 'to_venue_id'. We can use the same venue for loopback test if logic permits
    # or creates a temp venue.
    # Transfer logic: 
    # from_venue_id = venue_id (context)
    # to_venue_id = payload
    
    # Let's create a dummy venue
    dummy_venue_id = f"venue-dummy-{uuid.uuid4()}"
    # We can't easily create a venue without being owner, but we ARE owner.
    # But `transfer_inventory` endpoint...
    # `to_venue_id` just needs to be a string. The logic checks `from_venue_id` access.
    # It attempts to find/create item in destination.
    
    payload = {
        "to_venue_id": dummy_venue_id,
        "item_id": item_id,
        "quantity": 5.0,
        "reason": "E2E Transfer"
    }
    
    resp = requests.post(f"{BASE_URL}/venues/{VENUE_ID}/inventory/transfer", headers=headers, json=payload)
    if resp.status_code != 200:
         # It might fail if destination venue doesn't exist?
         # The code: `dest_item = ... find_one({"venue_id": to_venue_id...})`.
         # It doesn't strictly check if venue doc exists, it just uses the ID.
         # So this should work and auto-create the item in the "void" venue.
        raise Exception(f"Transfer failed: {resp.text}")
    
    data = resp.json()
    print(f"   Transferred 5.0kg to {dummy_venue_id}")

def test_pos_session(headers):
    # Open Session
    payload = {
        "venue_id": VENUE_ID,
        "user_id": USER_ID,
        "device_id": "e2e-pos-device",
        "opening_balance_cents": 10000 
    }
    
    resp = requests.post(f"{BASE_URL}/pos/sessions/open", headers=headers, json=payload)
    if resp.status_code != 200:
        raise Exception(f"Open Session failed: {resp.text}")
    
    data = resp.json()
    session_id = data["session"]["id"]
    print(f"   Opened POS Session: {session_id}")
    
    # Close Session
    close_payload = {
        "closing_balance_cents": 15000,
        "notes": "E2E Close"
    }
    
    resp_close = requests.post(f"{BASE_URL}/pos/sessions/{session_id}/close", headers=headers, json=close_payload)
    if resp_close.status_code != 200:
        raise Exception(f"Close Session failed: {resp_close.text}")
        
    print(f"   Closed POS Session: {session_id}")

def run_all():
    headers = get_auth_headers()
    print(f"[AUTH] Generated Auth Token for {USER_ID}")
    
    run_test_step("System Health", test_health)
    
    # Shared item for inventory tests
    item_id = run_test_step("Create Inventory Item & Stock", test_create_inventory_item, headers)
    
    if item_id:
        recipe_id = run_test_step("Create Recipe", test_create_recipe, headers, item_id)
        if recipe_id:
            run_test_step("Production Batch Create", test_production_batch, headers, recipe_id)
            
        run_test_step("Waste Logging", test_waste_log, headers, item_id)
        run_test_step("Stock Transfer", test_stock_transfer, headers, item_id)
    
    run_test_step("POS Session Cycle", test_pos_session, headers)
    
    print("\n[DONE] E2E Verification Complete")

if __name__ == "__main__":
    run_all()
