#!/usr/bin/env python3
"""
FINAL COMPREHENSIVE BACKEND TEST - All Ultimate & HR Features
Tests all previously failed endpoints after datetime timezone fixes
"""

import requests
import json
import base64
from datetime import datetime, timedelta

# Configuration
BASE_URL = "https://resiliency-hub.preview.emergentagent.com/api"
PIN = "1234"
ROLE = "owner"

# Test results tracking
results = {
    "passed": [],
    "failed": [],
    "total": 0
}

def log_test(name, passed, details=""):
    """Log test result"""
    results["total"] += 1
    if passed:
        results["passed"].append(name)
        print(f"✅ {name}")
    else:
        results["failed"].append({"name": name, "details": details})
        print(f"❌ {name}: {details}")

def print_summary():
    """Print test summary"""
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    print(f"Total Tests: {results['total']}")
    print(f"Passed: {len(results['passed'])} ({len(results['passed'])/results['total']*100:.1f}%)")
    print(f"Failed: {len(results['failed'])} ({len(results['failed'])/results['total']*100:.1f}%)")
    
    if results['failed']:
        print("\n❌ FAILED TESTS:")
        for fail in results['failed']:
            print(f"  - {fail['name']}: {fail['details']}")
    
    print("\n✅ PASSED TESTS:")
    for test in results['passed']:
        print(f"  - {test}")

# Step 1: Login
print("="*80)
print("STEP 1: Authentication")
print("="*80)

login_response = requests.post(
    f"{BASE_URL}/auth/login/pin?pin={PIN}&app=admin"
)

if login_response.status_code == 200:
    token = login_response.json()["accessToken"]
    user = login_response.json()["user"]
    venue_id = user.get("venueId") or user.get("venue_id")
    print(f"✅ Login successful as {user['name']} (role: {user['role']})")
    print(f"   Venue ID: {venue_id}")
    log_test("Authentication", True)
else:
    print(f"❌ Login failed: {login_response.status_code}")
    log_test("Authentication", False, f"Status {login_response.status_code}")
    print_summary()
    exit(1)

headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

# Step 2: Test Previously Failed Endpoints
print("\n" + "="*80)
print("STEP 2: Testing Previously Failed Endpoints (After Timezone Fixes)")
print("="*80)

# Test 1: Invoice OCR (was 422 - venue_id issue)
print("\n[1/9] Testing Invoice OCR...")
# Create a simple 1x1 pixel PNG image in base64
sample_image_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

invoice_ocr_data = {
    "image_base64": sample_image_base64,
    "supplier_hint": "Test Supplier"
}

invoice_ocr_response = requests.post(
    f"{BASE_URL}/venues/{venue_id}/invoices/ocr",
    headers=headers,
    json=invoice_ocr_data
)

if invoice_ocr_response.status_code in [200, 201]:
    log_test("POST /api/venues/{venue_id}/invoices/ocr", True)
    print(f"   Response: {invoice_ocr_response.json()}")
else:
    log_test("POST /api/venues/{venue_id}/invoices/ocr", False, 
             f"Status {invoice_ocr_response.status_code}: {invoice_ocr_response.text[:200]}")

# Test 2: Forecasting Generate (was 520)
print("\n[2/9] Testing Forecasting Generate...")
# First, get an item_id from inventory
items_response = requests.get(
    f"{BASE_URL}/inventory/items?venue_id={venue_id}",
    headers=headers
)

item_id = None
if items_response.status_code == 200:
    items = items_response.json()
    if isinstance(items, list) and len(items) > 0:
        item_id = items[0].get("id") or items[0].get("sku_id")
    elif isinstance(items, dict) and items.get("items"):
        item_id = items["items"][0].get("id") or items["items"][0].get("sku_id")

if item_id:
    forecast_data = {
        "item_id": item_id,
        "method": "moving_average",
        "days": 7,
        "use_ai": False
    }
    
    forecast_response = requests.post(
        f"{BASE_URL}/venues/{venue_id}/forecasting/generate",
        headers=headers,
        json=forecast_data
    )
    
    if forecast_response.status_code in [200, 201]:
        log_test("POST /api/venues/{venue_id}/forecasting/generate", True)
        print(f"   Forecast generated for item: {item_id}")
    else:
        log_test("POST /api/venues/{venue_id}/forecasting/generate", False,
                 f"Status {forecast_response.status_code}: {forecast_response.text[:200]}")
else:
    log_test("POST /api/venues/{venue_id}/forecasting/generate", False, "No inventory items found")

# Test 3: Production Batches (was 520)
print("\n[3/9] Testing Production Batches...")
batch_data = {
    "batch_date": datetime.now().isoformat(),
    "items": [
        {
            "sku_id": item_id if item_id else "test-sku-001",
            "quantity": 10.0,
            "unit": "kg"
        }
    ]
}

batch_response = requests.post(
    f"{BASE_URL}/venues/{venue_id}/production/batches",
    headers=headers,
    json=batch_data
)

if batch_response.status_code in [200, 201]:
    log_test("POST /api/venues/{venue_id}/production/batches", True)
    print(f"   Batch created")
else:
    log_test("POST /api/venues/{venue_id}/production/batches", False,
             f"Status {batch_response.status_code}: {batch_response.text[:200]}")

# Test 4: Engineered Recipes (was 520)
print("\n[4/9] Testing Engineered Recipes...")
recipe_data = {
    "name": "Test Recipe",
    "category": "main",
    "components": [
        {
            "sku_id": item_id if item_id else "test-sku-001",
            "quantity": 0.5,
            "unit": "kg"
        }
    ],
    "yield_quantity": 4.0,
    "yield_unit": "portions"
}

recipe_response = requests.post(
    f"{BASE_URL}/venues/{venue_id}/recipes/engineered",
    headers=headers,
    json=recipe_data
)

if recipe_response.status_code in [200, 201]:
    log_test("POST /api/venues/{venue_id}/recipes/engineered", True)
    print(f"   Recipe created")
else:
    log_test("POST /api/venues/{venue_id}/recipes/engineered", False,
             f"Status {recipe_response.status_code}: {recipe_response.text[:200]}")

# Test 5: Quality Audits (was 520)
print("\n[5/9] Testing Quality Audits...")
audit_data = {
    "audit_type": "temperature",
    "location": "walk_in_cooler",
    "temperature": 4.5,
    "passed": True,
    "notes": "Temperature within acceptable range"
}

audit_response = requests.post(
    f"{BASE_URL}/venues/{venue_id}/quality/audits",
    headers=headers,
    json=audit_data
)

if audit_response.status_code in [200, 201]:
    log_test("POST /api/venues/{venue_id}/quality/audits", True)
    print(f"   Audit created")
else:
    log_test("POST /api/venues/{venue_id}/quality/audits", False,
             f"Status {audit_response.status_code}: {audit_response.text[:200]}")

# Test 6: Compliance Documents (was 520)
print("\n[6/9] Testing Compliance Documents...")
compliance_data = {
    "doc_type": "food_safety_certificate",
    "title": "Food Safety Certificate 2026",
    "issue_date": datetime.now().isoformat(),
    "expiry_date": (datetime.now() + timedelta(days=365)).isoformat(),
    "issuer": "Malta Food Safety Authority"
}

compliance_response = requests.post(
    f"{BASE_URL}/venues/{venue_id}/compliance/documents",
    headers=headers,
    json=compliance_data
)

if compliance_response.status_code in [200, 201]:
    log_test("POST /api/venues/{venue_id}/compliance/documents", True)
    print(f"   Compliance document created")
else:
    log_test("POST /api/venues/{venue_id}/compliance/documents", False,
             f"Status {compliance_response.status_code}: {compliance_response.text[:200]}")

# Test 7: HR Payroll Runs (was 520)
print("\n[7/9] Testing HR Payroll Runs...")
payroll_data = {
    "period_start": datetime.now().replace(day=1).isoformat(),
    "period_end": datetime.now().isoformat(),
    "pay_date": (datetime.now() + timedelta(days=7)).isoformat()
}

payroll_response = requests.post(
    f"{BASE_URL}/venues/{venue_id}/hr/payroll/runs",
    headers=headers,
    json=payroll_data
)

if payroll_response.status_code in [200, 201]:
    log_test("POST /api/venues/{venue_id}/hr/payroll/runs", True)
    print(f"   Payroll run created")
else:
    log_test("POST /api/venues/{venue_id}/hr/payroll/runs", False,
             f"Status {payroll_response.status_code}: {payroll_response.text[:200]}")

# Test 8: HR Goals (was 520)
print("\n[8/9] Testing HR Goals...")
# First get an employee
employees_response = requests.get(
    f"{BASE_URL}/hr/employees?venue_id={venue_id}",
    headers=headers
)

employee_id = None
if employees_response.status_code == 200:
    employees = employees_response.json()
    if employees and len(employees) > 0:
        employee_id = employees[0].get("id")

if employee_id:
    goal_data = {
        "employee_id": employee_id,
        "title": "Improve Customer Service",
        "description": "Achieve 95% customer satisfaction rating",
        "target_date": (datetime.now() + timedelta(days=90)).isoformat(),
        "category": "performance"
    }
    
    goal_response = requests.post(
        f"{BASE_URL}/venues/{venue_id}/hr/goals",
        headers=headers,
        json=goal_data
    )
    
    if goal_response.status_code in [200, 201]:
        log_test("POST /api/venues/{venue_id}/hr/goals", True)
        print(f"   Goal created for employee: {employee_id}")
    else:
        log_test("POST /api/venues/{venue_id}/hr/goals", False,
                 f"Status {goal_response.status_code}: {goal_response.text[:200]}")
else:
    log_test("POST /api/venues/{venue_id}/hr/goals", False, "No employees found")

# Test 9: HR Documents (was 520 - datetime issue)
print("\n[9/9] Testing HR Documents...")
if employee_id:
    doc_data = {
        "employee_id": employee_id,
        "doc_type": "contract",
        "title": "Employment Contract 2026",
        "issue_date": datetime.now().isoformat(),
        "expiry_date": (datetime.now() + timedelta(days=365)).isoformat()
    }
    
    doc_response = requests.post(
        f"{BASE_URL}/venues/{venue_id}/hr/documents",
        headers=headers,
        json=doc_data
    )
    
    if doc_response.status_code in [200, 201]:
        log_test("POST /api/venues/{venue_id}/hr/documents", True)
        print(f"   HR document created")
    else:
        log_test("POST /api/venues/{venue_id}/hr/documents", False,
                 f"Status {doc_response.status_code}: {doc_response.text[:200]}")
else:
    log_test("POST /api/venues/{venue_id}/hr/documents", False, "No employees found")

# Step 3: Re-test Working Endpoints (Regression Check)
print("\n" + "="*80)
print("STEP 3: Regression Testing - Previously Working Endpoints")
print("="*80)

# Procurement Advanced
print("\n[Procurement Advanced]")
rfq_data = {
    "title": "Office Supplies RFQ",
    "items": [{"sku_id": "test-sku", "quantity": 10}],
    "deadline": (datetime.now() + timedelta(days=7)).isoformat()
}
rfq_response = requests.post(f"{BASE_URL}/procurement/rfqs?venue_id={venue_id}", headers=headers, json=rfq_data)
log_test("POST /api/procurement/rfqs", rfq_response.status_code in [200, 201], 
         f"Status {rfq_response.status_code}" if rfq_response.status_code not in [200, 201] else "")

rfqs_response = requests.get(f"{BASE_URL}/procurement/rfqs?venue_id={venue_id}", headers=headers)
log_test("GET /api/procurement/rfqs", rfqs_response.status_code == 200,
         f"Status {rfqs_response.status_code}" if rfqs_response.status_code != 200 else "")

# HR Leave Advanced
print("\n[HR Leave Advanced]")
accrual_data = {
    "leave_type": "annual",
    "accrual_rate": 2.0,
    "max_balance": 30.0
}
accrual_response = requests.post(f"{BASE_URL}/hr/leave/accrual-rules?venue_id={venue_id}", headers=headers, json=accrual_data)
log_test("POST /api/hr/leave/accrual-rules", accrual_response.status_code in [200, 201],
         f"Status {accrual_response.status_code}" if accrual_response.status_code not in [200, 201] else "")

# HR Expense
print("\n[HR Expense]")
categories_response = requests.get(f"{BASE_URL}/hr/expense/categories?venue_id={venue_id}", headers=headers)
log_test("GET /api/hr/expense/categories", categories_response.status_code == 200,
         f"Status {categories_response.status_code}" if categories_response.status_code != 200 else "")

# HR Performance
print("\n[HR Performance]")
reviews_response = requests.get(f"{BASE_URL}/hr/performance/reviews?venue_id={venue_id}", headers=headers)
log_test("GET /api/hr/performance/reviews", reviews_response.status_code == 200,
         f"Status {reviews_response.status_code}" if reviews_response.status_code != 200 else "")

# SFM Accounting
print("\n[SFM Accounting]")
accounts_response = requests.get(f"{BASE_URL}/hr/sfm/accounts?venue_id={venue_id}", headers=headers)
log_test("GET /api/hr/sfm/accounts", accounts_response.status_code == 200,
         f"Status {accounts_response.status_code}" if accounts_response.status_code != 200 else "")

# HR Analytics
print("\n[HR Analytics]")
headcount_response = requests.get(f"{BASE_URL}/hr/analytics/headcount?venue_id={venue_id}", headers=headers)
log_test("GET /api/hr/analytics/headcount", headcount_response.status_code == 200,
         f"Status {headcount_response.status_code}" if headcount_response.status_code != 200 else "")

# Global Search
print("\n[Global Search]")
search_response = requests.get(f"{BASE_URL}/search?q=test&context=ADMIN", headers=headers)
log_test("GET /api/search", search_response.status_code == 200,
         f"Status {search_response.status_code}" if search_response.status_code != 200 else "")

# Print final summary
print_summary()

# Exit with appropriate code
exit(0 if len(results['failed']) == 0 else 1)
