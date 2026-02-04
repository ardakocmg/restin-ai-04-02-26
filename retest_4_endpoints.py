#!/usr/bin/env python3
"""
Retest 4 Previously Failing Endpoints After Model Fixes
"""

import requests
import json
from datetime import datetime, timedelta

class EndpointRetester:
    def __init__(self, base_url="https://ketchensync.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.venue_id = "venue-caviar-bull"
        self.tests_passed = 0
        self.tests_failed = 0
        
    def login_admin(self):
        """Login with PIN 1234 for admin access"""
        print("\n🔐 Logging in with PIN 1234 (Admin)")
        login_url = f"{self.base_url}/api/auth/login/pin?pin=1234&app=admin"
        
        try:
            response = requests.post(login_url, timeout=10)
            if response.status_code == 200:
                data = response.json()
                self.token = data.get('accessToken')
                print(f"✅ Logged in as: {data['user']['name']} ({data['user']['role']})")
                return True
            else:
                print(f"❌ Login failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Login error: {e}")
            return False
    
    def make_request(self, method: str, endpoint: str, data: dict = None):
        """Make API request"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.token}'
        }
        
        try:
            if method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=15)
            elif method == 'GET':
                response = requests.get(url, headers=headers, timeout=15)
            else:
                return None, f"Unsupported method: {method}"
            
            return response, None
        except Exception as e:
            return None, str(e)
    
    def test_forecasting_generate(self):
        """Test 1: POST /api/venues/{venue_id}/forecasting/generate"""
        print("\n" + "="*70)
        print("TEST 1: POST /api/venues/{venue_id}/forecasting/generate")
        print("="*70)
        print("FIX: Added empty data check in forecasting_engine.py")
        print("EXPECTED: Should handle empty historical data gracefully")
        
        # Get an inventory item first
        response, error = self.make_request('GET', f'venues/{self.venue_id}/inventory')
        if error or response.status_code != 200:
            print(f"❌ Failed to get inventory items: {error or response.status_code}")
            self.tests_failed += 1
            return
        
        data = response.json()
        items = data if isinstance(data, list) else data.get('items', [])
        if not items:
            print("❌ No inventory items found")
            self.tests_failed += 1
            return
        
        item = items[0]
        print(f"\nUsing item: {item['name']} (ID: {item['id']})")
        
        # Test payload
        payload = {
            "item_id": item['id'],
            "item_name": item['name'],
            "method": "moving_average",
            "days": 30,
            "use_ai": False
        }
        
        print(f"\nPayload:")
        print(json.dumps(payload, indent=2))
        
        response, error = self.make_request('POST', f'venues/{self.venue_id}/forecasting/generate', payload)
        
        if error:
            print(f"\n❌ FAILED: Request error - {error}")
            self.tests_failed += 1
            return
        
        print(f"\nResponse Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ SUCCESS: Forecast generated")
            print(f"   - Item: {data.get('item_name')}")
            print(f"   - Method: {data.get('method')}")
            print(f"   - Forecast points: {len(data.get('forecast_data', []))}")
            print(f"   - Recommended order qty: {data.get('recommended_order_quantity')}")
            self.tests_passed += 1
        else:
            print(f"❌ FAILED: Status {response.status_code}")
            try:
                error_data = response.json()
                print(f"   Error: {json.dumps(error_data, indent=2)}")
            except:
                print(f"   Response: {response.text}")
            self.tests_failed += 1
    
    def test_production_batches(self):
        """Test 2: POST /api/venues/{venue_id}/production/batches"""
        print("\n" + "="*70)
        print("TEST 2: POST /api/venues/{venue_id}/production/batches")
        print("="*70)
        print("FIX: Added Field alias 'quantity' for 'target_quantity' in ProductionBatchItem")
        print("EXPECTED: Should accept both 'quantity' and 'target_quantity' field names")
        
        # Test with 'quantity' field (the alias)
        tomorrow = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
        
        payload = {
            "batch_date": tomorrow,
            "items": [
                {
                    "item_id": "item-test-1",
                    "item_name": "Test Item 1",
                    "quantity": 100.0,  # Using alias 'quantity' instead of 'target_quantity'
                    "unit": "kg"
                },
                {
                    "item_id": "item-test-2",
                    "item_name": "Test Item 2",
                    "quantity": 50.0,
                    "unit": "liters"
                }
            ],
            "internal_orders": []
        }
        
        print(f"\nPayload (using 'quantity' alias):")
        print(json.dumps(payload, indent=2))
        
        response, error = self.make_request('POST', f'venues/{self.venue_id}/production/batches', payload)
        
        if error:
            print(f"\n❌ FAILED: Request error - {error}")
            self.tests_failed += 1
            return
        
        print(f"\nResponse Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ SUCCESS: Production batch created")
            print(f"   - Batch number: {data.get('batch_number')}")
            print(f"   - Batch date: {data.get('batch_date')}")
            print(f"   - Items: {len(data.get('items', []))}")
            print(f"   - Status: {data.get('status')}")
            self.tests_passed += 1
        else:
            print(f"❌ FAILED: Status {response.status_code}")
            try:
                error_data = response.json()
                print(f"   Error: {json.dumps(error_data, indent=2)}")
            except:
                print(f"   Response: {response.text}")
            self.tests_failed += 1
    
    def test_recipes_engineered(self):
        """Test 3: POST /api/venues/{venue_id}/recipes/engineered"""
        print("\n" + "="*70)
        print("TEST 3: POST /api/venues/{venue_id}/recipes/engineered")
        print("="*70)
        print("FIX: Added Field alias 'unit_cost' for 'cost_per_unit' in RecipeIngredientDetail")
        print("EXPECTED: Should accept both 'unit_cost' and 'cost_per_unit' field names")
        
        # Test with 'unit_cost' field (the alias)
        payload = {
            "recipe_name": "Test Engineered Recipe",
            "description": "A test recipe to verify field alias fix",
            "ingredients": [
                {
                    "item_id": "ing-1",
                    "item_name": "Flour",
                    "quantity": 500,
                    "unit": "g",
                    "unit_cost": 0.002,  # Using alias 'unit_cost' instead of 'cost_per_unit'
                    "total_cost": 1.0
                },
                {
                    "item_id": "ing-2",
                    "item_name": "Sugar",
                    "quantity": 200,
                    "unit": "g",
                    "unit_cost": 0.003,
                    "total_cost": 0.6
                }
            ],
            "servings": 4,
            "prep_time_minutes": 15,
            "cook_time_minutes": 30,
            "labor_cost": 5.0,
            "overhead_cost": 2.0,
            "markup_percentage": 200,
            "instructions": [
                "Mix ingredients",
                "Bake at 180C for 30 minutes"
            ],
            "category": "Desserts",
            "tags": ["test", "engineered"]
        }
        
        print(f"\nPayload (using 'unit_cost' alias):")
        print(json.dumps(payload, indent=2))
        
        response, error = self.make_request('POST', f'venues/{self.venue_id}/recipes/engineered', payload)
        
        if error:
            print(f"\n❌ FAILED: Request error - {error}")
            self.tests_failed += 1
            return
        
        print(f"\nResponse Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ SUCCESS: Engineered recipe created")
            print(f"   - Recipe name: {data.get('recipe_name')}")
            print(f"   - Servings: {data.get('servings')}")
            print(f"   - Total cost: ${data.get('cost_analysis', {}).get('total_cost', 0):.2f}")
            print(f"   - Cost per serving: ${data.get('cost_analysis', {}).get('cost_per_serving', 0):.2f}")
            print(f"   - Suggested price: ${data.get('cost_analysis', {}).get('suggested_price', 0):.2f}")
            self.tests_passed += 1
        else:
            print(f"❌ FAILED: Status {response.status_code}")
            try:
                error_data = response.json()
                print(f"   Error: {json.dumps(error_data, indent=2)}")
            except:
                print(f"   Response: {response.text}")
            self.tests_failed += 1
    
    def test_hr_goals(self):
        """Test 4: POST /api/venues/{venue_id}/hr/goals"""
        print("\n" + "="*70)
        print("TEST 4: POST /api/venues/{venue_id}/hr/goals")
        print("="*70)
        print("FIX: Added Field alias 'metric' for 'kpi_name' and default values for 'unit' and 'weight'")
        print("EXPECTED: Should accept 'metric' field and work with minimal KPI data")
        
        # Test with 'metric' field (the alias) and minimal KPI data
        target_date = (datetime.now() + timedelta(days=90)).strftime('%Y-%m-%d')
        
        payload = {
            "employee_id": "emp-test-001",
            "goal_title": "Improve Customer Satisfaction",
            "description": "Increase customer satisfaction scores by 15%",
            "target_date": target_date,
            "kpis": [
                {
                    "metric": "Customer Satisfaction Score",  # Using alias 'metric' instead of 'kpi_name'
                    "target": 4.5
                    # 'unit' and 'weight' should use defaults
                },
                {
                    "metric": "Response Time",
                    "target": 5.0,
                    "unit": "minutes"
                    # 'weight' should use default
                }
            ]
        }
        
        print(f"\nPayload (using 'metric' alias with minimal data):")
        print(json.dumps(payload, indent=2))
        
        response, error = self.make_request('POST', f'venues/{self.venue_id}/hr/goals', payload)
        
        if error:
            print(f"\n❌ FAILED: Request error - {error}")
            self.tests_failed += 1
            return
        
        print(f"\nResponse Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ SUCCESS: HR goal created")
            print(f"   - Goal title: {data.get('goal_title')}")
            print(f"   - Employee ID: {data.get('employee_id')}")
            print(f"   - Target date: {data.get('target_date')}")
            print(f"   - KPIs: {len(data.get('kpis', []))}")
            print(f"   - Status: {data.get('status')}")
            
            # Verify KPI defaults were applied
            kpis = data.get('kpis', [])
            if kpis:
                print(f"\n   KPI Details:")
                for kpi in kpis:
                    print(f"     - {kpi.get('kpi_name')}: target={kpi.get('target')}, unit={kpi.get('unit')}, weight={kpi.get('weight')}")
            
            self.tests_passed += 1
        else:
            print(f"❌ FAILED: Status {response.status_code}")
            try:
                error_data = response.json()
                print(f"   Error: {json.dumps(error_data, indent=2)}")
            except:
                print(f"   Response: {response.text}")
            self.tests_failed += 1
    
    def run_all_tests(self):
        """Run all 4 endpoint tests"""
        print("\n" + "="*70)
        print("RETEST: 4 Previously Failing Endpoints After Model Fixes")
        print("="*70)
        
        if not self.login_admin():
            print("\n❌ CRITICAL: Cannot proceed without authentication")
            return
        
        # Run all 4 tests
        self.test_forecasting_generate()
        self.test_production_batches()
        self.test_recipes_engineered()
        self.test_hr_goals()
        
        # Summary
        print("\n" + "="*70)
        print("TEST SUMMARY")
        print("="*70)
        print(f"✅ Passed: {self.tests_passed}/4")
        print(f"❌ Failed: {self.tests_failed}/4")
        
        if self.tests_passed == 4:
            print("\n🎉 ALL TESTS PASSED! All 4 endpoints are now working correctly.")
        else:
            print(f"\n⚠️  {self.tests_failed} test(s) still failing. Review details above.")
        
        return self.tests_passed, self.tests_failed


if __name__ == "__main__":
    tester = EndpointRetester()
    passed, failed = tester.run_all_tests()
    
    # Exit with appropriate code
    exit(0 if failed == 0 else 1)
