#!/usr/bin/env python3
"""
Stock Count & Waste System - Comprehensive End-to-End Testing
Tests the complete flow including ledger integration
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, List, Optional

class StockCountWasteTester:
    def __init__(self, base_url="https://observe-hub-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.venue_id = "venue-caviar-bull"
        self.owner_pin = "1234"

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

            try:
                response_data = response.json() if response.content else {}
            except:
                response_data = {"raw_response": response.text}
            
            success = response.status_code == expected_status
            if not success:
                return False, response_data, f"Expected {expected_status}, got {response.status_code}: {json.dumps(response_data)}"
            
            return True, response_data, ""

        except requests.exceptions.Timeout:
            return False, {}, "Request timeout"
        except requests.exceptions.ConnectionError:
            return False, {}, "Connection error"
        except Exception as e:
            return False, {}, f"Request error: {str(e)}"

    def authenticate(self):
        """Authenticate with Owner PIN"""
        print("\n🔐 AUTHENTICATION")
        print("=" * 60)
        
        login_url = f"auth/login/pin?pin={self.owner_pin}&app=admin"
        success, data, error = self.make_request('POST', login_url)
        
        if success and 'accessToken' in data:
            self.token = data['accessToken']
            self.log_test("Owner Login (PIN: 1234)", True)
            print(f"   Logged in as: {data['user']['name']} ({data['user']['role']})")
            return True
        else:
            self.log_test("Owner Login (PIN: 1234)", False, error or "No accessToken received")
            print("   ❌ CRITICAL: Cannot proceed without authentication!")
            return False

    def test_complete_stock_count_flow(self):
        """Test complete stock count flow end-to-end"""
        print("\n\n📊 COMPLETE STOCK COUNT FLOW (END-TO-END)")
        print("=" * 60)
        
        # STEP 1: Get inventory items
        print("\n📦 STEP 1: Get Actual Inventory Items")
        success, items_data, error = self.make_request('GET', f'inventory/items?venue_id={self.venue_id}')
        self.log_test("GET /api/inventory/items", success, error)
        
        if not success:
            print("   ❌ CRITICAL: Cannot get inventory items!")
            return
        
        items = items_data.get('items', [])
        print(f"   ✅ Found {len(items)} inventory items")
        
        if len(items) < 3:
            print("   ❌ CRITICAL: Need at least 3 items for testing!")
            return
        
        # Select 3 items for counting
        test_items = items[:3]
        print(f"\n   Selected items for counting:")
        for item in test_items:
            print(f"      - {item['name']} (SKU: {item['sku']}, Current Stock: {item.get('current_stock', 0)} {item.get('base_unit', 'units')})")
        
        # STEP 2: Start new stock count
        print("\n\n📝 STEP 2: Start New Stock Count")
        success, count_data, error = self.make_request('POST', f'inventory/counts/start?venue_id={self.venue_id}', expected_status=200)
        self.log_test("POST /api/inventory/counts/start", success, error)
        
        if not success:
            print("   ❌ CRITICAL: Failed to start stock count!")
            return
        
        count = count_data.get('count', {})
        count_id = count.get('id')
        display_id = count.get('display_id')
        print(f"   ✅ Stock count started: {display_id} (ID: {count_id})")
        print(f"      Status: {count.get('status')}")
        
        # STEP 3: Submit count lines with variances
        print("\n\n📋 STEP 3: Submit Count Lines (3 items with variances)")
        
        # Define variances: -1, +1, +3
        variances = [-1, +1, +3]
        count_lines = []
        
        for i, item in enumerate(test_items):
            theoretical = item.get('current_stock', 0)
            variance = variances[i]
            counted = theoretical + variance
            
            line_data = {
                "item_id": item['id'],
                "item_name": item['name'],
                "counted_qty": counted,
                "unit": item.get('base_unit', 'kg')
            }
            
            print(f"\n   Item {i+1}: {item['name']}")
            print(f"      Theoretical: {theoretical} {item.get('base_unit', 'kg')}")
            print(f"      Counted: {counted} {item.get('base_unit', 'kg')}")
            print(f"      Variance: {variance:+} {item.get('base_unit', 'kg')}")
            
            success, line_result, error = self.make_request(
                'POST', 
                f'inventory/counts/{count_id}/lines?venue_id={self.venue_id}',
                line_data
            )
            self.log_test(f"Submit count line for {item['name']} (variance: {variance:+})", success, error)
            
            if success:
                count_lines.append({
                    "item": item,
                    "theoretical": theoretical,
                    "counted": counted,
                    "variance": variance
                })
        
        if len(count_lines) != 3:
            print("   ❌ CRITICAL: Failed to submit all count lines!")
            return
        
        print(f"\n   ✅ Successfully submitted {len(count_lines)} count lines")
        
        # STEP 4: Complete the count
        print("\n\n✅ STEP 4: Complete the Count")
        success, complete_data, error = self.make_request(
            'POST',
            f'inventory/counts/{count_id}/complete?venue_id={self.venue_id}'
        )
        self.log_test("POST /api/inventory/counts/{count_id}/complete", success, error)
        
        if not success:
            print("   ❌ CRITICAL: Failed to complete stock count!")
            return
        
        print(f"   ✅ Stock count completed: {display_id}")
        
        # STEP 5: Verify ledger adjustments created
        print("\n\n🔍 STEP 5: Verify Ledger Adjustments Created")
        
        for line in count_lines:
            item = line['item']
            variance = line['variance']
            
            print(f"\n   Checking item: {item['name']}")
            
            # Get item detail with ledger
            success, item_detail, error = self.make_request(
                'GET',
                f'inventory/items/{item["id"]}?venue_id={self.venue_id}'
            )
            
            if not success:
                self.log_test(f"GET /api/inventory/items/{item['id']} (verify ledger)", False, error)
                print(f"      ❌ Failed to get item detail: {error}")
                continue
            
            self.log_test(f"GET /api/inventory/items/{item['id']} (no 520 error)", True)
            
            ledger = item_detail.get('ledger', [])
            print(f"      ✅ Item detail retrieved (no 520 error)")
            print(f"      Ledger entries: {len(ledger)}")
            
            # Find STOCK_ADJUSTMENT entries for this count
            adjustment_entries = [
                e for e in ledger 
                if e.get('reason') == 'STOCK_ADJUSTMENT' 
                and e.get('ref_type') == 'COUNT'
                and e.get('ref_id') == count_id
            ]
            
            if adjustment_entries:
                self.log_test(f"Ledger adjustment created for {item['name']}", True)
                print(f"      ✅ Found {len(adjustment_entries)} STOCK_ADJUSTMENT entry(ies)")
                for entry in adjustment_entries:
                    print(f"         - qty_delta: {entry.get('qty_delta'):+} {entry.get('unit')}")
                    print(f"         - reason: {entry.get('reason')}")
                    print(f"         - ref_type: {entry.get('ref_type')}")
                    print(f"         - ref_id: {entry.get('ref_id')}")
            else:
                self.log_test(f"Ledger adjustment created for {item['name']}", False, "No STOCK_ADJUSTMENT entries found")
                print(f"      ❌ No STOCK_ADJUSTMENT entries found for this count")
        
        # STEP 6: Verify stock levels updated
        print("\n\n📈 STEP 6: Verify Stock Levels Updated Correctly")
        
        success, updated_items_data, error = self.make_request('GET', f'inventory/items?venue_id={self.venue_id}')
        
        if not success:
            print("   ❌ Failed to get updated inventory!")
            return
        
        updated_items = updated_items_data.get('items', [])
        
        for line in count_lines:
            item = line['item']
            expected_stock = line['counted']
            
            updated_item = next((i for i in updated_items if i['id'] == item['id']), None)
            
            if updated_item:
                actual_stock = updated_item.get('current_stock', 0)
                print(f"\n   {item['name']}:")
                print(f"      Expected: {expected_stock} {item.get('base_unit', 'kg')}")
                print(f"      Actual: {actual_stock} {item.get('base_unit', 'kg')}")
                
                if abs(actual_stock - expected_stock) < 0.01:  # Allow small floating point differences
                    self.log_test(f"Stock level updated correctly for {item['name']}", True)
                    print(f"      ✅ Stock level correct!")
                else:
                    self.log_test(f"Stock level updated correctly for {item['name']}", False, 
                                f"Expected {expected_stock}, got {actual_stock}")
                    print(f"      ❌ Stock level incorrect!")
            else:
                print(f"\n   ❌ Item {item['name']} not found in updated inventory")

    def test_complete_waste_flow(self):
        """Test complete waste flow end-to-end"""
        print("\n\n🗑️  COMPLETE WASTE FLOW (END-TO-END)")
        print("=" * 60)
        
        # STEP 1: Get inventory items
        print("\n📦 STEP 1: Get Inventory Items for Waste")
        success, items_data, error = self.make_request('GET', f'inventory/items?venue_id={self.venue_id}')
        
        if not success:
            print("   ❌ CRITICAL: Cannot get inventory items!")
            return
        
        items = items_data.get('items', [])
        
        if len(items) < 2:
            print("   ❌ CRITICAL: Need at least 2 items for testing!")
            return
        
        # Select 2 items for waste
        test_items = items[:2]
        print(f"   ✅ Selected {len(test_items)} items for waste logging:")
        for item in test_items:
            print(f"      - {item['name']} (Current Stock: {item.get('current_stock', 0)} {item.get('base_unit', 'units')})")
        
        # Record initial stock levels
        initial_stocks = {item['id']: item.get('current_stock', 0) for item in test_items}
        
        # STEP 2: Log waste for 2 items with different reasons
        print("\n\n📝 STEP 2: Log Waste (2 items with different reasons)")
        
        waste_reasons = ['SPOILAGE', 'PREP_WASTE']
        waste_entries = []
        
        for i, item in enumerate(test_items):
            waste_qty = 2.0  # Waste 2 units
            reason = waste_reasons[i]
            
            waste_data = {
                "venue_id": self.venue_id,
                "item_id": item['id'],
                "item_name": item['name'],
                "qty": waste_qty,
                "unit": item.get('base_unit', 'kg'),
                "reason": reason,
                "cost": 10.0,
                "notes": f"Test waste entry - {reason}"
            }
            
            print(f"\n   Item {i+1}: {item['name']}")
            print(f"      Waste Qty: {waste_qty} {item.get('base_unit', 'kg')}")
            print(f"      Reason: {reason}")
            
            success, waste_result, error = self.make_request('POST', 'inventory/waste', waste_data, expected_status=200)
            self.log_test(f"POST /api/inventory/waste ({reason})", success, error)
            
            if success:
                waste_entry = waste_result.get('waste', {})
                waste_entries.append({
                    "item": item,
                    "waste_id": waste_entry.get('id'),
                    "qty": waste_qty,
                    "reason": reason
                })
                print(f"      ✅ Waste logged: {waste_entry.get('id')}")
            else:
                print(f"      ❌ Failed to log waste: {error}")
        
        if len(waste_entries) != 2:
            print("   ❌ CRITICAL: Failed to log all waste entries!")
            return
        
        # STEP 3: Verify waste entries created
        print("\n\n📋 STEP 3: Verify Waste Entries Created")
        
        success, waste_list, error = self.make_request('GET', f'inventory/waste?venue_id={self.venue_id}')
        self.log_test("GET /api/inventory/waste", success, error)
        
        if success:
            waste_list_data = waste_list.get('waste', [])
            print(f"   ✅ Found {len(waste_list_data)} waste entries")
            
            # Verify our waste entries are in the list
            for entry in waste_entries:
                found = any(w.get('id') == entry['waste_id'] for w in waste_list_data)
                if found:
                    self.log_test(f"Waste entry {entry['waste_id'][:8]}... found in list", True)
                else:
                    self.log_test(f"Waste entry {entry['waste_id'][:8]}... found in list", False, "Not found")
        
        # STEP 4: Verify negative ledger entries created
        print("\n\n🔍 STEP 4: Verify Negative Ledger Entries Created")
        
        for entry in waste_entries:
            item = entry['item']
            waste_id = entry['waste_id']
            waste_qty = entry['qty']
            
            print(f"\n   Checking item: {item['name']}")
            
            # Get item detail with ledger
            success, item_detail, error = self.make_request(
                'GET',
                f'inventory/items/{item["id"]}?venue_id={self.venue_id}'
            )
            
            if not success:
                self.log_test(f"GET /api/inventory/items/{item['id']} (verify waste ledger)", False, error)
                print(f"      ❌ Failed to get item detail: {error}")
                continue
            
            ledger = item_detail.get('ledger', [])
            print(f"      ✅ Item detail retrieved")
            print(f"      Ledger entries: {len(ledger)}")
            
            # Find WASTE entries
            waste_ledger_entries = [
                e for e in ledger 
                if e.get('reason') == 'WASTE'
                and e.get('ref_type') == 'WASTE'
                and e.get('ref_id') == waste_id
            ]
            
            if waste_ledger_entries:
                self.log_test(f"Waste ledger entry created for {item['name']}", True)
                print(f"      ✅ Found {len(waste_ledger_entries)} WASTE entry(ies)")
                for ledger_entry in waste_ledger_entries:
                    qty_delta = ledger_entry.get('qty_delta', 0)
                    print(f"         - qty_delta: {qty_delta} {ledger_entry.get('unit')}")
                    print(f"         - reason: {ledger_entry.get('reason')}")
                    print(f"         - ref_type: {ledger_entry.get('ref_type')}")
                    
                    # Verify qty_delta is negative
                    if qty_delta < 0:
                        self.log_test(f"Waste ledger entry has negative qty_delta for {item['name']}", True)
                        print(f"         ✅ qty_delta is negative (correct)")
                    else:
                        self.log_test(f"Waste ledger entry has negative qty_delta for {item['name']}", False, 
                                    f"qty_delta is {qty_delta}, should be negative")
                        print(f"         ❌ qty_delta is {qty_delta}, should be negative!")
            else:
                self.log_test(f"Waste ledger entry created for {item['name']}", False, "No WASTE entries found")
                print(f"      ❌ No WASTE entries found")
        
        # STEP 5: Verify stock levels decreased
        print("\n\n📉 STEP 5: Verify Stock Levels Decreased Correctly")
        
        success, updated_items_data, error = self.make_request('GET', f'inventory/items?venue_id={self.venue_id}')
        
        if not success:
            print("   ❌ Failed to get updated inventory!")
            return
        
        updated_items = updated_items_data.get('items', [])
        
        for entry in waste_entries:
            item = entry['item']
            waste_qty = entry['qty']
            initial_stock = initial_stocks[item['id']]
            expected_stock = initial_stock - waste_qty
            
            updated_item = next((i for i in updated_items if i['id'] == item['id']), None)
            
            if updated_item:
                actual_stock = updated_item.get('current_stock', 0)
                print(f"\n   {item['name']}:")
                print(f"      Initial: {initial_stock} {item.get('base_unit', 'kg')}")
                print(f"      Waste: -{waste_qty} {item.get('base_unit', 'kg')}")
                print(f"      Expected: {expected_stock} {item.get('base_unit', 'kg')}")
                print(f"      Actual: {actual_stock} {item.get('base_unit', 'kg')}")
                
                if abs(actual_stock - expected_stock) < 0.01:  # Allow small floating point differences
                    self.log_test(f"Stock decreased correctly for {item['name']}", True)
                    print(f"      ✅ Stock level correct!")
                else:
                    self.log_test(f"Stock decreased correctly for {item['name']}", False, 
                                f"Expected {expected_stock}, got {actual_stock}")
                    print(f"      ❌ Stock level incorrect!")
            else:
                print(f"\n   ❌ Item {item['name']} not found in updated inventory")

    def test_edge_cases(self):
        """Test edge cases"""
        print("\n\n🔬 EDGE CASES")
        print("=" * 60)
        
        # Get inventory items
        success, items_data, error = self.make_request('GET', f'inventory/items?venue_id={self.venue_id}')
        
        if not success or not items_data.get('items'):
            print("   ❌ Cannot get inventory items for edge case testing!")
            return
        
        items = items_data.get('items', [])
        test_item = items[0]
        
        # EDGE CASE 1: Submit count line with 0 variance
        print("\n\n🔍 EDGE CASE 1: Count Line with 0 Variance")
        
        # Start count
        success, count_data, error = self.make_request('POST', f'inventory/counts/start?venue_id={self.venue_id}')
        
        if not success:
            print("   ❌ Failed to start count for edge case testing!")
            return
        
        count_id = count_data.get('count', {}).get('id')
        theoretical = test_item.get('current_stock', 0)
        
        line_data = {
            "item_id": test_item['id'],
            "item_name": test_item['name'],
            "counted_qty": theoretical,  # Same as theoretical = 0 variance
            "unit": test_item.get('base_unit', 'kg')
        }
        
        print(f"   Item: {test_item['name']}")
        print(f"   Theoretical: {theoretical}")
        print(f"   Counted: {theoretical}")
        print(f"   Variance: 0")
        
        success, line_result, error = self.make_request(
            'POST',
            f'inventory/counts/{count_id}/lines?venue_id={self.venue_id}',
            line_data
        )
        self.log_test("Submit count line with 0 variance", success, error)
        
        # Complete count
        success, complete_data, error = self.make_request(
            'POST',
            f'inventory/counts/{count_id}/complete?venue_id={self.venue_id}'
        )
        
        if success:
            # Verify no ledger adjustment created
            success, item_detail, error = self.make_request(
                'GET',
                f'inventory/items/{test_item["id"]}?venue_id={self.venue_id}'
            )
            
            if success:
                ledger = item_detail.get('ledger', [])
                adjustment_entries = [
                    e for e in ledger 
                    if e.get('ref_id') == count_id
                ]
                
                if not adjustment_entries:
                    self.log_test("No ledger adjustment for 0 variance (correct)", True)
                    print("   ✅ No ledger adjustment created (correct behavior)")
                else:
                    self.log_test("No ledger adjustment for 0 variance (correct)", False, 
                                "Adjustment created for 0 variance")
                    print("   ❌ Ledger adjustment created for 0 variance (should not happen)")
        
        # EDGE CASE 2: Log waste with notes field
        print("\n\n🔍 EDGE CASE 2: Waste with Notes Field")
        
        waste_data = {
            "venue_id": self.venue_id,
            "item_id": test_item['id'],
            "item_name": test_item['name'],
            "qty": 0.5,
            "unit": test_item.get('base_unit', 'kg'),
            "reason": "BREAKAGE",
            "cost": 5.0,
            "notes": "Dropped during service - edge case test with detailed notes"
        }
        
        success, waste_result, error = self.make_request('POST', 'inventory/waste', waste_data)
        self.log_test("Log waste with notes field", success, error)
        
        if success:
            waste_entry = waste_result.get('waste', {})
            if waste_entry.get('notes'):
                print(f"   ✅ Notes saved: {waste_entry.get('notes')[:50]}...")
            else:
                print("   ⚠️  Notes not saved")
        
        # EDGE CASE 3: Complete count with no lines submitted
        print("\n\n🔍 EDGE CASE 3: Complete Count with No Lines")
        
        success, count_data, error = self.make_request('POST', f'inventory/counts/start?venue_id={self.venue_id}')
        
        if success:
            count_id = count_data.get('count', {}).get('id')
            
            # Complete without submitting any lines
            success, complete_data, error = self.make_request(
                'POST',
                f'inventory/counts/{count_id}/complete?venue_id={self.venue_id}'
            )
            self.log_test("Complete count with no lines submitted", success, error)
            
            if success:
                print("   ✅ Count completed successfully (no lines)")
            else:
                print(f"   ❌ Failed to complete count with no lines: {error}")

    def print_summary(self):
        """Print test summary"""
        print("\n\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed / self.tests_run * 100):.1f}%")
        
        # Print failed tests
        failed_tests = [t for t in self.test_results if not t['success']]
        if failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"   - {test['test']}")
                if test['details']:
                    print(f"     {test['details']}")
        else:
            print("\n✅ ALL TESTS PASSED!")
        
        return self.tests_passed == self.tests_run

    def run_all_tests(self):
        """Run all tests"""
        print("\n" + "=" * 60)
        print("🧪 STOCK COUNT & WASTE SYSTEM - COMPREHENSIVE TESTING")
        print("=" * 60)
        print(f"Venue: {self.venue_id}")
        print(f"Owner PIN: {self.owner_pin}")
        print("=" * 60)
        
        # Authenticate
        if not self.authenticate():
            return False
        
        # Run tests
        self.test_complete_stock_count_flow()
        self.test_complete_waste_flow()
        self.test_edge_cases()
        
        # Print summary
        return self.print_summary()

if __name__ == "__main__":
    tester = StockCountWasteTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)
