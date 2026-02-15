"""Check data availability — corrected paths"""
import requests, os
os.environ["PYTHONIOENCODING"] = "utf-8"

BASE = "http://localhost:8000"
VENUE = "venue-caviar-bull"

# Login
r = requests.post(f"{BASE}/api/auth/login/pin?pin=0000&app=admin")
data = r.json()
token = data.get("accessToken") or data.get("token", "")
headers = {"Authorization": f"Bearer {token}"} if token else {}
print(f"Logged in as: {data.get('user',{}).get('name','?')}")
print(f"Token: {'YES' if token else 'NO'}")
print()

endpoints = [
    # Clocking (POST-only for data, GET for active/areas)
    ("Clocking Active",       "GET",  f"/api/clocking/active"),
    ("Clocking Work Areas",   "GET",  f"/api/clocking/work-areas"),
    ("Clocking Data",         "POST", f"/api/clocking/data"),
    # HR
    ("HR Employees",          "GET",  f"/api/hr/employees?venue_id={VENUE}"),
    ("HR Payroll Runs",       "GET",  f"/api/venues/{VENUE}/hr/payroll-runs"),
    ("HR Leave Requests",     "GET",  f"/api/venues/{VENUE}/hr/leave-requests"),
    ("HR Leave Balances",     "GET",  f"/api/venues/{VENUE}/hr/leave-balances"),
    # Shifts
    ("Shifts",                "GET",  f"/api/venues/{VENUE}/shifts"),
    # Menu
    ("Menus",                 "GET",  f"/api/venues/{VENUE}/menus"),
    ("Menu Categories",       "GET",  f"/api/venues/{VENUE}/menu/categories"),
    ("Menu Items",            "GET",  f"/api/venues/{VENUE}/menu/items"),
    # Floor Plans
    ("Floor Plans",           "GET",  f"/api/venues/{VENUE}/floor-plans"),
    # Orders
    ("Orders",                "GET",  f"/api/venues/{VENUE}/orders"),
    # Inventory
    ("Inventory",             "GET",  f"/api/venues/{VENUE}/inventory"),
    ("Suppliers",             "GET",  f"/api/venues/{VENUE}/suppliers"),
    # Venue Config
    ("Venue Config",          "GET",  f"/api/venues/{VENUE}/config"),
    # Stats
    ("Stats Dashboard",       "GET",  f"/api/venues/{VENUE}/stats/dashboard"),
    # Access Doors
    ("Access Doors",          "GET",  f"/api/access-control/doors?venue_id={VENUE}"),
]

print(f"{'Endpoint':<25} {'M':<5} {'Code':<6} {'Result'}")
print("-" * 90)

for name, method, path in endpoints:
    try:
        if method == "POST":
            r = requests.post(f"{BASE}{path}", headers=headers, json={}, timeout=10)
        else:
            r = requests.get(f"{BASE}{path}", headers=headers, timeout=10)
        status = r.status_code
        try:
            j = r.json()
            if isinstance(j, list):
                count = f"{len(j)} items"
            elif isinstance(j, dict):
                if "detail" in j:
                    count = f"ERR: {j['detail'][:50]}"
                else:
                    keys = list(j.keys())[:5]
                    count = f"keys: {keys}"
            else:
                count = r.text[:60]
        except:
            count = r.text[:60]
        flag = "OK" if status == 200 else "WARN" if status < 500 else "FAIL"
        print(f"{name:<25} {method:<5} {status:<6} [{flag}] {count}")
    except Exception as e:
        print(f"{name:<25} {method:<5} ERR    {str(e)[:50]}")
