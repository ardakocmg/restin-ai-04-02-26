#!/usr/bin/env python3
"""
Comprehensive Backend Testing for New Features
Tests: Backup System, Scheduled Tasks, Edge Gateway, Idempotency Middleware, Core APIs
"""

import requests
import sys
import json
import time
from datetime import datetime
from typing import Dict, List, Optional

class NewFeaturesTester:
    def __init__(self, base_url="https://observe-hub-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.edge_gateway_url = "http://localhost:8080"
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.failed_tests = []
        
    def log_test(self, name: str, success: bool, details: str = ""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
            self.failed_tests.append({"test": name, "details": details})
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })

    def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, 
                    expected_status: int = 200, headers: Optional[Dict] = None,
                    base_url: Optional[str] = None) -> tuple:
        """Make API request with error handling"""
        url = f"{base_url or self.base_url}/api/{endpoint}" if '/api/' not in endpoint else f"{base_url or self.base_url}/{endpoint}"
        request_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            request_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            request_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=request_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=request_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=request_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=request_headers, timeout=10)
            else:
                return False, {}, f"Unsupported method: {method}"

            try:
                response_data = response.json() if response.content else {}
            except:
                response_data = {"raw_response": response.text}

            success = response.status_code == expected_status
            if not success:
                return False, response_data, f"Expected {expected_status}, got {response.status_code}"
            
            return True, response_data, ""

        except requests.exceptions.Timeout:
            return False, {}, "Request timeout"
        except requests.exceptions.ConnectionError:
            return False, {}, "Connection error"
        except Exception as e:
            return False, {}, f"Request error: {str(e)}"

    def test_authentication(self):
        """Test authentication with PIN 1234"""
        print("\n" + "="*60)
        print("1. AUTHENTICATION")
        print("="*60)
        
        # Login with PIN 1234
        login_url = "auth/login/pin?pin=1234&app=admin"
        success, data, error = self.make_request('POST', login_url)
        
        if success and 'accessToken' in data:
            self.token = data['accessToken']
            self.log_test("POST /api/auth/login/pin (PIN: 1234, app: admin)", True)
            print(f"   Logged in successfully")
            print(f"   User: {data.get('user', {}).get('name', 'N/A')}")
            print(f"   Token: {self.token[:20]}...")
        else:
            self.log_test("POST /api/auth/login/pin (PIN: 1234, app: admin)", False, error or "No accessToken received")
            print("   ⚠️  WARNING: Authentication failed, some tests may fail")

    def test_backup_system(self):
        """Test Backup System API"""
        print("\n" + "="*60)
        print("2. BACKUP SYSTEM API")
        print("="*60)
        
        if not self.token:
            print("   ⚠️  No authentication token, skipping backup tests")
            return
        
        # Test backup status
        print("\n2.1 GET /api/backup/status")
        success, data, error = self.make_request('GET', 'backup/status')
        self.log_test("GET /api/backup/status", success, error)
        
        if success:
            stats = data.get('stats', {})
            total = data.get('total_backups', 0)
            latest = data.get('latest_backup')
            
            print(f"   Total backups: {total}")
            print(f"   Stats: {stats}")
            if latest:
                print(f"   Latest backup: {latest.get('created_at', 'N/A')}")
            
            # Verify stats structure
            if isinstance(stats, dict):
                self.log_test("Backup status returns stats dict", True)
            else:
                self.log_test("Backup status returns stats dict", False, f"Stats is {type(stats)}")
        
        # Test backup list
        print("\n2.2 GET /api/backup/list")
        success, data, error = self.make_request('GET', 'backup/list')
        self.log_test("GET /api/backup/list", success, error)
        
        if success:
            backups = data.get('backups', [])
            print(f"   Found {len(backups)} backups")
            
            if isinstance(backups, list):
                self.log_test("Backup list returns array", True)
                
                # Show first few backups
                for i, backup in enumerate(backups[:3]):
                    print(f"      Backup {i+1}: {backup.get('created_at', 'N/A')} - Status: {backup.get('status', 'N/A')}")
            else:
                self.log_test("Backup list returns array", False, f"Backups is {type(backups)}")
        
        # Test manual snapshot (optional - commented out to avoid creating actual backups)
        print("\n2.3 POST /api/backup/snapshot (SKIPPED - would create actual backup)")
        print("   ℹ️  Manual snapshot creation skipped to avoid creating test backups")

    def test_scheduled_tasks(self):
        """Test Scheduled Tasks Verification"""
        print("\n" + "="*60)
        print("3. SCHEDULED TASKS VERIFICATION")
        print("="*60)
        
        print("\n3.1 Check backend logs for scheduled tasks")
        
        try:
            # Check backend error logs (where startup messages go)
            import subprocess
            result = subprocess.run(
                ['tail', '-200', '/var/log/supervisor/backend.err.log'],
                capture_output=True,
                text=True,
                timeout=5
            )
            
            logs = result.stdout
            
            # Look for scheduled tasks messages
            if "Starting scheduled tasks" in logs or "Scheduled tasks started" in logs:
                self.log_test("Scheduled tasks started message found", True)
                print("   ✅ Found scheduled tasks initialization in logs")
                
                # Show relevant log lines
                for line in logs.split('\n'):
                    if 'scheduled' in line.lower() and ('starting' in line.lower() or 'started' in line.lower()):
                        print(f"      {line.strip()}")
            else:
                self.log_test("Scheduled tasks started message found", False, "No scheduled tasks messages in logs")
                print("   ❌ No scheduled tasks messages found in logs")
                print("   Showing last 10 lines of backend error logs:")
                for line in logs.split('\n')[-10:]:
                    if line.strip():
                        print(f"      {line.strip()}")
        
        except Exception as e:
            self.log_test("Check backend logs", False, f"Error reading logs: {str(e)}")
            print(f"   ❌ Error reading backend logs: {str(e)}")

    def test_edge_gateway(self):
        """Test Edge Gateway Health"""
        print("\n" + "="*60)
        print("4. EDGE GATEWAY HEALTH")
        print("="*60)
        
        # Test health endpoint
        print("\n4.1 GET http://localhost:8080/health")
        try:
            response = requests.get(f"{self.edge_gateway_url}/health", timeout=5)
            success = response.status_code == 200
            
            if success:
                data = response.json() if response.content else {}
                self.log_test("GET /health (Edge Gateway)", True)
                print(f"   Status: {response.status_code}")
                
                if 'cloud_reachable' in data:
                    cloud_reachable = data.get('cloud_reachable', False)
                    print(f"   Cloud reachable: {cloud_reachable}")
                    self.log_test("Edge Gateway shows cloud_reachable", True)
                else:
                    print(f"   Response: {data}")
            else:
                self.log_test("GET /health (Edge Gateway)", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("GET /health (Edge Gateway)", False, f"Error: {str(e)}")
            print(f"   ❌ Error: {str(e)}")
        
        # Test queue stats
        print("\n4.2 GET http://localhost:8080/api/queue/stats")
        try:
            response = requests.get(f"{self.edge_gateway_url}/api/queue/stats", timeout=5)
            success = response.status_code == 200
            
            if success:
                data = response.json() if response.content else {}
                self.log_test("GET /api/queue/stats (Edge Gateway)", True)
                print(f"   Status: {response.status_code}")
                
                if 'pending' in data or 'synced' in data or 'failed' in data:
                    print(f"   Pending: {data.get('pending', 0)}")
                    print(f"   Synced: {data.get('synced', 0)}")
                    print(f"   Failed: {data.get('failed', 0)}")
                    self.log_test("Queue stats show pending/synced/failed counts", True)
                else:
                    print(f"   Response: {data}")
            else:
                self.log_test("GET /api/queue/stats (Edge Gateway)", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("GET /api/queue/stats (Edge Gateway)", False, f"Error: {str(e)}")
            print(f"   ❌ Error: {str(e)}")
        
        # Test devices endpoint
        print("\n4.3 GET http://localhost:8080/api/devices")
        try:
            response = requests.get(f"{self.edge_gateway_url}/api/devices", timeout=5)
            success = response.status_code == 200
            
            if success:
                data = response.json() if response.content else {}
                self.log_test("GET /api/devices (Edge Gateway)", True)
                print(f"   Status: {response.status_code}")
                
                if isinstance(data, list):
                    print(f"   Found {len(data)} devices")
                else:
                    print(f"   Response: {data}")
            else:
                self.log_test("GET /api/devices (Edge Gateway)", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("GET /api/devices (Edge Gateway)", False, f"Error: {str(e)}")
            print(f"   ❌ Error: {str(e)}")

    def test_idempotency_middleware(self):
        """Test Idempotency Middleware"""
        print("\n" + "="*60)
        print("5. IDEMPOTENCY MIDDLEWARE")
        print("="*60)
        
        if not self.token:
            print("   ⚠️  No authentication token, skipping idempotency tests")
            return
        
        # Generate unique idempotency key
        idempotency_key = f"test_{int(time.time())}"
        
        print(f"\n5.1 Test idempotent order creation (key: {idempotency_key})")
        
        # First request
        print("\n   First request: POST /api/pos/orders")
        order_data = {
            "venue_id": "venue-caviar-bull",
            "table_id": "table-1"
        }
        
        headers = {"X-Idempotency-Key": idempotency_key}
        success1, data1, error1 = self.make_request('POST', 'pos/orders', order_data, headers=headers)
        
        if success1:
            self.log_test("First request with idempotency key", True)
            print(f"   ✅ First request successful")
            order_id = data1.get('id', 'N/A')
            print(f"   Order ID: {order_id}")
        else:
            self.log_test("First request with idempotency key", False, error1)
            print(f"   ❌ First request failed: {error1}")
            return
        
        # Duplicate request (should return cached response)
        print("\n   Duplicate request: POST /api/pos/orders (same idempotency key)")
        time.sleep(0.5)  # Small delay
        
        success2, data2, error2 = self.make_request('POST', 'pos/orders', order_data, headers=headers)
        
        if success2:
            self.log_test("Duplicate request with same idempotency key", True)
            print(f"   ✅ Duplicate request successful")
            
            # Verify same response
            order_id2 = data2.get('id', 'N/A')
            print(f"   Order ID: {order_id2}")
            
            if order_id == order_id2:
                self.log_test("Duplicate request returns same order ID", True)
                print(f"   ✅ Same order ID returned (idempotency working)")
            else:
                self.log_test("Duplicate request returns same order ID", False, f"Different IDs: {order_id} vs {order_id2}")
                print(f"   ❌ Different order IDs returned")
        else:
            self.log_test("Duplicate request with same idempotency key", False, error2)
            print(f"   ❌ Duplicate request failed: {error2}")
        
        # Check backend logs for idempotent replay message
        print("\n5.2 Check backend logs for idempotent replay")
        try:
            import subprocess
            result = subprocess.run(
                ['tail', '-50', '/var/log/supervisor/backend.out.log'],
                capture_output=True,
                text=True,
                timeout=5
            )
            
            logs = result.stdout
            
            if "Idempotent replay" in logs or "idempotent" in logs.lower():
                self.log_test("Backend logs show idempotent replay", True)
                print("   ✅ Found idempotent replay message in logs")
                
                # Show relevant log lines
                for line in logs.split('\n'):
                    if 'idempotent' in line.lower():
                        print(f"      {line.strip()}")
            else:
                self.log_test("Backend logs show idempotent replay", False, "No idempotent messages in logs")
                print("   ⚠️  No idempotent replay messages found in logs")
        except Exception as e:
            self.log_test("Check backend logs for idempotency", False, f"Error: {str(e)}")
            print(f"   ❌ Error reading logs: {str(e)}")

    def test_core_api_health(self):
        """Test Core API Health"""
        print("\n" + "="*60)
        print("6. CORE API HEALTH")
        print("="*60)
        
        if not self.token:
            print("   ⚠️  No authentication token, skipping some tests")
        
        # Test venues endpoint
        print("\n6.1 GET /api/venues")
        success, data, error = self.make_request('GET', 'venues')
        self.log_test("GET /api/venues", success, error)
        
        if success:
            venues = data if isinstance(data, list) else []
            print(f"   Found {len(venues)} venues")
            
            if venues:
                for venue in venues[:3]:
                    print(f"      - {venue.get('name', 'N/A')} (ID: {venue.get('id', 'N/A')})")
        
        # Test health endpoint
        print("\n6.2 GET /api/health")
        success, data, error = self.make_request('GET', 'health')
        self.log_test("GET /api/health", success, error)
        
        if success:
            status = data.get('status', 'N/A')
            print(f"   Status: {status}")
            
            if status == 'healthy' or 'ok' in str(status).lower():
                self.log_test("Health endpoint shows healthy status", True)
            else:
                self.log_test("Health endpoint shows healthy status", False, f"Status: {status}")

    def run_all_tests(self):
        """Run all comprehensive tests"""
        print("\n" + "🚀"*30)
        print("COMPREHENSIVE BACKEND TESTING - NEW FEATURES")
        print("Testing: Backup System, Scheduled Tasks, Edge Gateway, Idempotency, Core APIs")
        print("🚀"*30)
        
        # Run all test suites
        self.test_authentication()
        self.test_backup_system()
        self.test_scheduled_tasks()
        self.test_edge_gateway()
        self.test_idempotency_middleware()
        self.test_core_api_health()
        
        # Final summary
        print("\n" + "="*60)
        print("📊 FINAL TEST SUMMARY")
        print("="*60)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.failed_tests:
            print("\n❌ FAILED TESTS:")
            for failed in self.failed_tests:
                print(f"   - {failed['test']}: {failed['details']}")
        
        if self.tests_passed == self.tests_run:
            print("\n🎉 ALL TESTS PASSED!")
            return 0
        else:
            print(f"\n⚠️  {self.tests_run - self.tests_passed} tests failed")
            return 1

def main():
    tester = NewFeaturesTester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())
