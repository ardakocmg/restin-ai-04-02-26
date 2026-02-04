#!/usr/bin/env python3
"""
Comprehensive POS, KDS, and Inventory System Testing
Tests all three flows end-to-end as requested
"""

import requests
import json
from datetime import datetime
from typing import Dict, Optional

class POSKDSInventoryTester:
    def __init__(self, base_url="https://observe-hub-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.venue_id = "venue-caviar-bull"
        
        # Store created resources
        self.session_id = None
        self.order_id = None
        self.supplier_id = None
        self.po_id = None
        self.count_id = None

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
                return False, response_data, f"Expected {expected_status}, got {response.status_code}: {response_data}"
            
            return True, response_data, ""

        except requests.exceptions.Timeout:
            return False, {}, "Request timeout"
        except requests.exceptions.ConnectionError:
            return False, {}, "Connection error"
        except Exception as e:
            return False, {}, f"Request error: {str(e)}"

    def test_flow_1_pos_kds_integration(self):
        """Test Flow 1: POS → KDS Integration"""
        print("\n" + "="*80)
        print("TEST FLOW 1: POS → KDS INTEGRATION")
        print("="*80)
        
        # Step 1: Login
        print("\n📍 Step 1: Login with PIN")
        success, data, error = self.make_request(
            'POST', 
            'auth/login/pin',
            params={"pin": "1234", "app": "pos"}
        )
        
        if success and 'accessToken' in data:
            self.token = data['accessToken']
            self.log_test("Step 1: Login with PIN 1234", True)
            print(f"   Logged in as: {data.get('user', {}).get('name', 'Unknown')}")
        else:
            self.log_test("Step 1: Login with PIN 1234", False, error)
            print("   ❌ Cannot proceed without authentication")
            return
        
        # Step 2: Open POS session
        print("\n📍 Step 2: Open POS Session")
        success, data, error = self.make_request(
            'POST',
            'pos/sessions/open',
            data={
                "venue_id": self.venue_id,
                "device_id": "dev-001",
                "user_id": "user-001"
            }
        )
        
        if success and data.get('ok'):
            self.session_id = data.get('session', {}).get('id')
            self.log_test("Step 2: Open POS session", True)
            print(f"   Session ID: {self.session_id}")
        else:
            self.log_test("Step 2: Open POS session", False, error)
            print(f"   Response: {json.dumps(data, indent=2)}")
        
        # Step 3: Create order
        print("\n📍 Step 3: Create Order")
        success, data, error = self.make_request(
            'POST',
            'pos/orders',
            data={
                "venue_id": self.venue_id,
                "session_id": self.session_id,
                "table_id": "table-cb-main-1",
                "guest_count": 2
            }
        )
        
        if success and data.get('ok'):
            self.order_id = data.get('order', {}).get('id')
            self.log_test("Step 3: Create order", True)
            print(f"   Order ID: {self.order_id}")
        else:
            self.log_test("Step 3: Create order", False, error)
            print(f"   Response: {json.dumps(data, indent=2)}")
            return
        
        # Step 4: Get menu items
        print("\n📍 Step 4: Get Menu Items")
        success, menu_data, error = self.make_request(
            'GET',
            f'venues/{self.venue_id}/menu/items'
        )
        
        if not success or not menu_data:
            self.log_test("Step 4: Get menu items", False, "No menu items found")
            return
        
        menu_items = menu_data if isinstance(menu_data, list) else []
        self.log_test("Step 4: Get menu items", True)
        print(f"   Found {len(menu_items)} menu items")
        
        # Step 5: Add 2 items to order
        print("\n📍 Step 5: Add 2 Items to Order")
        items_added = 0
        for i, menu_item in enumerate(menu_items[:2]):
            success, data, error = self.make_request(
                'POST',
                f'pos/orders/{self.order_id}/items',
                data={
                    "order_id": self.order_id,
                    "venue_id": self.venue_id,
                    "menu_item_id": menu_item.get('id'),
                    "qty": 1,
                    "instructions": f"Test item {i+1}"
                }
            )
            
            if success and data.get('ok'):
                items_added += 1
                print(f"   ✅ Added: {menu_item.get('name')}")
            else:
                print(f"   ❌ Failed to add: {menu_item.get('name')} - {error}")
        
        self.log_test(f"Step 5: Add {items_added} items to order", items_added == 2, 
                     f"Added {items_added}/2 items")
        
        # Step 6: Send order
        print("\n📍 Step 6: Send Order to Kitchen")
        success, data, error = self.make_request(
            'POST',
            f'pos/orders/{self.order_id}/send',
            params={"venue_id": self.venue_id}
        )
        
        if success and data.get('ok'):
            self.log_test("Step 6: Send order to kitchen", True)
            print("   ✅ Order sent successfully")
        else:
            self.log_test("Step 6: Send order to kitchen", False, error)
            print(f"   Response: {json.dumps(data, indent=2)}")
            return
        
        # Step 7: Verify KDS tickets created
        print("\n📍 Step 7: Verify KDS Tickets Created")
        
        # Try different station keys
        station_keys = ["GRILL", "COLD", "PASS", "EXPO"]
        all_tickets = []
        
        for station_key in station_keys:
            success, data, error = self.make_request(
                'GET',
                f'kds/runtime/{station_key}/tickets',
                params={"venue_id": self.venue_id}
            )
            
            if success:
                tickets = data if isinstance(data, list) else []
                all_tickets.extend(tickets)
        
        # Find ticket for our order
        our_ticket = next((t for t in all_tickets if t.get('order_id') == self.order_id), None)
        
        if our_ticket:
            self.log_test("Step 7: KDS ticket created", True)
            print(f"   ✅ Ticket ID: {our_ticket.get('id')}")
            print(f"   Station: {our_ticket.get('station_key')}")
            print(f"   Status: {our_ticket.get('status')}")
            
            # Step 8: Bump KDS ticket
            print("\n📍 Step 8: Bump KDS Ticket")
            station_key = our_ticket.get('station_key', 'GRILL')
            success, data, error = self.make_request(
                'POST',
                f'kds/runtime/{station_key}/tickets/{our_ticket["id"]}/bump',
                data={"new_status": "PREPARING"},
                params={"venue_id": self.venue_id}
            )
            
            if success and data.get('ok'):
                self.log_test("Step 8: Bump KDS ticket to PREPARING", True)
                print("   ✅ Ticket bumped to PREPARING")
            else:
                self.log_test("Step 8: Bump KDS ticket", False, error)
        else:
            self.log_test("Step 7: KDS ticket created", False, "Ticket not found for order")
            print(f"   ❌ No ticket found for order {self.order_id}")
            print(f"   Found {len(all_tickets)} total tickets across all stations")
        
        # Step 9: Add payment
        print("\n📍 Step 9: Add Payment")
        
        # Get order to check total
        success, order_data, error = self.make_request(
            'GET',
            f'pos/orders/{self.order_id}',
            params={"venue_id": self.venue_id}
        )
        
        payment_amount = 100.00  # Default
        if success and order_data.get('ok'):
            order = order_data.get('order', {})
            totals = order.get('totals', {})
            grand_total = totals.get('grand_total', 100.00)
            payment_amount = grand_total + 10.00  # Pay a bit more to ensure sufficient
            print(f"   Order total: €{grand_total:.2f}")
        
        success, data, error = self.make_request(
            'POST',
            f'pos/orders/{self.order_id}/payments',
            data={
                "order_id": self.order_id,
                "venue_id": self.venue_id,
                "tender_type": "CASH",
                "amount": payment_amount
            }
        )
        
        if success and data.get('ok'):
            self.log_test("Step 9: Add payment", True)
            print(f"   ✅ Payment added: €{payment_amount:.2f} CASH")
        else:
            self.log_test("Step 9: Add payment", False, error)
            print(f"   Response: {json.dumps(data, indent=2)}")
        
        # Step 10: Close order
        print("\n📍 Step 10: Close Order")
        success, data, error = self.make_request(
            'POST',
            f'pos/orders/{self.order_id}/close',
            params={"venue_id": self.venue_id}
        )
        
        if success and data.get('ok'):
            self.log_test("Step 10: Close order", True)
            print("   ✅ Order closed successfully")
        else:
            self.log_test("Step 10: Close order", False, error)
            print(f"   Response: {json.dumps(data, indent=2)}")

    def test_flow_2_inventory_purchase_order(self):
        """Test Flow 2: Inventory - Purchase Order → Stock"""
        print("\n" + "="*80)
        print("TEST FLOW 2: INVENTORY - PURCHASE ORDER → STOCK")
        print("="*80)
        
        # Step 1: Create supplier
        print("\n📍 Step 1: Create Supplier")
        success, data, error = self.make_request(
            'POST',
            'inventory/suppliers',
            data={
                "venue_id": self.venue_id,
                "name": "Test Supplier",
                "code": "SUP001",
                "contact_name": "John Doe",
                "email": "john@testsupplier.com",
                "phone": "+1234567890"
            }
        )
        
        if success and data.get('id'):
            self.supplier_id = data.get('id')
            self.log_test("Step 1: Create supplier", True)
            print(f"   Supplier ID: {self.supplier_id}")
        else:
            self.log_test("Step 1: Create supplier", False, error)
            print(f"   Response: {json.dumps(data, indent=2)}")
            return
        
        # Step 2: List suppliers
        print("\n📍 Step 2: List Suppliers")
        success, data, error = self.make_request(
            'GET',
            'inventory/suppliers',
            params={"venue_id": self.venue_id}
        )
        
        if success:
            suppliers = data if isinstance(data, list) else []
            self.log_test("Step 2: List suppliers", True)
            print(f"   Found {len(suppliers)} suppliers")
        else:
            self.log_test("Step 2: List suppliers", False, error)
        
        # Step 3: Get inventory items for PO
        print("\n📍 Step 3: Get Inventory Items")
        success, data, error = self.make_request(
            'GET',
            'inventory/items',
            params={"venue_id": self.venue_id}
        )
        
        if not success or not data.get('items'):
            self.log_test("Step 3: Get inventory items", False, "No items found")
            return
        
        items = data.get('items', [])
        self.log_test("Step 3: Get inventory items", True)
        print(f"   Found {len(items)} inventory items")
        
        if not items:
            print("   ⚠️  No inventory items to create PO")
            return
        
        # Step 4: Create PO
        print("\n📍 Step 4: Create Purchase Order")
        po_lines = []
        for item in items[:2]:  # Use first 2 items
            po_lines.append({
                "sku_id": item.get('id'),
                "qty_ordered": 10.0,
                "unit_price": 5.00
            })
        
        success, data, error = self.make_request(
            'POST',
            'inventory/purchase-orders',
            data={
                "venue_id": self.venue_id,
                "supplier_id": self.supplier_id,
                "lines": po_lines,
                "notes": "Test PO"
            }
        )
        
        if success and data.get('ok'):
            self.po_id = data.get('purchase_order', {}).get('id')
            self.log_test("Step 4: Create purchase order", True)
            print(f"   PO ID: {self.po_id}")
        else:
            self.log_test("Step 4: Create purchase order", False, error)
            print(f"   Response: {json.dumps(data, indent=2)}")
            return
        
        # Step 5: Approve PO
        print("\n📍 Step 5: Approve Purchase Order")
        success, data, error = self.make_request(
            'POST',
            f'inventory/purchase-orders/{self.po_id}/approve',
            params={"venue_id": self.venue_id}
        )
        
        if success and data.get('ok'):
            self.log_test("Step 5: Approve PO", True)
            print("   ✅ PO approved")
        else:
            self.log_test("Step 5: Approve PO", False, error)
            print(f"   Response: {json.dumps(data, indent=2)}")
        
        # Step 6: Receive PO
        print("\n📍 Step 6: Receive Purchase Order")
        success, data, error = self.make_request(
            'POST',
            f'inventory/purchase-orders/{self.po_id}/receive',
            params={"venue_id": self.venue_id}
        )
        
        if success and data.get('ok'):
            self.log_test("Step 6: Receive PO", True)
            print("   ✅ PO received")
        else:
            self.log_test("Step 6: Receive PO", False, error)
            print(f"   Response: {json.dumps(data, indent=2)}")
        
        # Step 7: Check stock ledger
        print("\n📍 Step 7: Check Stock Ledger")
        if items:
            item_id = items[0].get('id')
            success, data, error = self.make_request(
                'GET',
                f'inventory/items/{item_id}',
                params={"venue_id": self.venue_id}
            )
            
            if success and data.get('ok'):
                ledger = data.get('ledger', [])
                self.log_test("Step 7: Check stock ledger", True)
                print(f"   ✅ Found {len(ledger)} ledger entries")
                
                # Check for IN entries from PO
                in_entries = [e for e in ledger if e.get('action') == 'in']
                if in_entries:
                    print(f"   ✅ Found {len(in_entries)} IN entries")
                else:
                    print("   ⚠️  No IN entries found")
            else:
                self.log_test("Step 7: Check stock ledger", False, error)

    def test_flow_3_stock_count_and_waste(self):
        """Test Flow 3: Inventory - Stock Count & Waste"""
        print("\n" + "="*80)
        print("TEST FLOW 3: INVENTORY - STOCK COUNT & WASTE")
        print("="*80)
        
        # Get inventory items first
        print("\n📍 Prep: Get Inventory Items")
        success, data, error = self.make_request(
            'GET',
            'inventory/items',
            params={"venue_id": self.venue_id}
        )
        
        if not success or not data.get('items'):
            print("   ❌ Cannot proceed without inventory items")
            return
        
        items = data.get('items', [])
        print(f"   Found {len(items)} inventory items")
        
        if not items:
            print("   ⚠️  No inventory items for testing")
            return
        
        test_item = items[0]
        
        # Step 1: Start stock count
        print("\n📍 Step 1: Start Stock Count")
        success, data, error = self.make_request(
            'POST',
            'inventory/counts/start',
            params={"venue_id": self.venue_id}
        )
        
        if success and data.get('ok'):
            self.count_id = data.get('count', {}).get('id')
            self.log_test("Step 1: Start stock count", True)
            print(f"   Count ID: {self.count_id}")
        else:
            self.log_test("Step 1: Start stock count", False, error)
            print(f"   Response: {json.dumps(data, indent=2)}")
            return
        
        # Step 2: Submit count line
        print("\n📍 Step 2: Submit Count Line")
        success, data, error = self.make_request(
            'POST',
            f'inventory/counts/{self.count_id}/lines',
            data={
                "item_id": test_item.get('id'),
                "counted_qty": 15.0
            },
            params={"venue_id": self.venue_id}
        )
        
        if success and data.get('ok'):
            self.log_test("Step 2: Submit count line", True)
            print(f"   ✅ Count line submitted for {test_item.get('name')}")
        else:
            self.log_test("Step 2: Submit count line", False, error)
            print(f"   Response: {json.dumps(data, indent=2)}")
        
        # Step 3: Complete count
        print("\n📍 Step 3: Complete Stock Count")
        success, data, error = self.make_request(
            'POST',
            f'inventory/counts/{self.count_id}/complete',
            params={"venue_id": self.venue_id}
        )
        
        if success and data.get('ok'):
            self.log_test("Step 3: Complete stock count", True)
            print("   ✅ Stock count completed")
        else:
            self.log_test("Step 3: Complete stock count", False, error)
            print(f"   Response: {json.dumps(data, indent=2)}")
        
        # Step 4: Log waste
        print("\n📍 Step 4: Log Waste")
        success, data, error = self.make_request(
            'POST',
            'inventory/waste',
            data={
                "venue_id": self.venue_id,
                "item_id": test_item.get('id'),
                "quantity": 2.0,
                "reason": "Spoilage - Test",
                "notes": "Test waste entry"
            }
        )
        
        if success and data.get('ok'):
            self.log_test("Step 4: Log waste", True)
            print("   ✅ Waste logged")
        else:
            self.log_test("Step 4: Log waste", False, error)
            print(f"   Response: {json.dumps(data, indent=2)}")
        
        # Step 5: Verify ledger updated
        print("\n📍 Step 5: Verify Ledger Updated")
        success, data, error = self.make_request(
            'GET',
            f'inventory/items/{test_item.get("id")}',
            params={"venue_id": self.venue_id}
        )
        
        if success and data.get('ok'):
            ledger = data.get('ledger', [])
            current_stock = data.get('current_stock', 0)
            
            self.log_test("Step 5: Verify ledger updated", True)
            print(f"   ✅ Current stock: {current_stock}")
            print(f"   ✅ Ledger entries: {len(ledger)}")
            
            # Check for adjustment and waste entries
            adjustment_entries = [e for e in ledger if e.get('action') == 'adjustment']
            waste_entries = [e for e in ledger if e.get('action') == 'waste']
            
            print(f"   Adjustment entries: {len(adjustment_entries)}")
            print(f"   Waste entries: {len(waste_entries)}")
        else:
            self.log_test("Step 5: Verify ledger updated", False, error)

    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*80)
        print("TEST SUMMARY")
        print("="*80)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        # Print failed tests
        failed_tests = [t for t in self.test_results if not t['success']]
        if failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"   - {test['test']}: {test['details']}")

def main():
    tester = POSKDSInventoryTester()
    
    # Run all three test flows
    tester.test_flow_1_pos_kds_integration()
    tester.test_flow_2_inventory_purchase_order()
    tester.test_flow_3_stock_count_and_waste()
    
    # Print summary
    tester.print_summary()

if __name__ == "__main__":
    main()
