#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime
from typing import Dict, List, Optional

class TablePresetsAndExportTester:
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
                response = requests.get(url, headers=headers, params=params, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, params=params, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, params=params, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, params=params, timeout=10)
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

    def test_admin_login(self):
        """Test admin login with PIN 1234"""
        print("\n🔐 Testing Admin Login (PIN 1234)")
        
        login_url = "auth/login/pin?pin=1234&app=admin"
        success, data, error = self.make_request('POST', login_url)
        
        if success and 'accessToken' in data:
            self.token = data['accessToken']
            self.log_test("Admin Login (PIN 1234)", True)
            print(f"   Logged in as: {data['user']['name']} ({data['user']['role']})")
            return True
        else:
            self.log_test("Admin Login (PIN 1234)", False, error or "No accessToken received")
            return False

    def test_inventory_api_endpoints(self):
        """Test inventory API endpoints for DataTable functionality"""
        print("\n📦 Testing Inventory API Endpoints")
        
        # Test basic inventory list
        success, data, error = self.make_request('GET', f'venues/{self.venue_id}/inventory')
        self.log_test("GET /api/venues/{venue_id}/inventory", success, error)
        
        if not success:
            return False
        
        inventory_items = data.get('items', [])
        total_count = data.get('total', 0)
        print(f"   Found {len(inventory_items)} items (total: {total_count})")
        
        # Test with pagination
        success, data, error = self.make_request('GET', f'venues/{self.venue_id}/inventory', 
                                                params={'page': 1, 'page_size': 10})
        self.log_test("Inventory API - Pagination", success, error)
        
        # Test with search
        success, data, error = self.make_request('GET', f'venues/{self.venue_id}/inventory', 
                                                params={'search': 'caviar'})
        self.log_test("Inventory API - Search", success, error)
        
        # Test with filters
        success, data, error = self.make_request('GET', f'venues/{self.venue_id}/inventory', 
                                                params={'current_stock_min': 0, 'current_stock_max': 1000})
        self.log_test("Inventory API - Filters", success, error)
        
        # Test with sorting
        success, data, error = self.make_request('GET', f'venues/{self.venue_id}/inventory', 
                                                params={'sort_by': 'name', 'sort_dir': 'asc'})
        self.log_test("Inventory API - Sorting", success, error)
        
        return True

    def test_error_inbox_api_endpoints(self):
        """Test error inbox API endpoints for DataTable functionality"""
        print("\n🚨 Testing Error Inbox API Endpoints")
        
        # Test basic error inbox list
        success, data, error = self.make_request('GET', 'observability/error-inbox', 
                                                params={'venue_id': self.venue_id})
        self.log_test("GET /api/observability/error-inbox", success, error)
        
        if not success:
            return False
        
        error_items = data.get('items', [])
        total_count = data.get('total', 0)
        print(f"   Found {len(error_items)} errors (total: {total_count})")
        
        # Test with pagination
        success, data, error = self.make_request('GET', 'observability/error-inbox', 
                                                params={'venue_id': self.venue_id, 'page': 1, 'page_size': 10})
        self.log_test("Error Inbox API - Pagination", success, error)
        
        # Test with search
        success, data, error = self.make_request('GET', 'observability/error-inbox', 
                                                params={'venue_id': self.venue_id, 'q': 'error'})
        self.log_test("Error Inbox API - Search", success, error)
        
        # Test with filters
        success, data, error = self.make_request('GET', 'observability/error-inbox', 
                                                params={'venue_id': self.venue_id, 'domains': 'ORDERS,INVENTORY'})
        self.log_test("Error Inbox API - Domain Filters", success, error)
        
        # Test retryable_only toggle
        success, data, error = self.make_request('GET', 'observability/error-inbox', 
                                                params={'venue_id': self.venue_id, 'retryable_only': True})
        self.log_test("Error Inbox API - Retryable Only", success, error)
        
        # Test blocking_only toggle
        success, data, error = self.make_request('GET', 'observability/error-inbox', 
                                                params={'venue_id': self.venue_id, 'blocking_only': True})
        self.log_test("Error Inbox API - Blocking Only", success, error)
        
        # Test with sorting
        success, data, error = self.make_request('GET', 'observability/error-inbox', 
                                                params={'venue_id': self.venue_id, 'sort_by': 'last_seen_at', 'sort_dir': 'desc'})
        self.log_test("Error Inbox API - Sorting", success, error)
        
        return True

    def test_table_presets_api(self):
        """Test table presets API endpoints"""
        print("\n📋 Testing Table Presets API")
        
        table_id = "inventory-items"
        
        # Test list presets (should be empty initially)
        success, data, error = self.make_request('GET', 'table-presets', 
                                                params={'table_id': table_id, 'venue_id': self.venue_id})
        self.log_test("GET /api/table-presets (list)", success, error)
        
        if not success:
            return False
        
        initial_presets = data.get('presets', [])
        print(f"   Found {len(initial_presets)} existing presets")
        
        # Test create personal preset
        preset_data = {
            "table_id": table_id,
            "venue_id": self.venue_id,
            "name": "Test Personal Preset",
            "scope": "USER",
            "state": {
                "columnVisibility": {"name": True, "sku": True, "current_stock": False},
                "columnOrder": ["name", "sku", "unit"],
                "pageSize": 50,
                "sorting": [{"id": "name", "desc": False}],
                "globalSearch": "",
                "filters": {}
            }
        }
        
        success, data, error = self.make_request('POST', 'table-presets', preset_data)
        self.log_test("POST /api/table-presets (create personal)", success, error)
        
        if not success:
            return False
        
        personal_preset = data.get('preset', {})
        personal_preset_id = personal_preset.get('id')
        print(f"   Created personal preset: {personal_preset_id}")
        
        # Test create role preset (should work for owner)
        role_preset_data = {
            "table_id": table_id,
            "venue_id": self.venue_id,
            "name": "Test Role Preset",
            "scope": "ROLE",
            "state": {
                "columnVisibility": {"name": True, "sku": True, "current_stock": True},
                "columnOrder": ["name", "current_stock", "unit"],
                "pageSize": 20,
                "sorting": [{"id": "current_stock", "desc": True}],
                "globalSearch": "",
                "filters": {"unit": ["g", "kg"]}
            }
        }
        
        success, data, error = self.make_request('POST', 'table-presets', role_preset_data)
        self.log_test("POST /api/table-presets (create role)", success, error)
        
        role_preset_id = None
        if success:
            role_preset = data.get('preset', {})
            role_preset_id = role_preset.get('id')
            print(f"   Created role preset: {role_preset_id}")
        
        # Test list presets again (should show new presets)
        success, data, error = self.make_request('GET', 'table-presets', 
                                                params={'table_id': table_id, 'venue_id': self.venue_id})
        self.log_test("GET /api/table-presets (after creation)", success, error)
        
        if success:
            updated_presets = data.get('presets', [])
            print(f"   Now found {len(updated_presets)} presets")
            
            # Verify presets contain expected fields
            for preset in updated_presets:
                if preset.get('id') == personal_preset_id:
                    self.log_test("Personal preset has correct scope", preset.get('scope') == 'USER')
                    self.log_test("Personal preset has state", 'state' in preset)
                elif preset.get('id') == role_preset_id:
                    self.log_test("Role preset has correct scope", preset.get('scope') == 'ROLE')
                    self.log_test("Role preset has state", 'state' in preset)
        
        # Test delete personal preset
        if personal_preset_id:
            success, data, error = self.make_request('DELETE', f'table-presets/{personal_preset_id}')
            self.log_test("DELETE /api/table-presets/{id} (personal)", success, error)
        
        # Test delete role preset
        if role_preset_id:
            success, data, error = self.make_request('DELETE', f'table-presets/{role_preset_id}')
            self.log_test("DELETE /api/table-presets/{id} (role)", success, error)
        
        return True

    def test_csv_export_functionality(self):
        """Test CSV export functionality (simulated)"""
        print("\n📊 Testing CSV Export Functionality")
        
        # We can't directly test CSV download via API, but we can test the data endpoints
        # that would be used for CSV export
        
        # Test inventory export data
        success, data, error = self.make_request('GET', f'venues/{self.venue_id}/inventory', 
                                                params={'page': 1, 'page_size': 1000})
        self.log_test("Inventory data for CSV export", success, error)
        
        if success:
            items = data.get('items', [])
            print(f"   Available for export: {len(items)} inventory items")
            
            # Verify items have required fields for CSV
            if items:
                sample_item = items[0]
                required_fields = ['name', 'sku', 'current_stock', 'unit', 'min_stock']
                has_all_fields = all(field in sample_item for field in required_fields)
                self.log_test("Inventory items have CSV export fields", has_all_fields)
                
                if has_all_fields:
                    print("   ✅ All required CSV fields present")
                else:
                    missing_fields = [f for f in required_fields if f not in sample_item]
                    print(f"   ❌ Missing fields: {missing_fields}")
        
        # Test error inbox export data
        success, data, error = self.make_request('GET', 'observability/error-inbox', 
                                                params={'venue_id': self.venue_id, 'page': 1, 'page_size': 1000})
        self.log_test("Error inbox data for CSV export", success, error)
        
        if success:
            items = data.get('items', [])
            print(f"   Available for export: {len(items)} error items")
            
            # Verify items have required fields for CSV
            if items:
                sample_item = items[0]
                required_fields = ['display_id', 'domain', 'severity', 'status', 'occurrence_count', 'last_seen_at']
                has_all_fields = all(field in sample_item for field in required_fields)
                self.log_test("Error items have CSV export fields", has_all_fields)
        
        return True

    def run_all_tests(self):
        """Run all tests"""
        print("🧪 Starting Table Presets and CSV Export Tests")
        print("=" * 60)
        
        # Test admin login first
        if not self.test_admin_login():
            print("❌ Cannot proceed without admin login")
            return False
        
        # Test API endpoints
        self.test_inventory_api_endpoints()
        self.test_error_inbox_api_endpoints()
        
        # Test table presets
        self.test_table_presets_api()
        
        # Test CSV export functionality
        self.test_csv_export_functionality()
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"Tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return False

def main():
    tester = TablePresetsAndExportTester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())