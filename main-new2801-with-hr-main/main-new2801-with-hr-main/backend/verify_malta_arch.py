import os
import sys
from fastapi.testclient import TestClient
from app.main import app

# Ensure we can import app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

client = TestClient(app)

def test_health():
    print("Testing /health...")
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "operational"
    print("[OK] /health passed")

def test_payroll_calc():
    print("Testing /api/payroll/calculate (2025 Rules)...")
    # Test Case: €25,000 Gross
    # SSC (Cat D, > €544.29/wk? No. 25000/52 = 480.76. 480.76 * 10% = 48.07)
    # Annual SSC = 48.07 * 52 = 2500 roughly. 
    # Exact logic in service:
    # Weekly Gross = 25000 / 52 = 480.769
    # SSC = 480.769 * 0.10 = 48.076 -> 48.08? Service doesn't round intermediate strictly but let's check output.
    # Taxable = 25000 - SSC_Annual
    # Tax Band (Single):
    # 16001-60000: 25% - 3400
    
    payload = {
        "gross_annual": 25000,
        "tax_category": "Single",
        "cola_eligible": True
    }
    # Fix: Allow for slash normalization if needed, but fastapi defaults to strict slash usually. 
    # Our endpoint is defined as /api/payroll/calculate
    response = client.post("/api/payroll/calculate", json=payload)
    assert response.status_code == 200
    data = response.json()
    
    print(f"  Input: 25k. Result: {data}")
    
    # 2025 Basic Checks
    assert data["gross_annual"] == 25000
    assert data["net_annual"] < 25000
    assert "additions" in data
    assert "cola_annual_total" in data["additions"]
    print("[OK] Payroll Calc passed")

def test_vault_flow():
    print("Testing Vault Flow...")
    secrets = {"salary_gross": 50000, "medical_notes": "Healthy"}
    
    # 1. Secure
    res1 = client.post("/api/secure-vault", json={"emp_id": "TEST001", "secrets": secrets})
    assert res1.status_code == 201
    assert res1.json()["status"] == "secured"
    
    # 2. Reveal
    res2 = client.get("/api/reveal?emp_id=TEST001&type=FULL")
    assert res2.status_code == 200
    revealed = res2.json()
    assert revealed["salary_gross"] == 50000
    assert revealed["medical_notes"] == "Healthy"
    print("[OK] Vault Flow passed")

if __name__ == "__main__":
    try:
        test_health()
        test_payroll_calc()
        test_vault_flow()
        print("\n[SUCCESS] ALL SYSTEM TESTS PASSED")
    except Exception as e:
        print(f"\n[FAILED] TESTS FAILED: {e}")
        sys.exit(1)
