#!/usr/bin/env python3
"""
Enhanced Validation Test - Testing specific issues found
"""

import requests
import sys
import time

API_URL = "https://observe-hub-1.preview.emergentagent.com"

def test_rate_limiting_on_api_endpoint():
    """Test rate limiting on a non-health endpoint"""
    print("\n" + "="*60)
    print("ENHANCED RATE LIMITING TEST")
    print("="*60)
    
    # First, authenticate
    print("\n1. Authenticating...")
    login_url = f"{API_URL}/api/auth/login/pin?pin=1234&app=pos"
    response = requests.post(login_url)
    
    if response.status_code != 200:
        print(f"   ❌ Authentication failed: {response.status_code}")
        return False
    
    token = response.json().get('accessToken')
    print(f"   ✅ Authenticated successfully")
    
    # Test rate limiting on /api/venues endpoint
    print("\n2. Testing rate limiting on /api/venues (100 rapid requests)...")
    headers = {
        'Authorization': f'Bearer {token}',
        'X-Device-Id': 'test-device-rate-limit'
    }
    
    rate_limit_headers_found = False
    rate_limited = False
    
    for i in range(100):
        try:
            response = requests.get(f"{API_URL}/api/venues", headers=headers, timeout=5)
            
            # Check for rate limiting headers
            if 'X-RateLimit-Limit' in response.headers:
                rate_limit_headers_found = True
                if i == 0:  # Print on first request
                    print(f"   ✅ Rate limit headers found:")
                    print(f"      X-RateLimit-Limit: {response.headers.get('X-RateLimit-Limit')}")
                    print(f"      X-RateLimit-Remaining: {response.headers.get('X-RateLimit-Remaining')}")
            
            if response.status_code == 429:
                rate_limited = True
                print(f"   ✅ Rate limited at request {i+1} (429 status)")
                break
            
            if i % 20 == 0:
                print(f"   Request {i+1}: Status {response.status_code}")
        
        except Exception as e:
            print(f"   Request {i+1}: Error - {str(e)}")
            break
    
    print(f"\n3. Results:")
    print(f"   Rate limit headers present: {'✅ YES' if rate_limit_headers_found else '❌ NO'}")
    print(f"   Rate limiting triggered: {'✅ YES' if rate_limited else '⚠️  NO (may need more requests)'}")
    
    return rate_limit_headers_found

def test_bill_split_with_existing_order():
    """Test bill split with an existing order"""
    print("\n" + "="*60)
    print("ENHANCED BILL SPLIT TEST")
    print("="*60)
    
    # Authenticate
    print("\n1. Authenticating...")
    login_url = f"{API_URL}/api/auth/login/pin?pin=1234&app=pos"
    response = requests.post(login_url)
    
    if response.status_code != 200:
        print(f"   ❌ Authentication failed: {response.status_code}")
        return False
    
    token = response.json().get('accessToken')
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    print(f"   ✅ Authenticated successfully")
    
    # Get existing orders
    print("\n2. Getting existing orders...")
    venue_id = "venue-caviar-bull"
    response = requests.get(f"{API_URL}/api/venues/{venue_id}/orders", headers=headers)
    
    if response.status_code != 200:
        print(f"   ❌ Failed to get orders: {response.status_code}")
        return False
    
    orders = response.json()
    print(f"   ✅ Found {len(orders)} orders")
    
    if not orders:
        print(f"   ⚠️  No existing orders to test bill split")
        return False
    
    # Use first order
    test_order_id = orders[0]['id']
    print(f"   Using order: {test_order_id}")
    
    # Test bill split
    print("\n3. Testing bill split...")
    split_payload = {
        "order_id": test_order_id,
        "split_type": "equal",
        "number_of_splits": 2
    }
    
    response = requests.post(
        f"{API_URL}/api/pos/bill-split/split",
        json=split_payload,
        headers=headers
    )
    
    print(f"   Response status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"   ✅ Bill split successful")
        print(f"      Success: {data.get('success')}")
        print(f"      Split ID: {data.get('split', {}).get('id', 'N/A')[:16]}...")
        return True
    else:
        print(f"   ⚠️  Bill split response: {response.status_code}")
        try:
            print(f"      Error: {response.json()}")
        except:
            print(f"      Raw response: {response.text[:200]}")
        return False

def test_backup_service_exists():
    """Check if backup service file exists"""
    print("\n" + "="*60)
    print("BACKUP SERVICE CHECK")
    print("="*60)
    
    import os
    
    backup_service_path = "/app/backend/services/backup_service.py"
    
    if os.path.exists(backup_service_path):
        print(f"   ✅ Backup service file exists: {backup_service_path}")
        
        # Check file content
        with open(backup_service_path, 'r') as f:
            content = f.read()
            has_backup_service_class = 'class BackupService' in content
            has_create_snapshot = 'create_snapshot' in content
            has_cleanup = 'cleanup' in content
            
            print(f"   BackupService class: {'✅ YES' if has_backup_service_class else '❌ NO'}")
            print(f"   create_snapshot method: {'✅ YES' if has_create_snapshot else '❌ NO'}")
            print(f"   cleanup method: {'✅ YES' if has_cleanup else '❌ NO'}")
            
            return has_backup_service_class and has_create_snapshot
    else:
        print(f"   ❌ Backup service file not found: {backup_service_path}")
        return False

def main():
    print("\n" + "🔍"*30)
    print("ENHANCED VALIDATION TEST")
    print("🔍"*30)
    
    results = {
        'rate_limiting': test_rate_limiting_on_api_endpoint(),
        'bill_split': test_bill_split_with_existing_order(),
        'backup_service': test_backup_service_exists()
    }
    
    print("\n" + "="*60)
    print("FINAL RESULTS")
    print("="*60)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "⚠️  NEEDS ATTENTION"
        print(f"   {test_name}: {status}")
    
    passed = sum(results.values())
    total = len(results)
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    return 0 if passed >= 2 else 1

if __name__ == "__main__":
    sys.exit(main())
