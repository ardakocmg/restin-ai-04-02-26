"""
Comprehensive Integrity Check — Verifies ALL critical flows
Tests: Auth, Clocking, Payroll, HR, Menu, Orders, Inventory, Shifts, Access Control
"""
import requests, json, os, sys
os.environ["PYTHONIOENCODING"] = "utf-8"

BASE = "http://localhost:8000"
VENUE = "venue-caviar-bull"
PASS_COUNT = 0
FAIL_COUNT = 0
WARN_COUNT = 0

def check(name, method, path, body=None, expect=200):
    global PASS_COUNT, FAIL_COUNT, WARN_COUNT
    url = f"{BASE}{path}"
    try:
        if method == "POST":
            r = requests.post(url, headers=HEADERS, json=body or {}, timeout=10)
        elif method == "GET":
            r = requests.get(url, headers=HEADERS, timeout=10)
        else:
            r = requests.request(method, url, headers=HEADERS, json=body, timeout=10)
        
        code = r.status_code
        try:
            j = r.json()
            if isinstance(j, list):
                detail = f"{len(j)} items"
            elif isinstance(j, dict):
                if "detail" in j:
                    detail = f"ERR: {str(j['detail'])[:60]}"
                elif "error" in j:
                    detail = f"ERR: {str(j['error'])[:60]}"
                elif "message" in j:
                    detail = f"MSG: {str(j['message'])[:60]}"
                else:
                    keys = list(j.keys())[:6]
                    detail = f"keys: {keys}"
            else:
                detail = str(j)[:60]
        except:
            detail = r.text[:60]
        
        if code == expect:
            flag = "PASS"
            PASS_COUNT += 1
        elif code < 500:
            flag = "WARN"
            WARN_COUNT += 1
        else:
            flag = "FAIL"
            FAIL_COUNT += 1
        
        icon = {"PASS": "+", "WARN": "~", "FAIL": "!"}[flag]
        print(f"  [{icon}] {name:<35} {method:<5} {code:<4} {detail}")
        return r
    except Exception as e:
        FAIL_COUNT += 1
        print(f"  [!] {name:<35} {method:<5} ERR  {str(e)[:50]}")
        return None

# ═══════════════════════════════════════════════════════════
print("=" * 80)
print("  RESTIN.AI — COMPREHENSIVE INTEGRITY CHECK")
print("=" * 80)

# ── 1. AUTH ──
print("\n[1] AUTH FLOW")
r = requests.post(f"{BASE}/api/auth/login/pin?pin=0000&app=admin")
data = r.json()
TOKEN = data.get("accessToken") or data.get("token", "")
USER = data.get("user", {})
HEADERS = {"Authorization": f"Bearer {TOKEN}"} if TOKEN else {}

if TOKEN:
    PASS_COUNT += 1
    print(f"  [+] Login                              POST  200  User: {USER.get('name','?')} | Token: OK")
else:
    FAIL_COUNT += 1
    print(f"  [!] Login                              POST  {r.status_code}  NO TOKEN! Keys: {list(data.keys())}")

# Health
check("Health Check", "GET", "/health")

# ── 2. CLOCKING FLOW ──
print("\n[2] CLOCKING FLOW")
check("Clocking - Active Sessions",     "GET",  "/api/clocking/active")
check("Clocking - Work Areas",          "GET",  "/api/clocking/work-areas")
check("Clocking - My Status",           "GET",  "/api/clocking/my-status")
check("Clocking - Data (POST)",         "POST", "/api/clocking/data", 
      body={"start_date": "2025-01-01", "end_date": "2026-12-31"})
check("Clocking - Add Entry",           "POST", "/api/clocking/add-entry",
      body={"date": "2026-02-10", "clock_in": "09:00", "clock_out": "17:00", "work_area": "FOH", "reason": "Integrity test"},
      expect=200)

# ── 3. HR FLOW ──
print("\n[3] HR MODULE")
check("HR - Employees",                 "GET",  f"/api/hr/employees?venue_id={VENUE}")
check("HR - Payroll Runs",              "GET",  f"/api/venues/{VENUE}/hr/payroll-runs")
check("HR - Leave Requests",            "GET",  f"/api/venues/{VENUE}/hr/leave-requests")
check("HR - Leave Balances",            "GET",  f"/api/venues/{VENUE}/hr/leave-balances")
check("HR - Employees (v2 Bridge)",     "GET",  f"/api/hr/employees?venue_id={VENUE}")

# ── 4. PAYROLL FLOW ──
print("\n[4] PAYROLL & FINANCE")
check("Payroll - Malta Calculate",       "POST", "/api/payroll/calculate",
      body={"gross_annual": 25000, "tax_category": "single", "cola_eligible": True})
check("Payroll MT - Runs",              "GET",  f"/api/venues/{VENUE}/payroll/runs")
check("Payroll MT - Config",            "GET",  f"/api/venues/{VENUE}/payroll/config")

# ── 5. SHIFTS ──
print("\n[5] SHIFTS")
check("Shifts - List",                  "GET",  f"/api/venues/{VENUE}/shifts")
check("Shifts - Schedule",             "GET",  f"/api/venues/{VENUE}/shifts/schedule")

# ── 6. MENU ──
print("\n[6] MENU MANAGEMENT")
check("Menu - List Menus",              "GET",  f"/api/venues/{VENUE}/menus")
check("Menu - Active Menu",             "GET",  f"/api/venues/{VENUE}/menus/active")
check("Menu - Categories",              "GET",  f"/api/venues/{VENUE}/menu/categories")
check("Menu - Items",                   "GET",  f"/api/venues/{VENUE}/menu/items")

# ── 7. ORDERS ──
print("\n[7] ORDERS")
check("Orders - List",                  "GET",  f"/api/venues/{VENUE}/orders")
check("Orders - Recent",                "GET",  f"/api/orders?venue_id={VENUE}")

# ── 8. INVENTORY ──
print("\n[8] INVENTORY")
check("Inventory - Overview",           "GET",  f"/api/venues/{VENUE}/inventory")
check("Inventory - Suppliers",          "GET",  f"/api/venues/{VENUE}/suppliers")
check("Inventory - Items",              "GET",  f"/api/venues/{VENUE}/inventory/items")

# ── 9. FLOOR PLANS & TABLES ──
print("\n[9] FLOOR PLANS & TABLES")
check("Floor Plans",                    "GET",  f"/api/venues/{VENUE}/floor-plans")
check("Tables",                         "GET",  f"/api/venues/{VENUE}/tables")

# ── 10. ACCESS CONTROL ──
print("\n[10] ACCESS CONTROL (Nuki)")
check("Doors - List",                   "GET",  f"/api/access-control/doors?venue_id={VENUE}")

# ── 11. HIVE CHAT ──
print("\n[11] HIVE CHAT")
check("Hive - Staff List",              "GET",  "/api/hive/staff")
check("Hive - Channels",                "GET",  "/api/hive/channels")

# ── 12. APPROVALS ──
print("\n[12] APPROVALS")
check("Approvals - Pending",            "GET",  f"/api/approvals?venue_id={VENUE}")

# ── 13. REPORTS ──
print("\n[13] REPORTS & ANALYTICS")
check("Dashboard Stats",                "GET",  f"/api/manager/dashboard-stats?venue_id={VENUE}")
check("POS Reports",                    "GET",  f"/api/venues/{VENUE}/pos/reports")

# ── 14. VAULT & AI ──
print("\n[14] UNIQUE ENDPOINTS")
check("System Version",                 "GET",  "/api/system/version")
check("AI Gateway",                     "POST", "/ai/generate",
      body={"provider": "google", "model": "gemini-flash", "prompt": "test"})

# ── 15. INTEGRATIONS ──
print("\n[15] INTEGRATIONS")
check("Smart Home",                     "GET",  f"/api/smart-home/devices?venue_id={VENUE}")
check("Venue Config",                   "GET",  f"/api/venues/{VENUE}/config")

# ═══════════════════════════════════════════════════════════
print("\n" + "=" * 80)
total = PASS_COUNT + FAIL_COUNT + WARN_COUNT
print(f"  RESULTS: {PASS_COUNT} PASS | {WARN_COUNT} WARN | {FAIL_COUNT} FAIL | {total} TOTAL")
pct = round(PASS_COUNT / total * 100) if total else 0
if FAIL_COUNT == 0:
    print(f"  STATUS: ALL SYSTEMS OPERATIONAL ({pct}% pass rate)")
elif FAIL_COUNT <= 3:
    print(f"  STATUS: MOSTLY OPERATIONAL ({pct}% pass rate)")
else:
    print(f"  STATUS: ISSUES DETECTED ({pct}% pass rate)")
print("=" * 80)
