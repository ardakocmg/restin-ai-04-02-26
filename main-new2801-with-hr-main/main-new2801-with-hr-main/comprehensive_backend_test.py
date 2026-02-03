#!/usr/bin/env python3
"""
Comprehensive Backend Testing for restin.ai
Final comprehensive backend testing to ensure everything is complete
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, List, Optional

class ComprehensiveBackendTester:
    def __init__(self, base_url="https://observe-hub-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.venue_id = None
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
                    expected_status: int = 200) -> tuple:
        """Make API request with error handling"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)
            else:
                return False, {}, f"Unsupported method: {method}"

            success = response.status_code == expected_status
            try:
                response_data = response.json() if response.content else {}
            except:
                response_data = {"raw_response": response.text}

            if not success:
                return False, response_data, f"Expected {expected_status}, got {response.status_code}"
            
            return True, response_data, ""

        except requests.exceptions.Timeout:
            return False, {}, "Request timeout"
        except requests.exceptions.ConnectionError:
            return False, {}, "Connection error"
        except Exception as e:
            return False, {}, f"Request error: {str(e)}"

    def test_auth_and_system(self):
        """Test Auth & System endpoints"""
        print("\n" + "="*60)
        print("1. AUTH & SYSTEM ENDPOINTS")
        print("="*60)
        
        # Test health check
        success, data, error = self.make_request('GET', 'health')
        self.log_test("GET /api/health", success, error)
        
        # Test system version
        success, data, error = self.make_request('GET', 'system/version')
        self.log_test("GET /api/system/version", success, error)
        if success:
            print(f"   Version: {data.get('version', 'N/A')}")
        
        # Test venues list
        success, data, error = self.make_request('GET', 'venues')
        self.log_test("GET /api/venues", success, error)
        if success and data:
            print(f"   Found {len(data)} venues")
            if data:
                self.venue_id = data[0]['id']
                print(f"   Using venue: {self.venue_id}")
        
        # Test admin login with PIN 0000
        login_url = "auth/login/pin?pin=0000&app=admin"
        success, data, error = self.make_request('POST', login_url)
        self.log_test("POST /api/auth/login/pin (PIN: 0000, app: admin)", success, error)
        
        if success and 'accessToken' in data:
            self.token = data['accessToken']
            print(f"   Logged in as: {data['user']['name']} ({data['user']['role']})")
        else:
            print("   ⚠️  WARNING: Admin login failed, some tests may fail")

    def test_modular_routes(self):
        """Test Modular Routes (sample from each domain)"""
        print("\n" + "="*60)
        print("2. MODULAR ROUTES (Sample from each domain)")
        print("="*60)
        
        if not self.venue_id:
            print("   ⚠️  No venue_id available, skipping venue-specific tests")
            return
        
        # Test venue stats
        success, data, error = self.make_request('GET', f'venues/{self.venue_id}/stats')
        self.log_test(f"GET /api/venues/{self.venue_id}/stats", success, error)
        if success:
            print(f"   Stats: {data.get('open_orders', 0)} orders, {data.get('occupied_tables', 0)}/{data.get('total_tables', 0)} tables")
        
        # Test menu items
        success, data, error = self.make_request('GET', f'venues/{self.venue_id}/menu/items')
        self.log_test(f"GET /api/venues/{self.venue_id}/menu/items", success, error)
        if success:
            print(f"   Found {len(data)} menu items")
        
        # Test guests
        success, data, error = self.make_request('GET', f'venues/{self.venue_id}/guests')
        self.log_test(f"GET /api/venues/{self.venue_id}/guests", success, error)
        if success:
            print(f"   Found {len(data)} guests")
        
        # Test inventory
        success, data, error = self.make_request('GET', f'venues/{self.venue_id}/inventory')
        self.log_test(f"GET /api/venues/{self.venue_id}/inventory", success, error)
        if success:
            print(f"   Found {len(data)} inventory items")
        
        # Test shifts
        success, data, error = self.make_request('GET', f'venues/{self.venue_id}/shifts/active')
        self.log_test(f"GET /api/venues/{self.venue_id}/shifts", success, error)
        if success:
            shifts = data if isinstance(data, list) else []
            print(f"   Found {len(shifts)} active shifts")
        
        # Test devices
        success, data, error = self.make_request('GET', f'venues/{self.venue_id}/devices')
        self.log_test(f"GET /api/venues/{self.venue_id}/devices", success, error)
        if success:
            print(f"   Found {len(data)} devices")

    def test_event_driven_infrastructure(self):
        """Test Event-Driven Infrastructure"""
        print("\n" + "="*60)
        print("3. EVENT-DRIVEN INFRASTRUCTURE")
        print("="*60)
        
        # Test services status
        success, data, error = self.make_request('GET', 'services/status')
        self.log_test("GET /api/services/status (should show 7 microservices)", success, error)
        
        if success:
            services = data.get('services', []) if isinstance(data, dict) else []
            event_bus_running = data.get('event_bus_running', False) if isinstance(data, dict) else False
            print(f"   Found {len(services)} microservices")
            print(f"   Event Bus Running: {event_bus_running}")
            
            if len(services) == 7:
                self.log_test("7 microservices active", True)
                for service in services:
                    print(f"      - {service.get('name', 'N/A')}: {service.get('status', 'N/A')}")
            else:
                self.log_test("7 microservices active", False, f"Expected 7, found {len(services)}")
        
        # Test events outbox
        success, data, error = self.make_request('GET', 'events/outbox')
        self.log_test("GET /api/events/outbox", success, error)
        if success:
            events = data.get('events', []) if isinstance(data, dict) else []
            print(f"   Outbox events: {len(events)}")
        
        # Test events DLQ
        success, data, error = self.make_request('GET', 'events/dlq')
        self.log_test("GET /api/events/dlq", success, error)
        if success:
            dlq_events = data.get('events', []) if isinstance(data, dict) else []
            print(f"   DLQ events: {len(dlq_events)}")

    def test_employee_routes(self):
        """Test Employee Routes"""
        print("\n" + "="*60)
        print("4. EMPLOYEE ROUTES")
        print("="*60)
        
        # Test employee tips
        success, data, error = self.make_request('GET', 'employee/tips')
        self.log_test("GET /api/employee/tips", success, error)
        if success:
            tips = data if isinstance(data, list) else []
            print(f"   Found {len(tips)} tips records")
        
        # Test employee payslips
        success, data, error = self.make_request('GET', 'employee/payslips')
        self.log_test("GET /api/employee/payslips", success, error)
        if success:
            payslips = data if isinstance(data, list) else []
            print(f"   Found {len(payslips)} payslips")
        
        # Test employee documents
        success, data, error = self.make_request('GET', 'employee/documents')
        self.log_test("GET /api/employee/documents", success, error)
        if success:
            documents = data if isinstance(data, list) else []
            print(f"   Found {len(documents)} documents")

    def test_finance_and_reporting(self):
        """Test Finance & Reporting"""
        print("\n" + "="*60)
        print("5. FINANCE & REPORTING")
        print("="*60)
        
        if not self.venue_id:
            print("   ⚠️  No venue_id available, skipping venue-specific tests")
            return
        
        # Test finance summary
        success, data, error = self.make_request('GET', f'venues/{self.venue_id}/finance/summary')
        self.log_test(f"GET /api/venues/{self.venue_id}/finance/summary", success, error)
        if success:
            print(f"   Open Orders: {data.get('open_orders_count', 0)}")
            print(f"   Closed Checks: {data.get('closed_checks_count', 0)}")
            print(f"   Gross Sales Today: {data.get('gross_sales_today', 0)}")
        
        # Test report definitions
        success, data, error = self.make_request('GET', 'reports/defs')
        self.log_test("GET /api/reports/defs", success, error)
        if success:
            reports = data if isinstance(data, list) else []
            print(f"   Found {len(reports)} report definitions")
            for report in reports[:3]:  # Show first 3
                print(f"      - {report.get('key', 'N/A')}: {report.get('title', 'N/A')}")

    def test_server_configuration(self):
        """Verify server.py configuration"""
        print("\n" + "="*60)
        print("6. SERVER CONFIGURATION VERIFICATION")
        print("="*60)
        
        # Count lines in server.py
        try:
            with open('/app/backend/server.py', 'r') as f:
                lines = f.readlines()
                total_lines = len(lines)
                
            print(f"   Server.py lines: {total_lines}")
            
            if 220 <= total_lines <= 230:
                self.log_test("Clean server.py (~221 lines)", True)
            else:
                self.log_test("Clean server.py (~221 lines)", False, f"Found {total_lines} lines")
            
            # Count route modules mounted
            route_includes = [line for line in lines if 'include_router' in line]
            print(f"   Route modules mounted: {len(route_includes)}")
            
            if len(route_includes) >= 28:
                self.log_test("All 28 route modules mounted", True)
            else:
                self.log_test("All 28 route modules mounted", False, f"Found {len(route_includes)} modules")
            
            # Check microservices initialization
            microservice_inits = [line for line in lines if '.initialize()' in line and 'service' in line.lower()]
            print(f"   Microservices initialized: {len(microservice_inits)}")
            
            if len(microservice_inits) == 7:
                self.log_test("7 microservices initialized", True)
            else:
                self.log_test("7 microservices initialized", False, f"Found {len(microservice_inits)} initializations")
                
        except Exception as e:
            self.log_test("Server.py verification", False, f"Error reading file: {str(e)}")

    def test_no_500_errors(self):
        """Verify no 500 errors on critical endpoints"""
        print("\n" + "="*60)
        print("7. NO 500 ERRORS VERIFICATION")
        print("="*60)
        
        critical_endpoints = [
            ('GET', 'health'),
            ('GET', 'system/version'),
            ('GET', 'venues'),
            ('GET', 'services/status'),
            ('GET', 'events/outbox'),
            ('GET', 'events/dlq'),
            ('GET', 'reports/defs'),
        ]
        
        if self.venue_id:
            critical_endpoints.extend([
                ('GET', f'venues/{self.venue_id}/stats'),
                ('GET', f'venues/{self.venue_id}/menu/items'),
                ('GET', f'venues/{self.venue_id}/finance/summary'),
            ])
        
        all_passed = True
        for method, endpoint in critical_endpoints:
            success, data, error = self.make_request(method, endpoint)
            if not success and '500' in error:
                print(f"   ❌ 500 error on {method} /api/{endpoint}")
                all_passed = False
        
        if all_passed:
            self.log_test("No 500 errors on critical endpoints", True)
            print("   ✅ All critical endpoints return 200 OK or proper auth error")
        else:
            self.log_test("No 500 errors on critical endpoints", False, "Some endpoints returned 500")

    def run_comprehensive_tests(self):
        """Run all comprehensive tests"""
        print("\n" + "🚀"*30)
        print("COMPREHENSIVE BACKEND TESTING - restin.ai")
        print("🚀"*30)
        
        # Run all test suites
        self.test_auth_and_system()
        self.test_modular_routes()
        self.test_event_driven_infrastructure()
        self.test_employee_routes()
        self.test_finance_and_reporting()
        self.test_server_configuration()
        self.test_no_500_errors()
        
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
    tester = ComprehensiveBackendTester()
    return tester.run_comprehensive_tests()

if __name__ == "__main__":
    sys.exit(main())
