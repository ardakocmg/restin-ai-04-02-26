#!/usr/bin/env python3
"""
Critical Backend Validation Test
Tests all critical flows as requested in review_request
"""

import requests
import sys

BASE_URL = "https://observe-hub-1.preview.emergentagent.com"
VENUE_ID = "venue-caviar-bull"

def test_health_checks():
    """Test 1: Health Checks"""
    print("\n" + "="*60)
    print("TEST 1: HEALTH CHECKS")
    print("="*60)
    
    # 1.1 Public URL health
    print("\n1.1 Testing: GET /api/health (public URL)")
    try:
        response = requests.get(f"{BASE_URL}/api/health", timeout=10)
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.json()}")
        if response.status_code == 200:
            print("   ✅ PASS: Public health check working")
        else:
            print(f"   ❌ FAIL: Expected 200, got {response.status_code}")
    except Exception as e:
        print(f"   ❌ FAIL: {str(e)}")
    
    # 1.2 Localhost health (Edge Gateway)
    print("\n1.2 Testing: GET http://localhost:8080/health")
    try:
        response = requests.get("http://localhost:8080/health", timeout=5)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            print("   ✅ PASS: Localhost health check working")
        else:
            print(f"   ❌ FAIL: Expected 200, got {response.status_code}")
    except Exception as e:
        print(f"   ⚠️  SKIP: Localhost not accessible (expected in container): {str(e)}")

def test_authentication():
    """Test 2: Authentication"""
    print("\n" + "="*60)
    print("TEST 2: AUTHENTICATION")
    print("="*60)
    
    print("\n2.1 Testing: POST /api/auth/login (PIN: 1234, venue: venue-caviar-bull)")
    try:
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            params={"pin": "1234", "venue_id": VENUE_ID},
            timeout=10
        )
        print(f"   Status: {response.status_code}")
        data = response.json()
        
        if response.status_code == 200 and "token" in data:
            print(f"   User: {data['user']['name']} ({data['user']['role']})")
            print(f"   Token: {data['token'][:50]}...")
            print("   ✅ PASS: Authentication working")
            return data['token']
        else:
            print(f"   ❌ FAIL: Authentication failed")
            print(f"   Response: {data}")
            return None
    except Exception as e:
        print(f"   ❌ FAIL: {str(e)}")
        return None

def test_bill_split(token):
    """Test 3: Bill Split Route (ObjectId check)"""
    print("\n" + "="*60)
    print("TEST 3: BILL SPLIT ROUTE (ObjectId Check)")
    print("="*60)
    
    if not token:
        print("   ⚠️  SKIP: No authentication token")
        return
    
    # First, create a real order to test with
    print("\n3.1 Creating test order...")
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Get tables
    try:
        response = requests.get(
            f"{BASE_URL}/api/venues/{VENUE_ID}/tables",
            headers=headers,
            timeout=10
        )
        tables = response.json()
        if not tables:
            print("   ❌ FAIL: No tables found")
            return
        
        table_id = tables[0]['id']
        print(f"   Using table: {tables[0]['name']}")
    except Exception as e:
        print(f"   ❌ FAIL: Could not get tables: {str(e)}")
        return
    
    # Get users
    try:
        response = requests.get(
            f"{BASE_URL}/api/venues/{VENUE_ID}/users",
            headers=headers,
            timeout=10
        )
        users = response.json()
        if not users:
            print("   ❌ FAIL: No users found")
            return
        
        server_id = users[0]['id']
    except Exception as e:
        print(f"   ❌ FAIL: Could not get users: {str(e)}")
        return
    
    # Create order
    try:
        response = requests.post(
            f"{BASE_URL}/api/orders",
            headers=headers,
            json={
                "venue_id": VENUE_ID,
                "table_id": table_id,
                "server_id": server_id
            },
            timeout=10
        )
        
        if response.status_code != 200:
            print(f"   ❌ FAIL: Could not create order: {response.status_code}")
            print(f"   Response: {response.text}")
            return
        
        order = response.json()
        order_id = order['id']
        print(f"   ✅ Order created: {order_id}")
    except Exception as e:
        print(f"   ❌ FAIL: Could not create order: {str(e)}")
        return
    
    # Test bill split with real order
    print(f"\n3.2 Testing: POST /api/pos/bill-split/split (order_id: {order_id})")
    try:
        response = requests.post(
            f"{BASE_URL}/api/pos/bill-split/split",
            headers=headers,
            json={
                "order_id": order_id,
                "split_type": "equal",
                "number_of_splits": 2
            },
            timeout=10
        )
        
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   Response: {data}")
            print("   ✅ PASS: Bill split working (no ObjectId serialization error)")
        elif response.status_code == 500 or response.status_code == 520:
            print(f"   ❌ FAIL: Server error (possible ObjectId issue)")
            print(f"   Response: {response.text}")
        else:
            print(f"   ⚠️  Status {response.status_code}: {response.text}")
    except Exception as e:
        print(f"   ❌ FAIL: {str(e)}")
    
    # Test with non-existent order (should return 404, not 500)
    print("\n3.3 Testing: POST /api/pos/bill-split/split (non-existent order)")
    try:
        response = requests.post(
            f"{BASE_URL}/api/pos/bill-split/split",
            headers=headers,
            json={
                "order_id": "non-existent-order-id",
                "split_type": "equal",
                "number_of_splits": 2
            },
            timeout=10
        )
        
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 404 or response.status_code == 520:
            # 520 with 404 message is acceptable
            data = response.json()
            if "404" in data.get("message", ""):
                print("   ✅ PASS: Returns 404 error (not 500)")
            else:
                print(f"   Response: {data}")
        else:
            print(f"   Response: {response.text}")
    except Exception as e:
        print(f"   ❌ FAIL: {str(e)}")

def test_critical_endpoints(token):
    """Test 4: Other Critical Endpoints"""
    print("\n" + "="*60)
    print("TEST 4: OTHER CRITICAL ENDPOINTS")
    print("="*60)
    
    if not token:
        print("   ⚠️  SKIP: No authentication token")
        return
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    endpoints = [
        ("GET", f"/api/venues/{VENUE_ID}/menu/categories", "Menu Categories"),
        ("GET", f"/api/venues/{VENUE_ID}/menu/items", "Menu Items"),
        ("GET", f"/api/venues/{VENUE_ID}/tables", "Tables"),
        ("GET", f"/api/venues/{VENUE_ID}/kds/tickets", "KDS Tickets"),
        ("GET", f"/api/venues/{VENUE_ID}/inventory", "Inventory"),
        ("GET", f"/api/venues/{VENUE_ID}/stats", "Venue Stats"),
    ]
    
    for method, endpoint, name in endpoints:
        print(f"\n4.{endpoints.index((method, endpoint, name)) + 1} Testing: {method} {endpoint}")
        try:
            response = requests.get(
                f"{BASE_URL}{endpoint}",
                headers=headers,
                timeout=10
            )
            
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    print(f"   Found {len(data)} items")
                elif isinstance(data, dict):
                    print(f"   Response keys: {list(data.keys())}")
                print(f"   ✅ PASS: {name} endpoint working")
            elif response.status_code == 500 or response.status_code == 520:
                print(f"   ❌ FAIL: Server error")
                print(f"   Response: {response.text[:200]}")
            else:
                print(f"   ⚠️  Status {response.status_code}")
        except Exception as e:
            print(f"   ❌ FAIL: {str(e)}")

def main():
    print("\n" + "="*60)
    print("CRITICAL BACKEND VALIDATION TEST")
    print("="*60)
    print(f"Base URL: {BASE_URL}")
    print(f"Venue ID: {VENUE_ID}")
    
    # Run tests
    test_health_checks()
    token = test_authentication()
    test_bill_split(token)
    test_critical_endpoints(token)
    
    print("\n" + "="*60)
    print("TEST COMPLETE")
    print("="*60)

if __name__ == "__main__":
    main()
