import requests
import json

BASE_URL = "http://localhost:8000"

def test_transfer():
    # 1. Login
    print("Logging in...")
    # Using /api/auth/login/pin which is the robust flow
    resp = requests.post(f"{BASE_URL}/api/auth/login/pin", params={"pin": "1111", "app": "admin"})
    if resp.status_code != 200:
        print("Login failed:", resp.text)
        return
    token = resp.json()["accessToken"]
    headers = {"Authorization": f"Bearer {token}"}
    print("Logged in.")

    # 2. Get Venues
    print("Fetching venues...")
    resp = requests.get(f"{BASE_URL}/api/venues", headers=headers)
    venues = resp.json()
    if len(venues) < 2:
        print("Not enough venues to test transfer (need at least 2).")
        # Try to use the same venue if only 1 exists, but transfer usually implies different venues.
        # If strict transfer, it might fail.
        # Let's check if we can transfer to self (some systems allow location transfer within venue, but here it is venue-to-venue)
        # If only 1 venue, we might need to skip or mock.
        # Assuming we have at least 'venue-caviar-bull' and maybe another one from previous setup or mock.
        # If only 1, we can't fully test venue-to-venue transfer.
        pass
    
    source_venue = venues[0]
    dest_venue = venues[1] if len(venues) > 1 else venues[0]
    
    print(f"Source: {source_venue['id']}, Dest: {dest_venue['id']}")

    # 3. Get Inventory Item from Source
    print(f"Fetching inventory for {source_venue['id']}...")
    resp = requests.get(f"{BASE_URL}/api/venues/{source_venue['id']}/inventory", headers=headers)
    items = resp.json()["items"]
    if not items:
        print("No items in source venue. Creating one...")
        # Create item
        new_item = {
            "venue_id": source_venue['id'],
            "name": "Test Transfer Item",
            "sku": "TEST-TR-001",
            "unit": "each",
            "min_stock": 10
        }
        resp = requests.post(f"{BASE_URL}/api/inventory/items", json=new_item, headers=headers)
        item = resp.json()
        # Add stock
        requests.post(f"{BASE_URL}/api/inventory/ledger", json={
            "item_id": item['id'],
            "action": "in",
            "quantity": 100,
            "reason": "Initial Stock"
        }, headers=headers)
        item["current_stock"] = 100
        print("Created item with 100 stock.")
    else:
        item = items[0]
        # Ensure positive stock
        if item['current_stock'] < 10:
             requests.post(f"{BASE_URL}/api/inventory/ledger", json={
                "item_id": item['id'],
                "action": "in",
                "quantity": 100,
                "reason": "Topup for test"
            }, headers=headers)
             item['current_stock'] += 100

    print(f"Item: {item['name']} ({item['id']}), Stock: {item['current_stock']}")

    # 4. Perform Transfer
    transfer_qty = 5
    print(f"Transferring {transfer_qty} to {dest_venue['id']}...")
    
    payload = {
        "item_id": item['id'],
        "to_venue_id": dest_venue['id'],
        "quantity": transfer_qty,
        "reason": "API Test Transfer"
    }
    
    resp = requests.post(
        f"{BASE_URL}/api/venues/{source_venue['id']}/inventory/transfer",
        json=payload,
        headers=headers
    )
    
    if resp.status_code == 200:
        print("Transfer successful:", resp.json()["message"])
    else:
        print("Transfer failed:", resp.status_code, resp.text)
        return

    # 5. Verify Source Stock
    print("Verifying source stock...")
    resp = requests.get(f"{BASE_URL}/api/venues/{source_venue['id']}/inventory", headers=headers)
    updated_items = resp.json()["items"]
    updated_item = next(i for i in updated_items if i['id'] == item['id'])
    print(f"Source Stock: {updated_item['current_stock']} (Expected: {item['current_stock'] - transfer_qty})")

    # 6. Verify Dest Stock
    print("Verifying dest stock...")
    resp = requests.get(f"{BASE_URL}/api/venues/{dest_venue['id']}/inventory", headers=headers)
    dest_items = resp.json()["items"]
    # Find by SKU
    dest_item = next((i for i in dest_items if i['sku'] == item['sku']), None)
    if dest_item:
        print(f"Dest Stock: {dest_item['current_stock']} (Expected >= {transfer_qty})")
    else:
        print("Dest item not found!")

if __name__ == "__main__":
    test_transfer()
