#!/usr/bin/env python3
"""
Comprehensive Backend Testing for Ultimate Paket & HR Advanced Features
Tests 50+ endpoints across 14 modules
"""

import requests
import sys
import json
import base64
from datetime import datetime, timedelta
from typing import Dict, List, Optional

class UltimateHRTester:
    def __init__(self, base_url="https://resiliency-hub.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.venue_id = "venue-caviar-bull"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.created_resources = {
            "rfqs": [],
            "invoices": [],
            "forecasts": [],
            "internal_orders": [],
            "batches": [],
            "recipes": [],
            "audits": [],
            "leave_requests": [],
            "payroll_runs": [],
            "expense_claims": [],
            "goals": [],
            "reviews": [],
            "documents": [],
            "gl_accounts": [],
        }

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
                    error_msg += f" - {response_data.get('detail', response_data)}"
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
        
        # Use query parameters for PIN login
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
        """Test RFQ, Approval Rules, and Auto-Order Rules"""
        print("\n📦 Testing Procurement Advanced...")
        
        # Create RFQ
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
        
        if success and data.get('id'):
            rfq_id = data['id']
            self.created_resources['rfqs'].append(rfq_id)
            
            # List RFQs
            success, data, error = self.make_request('GET', f'venues/{self.venue_id}/rfq')
            self.log_test("GET /api/venues/{venue_id}/rfq - List RFQs", success, error)
            
            # Submit quote
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
            
            # Award RFQ
            award_data = {"supplier_id": "supplier-1"}
            success, data, error = self.make_request('POST', f'venues/{self.venue_id}/rfq/{rfq_id}/award', award_data)
            self.log_test("POST /api/venues/{venue_id}/rfq/{rfq_id}/award - Award RFQ", success, error)
        
        # Create approval rule
        rule_data = {
            "rule_name": "High Value Purchase Approval",
            "condition": "amount_exceeds",
            "threshold": 5000.0,
            "approvers": ["user-manager-1", "user-owner"],
            "escalation_hours": 24
        }
        
        success, data, error = self.make_request('POST', f'venues/{self.venue_id}/procurement/approval-rules', rule_data)
        self.log_test("POST /api/venues/{venue_id}/procurement/approval-rules - Create Approval Rule", success, error)
        
        # List approval rules
        success, data, error = self.make_request('GET', f'venues/{self.venue_id}/procurement/approval-rules')
        self.log_test("GET /api/venues/{venue_id}/procurement/approval-rules - List Rules", success, error)
        
        # Create auto-order rule
        auto_order_data = {
            "item_id": "item-caviar-1",
            "supplier_id": "supplier-1",
            "reorder_point": 5.0,
            "order_quantity": 20.0,
            "lead_time_days": 3
        }
        
        success, data, error = self.make_request('POST', f'venues/{self.venue_id}/procurement/auto-order-rules', auto_order_data)
        self.log_test("POST /api/venues/{venue_id}/procurement/auto-order-rules - Create Auto-Order Rule", success, error)
        
        # List auto-order rules
        success, data, error = self.make_request('GET', f'venues/{self.venue_id}/procurement/auto-order-rules')
        self.log_test("GET /api/venues/{venue_id}/procurement/auto-order-rules - List Auto-Order Rules", success, error)

    # ==================== AI INVOICE PROCESSING ====================
    def test_invoice_ai(self):
        """Test AI Invoice OCR and Processing"""
        print("\n🤖 Testing AI Invoice Processing...")
        
        # Create sample base64 image (1x1 pixel PNG)
        sample_image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        
        # Process invoice with OCR
        ocr_request = {
            "image_base64": sample_image,
            "po_id": None
        }
        
        success, data, error = self.make_request('POST', f'venues/{self.venue_id}/invoices/ocr', ocr_request)
        self.log_test("POST /api/venues/{venue_id}/invoices/ocr - Process Invoice OCR", success, error)
        
        if success and data.get('id'):
            invoice_id = data['id']
            self.created_resources['invoices'].append(invoice_id)
            
            # List AI invoices
            success, data, error = self.make_request('GET', f'venues/{self.venue_id}/invoices/ai')
            self.log_test("GET /api/venues/{venue_id}/invoices/ai - List AI Invoices", success, error)
            
            # Get invoice details
            success, data, error = self.make_request('GET', f'venues/{self.venue_id}/invoices/ai/{invoice_id}')
            self.log_test("GET /api/venues/{venue_id}/invoices/ai/{invoice_id} - Get Invoice Details", success, error)
            
            # Approve invoice
            success, data, error = self.make_request('POST', f'venues/{self.venue_id}/invoices/ai/{invoice_id}/approve', {})
            self.log_test("POST /api/venues/{venue_id}/invoices/ai/{invoice_id}/approve - Approve Invoice", success, error)
        
        # Test reject invoice (create another one)
        success, data, error = self.make_request('POST', f'venues/{self.venue_id}/invoices/ocr', ocr_request)
        if success and data.get('id'):
            invoice_id = data['id']
            success, data, error = self.make_request('POST', f'venues/{self.venue_id}/invoices/ai/{invoice_id}/reject', 
                                                     {"reason": "Incorrect amount"})
            self.log_test("POST /api/venues/{venue_id}/invoices/ai/{invoice_id}/reject - Reject Invoice", success, error)

    # ==================== DEMAND FORECASTING ====================
    def test_forecasting(self):
        """Test Demand Forecasting with AI"""
        print("\n📊 Testing Demand Forecasting...")
        
        # Generate forecast
        forecast_request = {
            "item_id": "item-caviar-1",
            "item_name": "Oscietra Caviar",
            "method": "moving_average",
            "days": 30,
            "use_ai": True
        }
        
        success, data, error = self.make_request('POST', f'venues/{self.venue_id}/forecasting/generate', forecast_request)
        self.log_test("POST /api/venues/{venue_id}/forecasting/generate - Generate Forecast (with AI)", success, error)
        
        if success and data.get('id'):
            self.created_resources['forecasts'].append(data['id'])
        
        # List forecasts
        success, data, error = self.make_request('GET', f'venues/{self.venue_id}/forecasting')
        self.log_test("GET /api/venues/{venue_id}/forecasting - List Forecasts", success, error)
        
        # Detect seasonal patterns
        success, data, error = self.make_request('GET', f'venues/{self.venue_id}/forecasting/seasonal-patterns?item_id=item-caviar-1&days=60')
        self.log_test("GET /api/venues/{venue_id}/forecasting/seasonal-patterns - Detect Patterns", success, error)

    # ==================== CENTRAL KITCHEN ====================
    def test_central_kitchen(self):
        """Test Central Kitchen Production & Distribution"""
        print("\n🏭 Testing Central Kitchen...")
        
        # Create internal order
        order_data = {
            "central_kitchen_id": "venue-central-kitchen",
            "items": [
                {"item_id": "item-1", "item_name": "Prepared Sauce", "quantity": 50, "unit": "L"}
            ],
            "requested_delivery": (datetime.now() + timedelta(days=2)).isoformat()
        }
        
        success, data, error = self.make_request('POST', f'venues/{self.venue_id}/internal-orders', order_data)
        self.log_test("POST /api/venues/{venue_id}/internal-orders - Create Internal Order", success, error)
        
        if success and data.get('id'):
            self.created_resources['internal_orders'].append(data['id'])
        
        # List internal orders
        success, data, error = self.make_request('GET', f'venues/{self.venue_id}/internal-orders')
        self.log_test("GET /api/venues/{venue_id}/internal-orders - List Orders", success, error)
        
        # Create production batch
        batch_data = {
            "batch_date": datetime.now().isoformat()[:10],
            "items": [
                {"item_id": "item-1", "item_name": "Prepared Sauce", "quantity": 100, "unit": "L"}
            ],
            "internal_orders": []
        }
        
        success, data, error = self.make_request('POST', f'venues/{self.venue_id}/production/batches', batch_data)
        self.log_test("POST /api/venues/{venue_id}/production/batches - Create Production Batch", success, error)
        
        if success and data.get('id'):
            batch_id = data['id']
            self.created_resources['batches'].append(batch_id)
            
            # List batches
            success, data, error = self.make_request('GET', f'venues/{self.venue_id}/production/batches')
            self.log_test("GET /api/venues/{venue_id}/production/batches - List Batches", success, error)
            
            # Start batch
            success, data, error = self.make_request('POST', f'venues/{self.venue_id}/production/batches/{batch_id}/start', {})
            self.log_test("POST /api/venues/{venue_id}/production/batches/{batch_id}/start - Start Batch", success, error)
            
            # Complete batch
            completion_data = {
                "quality_checked": True,
                "quality_notes": "All items passed quality inspection"
            }
            success, data, error = self.make_request('POST', f'venues/{self.venue_id}/production/batches/{batch_id}/complete', completion_data)
            self.log_test("POST /api/venues/{venue_id}/production/batches/{batch_id}/complete - Complete Batch", success, error)
        
        # Create distribution
        distribution_data = {
            "batch_id": "batch-1",
            "to_venue_id": "venue-restaurant-1",
            "items": [
                {"item_id": "item-1", "quantity": 25, "unit": "L"}
            ]
        }
        
        success, data, error = self.make_request('POST', f'venues/{self.venue_id}/distribution', distribution_data)
        self.log_test("POST /api/venues/{venue_id}/distribution - Create Distribution", success, error)
        
        # List distributions
        success, data, error = self.make_request('GET', f'venues/{self.venue_id}/distribution')
        self.log_test("GET /api/venues/{venue_id}/distribution - List Distributions", success, error)

    # ==================== RECIPE ENGINEERING ====================
    def test_recipe_engineering(self):
        """Test Recipe Engineering & Cost Analysis"""
        print("\n👨‍🍳 Testing Recipe Engineering...")
        
        # Create engineered recipe
        recipe_data = {
            "recipe_name": "Signature Beef Wellington",
            "description": "Premium beef wellington with foie gras",
            "ingredients": [
                {"item_id": "item-1", "item_name": "Wagyu Beef", "quantity": 0.5, "unit": "kg", "unit_cost": 120.0, "total_cost": 60.0},
                {"item_id": "item-2", "item_name": "Foie Gras", "quantity": 0.1, "unit": "kg", "unit_cost": 200.0, "total_cost": 20.0},
                {"item_id": "item-3", "item_name": "Puff Pastry", "quantity": 0.3, "unit": "kg", "unit_cost": 15.0, "total_cost": 4.5}
            ],
            "servings": 4,
            "prep_time_minutes": 45,
            "cook_time_minutes": 35,
            "labor_cost": 25.0,
            "overhead_cost": 10.0,
            "markup_percentage": 300,
            "category": "Main Course",
            "tags": ["signature", "premium", "beef"],
            "instructions": [
                "Prepare beef fillet",
                "Wrap with foie gras and mushroom duxelles",
                "Encase in puff pastry",
                "Bake at 200°C for 35 minutes"
            ]
        }
        
        success, data, error = self.make_request('POST', f'venues/{self.venue_id}/recipes/engineered', recipe_data)
        self.log_test("POST /api/venues/{venue_id}/recipes/engineered - Create Engineered Recipe", success, error)
        
        if success and data.get('id'):
            recipe_id = data['id']
            self.created_resources['recipes'].append(recipe_id)
            
            # List recipes
            success, data, error = self.make_request('GET', f'venues/{self.venue_id}/recipes/engineered')
            self.log_test("GET /api/venues/{venue_id}/recipes/engineered - List Recipes", success, error)
            
            # Get recipe
            success, data, error = self.make_request('GET', f'venues/{self.venue_id}/recipes/engineered/{recipe_id}')
            self.log_test("GET /api/venues/{venue_id}/recipes/engineered/{recipe_id} - Get Recipe", success, error)
            
            # Update recipe
            update_data = {
                "ingredients": recipe_data["ingredients"],
                "markup_percentage": 350,
                "change_notes": "Increased markup due to premium ingredients"
            }
            success, data, error = self.make_request('PUT', f'venues/{self.venue_id}/recipes/engineered/{recipe_id}', update_data)
            self.log_test("PUT /api/venues/{venue_id}/recipes/engineered/{recipe_id} - Update Recipe", success, error)
        
        # Profitability analysis
        success, data, error = self.make_request('GET', f'venues/{self.venue_id}/recipes/engineered/analytics/profitability')
        self.log_test("GET /api/venues/{venue_id}/recipes/engineered/analytics/profitability - Profitability Analysis", success, error)

    # ==================== QUALITY CONTROL ====================
    def test_quality_control(self):
        """Test Quality Audits, Allergens, and Compliance"""
        print("\n✅ Testing Quality Control...")
        
        # Create quality audit
        audit_data = {
            "audit_type": "food_safety",
            "audit_date": datetime.now().isoformat()[:10],
            "checklist": [
                {"item": "Temperature logs maintained", "status": "pass", "notes": "All within range"},
                {"item": "Hand washing stations stocked", "status": "pass", "notes": "Fully stocked"},
                {"item": "Food storage labels current", "status": "fail", "notes": "2 items expired"}
            ],
            "findings": ["Expired labels found in dry storage"],
            "corrective_actions": ["Replace all expired labels", "Implement weekly label checks"],
            "follow_up_required": True,
            "follow_up_date": (datetime.now() + timedelta(days=7)).isoformat()[:10]
        }
        
        success, data, error = self.make_request('POST', f'venues/{self.venue_id}/quality/audits', audit_data)
        self.log_test("POST /api/venues/{venue_id}/quality/audits - Create Audit", success, error)
        
        if success and data.get('id'):
            self.created_resources['audits'].append(data['id'])
        
        # List audits
        success, data, error = self.make_request('GET', f'venues/{self.venue_id}/quality/audits')
        self.log_test("GET /api/venues/{venue_id}/quality/audits - List Audits", success, error)
        
        # Create allergen info
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
        
        # List allergens
        success, data, error = self.make_request('GET', f'venues/{self.venue_id}/quality/allergens')
        self.log_test("GET /api/venues/{venue_id}/quality/allergens - List Allergens", success, error)
        
        # Create compliance document
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
        
        # List compliance documents
        success, data, error = self.make_request('GET', f'venues/{self.venue_id}/compliance/documents')
        self.log_test("GET /api/venues/{venue_id}/compliance/documents - List Compliance Docs", success, error)

    # ==================== HR LEAVE ADVANCED ====================
    def test_hr_leave_advanced(self):
        """Test Leave Accrual, Blackouts, and Requests"""
        print("\n🏖️ Testing HR Leave Advanced...")
        
        # Create accrual rule
        accrual_data = {
            "leave_type": "annual",
            "accrual_method": "monthly",
            "accrual_rate": 1.67,
            "max_balance": 25.0,
            "carryover_allowed": True,
            "carryover_max": 5.0,
            "carryover_expiry_months": 3,
            "probation_period_months": 3
        }
        
        success, data, error = self.make_request('POST', f'venues/{self.venue_id}/hr/leave/accrual-rules', accrual_data)
        self.log_test("POST /api/venues/{venue_id}/hr/leave/accrual-rules - Create Accrual Rule", success, error)
        
        # List accrual rules
        success, data, error = self.make_request('GET', f'venues/{self.venue_id}/hr/leave/accrual-rules')
        self.log_test("GET /api/venues/{venue_id}/hr/leave/accrual-rules - List Rules", success, error)
        
        # Create blackout date
        blackout_data = {
            "name": "Christmas Period",
            "start_date": "2025-12-20",
            "end_date": "2025-12-26",
            "reason": "Peak holiday season",
            "applies_to_roles": ["waiter", "chef", "bartender"]
        }
        
        success, data, error = self.make_request('POST', f'venues/{self.venue_id}/hr/leave/blackout-dates', blackout_data)
        self.log_test("POST /api/venues/{venue_id}/hr/leave/blackout-dates - Create Blackout", success, error)
        
        # List blackout dates
        success, data, error = self.make_request('GET', f'venues/{self.venue_id}/hr/leave/blackout-dates')
        self.log_test("GET /api/venues/{venue_id}/hr/leave/blackout-dates - List Blackouts", success, error)
        
        # Create leave request
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
        
        if success and data.get('id'):
            request_id = data['id']
            self.created_resources['leave_requests'].append(request_id)
            
            # List leave requests
            success, data, error = self.make_request('GET', f'venues/{self.venue_id}/hr/leave/requests')
            self.log_test("GET /api/venues/{venue_id}/hr/leave/requests - List Requests", success, error)
            
            # Approve leave request
            success, data, error = self.make_request('POST', f'venues/{self.venue_id}/hr/leave/requests/{request_id}/approve', {})
            self.log_test("POST /api/venues/{venue_id}/hr/leave/requests/{request_id}/approve - Approve", success, error)
        
        # Test reject (create another request)
        leave_request["start_date"] = "2025-04-10"
        leave_request["end_date"] = "2025-04-14"
        success, data, error = self.make_request('POST', f'venues/{self.venue_id}/hr/leave/requests', leave_request)
        if success and data.get('id'):
            request_id = data['id']
            success, data, error = self.make_request('POST', f'venues/{self.venue_id}/hr/leave/requests/{request_id}/reject', 
                                                     {"reason": "Insufficient coverage"})
            self.log_test("POST /api/venues/{venue_id}/hr/leave/requests/{request_id}/reject - Reject", success, error)

    # ==================== HR PAYROLL ADVANCED ====================
    def test_hr_payroll_advanced(self):
        """Test Payroll Runs with State Transitions"""
        print("\n💰 Testing HR Payroll Advanced...")
        
        # Create payroll run
        payroll_data = {
            "run_name": "January 2025 Payroll",
            "period_start": "2025-01-01",
            "period_end": "2025-01-31",
            "payslips": [
                {
                    "employee_id": "emp-001",
                    "employee_name": "John Smith",
                    "gross_pay": 5000.0,
                    "tax_amount": 1000.0,
                    "net_pay": 4000.0,
                    "deductions": {"tax": 1000.0},
                    "additions": {}
                },
                {
                    "employee_id": "emp-002",
                    "employee_name": "Jane Doe",
                    "gross_pay": 4500.0,
                    "tax_amount": 900.0,
                    "net_pay": 3600.0,
                    "deductions": {"tax": 900.0},
                    "additions": {}
                }
            ]
        }
        
        success, data, error = self.make_request('POST', f'venues/{self.venue_id}/hr/payroll/runs', payroll_data)
        self.log_test("POST /api/venues/{venue_id}/hr/payroll/runs - Create Payroll Run", success, error)
        
        if success and data.get('id'):
            run_id = data['id']
            self.created_resources['payroll_runs'].append(run_id)
            
            # List payroll runs
            success, data, error = self.make_request('GET', f'venues/{self.venue_id}/hr/payroll/runs')
            self.log_test("GET /api/venues/{venue_id}/hr/payroll/runs - List Runs", success, error)
            
            # Validate payroll run
            success, data, error = self.make_request('POST', f'venues/{self.venue_id}/hr/payroll/runs/{run_id}/validate', {})
            self.log_test("POST /api/venues/{venue_id}/hr/payroll/runs/{run_id}/validate - Validate", success, error)
            
            # Approve payroll run
            success, data, error = self.make_request('POST', f'venues/{self.venue_id}/hr/payroll/runs/{run_id}/approve', {})
            self.log_test("POST /api/venues/{venue_id}/hr/payroll/runs/{run_id}/approve - Approve", success, error)
            
            # Lock payroll run
            success, data, error = self.make_request('POST', f'venues/{self.venue_id}/hr/payroll/runs/{run_id}/lock', {})
            self.log_test("POST /api/venues/{venue_id}/hr/payroll/runs/{run_id}/lock - Lock", success, error)
            
            # Dispatch payroll run
            dispatch_data = {
                "method": "email",
                "emails": {
                    "emp-001": "john@example.com",
                    "emp-002": "jane@example.com"
                }
            }
            success, data, error = self.make_request('POST', f'venues/{self.venue_id}/hr/payroll/runs/{run_id}/dispatch', dispatch_data)
            self.log_test("POST /api/venues/{venue_id}/hr/payroll/runs/{run_id}/dispatch - Dispatch", success, error)
        
        # Get dispatch queue
        success, data, error = self.make_request('GET', f'venues/{self.venue_id}/hr/payroll/dispatch-queue')
        self.log_test("GET /api/venues/{venue_id}/hr/payroll/dispatch-queue - Get Queue", success, error)

    # ==================== HR EXPENSE ====================
    def test_hr_expense(self):
        """Test Expense Categories and Claims with OCR"""
        print("\n💳 Testing HR Expense Management...")
        
        # Create expense category
        category_data = {
            "category_name": "Travel",
            "requires_receipt": True,
            "max_amount": 1000.0,
            "approval_required": True,
            "approvers": ["manager-1"]
        }
        
        success, data, error = self.make_request('POST', f'venues/{self.venue_id}/hr/expense/categories', category_data)
        self.log_test("POST /api/venues/{venue_id}/hr/expense/categories - Create Category", success, error)
        
        category_id = None
        if success and data.get('id'):
            category_id = data['id']
        
        # List expense categories
        success, data, error = self.make_request('GET', f'venues/{self.venue_id}/hr/expense/categories')
        self.log_test("GET /api/venues/{venue_id}/hr/expense/categories - List Categories", success, error)
        
        # Create expense claim with receipt OCR
        sample_image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        
        claim_data = {
            "category_id": category_id or "cat-travel",
            "expense_date": datetime.now().isoformat()[:10],
            "amount": 250.50,
            "currency": "USD",
            "reason": "Client meeting transportation",
            "receipt_image_base64": sample_image
        }
        
        success, data, error = self.make_request('POST', f'venues/{self.venue_id}/hr/expense/claims', claim_data)
        self.log_test("POST /api/venues/{venue_id}/hr/expense/claims - Create Claim (with OCR)", success, error)
        
        if success and data.get('id'):
            claim_id = data['id']
            self.created_resources['expense_claims'].append(claim_id)
            
            # List expense claims
            success, data, error = self.make_request('GET', f'venues/{self.venue_id}/hr/expense/claims')
            self.log_test("GET /api/venues/{venue_id}/hr/expense/claims - List Claims", success, error)
            
            # Approve expense claim
            success, data, error = self.make_request('POST', f'venues/{self.venue_id}/hr/expense/claims/{claim_id}/approve', {})
            self.log_test("POST /api/venues/{venue_id}/hr/expense/claims/{claim_id}/approve - Approve", success, error)

    # ==================== HR PERFORMANCE ====================
    def test_hr_performance(self):
        """Test Goals, Reviews, and 360 Feedback"""
        print("\n🎯 Testing HR Performance Management...")
        
        # Create goal
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
        
        if success and data.get('id'):
            self.created_resources['goals'].append(data['id'])
        
        # List goals
        success, data, error = self.make_request('GET', f'venues/{self.venue_id}/hr/goals')
        self.log_test("GET /api/venues/{venue_id}/hr/goals - List Goals", success, error)
        
        # Create performance review
        review_data = {
            "employee_id": "emp-001",
            "employee_name": "John Smith",
            "review_period_start": "2024-07-01",
            "review_period_end": "2024-12-31",
            "review_type": "annual",
            "questions": [
                {"question": "Quality of work", "rating": 4},
                {"question": "Teamwork", "rating": 5},
                {"question": "Communication", "rating": 4}
            ]
        }
        
        success, data, error = self.make_request('POST', f'venues/{self.venue_id}/hr/reviews', review_data)
        self.log_test("POST /api/venues/{venue_id}/hr/reviews - Create Review", success, error)
        
        if success and data.get('id'):
            self.created_resources['reviews'].append(data['id'])
        
        # List performance reviews
        success, data, error = self.make_request('GET', f'venues/{self.venue_id}/hr/reviews')
        self.log_test("GET /api/venues/{venue_id}/hr/reviews - List Reviews", success, error)
        
        # Create 360 feedback
        feedback_data = {
            "employee_id": "emp-001",
            "review_cycle": "2024-H2",
            "feedbacks": [
                {"reviewer_id": "emp-002", "reviewer_name": "Jane Doe", "rating": 4, "comments": "Great team player"},
                {"reviewer_id": "emp-003", "reviewer_name": "Bob Wilson", "rating": 5, "comments": "Excellent leadership"}
            ]
        }
        
        success, data, error = self.make_request('POST', f'venues/{self.venue_id}/hr/360-feedback', feedback_data)
        self.log_test("POST /api/venues/{venue_id}/hr/360-feedback - Create 360 Feedback", success, error)

    # ==================== HR DOCUMENTS ====================
    def test_hr_documents_advanced(self):
        """Test Document Management and Training Certificates"""
        print("\n📄 Testing HR Documents Advanced...")
        
        # Upload employee document
        doc_data = {
            "employee_id": "emp-001",
            "document_type": "passport",
            "document_name": "Passport - John Smith",
            "document_number": "P12345678",
            "issue_date": "2020-01-15",
            "expiry_date": "2030-01-15",
            "issuing_authority": "Government",
            "file_url": "https://example.com/passport.pdf",
            "reminder_days_before": 90,
            "notes": "Valid for 10 years"
        }
        
        success, data, error = self.make_request('POST', f'venues/{self.venue_id}/hr/documents', doc_data)
        self.log_test("POST /api/venues/{venue_id}/hr/documents - Upload Document", success, error)
        
        if success and data.get('id'):
            self.created_resources['documents'].append(data['id'])
        
        # List employee documents
        success, data, error = self.make_request('GET', f'venues/{self.venue_id}/hr/documents')
        self.log_test("GET /api/venues/{venue_id}/hr/documents - List Documents", success, error)
        
        # Get expiring documents
        success, data, error = self.make_request('GET', f'venues/{self.venue_id}/hr/documents/expiring-soon')
        self.log_test("GET /api/venues/{venue_id}/hr/documents/expiring-soon - Get Expiring", success, error)
        
        # Create training certificate
        cert_data = {
            "employee_id": "emp-001",
            "training_name": "Food Safety Level 2",
            "provider": "Food Safety Academy",
            "completion_date": "2024-11-15",
            "expiry_date": "2027-11-15",
            "certificate_url": "https://example.com/cert.pdf",
            "hours": 8,
            "score": 95
        }
        
        success, data, error = self.make_request('POST', f'venues/{self.venue_id}/hr/training-certificates', cert_data)
        self.log_test("POST /api/venues/{venue_id}/hr/training-certificates - Create Certificate", success, error)

    # ==================== SFM ACCOUNTING ====================
    def test_hr_sfm_accounting(self):
        """Test GL Accounts, Ledger Entries, and VAT Returns"""
        print("\n📊 Testing SFM Accounting...")
        
        # Create GL account
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
            self.created_resources['gl_accounts'].append(account_id)
        
        # List GL accounts
        success, data, error = self.make_request('GET', f'venues/{self.venue_id}/accounting/gl-accounts')
        self.log_test("GET /api/venues/{venue_id}/accounting/gl-accounts - List Accounts", success, error)
        
        # Create ledger entry
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
        self.log_test("POST /api/venues/{venue_id}/accounting/ledger-entries - Create Ledger Entry", success, error)
        
        # List ledger entries
        success, data, error = self.make_request('GET', f'venues/{self.venue_id}/accounting/ledger-entries')
        self.log_test("GET /api/venues/{venue_id}/accounting/ledger-entries - List Entries", success, error)
        
        # Create VAT return
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
        
        # List VAT returns
        success, data, error = self.make_request('GET', f'venues/{self.venue_id}/accounting/vat-returns')
        self.log_test("GET /api/venues/{venue_id}/accounting/vat-returns - List Returns", success, error)

    # ==================== HR ANALYTICS ====================
    def test_hr_analytics_advanced(self):
        """Test HR Analytics - Headcount, Turnover, Costs"""
        print("\n📈 Testing HR Analytics Advanced...")
        
        # Get headcount metrics
        success, data, error = self.make_request('GET', f'venues/{self.venue_id}/hr/analytics/headcount')
        self.log_test("GET /api/venues/{venue_id}/hr/analytics/headcount - Headcount Metrics", success, error)
        
        # Get turnover metrics
        success, data, error = self.make_request('GET', f'venues/{self.venue_id}/hr/analytics/turnover')
        self.log_test("GET /api/venues/{venue_id}/hr/analytics/turnover - Turnover Metrics", success, error)
        
        # Get cost metrics
        success, data, error = self.make_request('GET', f'venues/{self.venue_id}/hr/analytics/costs')
        self.log_test("GET /api/venues/{venue_id}/hr/analytics/costs - Cost Metrics", success, error)

    # ==================== GLOBAL SEARCH ====================
    def test_global_search(self):
        """Test Global Search Across Modules"""
        print("\n🔍 Testing Global Search...")
        
        # Search for "beef"
        success, data, error = self.make_request('GET', f'venues/{self.venue_id}/search?q=beef&limit=20')
        self.log_test("GET /api/venues/{venue_id}/search?q=beef - Global Search", success, error)
        
        # Search with module filter
        success, data, error = self.make_request('GET', f'venues/{self.venue_id}/search?q=john&modules=employees,leave&limit=10')
        self.log_test("GET /api/venues/{venue_id}/search?q=john&modules=employees,leave - Filtered Search", success, error)

    # ==================== MAIN TEST RUNNER ====================
    def run_all_tests(self):
        """Run all test suites"""
        print("=" * 80)
        print("🚀 ULTIMATE PAKET & HR ADVANCED - COMPREHENSIVE BACKEND TESTING")
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
        self.test_hr_leave_advanced()
        self.test_hr_payroll_advanced()
        self.test_hr_expense()
        self.test_hr_performance()
        self.test_hr_documents_advanced()
        self.test_hr_sfm_accounting()
        self.test_hr_analytics_advanced()
        self.test_global_search()
        
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
        
        if self.tests_passed < self.tests_run:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  - {result['test']}: {result['details']}")
        
        print("\n" + "=" * 80)


if __name__ == "__main__":
    tester = UltimateHRTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)
