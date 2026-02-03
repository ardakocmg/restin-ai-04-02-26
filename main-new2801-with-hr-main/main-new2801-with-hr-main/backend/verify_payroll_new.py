import requests
import json
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8000/api"
VENUE_ID = "venue-caviar-bull"
PIN = "1234"

def test_payroll_calculation():
    print("Testing DB-backed Payroll Calculation...")
    
    # 1. Login to get token
    login_res = requests.post(f"{BASE_URL}/auth/login/pin?pin={PIN}&app=admin")
    if login_res.status_code != 200:
        print(f"Login failed: {login_res.text}")
        return
    
    token = login_res.json()["accessToken"]
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    # 2. Calculate Payroll for January 2026
    # Seed data has 90 days of history before 2026-01-26
    calc_data = {
        "run_name": "January 2026 Verification Run",
        "period_start": "2026-01-01",
        "period_end": "2026-01-20",
        "employees": ["0307741A"] # Arda Koc
    }
    
    calc_res = requests.post(
        f"{BASE_URL}/venues/{VENUE_ID}/hr/payroll/calculate",
        headers=headers,
        json=calc_data
    )
    
    if calc_res.status_code == 200:
        result = calc_res.json()
        print("Payroll Calculation Successful!")
        print(f"Run Number: {result['run_number']}")
        print(f"Total Gross: {result['total_gross']}")
        print(f"Employee Count: {result['employee_count']}")
        
        if result['payslips']:
            ps = result['payslips'][0]
            print(f"\nPayslip for {ps['employee_name']}:")
            print(f"  Hours worked: {ps['hours_worked']}")
            print(f"  Gross: {ps['gross_pay']}")
            print(f"  Tax: {ps['tax_amount']}")
            print(f"  Net: {ps['net_pay']}")
    else:
        print(f"Calculation failed: {calc_res.status_code}")
        print(calc_res.text)

if __name__ == "__main__":
    test_payroll_calculation()
