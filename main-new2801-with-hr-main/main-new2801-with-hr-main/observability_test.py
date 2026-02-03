#!/usr/bin/env python3

import requests
import sys
import json
import time
from datetime import datetime
from typing import Dict, List, Optional

class ObservabilityTester:
    def __init__(self, base_url="https://observe-hub-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.venue_id = "venue-caviar-bull"

    def log_test(self, name: str, success: bool, details: str = ""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })

    def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, 
                    expected_status: int = 200, params: Optional[Dict] = None) -> tuple:
        """Make API request with error handling"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=15)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, params=params, timeout=15)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=15)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=15)
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
        """Test authentication with Owner PIN 1234"""
        print("\n🔐 Testing Authentication")
        print("=" * 50)
        
        # Test Owner PIN (1234) for admin access
        login_url = "auth/login/pin?pin=1234&app=admin"
        success, data, error = self.make_request('POST', login_url)
        
        if success and 'accessToken' in data:
            self.token = data['accessToken']
            self.log_test("Login with Owner PIN (1234)", True)
            print(f"   Logged in as: {data['user']['name']} ({data['user']['role']})")
            print(f"   Venue ID: {data['user']['venueId']}")
            return True
        else:
            self.log_test("Login with Owner PIN (1234)", False, error or "No accessToken received")
            return False

    def test_error_inbox_endpoints(self):
        """Test Error Inbox endpoints"""
        print("\n📥 Testing Error Inbox Endpoints")
        print("=" * 50)
        
        # 1. List error inbox items
        print("\n1. GET /api/observability/error-inbox")
        success, data, error = self.make_request(
            'GET', 
            'observability/error-inbox',
            params={'venue_id': self.venue_id}
        )
        self.log_test("GET /api/observability/error-inbox", success, error)
        
        error_items = []
        if success:
            error_items = data.get('items', [])
            print(f"   Found {len(error_items)} error inbox items")
            
            # Test with filters
            print("\n2. GET /api/observability/error-inbox (with filters)")
            success, filtered_data, error = self.make_request(
                'GET',
                'observability/error-inbox',
                params={
                    'venue_id': self.venue_id,
                    'domains': 'POS,KDS',
                    'severities': 'ERROR,CRITICAL',
                    'q': 'test'
                }
            )
            self.log_test("GET /api/observability/error-inbox (with filters)", success, error)
            
            if success:
                filtered_items = filtered_data.get('items', [])
                print(f"   Filtered results: {len(filtered_items)} items")

        # 3. Test error detail endpoint if we have errors
        if error_items:
            error_id = error_items[0]['id']
            print(f"\n3. GET /api/observability/error-inbox/{error_id}")
            success, detail_data, error = self.make_request(
                'GET',
                f'observability/error-inbox/{error_id}'
            )
            self.log_test("GET /api/observability/error-inbox/{id}", success, error)
            
            if success:
                item = detail_data.get('item', {})
                print(f"   Error: {item.get('error', {}).get('message', 'N/A')}")
                print(f"   Domain: {item.get('domain', 'N/A')}")
                print(f"   Severity: {item.get('severity', 'N/A')}")
                
                # 4. Test action token generation
                if item.get('retry_plan', {}).get('allowed'):
                    print(f"\n4. POST /api/observability/error-inbox/{error_id}/action-token")
                    success, token_data, error = self.make_request(
                        'POST',
                        f'observability/error-inbox/{error_id}/action-token'
                    )
                    self.log_test("POST /api/observability/error-inbox/{id}/action-token", success, error)
                    
                    if success:
                        action_token = token_data.get('action_token')
                        print(f"   Action token generated: {action_token[:16]}...")
                        
                        # 5. Test retry with action token
                        print(f"\n5. POST /api/observability/error-inbox/{error_id}/retry")
                        retry_payload = {
                            "token": action_token,
                            "patch": {
                                "body": {},
                                "query": {}
                            }
                        }
                        success, retry_data, error = self.make_request(
                            'POST',
                            f'observability/error-inbox/{error_id}/retry',
                            data=retry_payload
                        )
                        self.log_test("POST /api/observability/error-inbox/{id}/retry", success, error)
                        
                        if success:
                            print(f"   Retry result: {retry_data.get('message', 'N/A')}")
                            print(f"   Status code: {retry_data.get('status_code', 'N/A')}")
                
                # 6. Test acknowledge
                print(f"\n6. POST /api/observability/error-inbox/{error_id}/acknowledge")
                success, ack_data, error = self.make_request(
                    'POST',
                    f'observability/error-inbox/{error_id}/acknowledge'
                )
                self.log_test("POST /api/observability/error-inbox/{id}/acknowledge", success, error)
        else:
            print("   No error items found to test detail endpoints")

    def test_test_panel_endpoints(self):
        """Test Test Panel endpoints"""
        print("\n🧪 Testing Test Panel Endpoints")
        print("=" * 50)
        
        # 1. Run a test
        print("\n1. POST /api/observability/testpanel/run")
        test_payload = {
            "venue_id": self.venue_id,
            "target": {
                "method": "GET",
                "path": "/api/venues"
            },
            "request_body": {},
            "request_query": {}
        }
        
        success, run_data, error = self.make_request(
            'POST',
            'observability/testpanel/run',
            data=test_payload
        )
        self.log_test("POST /api/observability/testpanel/run", success, error)
        
        if success:
            run = run_data.get('run', {})
            print(f"   Test run created: {run.get('display_id', 'N/A')}")
            print(f"   Status code: {run.get('status_code', 'N/A')}")
            print(f"   Success: {run.get('success', False)}")
            print(f"   Steps: {len(run.get('steps', []))}")
            
            # Verify run structure
            required_fields = ['id', 'display_id', 'venue_id', 'created_at', 'target', 'status_code', 'steps']
            missing_fields = [field for field in required_fields if field not in run]
            if not missing_fields:
                self.log_test("Test run has required fields", True)
            else:
                self.log_test("Test run has required fields", False, f"Missing: {missing_fields}")
        
        # 2. Test with POST request
        print("\n2. POST /api/observability/testpanel/run (POST request)")
        post_test_payload = {
            "venue_id": self.venue_id,
            "target": {
                "method": "POST",
                "path": "/api/orders"
            },
            "request_body": {
                "venue_id": self.venue_id,
                "table_id": "table-1",
                "server_id": "user-cb-owner"
            },
            "request_query": {}
        }
        
        success, post_run_data, error = self.make_request(
            'POST',
            'observability/testpanel/run',
            data=post_test_payload
        )
        self.log_test("POST /api/observability/testpanel/run (POST request)", success, error)
        
        if success:
            run = post_run_data.get('run', {})
            print(f"   POST test run: {run.get('display_id', 'N/A')}")
            print(f"   Status code: {run.get('status_code', 'N/A')}")
        
        # 3. List test runs
        print("\n3. GET /api/observability/testpanel/runs")
        success, runs_data, error = self.make_request(
            'GET',
            'observability/testpanel/runs',
            params={'venue_id': self.venue_id}
        )
        self.log_test("GET /api/observability/testpanel/runs", success, error)
        
        if success:
            runs = runs_data.get('runs', [])
            print(f"   Found {len(runs)} test runs")
            
            if runs:
                latest_run = runs[0]
                print(f"   Latest run: {latest_run.get('display_id', 'N/A')}")
                print(f"   Created by: {latest_run.get('created_by', 'N/A')}")
                print(f"   Test type: {latest_run.get('test_type', 'N/A')}")

    def test_error_capture_middleware(self):
        """Test error capture middleware by triggering errors"""
        print("\n🚨 Testing Error Capture Middleware")
        print("=" * 50)
        
        # Get initial error count
        success, initial_data, error = self.make_request(
            'GET',
            'observability/error-inbox',
            params={'venue_id': self.venue_id}
        )
        
        initial_count = len(initial_data.get('items', [])) if success else 0
        print(f"   Initial error count: {initial_count}")
        
        # 1. Trigger a 404 error
        print("\n1. Triggering 404 error")
        success, error_data, error = self.make_request(
            'GET',
            'non-existent-endpoint',
            expected_status=404
        )
        self.log_test("Trigger 404 error", success, error)
        
        # 2. Trigger a validation error
        print("\n2. Triggering validation error")
        success, error_data, error = self.make_request(
            'POST',
            'orders',
            data={"invalid": "data"},  # Missing required fields
            expected_status=400
        )
        self.log_test("Trigger validation error", success, error)
        
        # Wait a moment for error capture
        time.sleep(2)
        
        # 3. Check if errors were captured
        print("\n3. Checking if errors were captured")
        success, updated_data, error = self.make_request(
            'GET',
            'observability/error-inbox',
            params={'venue_id': self.venue_id}
        )
        
        if success:
            updated_count = len(updated_data.get('items', []))
            new_errors = updated_count - initial_count
            print(f"   Updated error count: {updated_count}")
            print(f"   New errors captured: {new_errors}")
            
            if new_errors > 0:
                self.log_test("Error capture middleware working", True)
                
                # Check latest error details
                latest_error = updated_data['items'][0]
                print(f"   Latest error: {latest_error.get('error', {}).get('message', 'N/A')}")
                print(f"   Source type: {latest_error.get('source', {}).get('source_type', 'N/A')}")
            else:
                self.log_test("Error capture middleware working", False, "No new errors captured")
        else:
            self.log_test("Error capture middleware working", False, "Could not check error inbox")

    def test_permissions(self):
        """Test observability permissions"""
        print("\n🔐 Testing Observability Permissions")
        print("=" * 50)
        
        # Current user should have observability permissions as Owner
        print("\n1. Testing current user permissions (Owner)")
        
        # Test error inbox view permission
        success, data, error = self.make_request(
            'GET',
            'observability/error-inbox',
            params={'venue_id': self.venue_id}
        )
        self.log_test("Owner can view error inbox", success, error)
        
        # Test test panel run permission with /api/health (should be allowed now)
        success, data, error = self.make_request(
            'POST',
            'observability/testpanel/run',
            data={
                "venue_id": self.venue_id,
                "target": {"method": "GET", "path": "/api/health"},
                "request_body": {}
            }
        )
        self.log_test("Owner can run test panel (/api/health)", success, error)
        
        if success:
            run = data.get('run', {})
            print(f"   Health test run: {run.get('display_id', 'N/A')}")
            print(f"   Status code: {run.get('status_code', 'N/A')}")
        else:
            print(f"   Error: {error}")
            
        # Test general test panel run permission
        success, data, error = self.make_request(
            'POST',
            'observability/testpanel/run',
            data={
                "venue_id": self.venue_id,
                "target": {"method": "GET", "path": "/api/venues"},
                "request_body": {}
            }
        )
        self.log_test("Owner can run test panel (general)", success, error)

    def test_retry_plan_generation(self):
        """Test retry plan generation for different error types"""
        print("\n🔄 Testing Retry Plan Generation")
        print("=" * 50)
        
        # Get error inbox items to check retry plans
        success, data, error = self.make_request(
            'GET',
            'observability/error-inbox',
            params={'venue_id': self.venue_id}
        )
        
        if success:
            items = data.get('items', [])
            retryable_items = [item for item in items if item.get('retry_plan', {}).get('allowed')]
            
            print(f"   Total error items: {len(items)}")
            print(f"   Retryable items: {len(retryable_items)}")
            
            if retryable_items:
                self.log_test("Retry plans generated for retryable errors", True)
                
                # Check retry plan structure
                sample_item = retryable_items[0]
                retry_plan = sample_item.get('retry_plan', {})
                
                required_fields = ['allowed', 'mode', 'requires_token', 'target']
                missing_fields = [field for field in required_fields if field not in retry_plan]
                
                if not missing_fields:
                    self.log_test("Retry plan has required fields", True)
                    print(f"   Mode: {retry_plan.get('mode', 'N/A')}")
                    print(f"   Target: {retry_plan.get('target', {}).get('method', 'N/A')} {retry_plan.get('target', {}).get('path', 'N/A')}")
                    print(f"   Editable fields: {len(retry_plan.get('editable_fields', []))}")
                else:
                    self.log_test("Retry plan has required fields", False, f"Missing: {missing_fields}")
            else:
                print("   No retryable items found to test retry plan structure")
        else:
            self.log_test("Check retry plan generation", False, "Could not access error inbox")

    def test_observability_service_integration(self):
        """Test observability service integration"""
        print("\n⚙️ Testing Observability Service Integration")
        print("=" * 50)
        
        # Test path allowlist
        print("\n1. Testing path allowlist")
        
        # Test allowed path
        allowed_test = {
            "venue_id": self.venue_id,
            "target": {"method": "GET", "path": "/api/venues"},
            "request_body": {}
        }
        
        success, data, error = self.make_request(
            'POST',
            'observability/testpanel/run',
            data=allowed_test
        )
        self.log_test("Allowed path (/api/venues) works", success, error)
        
        # Test disallowed path
        disallowed_test = {
            "venue_id": self.venue_id,
            "target": {"method": "GET", "path": "/api/auth/users"},
            "request_body": {}
        }
        
        success, data, error = self.make_request(
            'POST',
            'observability/testpanel/run',
            data=disallowed_test,
            expected_status=400
        )
        self.log_test("Disallowed path (/api/auth/users) blocked", success, error)
        
        # Test step generation
        print("\n2. Testing step generation")
        if success:  # From the allowed path test
            run = data.get('run', {})
            steps = run.get('steps', [])
            
            if steps:
                self.log_test("Steps generated for test runs", True)
                print(f"   Generated {len(steps)} steps")
                
                # Check step structure
                sample_step = steps[0]
                step_fields = ['step_id', 'title', 'domain', 'status', 'severity', 'timestamp']
                missing_step_fields = [field for field in step_fields if field not in sample_step]
                
                if not missing_step_fields:
                    self.log_test("Steps have required fields", True)
                else:
                    self.log_test("Steps have required fields", False, f"Missing: {missing_step_fields}")
            else:
                self.log_test("Steps generated for test runs", False, "No steps found")

    def run_all_tests(self):
        """Run all observability tests"""
        print("🔍 OBSERVABILITY HUB & ERROR TRIAGE PANEL - BACKEND TESTING")
        print("=" * 70)
        
        # Authentication is required for all tests
        if not self.test_authentication():
            print("\n❌ CRITICAL: Authentication failed. Cannot proceed with tests.")
            return False
        
        # Run all test suites
        self.test_error_inbox_endpoints()
        self.test_test_panel_endpoints()
        self.test_error_capture_middleware()
        self.test_permissions()
        self.test_retry_plan_generation()
        self.test_observability_service_integration()
        
        # Print summary
        print("\n" + "=" * 70)
        print("📊 OBSERVABILITY TESTING SUMMARY")
        print("=" * 70)
        print(f"Tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("✅ All tests passed!")
            return True
        else:
            print(f"❌ {self.tests_run - self.tests_passed} tests failed")
            return False

def main():
    tester = ObservabilityTester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())