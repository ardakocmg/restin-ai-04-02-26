#!/usr/bin/env python3
"""
Final Comprehensive Testing for restin.ai
Testing ALL systems including NEW Inventory & Suppliers module
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, List, Optional

class FinalComprehensiveTester:
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

    def test_core_apis(self):
        """Test Core APIs"""
        print("\n" + "="*70)
        print("1. CORE APIs")
        print("="*70)
        
        # Test health check
        success, data, error = self.make_request('GET', 'health')
        self.log_test("GET /api/health", success, error)
        
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

    def test_inventory_suppliers_module(self):
        """Test NEW Inventory & Suppliers Module"""
        print("\n" + "="*70)
        print("2. INVENTORY & SUPPLIERS MODULE (NEW)")
        print("="*70)
        
        if not self.venue_id:
            print("   ⚠️  No venue_id available, skipping venue-specific tests")
            return
        
        # Test suppliers endpoint
        success, data, error = self.make_request('GET', f'inventory/suppliers?venue_id={self.venue_id}')
        self.log_test(f"GET /api/inventory/suppliers?venue_id={self.venue_id}", success, error)
        if success:
            suppliers = data if isinstance(data, list) else []
            print(f"   Found {len(suppliers)} suppliers")
            if suppliers:
                for supplier in suppliers[:3]:  # Show first 3
                    print(f"      - {supplier.get('name', 'N/A')} ({supplier.get('id', 'N/A')})")
        
        # Test purchase orders endpoint
        success, data, error = self.make_request('GET', f'inventory/purchase-orders?venue_id={self.venue_id}')
        self.log_test(f"GET /api/inventory/purchase-orders?venue_id={self.venue_id}", success, error)
        if success:
            pos = data if isinstance(data, list) else []
            print(f"   Found {len(pos)} purchase orders")
            if pos:
                for po in pos[:3]:  # Show first 3
                    print(f"      - PO {po.get('display_id', 'N/A')}: {po.get('status', 'N/A')}")
        
        # Test receiving/GRNs endpoint
        success, data, error = self.make_request('GET', f'inventory/receiving/grns?venue_id={self.venue_id}')
        self.log_test(f"GET /api/inventory/receiving/grns?venue_id={self.venue_id}", success, error)
        if success:
            grns = data if isinstance(data, list) else []
            print(f"   Found {len(grns)} GRNs (Goods Received Notes)")
            if grns:
                for grn in grns[:3]:  # Show first 3
                    print(f"      - GRN {grn.get('display_id', 'N/A')}: {grn.get('status', 'N/A')}")

    def test_employee_module(self):
        """Test Employee Module"""
        print("\n" + "="*70)
        print("3. EMPLOYEE MODULE")
        print("="*70)
        
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

    def test_event_driven_system(self):
        """Test Event-Driven System"""
        print("\n" + "="*70)
        print("4. EVENT-DRIVEN SYSTEM")
        print("="*70)
        
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
            print(f"   Outbox events: {len(events)} pending")
        
        # Test events DLQ
        success, data, error = self.make_request('GET', 'events/dlq')
        self.log_test("GET /api/events/dlq", success, error)
        if success:
            dlq_events = data.get('events', []) if isinstance(data, dict) else []
            print(f"   DLQ events: {len(dlq_events)} failed")

    def test_existing_modules_spot_check(self):
        """Test Existing Modules (Spot Check)"""
        print("\n" + "="*70)
        print("5. EXISTING MODULES (Spot Check)")
        print("="*70)
        
        if not self.venue_id:
            print("   ⚠️  No venue_id available, skipping venue-specific tests")
            return
        
        # Test menu items
        success, data, error = self.make_request('GET', f'venues/{self.venue_id}/menu/items')
        self.log_test(f"GET /api/venues/{self.venue_id}/menu/items", success, error)
        if success:
            items = data if isinstance(data, list) else []
            print(f"   Found {len(items)} menu items")
        
        # Test menu categories
        success, data, error = self.make_request('GET', f'venues/{self.venue_id}/menu/categories')
        self.log_test(f"GET /api/venues/{self.venue_id}/menu/categories", success, error)
        if success:
            categories = data if isinstance(data, list) else []
            print(f"   Found {len(categories)} menu categories")
        
        # Test orders
        success, data, error = self.make_request('GET', f'venues/{self.venue_id}/orders')
        self.log_test(f"GET /api/venues/{self.venue_id}/orders", success, error)
        if success:
            orders = data if isinstance(data, list) else []
            print(f"   Found {len(orders)} orders")
        
        # Test guests
        success, data, error = self.make_request('GET', f'venues/{self.venue_id}/guests')
        self.log_test(f"GET /api/venues/{self.venue_id}/guests", success, error)
        if success:
            guests = data if isinstance(data, list) else []
            print(f"   Found {len(guests)} guests")
        
        # Test tables
        success, data, error = self.make_request('GET', f'venues/{self.venue_id}/tables')
        self.log_test(f"GET /api/venues/{self.venue_id}/tables", success, error)
        if success:
            tables = data if isinstance(data, list) else []
            print(f"   Found {len(tables)} tables")
        
        # Test inventory
        success, data, error = self.make_request('GET', f'venues/{self.venue_id}/inventory')
        self.log_test(f"GET /api/venues/{self.venue_id}/inventory", success, error)
        if success:
            inventory = data if isinstance(data, list) else []
            print(f"   Found {len(inventory)} inventory items")
        
        # Test KDS tickets
        success, data, error = self.make_request('GET', f'venues/{self.venue_id}/kds/tickets')
        self.log_test(f"GET /api/venues/{self.venue_id}/kds/tickets", success, error)
        if success:
            tickets = data if isinstance(data, list) else []
            print(f"   Found {len(tickets)} KDS tickets")
        
        # Test stats
        success, data, error = self.make_request('GET', f'venues/{self.venue_id}/stats')
        self.log_test(f"GET /api/venues/{self.venue_id}/stats", success, error)
        if success:
            print(f"   Stats: {data.get('open_orders', 0)} orders, {data.get('occupied_tables', 0)}/{data.get('total_tables', 0)} tables")
        
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
            devices = data if isinstance(data, list) else []
            print(f"   Found {len(devices)} devices")
        
        # Test floor plan
        success, data, error = self.make_request('GET', f'venues/{self.venue_id}/floor-plan')
        self.log_test(f"GET /api/venues/{self.venue_id}/floor-plan", success, error)
        if success:
            floor_plan = data.get('floor_plan', {}) if isinstance(data, dict) else {}
            version = data.get('version', 0) if isinstance(data, dict) else 0
            print(f"   Floor plan version: {version}")
        
        # Test audit logs
        success, data, error = self.make_request('GET', f'venues/{self.venue_id}/audit-logs')
        self.log_test(f"GET /api/venues/{self.venue_id}/audit-logs", success, error)
        if success:
            logs = data if isinstance(data, list) else []
            print(f"   Found {len(logs)} audit log entries")
        
        # Test finance summary
        success, data, error = self.make_request('GET', f'venues/{self.venue_id}/finance/summary')
        self.log_test(f"GET /api/venues/{self.venue_id}/finance/summary", success, error)
        if success:
            print(f"   Finance: {data.get('open_orders_count', 0)} open orders, {data.get('closed_checks_count', 0)} closed checks")
        
        # Test reports
        success, data, error = self.make_request('GET', 'reports/defs')
        self.log_test("GET /api/reports/defs", success, error)
        if success:
            reports = data if isinstance(data, list) else []
            print(f"   Found {len(reports)} report definitions")
        
        # Test system version
        success, data, error = self.make_request('GET', 'system/version')
        self.log_test("GET /api/system/version", success, error)
        if success:
            print(f"   System version: {data.get('version', 'N/A')}")
        
        # Test system modules
        success, data, error = self.make_request('GET', 'system/modules')
        self.log_test("GET /api/system/modules", success, error)
        if success:
            modules = data if isinstance(data, list) else []
            print(f"   Found {len(modules)} system modules")

    def test_no_500_errors(self):
        """Verify no 500 errors on all tested endpoints"""
        print("\n" + "="*70)
        print("6. NO 500 ERRORS VERIFICATION")
        print("="*70)
        
        all_passed = True
        error_count = 0
        
        for result in self.test_results:
            if not result['success'] and '500' in result['details']:
                print(f"   ❌ 500 error on {result['test']}")
                all_passed = False
                error_count += 1
        
        if all_passed:
            self.log_test("No 500 errors on any endpoint", True)
            print("   ✅ All endpoints return 200 OK or proper auth error")
        else:
            self.log_test("No 500 errors on any endpoint", False, f"{error_count} endpoints returned 500")

    def run_final_comprehensive_tests(self):
        """Run all final comprehensive tests"""
        print("\n" + "🚀"*35)
        print("FINAL COMPREHENSIVE TESTING - restin.ai")
        print("Testing ALL Systems + NEW Inventory & Suppliers Module")
        print("🚀"*35)
        
        # Run all test suites
        self.test_core_apis()
        self.test_inventory_suppliers_module()
        self.test_employee_module()
        self.test_event_driven_system()
        self.test_existing_modules_spot_check()
        self.test_no_500_errors()
        
        # Final summary
        print("\n" + "="*70)
        print("📊 FINAL TEST SUMMARY")
        print("="*70)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.failed_tests:
            print("\n❌ FAILED TESTS:")
            for failed in self.failed_tests:
                print(f"   - {failed['test']}: {failed['details']}")
        else:
            print("\n✅ NO FAILED TESTS")
        
        # Expected results summary
        print("\n" + "="*70)
        print("📋 EXPECTED RESULTS VERIFICATION")
        print("="*70)
        print(f"✅ 30+ endpoints tested: {self.tests_run >= 30}")
        print(f"✅ New Inventory & Suppliers module functional: Check results above")
        print(f"✅ Zero breaking changes: {self.tests_run - self.tests_passed == 0}")
        
        if self.tests_passed == self.tests_run:
            print("\n🎉 ALL TESTS PASSED! SYSTEM FULLY OPERATIONAL!")
            return 0
        else:
            print(f"\n⚠️  {self.tests_run - self.tests_passed} tests failed")
            return 1

def main():
    tester = FinalComprehensiveTester()
    return tester.run_final_comprehensive_tests()

if __name__ == "__main__":
    sys.exit(main())
