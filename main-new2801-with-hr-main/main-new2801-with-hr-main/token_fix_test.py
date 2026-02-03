#!/usr/bin/env python3
"""
Token Fix Verification & Comprehensive POS/KDS System Testing
Tests the complete flow after token storage bug fix in POSRuntime.jsx
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, List, Optional

class TokenFixTester:
    def __init__(self, base_url="https://observe-hub-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.user_name = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.venue_id = "venue-caviar-bull"
        self.session_id = None
        self.order_id = None
        self.ticket_id = None

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
                return False, response_data, f"Expected {expected_status}, got {response.status_code}: {response_data}"
            
            return True, response_data, ""

        except requests.exceptions.Timeout:
            return False, {}, "Request timeout"
        except requests.exceptions.ConnectionError:
            return False, {}, "Connection error"
        except Exception as e:
            return False, {}, f"Request error: {str(e)}"

    def test_authentication_token_storage(self):
        """Test 1: Authentication with PIN 1234 and verify token storage"""
        print("\n" + "="*80)
        print("TEST 1: AUTHENTICATION VERIFICATION")
        print("="*80)
        
        # Login with Owner PIN (1234)
        print("\n1.1 POST /api/auth/login/pin (PIN: 1234, app: pos)")
        login_url = "auth/login/pin?pin=1234&app=pos"
        success, data, error = self.make_request('POST', login_url)
        
        if success and 'accessToken' in data:
            self.token = data['accessToken']
            self.user_id = data['user']['id']
            self.user_name = data['user']['name']
            self.log_test("Login with PIN 1234 (Owner)", True)
            print(f"   ✅ Logged in as: {data['user']['name']} ({data['user']['role']})")
            print(f"   ✅ User ID: {self.user_id}")
            print(f"   ✅ Venue ID: {data['user']['venueId']}")
            print(f"   ✅ Token received: {self.token[:20]}...")
            
            # Verify token format
            if self.token and len(self.token) > 20:
                self.log_test("Token has valid format", True)
            else:
                self.log_test("Token has valid format", False, "Token too short")
        else:
            self.log_test("Login with PIN 1234 (Owner)", False, error or "No accessToken received")
            print("   ❌ CRITICAL: Cannot proceed without authentication!")
            return False
        
        # Test that API calls succeed with token
        print("\n1.2 Verify API calls succeed with token")
        success, data, error = self.make_request('GET', 'health')
        self.log_test("API call with token succeeds (GET /api/health)", success, error)
        
        return True

    def test_pos_session_flow(self):
        """Test 2: POS Session Management"""
        print("\n" + "="*80)
        print("TEST 2: POS SESSION MANAGEMENT")
        print("="*80)
        
        # Open POS session
        print("\n2.1 POST /api/pos/sessions/open")
        session_data = {
            "venue_id": self.venue_id,
            "device_id": "test_device_001",
            "user_id": self.user_id
        }
        
        success, data, error = self.make_request('POST', 'pos/sessions/open', session_data)
        
        if success and data.get('ok') and 'session' in data:
            self.session_id = data['session']['id']
            self.log_test("Open POS session", True)
            print(f"   ✅ Session ID: {self.session_id}")
            print(f"   ✅ Status: {data['session']['status']}")
            print(f"   ✅ Menu Snapshot: {data['session'].get('menu_snapshot', {}).get('snapshot_id', 'N/A')}")
        else:
            self.log_test("Open POS session", False, error or "Session not created")
            return False
        
        return True

    def test_pos_order_flow(self):
        """Test 3: Complete POS Order Flow"""
        print("\n" + "="*80)
        print("TEST 3: POS ORDER FLOW")
        print("="*80)
        
        # Get tables
        print("\n3.1 GET /api/venues/{venue_id}/tables")
        success, tables_data, error = self.make_request('GET', f'venues/{self.venue_id}/tables')
        
        if not success or not tables_data:
            self.log_test("Get tables", False, error)
            return False
        
        self.log_test("Get tables", True)
        print(f"   ✅ Found {len(tables_data)} tables")
        
        # Find available table
        available_table = next((t for t in tables_data if t.get('status') == 'available'), tables_data[0])
        print(f"   ✅ Using table: {available_table.get('name')} (ID: {available_table.get('id')})")
        
        # Create POS order
        print("\n3.2 POST /api/pos/orders")
        order_data = {
            "venue_id": self.venue_id,
            "session_id": self.session_id,
            "table_id": available_table['id'],
            "table_name": available_table.get('name', 'Unknown'),
            "guest_count": 2
        }
        
        success, data, error = self.make_request('POST', 'pos/orders', order_data)
        
        if success and data.get('ok') and 'order' in data:
            self.order_id = data['order']['id']
            self.log_test("Create POS order", True)
            print(f"   ✅ Order ID: {self.order_id}")
            print(f"   ✅ Status: {data['order']['status']}")
        else:
            self.log_test("Create POS order", False, error or "Order not created")
            return False
        
        # Get menu items
        print("\n3.3 GET /api/venues/{venue_id}/menu/items")
        success, items_data, error = self.make_request('GET', f'venues/{self.venue_id}/menu/items')
        
        if not success or not items_data:
            self.log_test("Get menu items", False, error)
            return False
        
        self.log_test("Get menu items", True)
        print(f"   ✅ Found {len(items_data)} menu items")
        
        # Add items to order
        print("\n3.4 POST /api/pos/orders/{order_id}/items")
        items_added = 0
        for i, menu_item in enumerate(items_data[:3]):  # Add first 3 items
            item_data = {
                "order_id": self.order_id,
                "venue_id": self.venue_id,
                "menu_item_id": menu_item['id'],
                "qty": 1,
                "seat_no": 1,
                "course_no": 1
            }
            
            success, data, error = self.make_request('POST', f'pos/orders/{self.order_id}/items', item_data)
            
            if success and data.get('ok'):
                items_added += 1
                print(f"   ✅ Added: {menu_item['name']}")
            else:
                print(f"   ❌ Failed to add: {menu_item['name']} - {error}")
        
        self.log_test(f"Add items to order ({items_added}/3)", items_added > 0, 
                     f"Added {items_added} items")
        
        # Send order to KDS
        print("\n3.5 POST /api/pos/orders/{order_id}/send")
        success, data, error = self.make_request('POST', f'pos/orders/{self.order_id}/send?venue_id={self.venue_id}')
        
        if success and data.get('ok'):
            self.log_test("Send order to KDS", True)
            print("   ✅ Order sent to kitchen")
        else:
            self.log_test("Send order to KDS", False, error or "Failed to send")
            return False
        
        return True

    def test_kds_integration(self):
        """Test 4: KDS System Integration"""
        print("\n" + "="*80)
        print("TEST 4: KDS SYSTEM INTEGRATION")
        print("="*80)
        
        # Get KDS stations
        print("\n4.1 GET /api/kds/stations?venue_id={venue_id}")
        success, stations_data, error = self.make_request('GET', f'kds/stations?venue_id={self.venue_id}')
        
        if success and stations_data:
            self.log_test("Get KDS stations", True)
            print(f"   ✅ Found {len(stations_data)} KDS stations")
            for station in stations_data:
                print(f"      - {station.get('station_key')}: {station.get('display_name')}")
        else:
            self.log_test("Get KDS stations", False, error or "No stations found")
            return False
        
        # Get KDS tickets
        print("\n4.2 GET /api/kds/runtime/KITCHEN/tickets")
        success, tickets_data, error = self.make_request('GET', f'kds/runtime/KITCHEN/tickets?venue_id={self.venue_id}')
        
        if not success:
            self.log_test("Get KDS tickets", False, error)
            return False
        
        self.log_test("Get KDS tickets", True)
        print(f"   ✅ Found {len(tickets_data)} KDS tickets")
        
        # Find ticket for our order
        our_ticket = next((t for t in tickets_data if t.get('order_id') == self.order_id), None)
        
        if not our_ticket:
            self.log_test("KDS ticket created for POS order", False, 
                         f"No ticket found for order {self.order_id}")
            print(f"   ❌ CRITICAL: POS→KDS integration broken!")
            print(f"   Order ID: {self.order_id}")
            print(f"   Tickets found: {len(tickets_data)}")
            return False
        
        self.log_test("KDS ticket created for POS order", True)
        self.ticket_id = our_ticket['id']
        print(f"   ✅ Ticket ID: {self.ticket_id}")
        print(f"   ✅ Table: {our_ticket.get('table_name')}")
        print(f"   ✅ Status: {our_ticket.get('status')}")
        print(f"   ✅ Items: {len(our_ticket.get('items', []))}")
        
        # Test ticket bump workflow
        print("\n4.3 Test Ticket Bump Workflow (NEW → PREPARING → READY → COMPLETED)")
        
        # Bump to PREPARING
        print("\n   4.3.1 POST /api/kds/runtime/KITCHEN/tickets/{ticket_id}/bump")
        bump_data = {"new_status": "PREPARING"}
        success, data, error = self.make_request('POST', f'kds/runtime/KITCHEN/tickets/{self.ticket_id}/bump?venue_id={self.venue_id}', bump_data)
        
        if success:
            self.log_test("Bump ticket to PREPARING", True)
            print("      ✅ Ticket status: NEW → PREPARING")
        else:
            self.log_test("Bump ticket to PREPARING", False, error)
        
        # Bump to READY
        print("\n   4.3.2 POST /api/kds/runtime/KITCHEN/tickets/{ticket_id}/bump")
        bump_data = {"new_status": "READY"}
        success, data, error = self.make_request('POST', f'kds/runtime/KITCHEN/tickets/{self.ticket_id}/bump?venue_id={self.venue_id}', bump_data)
        
        if success:
            self.log_test("Bump ticket to READY", True)
            print("      ✅ Ticket status: PREPARING → READY")
        else:
            self.log_test("Bump ticket to READY", False, error)
        
        return True

    def test_pos_payment_flow(self):
        """Test 5: POS Payment & Close Order"""
        print("\n" + "="*80)
        print("TEST 5: POS PAYMENT & CLOSE ORDER")
        print("="*80)
        
        # Get order details to calculate total
        print("\n5.1 GET /api/pos/orders/{order_id}")
        success, data, error = self.make_request('GET', f'pos/orders/{self.order_id}?venue_id={self.venue_id}')
        
        if not success or not data.get('ok'):
            self.log_test("Get order details", False, error)
            return False
        
        self.log_test("Get order details", True)
        order = data['order']
        total = order.get('totals', {}).get('grand_total', 100.00)
        print(f"   ✅ Order total: €{total:.2f}")
        
        # Process payment
        print("\n5.2 POST /api/pos/orders/{order_id}/payments")
        payment_data = {
            "order_id": self.order_id,
            "venue_id": self.venue_id,
            "amount": total if total > 0 else 50.00,  # Use minimum 50 if total is 0
            "tender_type": "CARD",
            "external_ref": "test_payment_001"
        }
        
        success, data, error = self.make_request('POST', f'pos/orders/{self.order_id}/payments', payment_data)
        
        if success and data.get('ok'):
            self.log_test("Process payment", True)
            print(f"   ✅ Payment ID: {data['payment']['id']}")
            print(f"   ✅ Amount: €{data['payment']['amount']:.2f}")
            print(f"   ✅ Status: {data['payment']['status']}")
        else:
            self.log_test("Process payment", False, error or "Payment failed")
            return False
        
        # Close order
        print("\n5.3 POST /api/pos/orders/{order_id}/close")
        success, data, error = self.make_request('POST', f'pos/orders/{self.order_id}/close?venue_id={self.venue_id}')
        
        if success and data.get('ok'):
            self.log_test("Close order", True)
            print("   ✅ Order closed successfully")
        else:
            self.log_test("Close order", False, error or "Failed to close order")
            return False
        
        return True

    def test_inventory_system(self):
        """Test 6: Inventory System"""
        print("\n" + "="*80)
        print("TEST 6: INVENTORY SYSTEM")
        print("="*80)
        
        # List inventory items
        print("\n6.1 GET /api/inventory/items?venue_id={venue_id}")
        success, data, error = self.make_request('GET', f'inventory/items?venue_id={self.venue_id}')
        
        if success:
            items = data.get('items', [])
            self.log_test("List inventory items", True)
            print(f"   ✅ Found {len(items)} inventory items")
            for item in items[:5]:
                print(f"      - {item.get('name')}: {item.get('current_stock')} {item.get('unit')}")
        else:
            self.log_test("List inventory items", False, error)
        
        # Create supplier
        print("\n6.2 POST /api/inventory/suppliers")
        supplier_data = {
            "venue_id": self.venue_id,
            "name": "Test Supplier Ltd",
            "contact_name": "John Doe",
            "email": "john@testsupplier.com",
            "phone": "+1234567890",
            "lead_time_days": 3,
            "payment_terms": "NET30"
        }
        
        success, data, error = self.make_request('POST', 'inventory/suppliers', supplier_data)
        
        if success:
            self.log_test("Create supplier", True)
            print(f"   ✅ Supplier created: {data.get('name')}")
        else:
            self.log_test("Create supplier", False, error)
        
        # Create purchase order
        print("\n6.3 POST /api/inventory/purchase-orders")
        po_data = {
            "venue_id": self.venue_id,
            "supplier_id": data.get('id') if success else "test_supplier_001",
            "expected_delivery_date": "2025-02-01",
            "lines": [
                {
                    "sku_id": items[0].get('id') if items else "test_item_001",
                    "sku_name": items[0].get('name') if items else "Test Item",
                    "supplier_sku": "SUP-001",
                    "qty_ordered": 10,
                    "uom": items[0].get('unit') if items else "each",
                    "unit_price": 25.00,
                    "line_total": 250.00
                }
            ]
        }
        
        success, data, error = self.make_request('POST', 'inventory/purchase-orders', po_data)
        
        if success:
            self.log_test("Create purchase order", True)
            print(f"   ✅ PO created: {data.get('id')}")
        else:
            self.log_test("Create purchase order", False, error)
        
        # Test missing endpoints (expected 404)
        print("\n6.4 POST /api/inventory/counts/start (Expected: 404)")
        success, data, error = self.make_request('POST', 'inventory/counts/start', 
                                                 {"venue_id": self.venue_id}, expected_status=404)
        
        if success:
            self.log_test("Stock count endpoint missing (404)", True)
            print("   ✅ Correctly returns 404 (not implemented)")
        else:
            self.log_test("Stock count endpoint missing (404)", False, 
                         "Endpoint exists but should be missing")
        
        print("\n6.5 POST /api/inventory/waste (Expected: 404)")
        success, data, error = self.make_request('POST', 'inventory/waste', 
                                                 {"venue_id": self.venue_id}, expected_status=404)
        
        if success:
            self.log_test("Waste endpoint missing (404)", True)
            print("   ✅ Correctly returns 404 (not implemented)")
        else:
            self.log_test("Waste endpoint missing (404)", False, 
                         "Endpoint exists but should be missing")
        
        return True

    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*80)
        print("TEST SUMMARY")
        print("="*80)
        
        print(f"\nTotal Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        # Group results by test section
        print("\n" + "-"*80)
        print("DETAILED RESULTS:")
        print("-"*80)
        
        failed_tests = [t for t in self.test_results if not t['success']]
        
        if failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"   - {test['test']}")
                if test['details']:
                    print(f"     {test['details']}")
        else:
            print("\n✅ ALL TESTS PASSED!")
        
        # Critical findings
        print("\n" + "-"*80)
        print("CRITICAL FINDINGS:")
        print("-"*80)
        
        # Check for POS-KDS integration
        kds_ticket_test = next((t for t in self.test_results if 'KDS ticket created' in t['test']), None)
        if kds_ticket_test and not kds_ticket_test['success']:
            print("❌ POS→KDS integration is BROKEN (tickets not creating)")
        elif kds_ticket_test and kds_ticket_test['success']:
            print("✅ POS→KDS integration is WORKING")
        
        # Check for missing endpoints
        stock_count_test = next((t for t in self.test_results if 'Stock count' in t['test']), None)
        waste_test = next((t for t in self.test_results if 'Waste' in t['test']), None)
        
        if stock_count_test and stock_count_test['success']:
            print("✅ Stock count endpoint correctly returns 404 (not implemented)")
        
        if waste_test and waste_test['success']:
            print("✅ Waste endpoint correctly returns 404 (not implemented)")

def main():
    print("="*80)
    print("TOKEN FIX VERIFICATION & COMPREHENSIVE POS/KDS SYSTEM TESTING")
    print("="*80)
    print("\nTesting restin.ai POS/KDS system after token storage bug fix")
    print("Base URL: https://observe-hub-1.preview.emergentagent.com")
    print("Venue: venue-caviar-bull")
    print("Test Credentials: PIN 1234 (Owner)")
    print("\n" + "="*80)
    
    tester = TokenFixTester()
    
    # Run all tests
    if not tester.test_authentication_token_storage():
        print("\n❌ CRITICAL: Authentication failed. Cannot proceed with tests.")
        sys.exit(1)
    
    if not tester.test_pos_session_flow():
        print("\n⚠️  WARNING: POS session flow failed. Continuing with other tests...")
    
    if not tester.test_pos_order_flow():
        print("\n⚠️  WARNING: POS order flow failed. Continuing with other tests...")
    
    tester.test_kds_integration()
    
    # Skip payment flow if order wasn't created
    if tester.order_id:
        tester.test_pos_payment_flow()
    else:
        print("\n⚠️  SKIPPING: Payment flow (no order created)")
    
    tester.test_inventory_system()
    
    # Print summary
    tester.print_summary()
    
    # Exit with appropriate code
    if tester.tests_passed == tester.tests_run:
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()
