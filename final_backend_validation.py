#!/usr/bin/env python3
"""
FINAL BACKEND VALIDATION - All New Routes
Testing: Bill Split, Table Merge, Backup System, Rate Limiting, Edge Gateway, Scheduled Tasks
"""

import requests
import sys
import json
import time
from datetime import datetime
from typing import Dict, Optional

class FinalBackendValidator:
    def __init__(self, base_url="https://observe-hub-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.venue_id = "venue-caviar-bull"
        
    def log_test(self, name: str, success: bool, details: str = ""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
            self.failed_tests.append({"test": name, "details": details})

    def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, 
                    expected_status: int = 200, timeout: int = 10) -> tuple:
        """Make API request with error handling"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=timeout)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=timeout)
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
        """Test authentication with correct endpoint"""
        print("\n" + "="*60)
        print("1. AUTHENTICATION")
        print("="*60)
        
        # Try PIN-first auth
        login_url = f"auth/login/pin?pin=1234&app=pos"
        success, data, error = self.make_request('POST', login_url)
        
        if success and 'accessToken' in data:
            self.token = data['accessToken']
            self.log_test("POST /api/auth/login/pin (PIN: 1234)", True)
            print(f"   Logged in as: {data['user']['name']} ({data['user']['role']})")
            print(f"   Venue ID: {data['user'].get('venueId', 'N/A')}")
            return True
        else:
            # Try alternative auth
            print("   Trying alternative auth endpoint...")
            login_url = f"auth/login?venue_id={self.venue_id}&pin=1234&device_id=test_device"
            success, data, error = self.make_request('POST', login_url)
            
            if success and 'token' in data:
                self.token = data['token']
                self.log_test("POST /api/auth/login (fallback)", True)
                print(f"   Logged in as: {data['user']['name']} ({data['user']['role']})")
                return True
            else:
                self.log_test("Authentication", False, error or "No token received")
                return False

    def test_bill_split_api(self):
        """Test Bill Split API"""
        print("\n" + "="*60)
        print("2. BILL SPLIT API")
        print("="*60)
        
        if not self.token:
            print("   ⚠️  No authentication token, skipping")
            return
        
        # First, we need to create an order to split
        print("\n   Creating test order for bill split...")
        
        # Get tables
        success, tables_data, error = self.make_request('GET', f'venues/{self.venue_id}/tables')
        if not success or not tables_data:
            self.log_test("Bill Split - Get tables", False, "No tables found")
            return
        
        test_table = tables_data[0] if tables_data else None
        if not test_table:
            self.log_test("Bill Split - Find table", False, "No tables available")
            return
        
        # Get users
        success, users_data, error = self.make_request('GET', f'venues/{self.venue_id}/users')
        if not success or not users_data:
            self.log_test("Bill Split - Get users", False, "No users found")
            return
        
        server = users_data[0]
        
        # Create order
        success, order_data, error = self.make_request('POST', 'orders', {
            "venue_id": self.venue_id,
            "table_id": test_table['id'],
            "server_id": server['id']
        })
        
        if not success:
            self.log_test("Bill Split - Create test order", False, error)
            return
        
        order_id = order_data['id']
        print(f"   Created test order: {order_id}")
        
        # Test bill split endpoint
        print("\n   Testing POST /api/pos/bill-split/split")
        split_payload = {
            "order_id": order_id,
            "split_type": "equal",
            "number_of_splits": 3
        }
        
        success, split_data, error = self.make_request('POST', 'pos/bill-split/split', split_payload)
        self.log_test("POST /api/pos/bill-split/split", success, error)
        
        if success:
            print(f"   ✅ Bill split created successfully")
            print(f"      Split Type: {split_data.get('split', {}).get('split_type', 'N/A')}")
            splits = split_data.get('split', {}).get('splits', [])
            print(f"      Number of Splits: {len(splits)}")
            
            # Verify response structure
            has_success = split_data.get('success', False)
            has_split = 'split' in split_data
            self.log_test("Bill split returns valid JSON structure", has_success and has_split)
        else:
            print(f"   ⚠️  Bill split endpoint accessible but may need valid order with totals")

    def test_table_merge_api(self):
        """Test Table Merge API"""
        print("\n" + "="*60)
        print("3. TABLE MERGE API")
        print("="*60)
        
        if not self.token:
            print("   ⚠️  No authentication token, skipping")
            return
        
        # Get tables
        success, tables_data, error = self.make_request('GET', f'venues/{self.venue_id}/tables')
        if not success or not tables_data or len(tables_data) < 3:
            self.log_test("Table Merge - Get tables", False, "Need at least 3 tables")
            return
        
        # Use first 3 tables
        source_tables = [tables_data[1]['id'], tables_data[2]['id']]
        target_table = tables_data[0]['id']
        
        print(f"   Source tables: {source_tables}")
        print(f"   Target table: {target_table}")
        
        # Test table merge endpoint
        print("\n   Testing POST /api/pos/table-merge/merge")
        merge_payload = {
            "source_tables": source_tables,
            "target_table": target_table,
            "venue_id": self.venue_id
        }
        
        success, merge_data, error = self.make_request('POST', 'pos/table-merge/merge', merge_payload)
        self.log_test("POST /api/pos/table-merge/merge", success, error)
        
        if success:
            print(f"   ✅ Table merge completed successfully")
            print(f"      Merged Order ID: {merge_data.get('merged_order_id', 'N/A')}")
            print(f"      Total Items: {merge_data.get('total_items', 0)}")
            print(f"      Total Guests: {merge_data.get('total_guests', 0)}")
            
            # Verify response structure
            has_success = merge_data.get('success', False)
            has_merged_order = 'merged_order_id' in merge_data
            self.log_test("Table merge returns valid JSON structure", has_success and has_merged_order)
        else:
            print(f"   ⚠️  Table merge endpoint accessible")

    def test_backup_system(self):
        """Test Backup System APIs"""
        print("\n" + "="*60)
        print("4. BACKUP SYSTEM")
        print("="*60)
        
        if not self.token:
            print("   ⚠️  No authentication token, skipping")
            return
        
        # Test backup status
        print("\n   Testing GET /api/backup/status")
        success, status_data, error = self.make_request('GET', 'backup/status')
        self.log_test("GET /api/backup/status", success, error)
        
        if success:
            print(f"   ✅ Backup status retrieved")
            print(f"      Total Backups: {status_data.get('total_backups', 0)}")
            stats = status_data.get('stats', {})
            print(f"      Stats: {stats}")
            
            latest = status_data.get('latest_backup')
            if latest:
                print(f"      Latest Backup: {latest.get('created_at', 'N/A')}")
        
        # Test backup list
        print("\n   Testing GET /api/backup/list")
        success, list_data, error = self.make_request('GET', 'backup/list')
        self.log_test("GET /api/backup/list", success, error)
        
        if success:
            backups = list_data.get('backups', [])
            print(f"   ✅ Backup list retrieved")
            print(f"      Number of Backups: {len(backups)}")
            
            if backups:
                print(f"      Sample backup: {backups[0].get('id', 'N/A')[:16]}...")

    def test_rate_limiting(self):
        """Test Rate Limiting"""
        print("\n" + "="*60)
        print("5. RATE LIMITING")
        print("="*60)
        
        print("\n   Making 10 rapid requests to /api/health")
        rate_limit_headers_found = False
        status_codes = []
        
        for i in range(10):
            url = f"{self.base_url}/api/health"
            headers = {'X-Device-Id': 'test-device'}
            
            try:
                response = requests.get(url, headers=headers, timeout=5)
                status_codes.append(response.status_code)
                
                # Check for rate limiting headers
                if 'X-RateLimit-Limit' in response.headers or 'X-RateLimit-Remaining' in response.headers:
                    rate_limit_headers_found = True
                    print(f"   Request {i+1}: Status {response.status_code} - Rate limit headers present")
                else:
                    print(f"   Request {i+1}: Status {response.status_code}")
                
                time.sleep(0.1)  # Small delay between requests
            except Exception as e:
                print(f"   Request {i+1}: Error - {str(e)}")
        
        self.log_test("Rate limiting headers present", rate_limit_headers_found, 
                     "No rate limit headers found in responses")
        
        # Check if any requests were rate limited (429 status)
        rate_limited = 429 in status_codes
        if rate_limited:
            print(f"   ✅ Rate limiting active (received 429 status)")
            self.log_test("Rate limiting active", True)
        else:
            print(f"   ⚠️  No 429 status received (may need more requests to trigger)")
            self.log_test("Rate limiting active", False, "No 429 status in 10 requests")

    def test_edge_gateway(self):
        """Test Edge Gateway"""
        print("\n" + "="*60)
        print("6. EDGE GATEWAY")
        print("="*60)
        
        # Test edge gateway health
        print("\n   Testing http://localhost:8080/health")
        try:
            response = requests.get("http://localhost:8080/health", timeout=5)
            success = response.status_code == 200
            self.log_test("Edge Gateway /health", success, 
                         f"Status: {response.status_code}" if not success else "")
            
            if success:
                print(f"   ✅ Edge Gateway health check passed")
        except Exception as e:
            self.log_test("Edge Gateway /health", False, f"Connection error: {str(e)}")
            print(f"   ⚠️  Edge Gateway may not be running on localhost:8080")
        
        # Test queue stats
        print("\n   Testing http://localhost:8080/api/queue/stats")
        try:
            response = requests.get("http://localhost:8080/api/queue/stats", timeout=5)
            success = response.status_code == 200
            self.log_test("Edge Gateway /api/queue/stats", success,
                         f"Status: {response.status_code}" if not success else "")
            
            if success:
                try:
                    data = response.json()
                    print(f"   ✅ Queue stats retrieved")
                    print(f"      Pending: {data.get('pending', 'N/A')}")
                    print(f"      Processing: {data.get('processing', 'N/A')}")
                except:
                    print(f"   ✅ Queue stats endpoint accessible")
        except Exception as e:
            self.log_test("Edge Gateway /api/queue/stats", False, f"Connection error: {str(e)}")
            print(f"   ⚠️  Edge Gateway queue stats not accessible")

    def test_scheduled_tasks_in_logs(self):
        """Test Scheduled Tasks in Logs"""
        print("\n" + "="*60)
        print("7. SCHEDULED TASKS IN LOGS")
        print("="*60)
        
        print("\n   Checking backend logs for scheduled tasks...")
        
        try:
            import subprocess
            
            # Check backend logs
            result = subprocess.run(
                ['tail', '-50', '/var/log/supervisor/backend.out.log'],
                capture_output=True,
                text=True,
                timeout=5
            )
            
            if result.returncode == 0:
                log_content = result.stdout.lower()
                
                # Check for scheduled task indicators
                has_scheduled = 'scheduled' in log_content
                has_backup = 'backup' in log_content
                has_cleanup = 'cleanup' in log_content
                
                print(f"   Log analysis:")
                print(f"      'scheduled' found: {has_scheduled}")
                print(f"      'backup' found: {has_backup}")
                print(f"      'cleanup' found: {has_cleanup}")
                
                if has_scheduled or has_backup or has_cleanup:
                    self.log_test("Scheduled tasks running", True)
                    print(f"   ✅ Scheduled tasks detected in logs")
                else:
                    self.log_test("Scheduled tasks running", False, 
                                 "No scheduled task indicators in logs")
                    print(f"   ⚠️  No scheduled task indicators found in recent logs")
            else:
                self.log_test("Check backend logs", False, "Could not read logs")
                print(f"   ⚠️  Could not read backend logs")
        
        except Exception as e:
            self.log_test("Check backend logs", False, f"Error: {str(e)}")
            print(f"   ⚠️  Error checking logs: {str(e)}")

    def run_validation(self):
        """Run all validation tests"""
        print("\n" + "🚀"*30)
        print("FINAL BACKEND VALIDATION - All New Routes")
        print("🚀"*30)
        
        # Run all tests
        if not self.test_authentication():
            print("\n❌ CRITICAL: Authentication failed, cannot proceed with other tests")
            return 1
        
        self.test_bill_split_api()
        self.test_table_merge_api()
        self.test_backup_system()
        self.test_rate_limiting()
        self.test_edge_gateway()
        self.test_scheduled_tasks_in_logs()
        
        # Final summary
        print("\n" + "="*60)
        print("📊 VALIDATION SUMMARY")
        print("="*60)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        print("\n" + "="*60)
        print("EXPECTED RESULTS:")
        print("="*60)
        print("✅ Bill split endpoint accessible (may need valid order)")
        print("✅ Table merge endpoint accessible")
        print("✅ Backup APIs working")
        print("✅ Rate limiting headers present")
        print("✅ Edge Gateway operational (if running)")
        print("✅ Scheduled tasks running")
        
        print("\n" + "="*60)
        print("SUCCESS CRITERIA:")
        print("="*60)
        print("✅ All endpoints return valid JSON (not 500 errors)")
        print("✅ Authentication working")
        print("✅ New routes mounted correctly")
        print("✅ Rate limiting active")
        
        if self.failed_tests:
            print("\n❌ FAILED TESTS:")
            for failed in self.failed_tests:
                print(f"   - {failed['test']}: {failed['details']}")
        
        if self.tests_passed >= self.tests_run * 0.8:  # 80% pass rate
            print("\n🎉 VALIDATION PASSED (80%+ success rate)")
            return 0
        else:
            print(f"\n⚠️  VALIDATION NEEDS ATTENTION ({self.tests_passed}/{self.tests_run} passed)")
            return 1

def main():
    validator = FinalBackendValidator()
    return validator.run_validation()

if __name__ == "__main__":
    sys.exit(main())
