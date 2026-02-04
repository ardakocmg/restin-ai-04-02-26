#!/usr/bin/env python3
"""
Model Validation Testing for Ultimate Paket & HR Advanced Features
Focus: Pydantic model validation, type mismatches, KeyError issues
"""

import requests
import sys
import json
import base64
from datetime import datetime, timedelta
from typing import Dict, List, Optional

class ModelValidationTester:
    def __init__(self, base_url="https://ketchensync.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.venue_id = "venue-caviar-bull"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.failed_endpoints = []

    def log_test(self, name: str, success: bool, details: str = ""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
            self.failed_endpoints.append({"endpoint": name, "error": details})
        
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
                response = requests.get(url, headers=headers, timeout=15)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=15)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=15)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=15)
            else:
                return False, {}, f"Unsupported method: {method}"

            try:
                response_data = response.json() if response.content else {}
            except:
                response_data = {"raw_response": response.text[:500]}

            success = response.status_code == expected_status
            if not success:
                error_msg = f"Expected {expected_status}, got {response.status_code}"
                if response_data:
                    error_detail = response_data.get('detail', response_data)
                    error_msg += f" - {error_detail}"
                return False, response_data, error_msg
            
            return True, response_data, ""

        except requests.exceptions.Timeout:
            return False, {}, "Request timeout"
        except requests.exceptions.ConnectionError:
            return False, {}, "Connection error"
        except Exception as e:
            return False, {}, f"Request error: {str(e)}"

    def authenticate(self):
        """Authenticate with Owner PIN"""
        print("\n🔐 Authenticating...")
        
        url = f"{self.base_url}/api/auth/login/pin?pin=1234&app=admin"
        try:
            response = requests.post(url, timeout=15)
            data = response.json() if response.content else {}
            
            if response.status_code == 200 and (data.get('token') or data.get('accessToken')):
                self.token = data.get('token') or data.get('accessToken')
                print(f"✅ Authenticated as {data.get('user', {}).get('name', 'Owner')}")
                return True
            else:
                print(f"❌ Authentication failed: {response.status_code} - {data}")
                return False
        except Exception as e:
            print(f"❌ Authentication error: {str(e)}")
            return False

    # ==================== PROCUREMENT ADVANCED ====================
    def test_procurement_advanced(self):
        """Test RFQ endpoints with model validation"""
        print("\n📦 Testing Procurement Advanced - Model Validation...")
        
        # Test 1: Create RFQ with correct model
        rfq_data = {
            "title": "Q1 2025 Seafood RFQ",
            "description": "Quarterly seafood procurement",
            "items": [
                {"item_id": "item-1", "item_name": "Dover Sole", "quantity": 50, "unit": "kg"},
                {"item_id": "item-2", "item_name": "Oscietra Caviar", "quantity": 10, "unit": "kg"}
            ],
            "suppliers": ["supplier-1", "supplier-2"],
            "deadline": (datetime.now() + timedelta(days=7)).isoformat()
        }
        
        success, data, error = self.make_request('POST', f'venues/{self.venue_id}/rfq', rfq_data)
        self.log_test("POST /api/venues/{venue_id}/rfq - Create RFQ", success, error)
        
        rfq_id = None
        if success and data.get('id'):
            rfq_id = data['id']
        
        # Test 2: List RFQs
        success, data, error = self.make_request('GET', f'venues/{self.venue_id}/rfq')
        self.log_test("GET /api/venues/{venue_id}/rfq - List RFQs", success, error)
        
        # Test 3: Submit quote (test List[Dict] vs Dict type)
        if rfq_id:
            quote_data = {
                "supplier_id": "supplier-1",
                "supplier_name": "Premium Seafood Co",
                "items": [
                    {"item_id": "item-1", "unit_price": 45.0, "quantity": 50, "total": 2250.0},
                    {"item_id": "item-2", "unit_price": 850.0, "quantity": 10, "total": 8500.0}
                ],
                "total_amount": 10750.0,
                "valid_until": (datetime.now() + timedelta(days=14)).isoformat(),
                "notes": "Premium quality guaranteed"
            }
            
            success, data, error = self.make_request('POST', f'venues/{self.venue_id}/rfq/{rfq_id}/quote', quote_data)
            self.log_test("POST /api/venues/{venue_id}/rfq/{rfq_id}/quote - Submit Quote", success, error)
            
            # Test 4: Award RFQ
            award_data = {"supplier_id": "supplier-1"}
            success, data, error = self.make_request('POST', f'venues/{self.venue_id}/rfq/{rfq_id}/award', award_data)
            self.log_test("POST /api/venues/{venue_id}/rfq/{rfq_id}/award - Award RFQ", success, error)
        
        # Test 5: Create approval rule
        rule_data = {
            "rule_name": "High Value Purchase Approval",
            "condition": "amount_exceeds",
            "threshold": 5000.0,
            "approvers": ["user-manager-1", "user-owner"],
            "escalation_hours": 24
        }
        
        success, data, error = self.make_request('POST', f'venues/{self.venue_id}/procurement/approval-rules', rule_data)
        self.log_test("POST /api/venues/{venue_id}/procurement/approval-rules - Create Rule", success, error)
        
        # Test 6: List approval rules
        success, data, error = self.make_request('GET', f'venues/{self.venue_id}/procurement/approval-rules')
        self.log_test("GET /api/venues/{venue_id}/procurement/approval-rules - List Rules", success, error)
        
        # Test 7: Create auto-order rule
        auto_order_data = {
            "item_id": "item-caviar-1",
            "supplier_id": "supplier-1",
            "reorder_point": 5.0,
            "order_quantity": 20.0,
            "lead_time_days": 3
        }
        
        success, data, error = self.make_request('POST', f'venues/{self.venue_id}/procurement/auto-order-rules', auto_order_data)
        self.log_test("POST /api/venues/{venue_id}/procurement/auto-order-rules - Create Auto-Order", success, error)
        
        # Test 8: List auto-order rules
        success, data, error = self.make_request('GET', f'venues/{self.venue_id}/procurement/auto-order-rules')
        self.log_test("GET /api/venues/{venue_id}/procurement/auto-order-rules - List Auto-Orders", success, error)

    # ==================== AI INVOICE PROCESSING ====================
    def test_invoice_ai(self):
        """Test AI Invoice endpoints with model validation"""
        print("\n🤖 Testing AI Invoice Processing - Model Validation...")
        
        # Create sample base64 image (1x1 pixel PNG)
        sample_image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        
        # Test 1: Process invoice with OCR
        ocr_request = {
            "image_base64": sample_image,
            "po_id": None
        }
        
        success, data, error = self.make_request('POST', f'venues/{self.venue_id}/invoices/ocr', ocr_request)
        self.log_test("POST /api/venues/{venue_id}/invoices/ocr - Process OCR", success, error)
        
        invoice_id = None
        if success and data.get('id'):
            invoice_id = data['id']
        
        # Test 2: List AI invoices
        success, data, error = self.make_request('GET', f'venues/{self.venue_id}/invoices/ai')
        self.log_test("GET /api/venues/{venue_id}/invoices/ai - List Invoices", success, error)
        
        # Test 3: Get invoice details
        if invoice_id:
            success, data, error = self.make_request('GET', f'venues/{self.venue_id}/invoices/ai/{invoice_id}')
            self.log_test("GET /api/venues/{venue_id}/invoices/ai/{invoice_id} - Get Invoice", success, error)
            
            # Test 4: Approve invoice
            success, data, error = self.make_request('POST', f'venues/{self.venue_id}/invoices/ai/{invoice_id}/approve', {})
            self.log_test("POST /api/venues/{venue_id}/invoices/ai/{invoice_id}/approve - Approve", success, error)
        
        # Test 5: Reject invoice (create another one)
        success, data, error = self.make_request('POST', f'venues/{self.venue_id}/invoices/ocr', ocr_request)
        if success and data.get('id'):
            invoice_id = data['id']
            success, data, error = self.make_request('POST', f'venues/{self.venue_id}/invoices/ai/{invoice_id}/reject', 
                                                     {"reason": "Incorrect amount"})
            self.log_test("POST /api/venues/{venue_id}/invoices/ai/{invoice_id}/reject - Reject", success, error)

    # ==================== DEMAND FORECASTING ====================
    def test_forecasting(self):
        """Test Forecasting endpoints with model validation"""
        print("\n📊 Testing Demand Forecasting - Model Validation...")
        
        # Test 1: Generate forecast
        forecast_request = {
            "item_id": "item-caviar-1",
            "item_name": "Oscietra Caviar",
            "method": "moving_average",
            "days": 30,
            "use_ai": True
        }
        
        success, data, error = self.make_request('POST', f'venues/{self.venue_id}/forecasting/generate', forecast_request)
        self.log_test("POST /api/venues/{venue_id}/forecasting/generate - Generate Forecast", success, error)
        
        # Test 2: List forecasts
        success, data, error = self.make_request('GET', f'venues/{self.venue_id}/forecasting')
        self.log_test("GET /api/venues/{venue_id}/forecasting - List Forecasts", success, error)
        
        # Test 3: Detect seasonal patterns
        success, data, error = self.make_request('GET', f'venues/{self.venue_id}/forecasting/seasonal-patterns?item_id=item-caviar-1&days=60')
        self.log_test("GET /api/venues/{venue_id}/forecasting/seasonal-patterns - Detect Patterns", success, error)

    # ==================== CENTRAL KITCHEN ====================
    def test_central_kitchen(self):
        """Test Central Kitchen endpoints with model validation"""
        print("\n🏭 Testing Central Kitchen - Model Validation...")
        
        # Test 1: Create internal order
        order_data = {
            "central_kitchen_id": "venue-central-kitchen",
            "items": [
                {"item_id": "item-1", "item_name": "Prepared Sauce", "quantity": 50, "unit": "L"}
            ],
            "requested_delivery": (datetime.now() + timedelta(days=2)).isoformat()
        }
        
        success, data, error = self.make_request('POST', f'venues/{self.venue_id}/internal-orders', order_data)
        self.log_test("POST /api/venues/{venue_id}/internal-orders - Create Order", success, error)
        
        # Test 2: List internal orders
        success, data, error = self.make_request('GET', f'venues/{self.venue_id}/internal-orders')
        self.log_test("GET /api/venues/{venue_id}/internal-orders - List Orders", success, error)
        
        # Test 3: Create production batch
        batch_data = {
            "batch_date": datetime.now().isoformat()[:10],
            "items": [
                {"item_id": "item-1", "item_name": "Prepared Sauce", "quantity": 100, "unit": "L"}
            ],
            "internal_orders": []
        }
        
        success, data, error = self.make_request('POST', f'venues/{self.venue_id}/production/batches', batch_data)
        self.log_test("POST /api/venues/{venue_id}/production/batches - Create Batch", success, error)
        
        batch_id = None
        if success and data.get('id'):
            batch_id = data['id']
        
        # Test 4: List batches
        success, data, error = self.make_request('GET', f'venues/{self.venue_id}/production/batches')
        self.log_test("GET /api/venues/{venue_id}/production/batches - List Batches", success, error)
        
        # Test 5: Start batch
        if batch_id:
            success, data, error = self.make_request('POST', f'venues/{self.venue_id}/production/batches/{batch_id}/start', {})
            self.log_test("POST /api/venues/{venue_id}/production/batches/{batch_id}/start - Start", success, error)
            
            # Test 6: Complete batch
            completion_data = {
                "quality_checked": True,
                "quality_notes": "All items passed quality inspection"
            }
            success, data, error = self.make_request('POST', f'venues/{self.venue_id}/production/batches/{batch_id}/complete', completion_data)
            self.log_test("POST /api/venues/{venue_id}/production/batches/{batch_id}/complete - Complete", success, error)
        
        # Test 7: Create distribution
        distribution_data = {
            "batch_id": "batch-1",
            "to_venue_id": "venue-restaurant-1",
            "items": [
                {"item_id": "item-1", "quantity": 25, "unit": "L"}
            ]
        }
        
        success, data, error = self.make_request('POST', f'venues/{self.venue_id}/distribution', distribution_data)
        self.log_test("POST /api/venues/{venue_id}/distribution - Create Distribution", success, error)
        
        # Test 8: List distributions
        success, data, error = self.make_request('GET', f'venues/{self.venue_id}/distribution')
        self.log_test("GET /api/venues/{venue_id}/distribution - List Distributions", success, error)

    # ==================== RECIPE ENGINEERING ====================
    def test_recipe_engineering(self):
        """Test Recipe Engineering endpoints with model validation"""
        print("\n👨‍🍳 Testing Recipe Engineering - Model Validation...")
        
        # Test 1: Create engineered recipe
        recipe_data = {
            "recipe_name": "Signature Beef Wellington",
            "description": "Premium beef wellington with foie gras",
            "ingredients": [
                {"item_id": "item-1", "item_name": "Wagyu Beef", "quantity": 0.5, "unit": "kg", "unit_cost": 120.0, "total_cost": 60.0},
                {"item_id": "item-2", "item_name": "Foie Gras", "quantity": 0.1, "unit": "kg", "unit_cost": 200.0, "total_cost": 20.0}
            ],
            "servings": 4,
            "prep_time_minutes": 45,
            "cook_time_minutes": 35,
            "labor_cost": 25.0,
            "overhead_cost": 10.0,
            "markup_percentage": 300,
            "category": "Main Course",
            "tags": ["signature", "premium", "beef"],
            "instructions": ["Prepare beef fillet", "Wrap with foie gras", "Encase in puff pastry", "Bake at 200°C"]
        }
        
        success, data, error = self.make_request('POST', f'venues/{self.venue_id}/recipes/engineered', recipe_data)
        self.log_test("POST /api/venues/{venue_id}/recipes/engineered - Create Recipe", success, error)
        
        recipe_id = None
        if success and data.get('id'):
            recipe_id = data['id']
        
        # Test 2: List recipes
        success, data, error = self.make_request('GET', f'venues/{self.venue_id}/recipes/engineered')
        self.log_test("GET /api/venues/{venue_id}/recipes/engineered - List Recipes", success, error)
        
        # Test 3: Get recipe
        if recipe_id:
            success, data, error = self.make_request('GET', f'venues/{self.venue_id}/recipes/engineered/{recipe_id}')
            self.log_test("GET /api/venues/{venue_id}/recipes/engineered/{recipe_id} - Get Recipe", success, error)
            
            # Test 4: Update recipe
            update_data = {
                "ingredients": recipe_data["ingredients"],
                "markup_percentage": 350,
                "change_notes": "Increased markup due to premium ingredients"
            }
            success, data, error = self.make_request('PUT', f'venues/{self.venue_id}/recipes/engineered/{recipe_id}', update_data)
            self.log_test("PUT /api/venues/{venue_id}/recipes/engineered/{recipe_id} - Update Recipe", success, error)
        
        # Test 5: Profitability analysis
        success, data, error = self.make_request('GET', f'venues/{self.venue_id}/recipes/engineered/analytics/profitability')
        self.log_test("GET /api/venues/{venue_id}/recipes/engineered/analytics/profitability - Profitability", success, error)

    # ==================== QUALITY CONTROL ====================
    def test_quality_control(self):
        """Test Quality Control endpoints with model validation"""
        print("\n✅ Testing Quality Control - Model Validation...")
        
        # Test 1: Create quality audit
        audit_data = {
            "audit_type": "food_safety",
            "audit_date": datetime.now().isoformat()[:10],
            "checklist": [
                {"item": "Temperature logs maintained", "status": "pass", "notes": "All within range"},
                {"item": "Hand washing stations stocked", "status": "pass", "notes": "Fully stocked"}
            ],
            "findings": ["All items passed inspection"],
            "corrective_actions": [],
            "follow_up_required": False
        }
        
        success, data, error = self.make_request('POST', f'venues/{self.venue_id}/quality/audits', audit_data)
        self.log_test("POST /api/venues/{venue_id}/quality/audits - Create Audit", success, error)
        
        # Test 2: List audits
        success, data, error = self.make_request('GET', f'venues/{self.venue_id}/quality/audits')
        self.log_test("GET /api/venues/{venue_id}/quality/audits - List Audits", success, error)
        
        # Test 3: Create allergen info
        allergen_data = {
            "item_id": "item-beef-wellington",
            "item_name": "Beef Wellington",
            "allergens": ["gluten", "eggs", "milk"],
            "may_contain": ["nuts"],
            "allergen_free": ["shellfish", "fish"],
            "cross_contamination_risk": True
        }
        
        success, data, error = self.make_request('POST', f'venues/{self.venue_id}/quality/allergens', allergen_data)
        self.log_test("POST /api/venues/{venue_id}/quality/allergens - Create Allergen Info", success, error)
        
        # Test 4: List allergens
        success, data, error = self.make_request('GET', f'venues/{self.venue_id}/quality/allergens')
        self.log_test("GET /api/venues/{venue_id}/quality/allergens - List Allergens", success, error)
        
        # Test 5: Create compliance document
        doc_data = {
            "document_type": "food_license",
            "document_name": "Food Service License 2025",
            "issuing_authority": "Health Department",
            "issue_date": "2025-01-01",
            "expiry_date": "2025-12-31",
            "document_url": "https://example.com/license.pdf"
        }
        
        success, data, error = self.make_request('POST', f'venues/{self.venue_id}/compliance/documents', doc_data)
        self.log_test("POST /api/venues/{venue_id}/compliance/documents - Create Compliance Doc", success, error)
        
        # Test 6: List compliance documents
        success, data, error = self.make_request('GET', f'venues/{self.venue_id}/compliance/documents')
        self.log_test("GET /api/venues/{venue_id}/compliance/documents - List Compliance Docs", success, error)

    # ==================== HR ADVANCED ====================
    def test_hr_advanced(self):
        """Test HR Advanced endpoints with model validation"""
        print("\n👥 Testing HR Advanced - Model Validation...")
        
        # Test 1: Create leave request
        leave_request = {
            "employee_id": "emp-001",
            "employee_name": "John Smith",
            "leave_type": "annual",
            "start_date": "2025-03-10",
            "end_date": "2025-03-14",
            "days": 5,
            "reason": "Family vacation"
        }
        
        success, data, error = self.make_request('POST', f'venues/{self.venue_id}/hr/leave/requests', leave_request)
        self.log_test("POST /api/venues/{venue_id}/hr/leave/requests - Create Leave Request", success, error)
        
        # Test 2: List leave requests
        success, data, error = self.make_request('GET', f'venues/{self.venue_id}/hr/leave/requests')
        self.log_test("GET /api/venues/{venue_id}/hr/leave/requests - List Requests", success, error)
        
        # Test 3: Create expense claim
        sample_image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        
        claim_data = {
            "category_id": "cat-travel",
            "expense_date": datetime.now().isoformat()[:10],
            "amount": 250.50,
            "currency": "USD",
            "reason": "Client meeting transportation",
            "receipt_image_base64": sample_image
        }
        
        success, data, error = self.make_request('POST', f'venues/{self.venue_id}/hr/expense/claims', claim_data)
        self.log_test("POST /api/venues/{venue_id}/hr/expense/claims - Create Claim", success, error)
        
        # Test 4: List expense claims
        success, data, error = self.make_request('GET', f'venues/{self.venue_id}/hr/expense/claims')
        self.log_test("GET /api/venues/{venue_id}/hr/expense/claims - List Claims", success, error)
        
        # Test 5: Create performance goal
        goal_data = {
            "employee_id": "emp-001",
            "goal_title": "Improve Customer Satisfaction Score",
            "description": "Increase CSAT from 85% to 90%",
            "target_date": "2025-06-30",
            "kpis": [
                {"metric": "CSAT Score", "target": 90, "current": 85}
            ]
        }
        
        success, data, error = self.make_request('POST', f'venues/{self.venue_id}/hr/goals', goal_data)
        self.log_test("POST /api/venues/{venue_id}/hr/goals - Create Goal", success, error)
        
        # Test 6: List goals
        success, data, error = self.make_request('GET', f'venues/{self.venue_id}/hr/goals')
        self.log_test("GET /api/venues/{venue_id}/hr/goals - List Goals", success, error)

    # ==================== SFM ACCOUNTING ====================
    def test_hr_sfm_accounting(self):
        """Test SFM Accounting endpoints with model validation"""
        print("\n📊 Testing SFM Accounting - Model Validation...")
        
        # Test 1: Create GL account
        account_data = {
            "account_code": "4000",
            "account_name": "Sales Revenue",
            "account_type": "revenue",
            "parent_account": None
        }
        
        success, data, error = self.make_request('POST', f'venues/{self.venue_id}/accounting/gl-accounts', account_data)
        self.log_test("POST /api/venues/{venue_id}/accounting/gl-accounts - Create GL Account", success, error)
        
        account_id = None
        if success and data.get('id'):
            account_id = data['id']
        
        # Test 2: List GL accounts
        success, data, error = self.make_request('GET', f'venues/{self.venue_id}/accounting/gl-accounts')
        self.log_test("GET /api/venues/{venue_id}/accounting/gl-accounts - List Accounts", success, error)
        
        # Test 3: Create ledger entry
        entry_data = {
            "entry_date": datetime.now().isoformat()[:10],
            "account_id": account_id or "acc-4000",
            "account_code": "4000",
            "debit": 0,
            "credit": 1500.0,
            "description": "Daily sales revenue",
            "reference": "INV-2025-001",
            "source": "pos",
            "source_id": "order-12345"
        }
        
        success, data, error = self.make_request('POST', f'venues/{self.venue_id}/accounting/ledger-entries', entry_data)
        self.log_test("POST /api/venues/{venue_id}/accounting/ledger-entries - Create Entry", success, error)
        
        # Test 4: List ledger entries
        success, data, error = self.make_request('GET', f'venues/{self.venue_id}/accounting/ledger-entries')
        self.log_test("GET /api/venues/{venue_id}/accounting/ledger-entries - List Entries", success, error)
        
        # Test 5: Create VAT return
        vat_data = {
            "period_start": "2025-01-01",
            "period_end": "2025-01-31",
            "total_sales": 50000.0,
            "vat_on_sales": 10000.0,
            "total_purchases": 20000.0,
            "vat_on_purchases": 4000.0,
            "vat_payable": 6000.0
        }
        
        success, data, error = self.make_request('POST', f'venues/{self.venue_id}/accounting/vat-returns', vat_data)
        self.log_test("POST /api/venues/{venue_id}/accounting/vat-returns - Create VAT Return", success, error)
        
        # Test 6: List VAT returns
        success, data, error = self.make_request('GET', f'venues/{self.venue_id}/accounting/vat-returns')
        self.log_test("GET /api/venues/{venue_id}/accounting/vat-returns - List Returns", success, error)

    # ==================== MAIN TEST RUNNER ====================
    def run_all_tests(self):
        """Run all test suites"""
        print("=" * 80)
        print("🚀 MODEL VALIDATION TESTING - Ultimate Paket & HR Advanced")
        print("=" * 80)
        
        if not self.authenticate():
            print("\n❌ Authentication failed. Cannot proceed with tests.")
            return False
        
        # Run all test suites
        self.test_procurement_advanced()
        self.test_invoice_ai()
        self.test_forecasting()
        self.test_central_kitchen()
        self.test_recipe_engineering()
        self.test_quality_control()
        self.test_hr_advanced()
        self.test_hr_sfm_accounting()
        
        # Print summary
        self.print_summary()
        
        return self.tests_passed == self.tests_run

    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 80)
        print("📊 TEST SUMMARY")
        print("=" * 80)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed} ✅")
        print(f"Failed: {self.tests_run - self.tests_passed} ❌")
        print(f"Success Rate: {(self.tests_passed / self.tests_run * 100):.1f}%")
        
        if self.failed_endpoints:
            print("\n❌ FAILED ENDPOINTS:")
            for failure in self.failed_endpoints:
                print(f"\n  Endpoint: {failure['endpoint']}")
                print(f"  Error: {failure['error']}")
        
        print("\n" + "=" * 80)


if __name__ == "__main__":
    tester = ModelValidationTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)
