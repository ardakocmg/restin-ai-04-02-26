import requests
import sys

BASE_URL = "http://localhost:8000"

def test_login():
    print("Testing Login...")
    try:
        response = requests.post(f"{BASE_URL}/api/auth/login/pin?pin=1111&app=admin")
        if response.status_code == 200:
            print("Login Successful")
            return response.json()
        else:
            print(f"Login Failed: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"Login Error: {e}")
        return None

def test_venues(headers):
    print("\nTesting Venue List...")
    try:
        response = requests.get(f"{BASE_URL}/api/venues", headers=headers)
        if response.status_code == 200:
            print("Venue List Successful")
            return response.json()
        else:
            print(f"Venue List Failed: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"Venue List Error: {e}")
        return None

def test_employees(headers, venue_id):
    print(f"\nTesting Employee List for Venue {venue_id}...")
    try:
        response = requests.get(f"{BASE_URL}/api/hr/employees?venue_id={venue_id}", headers=headers)
        if response.status_code == 200:
            print("Employee List Successful")
            return response.json()
        else:
            print(f"Employee List Failed: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"Employee List Error: {e}")
        return None

def test_inventory(headers, venue_id):
    print(f"\nTesting Inventory Items for Venue {venue_id}...")
    try:
        # Assuming typical inventory endpoint, adjusting if needed based on failures
        response = requests.get(f"{BASE_URL}/api/inventory/items?venue_id={venue_id}", headers=headers)
        if response.status_code == 200:
            print("Inventory Items Successful")
            return response.json()
        elif response.status_code == 404:
             print("Inventory endpoint might be different, trying alternative...")
             return None
        else:
            print(f"Inventory Items Failed: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"Inventory Items Error: {e}")
        return None

def main():
    print("Starting Integration Test...")
    
    auth_data = test_login()
    if not auth_data:
        sys.exit(1)
        
    token = auth_data.get("accessToken")
    headers = {"Authorization": f"Bearer {token}"}
    
    venues = test_venues(headers)
    if not venues:
        sys.exit(1)
        
    venue_id = venues[0]['id']
    print(f"Using Venue ID: {venue_id}")
    
    test_employees(headers, venue_id)
    test_inventory(headers, venue_id)

    print("\nIntegration Test Complete.")

if __name__ == "__main__":
    main()
