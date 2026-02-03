#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class Stage2Tester:
    def __init__(self, base_url="https://observe-hub-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        
    def log_test(self, name: str, success: bool, details: str = ""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        if details and success:
            print(f"   {details}")

    def make_request(self, method: str, endpoint: str, data=None, expected_status: int = 200):
        """Make API request"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            
            success = response.status_code == expected_status
            try:
                response_data = response.json() if response.content else {}
            except:
                response_data = {"raw_response": response.text}

            if not success:
                return False, response_data, f"Expected {expected_status}, got {response.status_code}"
            
            return True, response_data, ""

        except Exception as e:
            return False, {}, f"Request error: {str(e)}"

    def test_three_venues(self):
        """Test that exactly 3 real venues exist"""
        success, data, error = self.make_request('GET', 'venues')
        
        if not success:
            self.log_test("Get Venues", False, error)
            return False
            
        venues = data
        expected_venues = [
            "Caviar & Bull",
            "Don Royale", 
            "Sole by Tarragon"
        ]
        
        venue_names = [v['name'] for v in venues]
        
        if len(venues) == 3 and all(name in venue_names for name in expected_venues):
            self.log_test("Three Real Venues Present", True, f"Found: {', '.join(venue_names)}")
            return venues
        else:
            self.log_test("Three Real Venues Present", False, f"Expected {expected_venues}, got {venue_names}")
            return False

    def test_venue_login(self, venue_id, venue_name):
        """Test login with PIN 1234 for a venue"""
        login_url = f"auth/login?venue_id={venue_id}&pin=1234&device_id=test_device"
        success, data, error = self.make_request('POST', login_url)
        
        if success and 'token' in data:
            self.token = data['token']
            self.log_test(f"Login to {venue_name}", True, f"Logged in as: {data['user']['name']}")
            return True
        else:
            self.log_test(f"Login to {venue_name}", False, error)
            return False

    def test_menu_with_allergens(self, venue_id, venue_name):
        """Test menu items have allergens"""
        # Get categories
        success, categories, error = self.make_request('GET', f'venues/{venue_id}/menu/categories')
        if not success:
            self.log_test(f"{venue_name} - Get Categories", False, error)
            return
            
        self.log_test(f"{venue_name} - Menu Categories", True, f"Found {len(categories)} categories")
        
        # Get all menu items
        success, items, error = self.make_request('GET', f'venues/{venue_id}/menu/items')
        if not success:
            self.log_test(f"{venue_name} - Get Menu Items", False, error)
            return
            
        # Check for allergens
        items_with_allergens = [item for item in items if item.get('allergens') and len(item['allergens']) > 0]
        
        self.log_test(f"{venue_name} - Menu Items", True, f"Found {len(items)} items, {len(items_with_allergens)} with allergens")
        
        # Show sample items with allergens
        if items_with_allergens:
            sample = items_with_allergens[0]
            allergen_list = ', '.join(sample['allergens'])
            print(f"   Sample: {sample['name']} - Allergens: {allergen_list}")

    def test_venue_scoping(self, venues):
        """Test that venues can't access each other's menu items"""
        if len(venues) < 2:
            return
            
        venue1 = venues[0]
        venue2 = venues[1]
        
        # Login to venue1
        if not self.test_venue_login(venue1['id'], venue1['name']):
            return
            
        # Get venue1 items
        success, venue1_items, error = self.make_request('GET', f'venues/{venue1["id"]}/menu/items')
        if not success:
            return
            
        # Try to access venue2 items (should work but return different items)
        success, venue2_items, error = self.make_request('GET', f'venues/{venue2["id"]}/menu/items')
        
        if success:
            # Items should be different (venue-scoped)
            venue1_item_ids = {item['id'] for item in venue1_items}
            venue2_item_ids = {item['id'] for item in venue2_items}
            
            if venue1_item_ids.isdisjoint(venue2_item_ids):
                self.log_test("Venue Scoping", True, "Menu items are properly scoped per venue")
            else:
                self.log_test("Venue Scoping", False, "Menu items overlap between venues")
        else:
            self.log_test("Venue Scoping", False, "Could not access venue2 items")

    def test_floor_setup(self, venue_id, venue_name):
        """Test floor setup with zones and tables"""
        # Get zones
        success, zones, error = self.make_request('GET', f'venues/{venue_id}/zones')
        if not success:
            self.log_test(f"{venue_name} - Get Zones", False, error)
            return
            
        # Get tables
        success, tables, error = self.make_request('GET', f'venues/{venue_id}/tables')
        if not success:
            self.log_test(f"{venue_name} - Get Tables", False, error)
            return
            
        # Check zone types
        zone_types = set(zone['type'] for zone in zones)
        expected_types = {'dining', 'bar', 'kitchen'}
        
        if expected_types.intersection(zone_types):
            self.log_test(f"{venue_name} - Floor Setup", True, 
                         f"Found {len(zones)} zones, {len(tables)} tables")
            print(f"   Zone types: {', '.join(zone_types)}")
        else:
            self.log_test(f"{venue_name} - Floor Setup", False, "Missing expected zone types")

    def run_stage2_tests(self):
        """Run Stage 2 specific tests"""
        print("🚀 Starting Stage 2 Patch Tests for restin.ai")
        print("=" * 60)
        
        # Test 1: Three real venues
        venues = self.test_three_venues()
        if not venues:
            return 1
            
        # Test 2: Login with PIN 1234 for each venue
        for venue in venues:
            if self.test_venue_login(venue['id'], venue['name']):
                # Test 3: Menu with allergens
                self.test_menu_with_allergens(venue['id'], venue['name'])
                
                # Test 4: Floor setup
                self.test_floor_setup(venue['id'], venue['name'])
        
        # Test 5: Venue scoping
        self.test_venue_scoping(venues)
        
        # Summary
        print("\n" + "=" * 60)
        print(f"📊 Stage 2 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All Stage 2 features working!")
            return 0
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return 1

def main():
    tester = Stage2Tester()
    return tester.run_stage2_tests()

if __name__ == "__main__":
    sys.exit(main())