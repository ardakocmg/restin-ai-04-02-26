"""Quick endpoint test with CORRECT paths."""
import requests

BASE = "http://localhost:8000"
r = requests.post(f"{BASE}/api/auth/login/pin?pin=0000&app=admin")
data = r.json()
t = data.get("accessToken")
h = {"Authorization": "Bearer " + t}
print("=== LOGIN ===")
print("User:", data["user"]["name"])
print()

tests = [
    ("GET", "/api/system/version", "System Version"),
    ("GET", "/api/health", "Health Check"),
    ("GET", "/api/manager/dashboard-stats?venue_id=venue-caviar-bull", "Dashboard Stats"),
    ("GET", "/api/hive/staff/online", "Hive Staff"),
    ("GET", "/api/hive/messages?channel=general", "Hive Messages"),
    ("GET", "/api/hive/tasks?venue_id=venue-caviar-bull", "Hive Tasks"),
    ("GET", "/api/venues/venue-caviar-bull/summary/dashboard", "HR Summary"),
    ("GET", "/api/employee-portal/data?venue_id=venue-caviar-bull", "Employee Portal"),
    ("GET", "/api/hr/employees?venue_id=venue-caviar-bull", "HR Employees"),
    ("POST", "/api/clocking/data", "Clocking Data"),
    ("GET", "/api/scheduler/data?venue_id=venue-caviar-bull", "Scheduler"),
    ("GET", "/api/payroll-mt/payruns?venue_id=venue-caviar-bull", "Payroll Runs"),
    ("GET", "/api/venues/venue-caviar-bull/menus", "Menus"),
    ("GET", "/api/inventory/items?venue_id=venue-caviar-bull", "Inventory Items"),
    ("GET", "/api/inventory/suppliers?venue_id=venue-caviar-bull", "Suppliers"),
    ("GET", "/api/venues/venue-caviar-bull/floor-plans", "Floor Plans"),
    ("GET", "/api/venues/venue-caviar-bull/tables", "Tables"),
    ("GET", "/api/crm/guests?venue_id=venue-caviar-bull", "CRM Guests"),
    ("GET", "/api/crm/summary?venue_id=venue-caviar-bull", "CRM Summary"),
    ("GET", "/api/reservations/analytics/summary?venue_id=venue-caviar-bull", "Reservations"),
    ("GET", "/api/venues/venue-caviar-bull/audit-logs", "Audit Logs"),
    ("GET", "/api/smart-home/devices?venue_id=venue-caviar-bull", "Smart Home"),
    ("POST", "/api/pos/sessions/open", "POS Session"),
]

pc, fc, wc = 0, 0, 0
print(f"{'STS':>4} {'Endpoint':<62} {'Name':<20} {'Info'}")
print("-" * 120)
for method, path, name in tests:
    try:
        kw = {"headers": h, "timeout": 8}
        if method == "POST":
            kw["json"] = {"venue_id": "venue-caviar-bull", "date_from": "01/02/2026", "date_to": "15/02/2026"}
        r2 = requests.request(method, f"{BASE}{path}", **kw)
        code = r2.status_code
        info = ""
        if code == 200:
            try:
                j = r2.json()
                for k in ["staff","messages","tasks","employees","records","payruns","menus","items","suppliers","floor_plans","tables","guests","audit_logs","devices","data","weeks"]:
                    if k in j and isinstance(j[k], list):
                        info = str(len(j[k])) + " items"
                        break
                if not info:
                    info = str(j)[:60]
            except Exception:
                info = r2.text[:60]
            pc += 1
            tag = "PASS"
        elif code == 422:
            wc += 1; tag = " OK*"; info = "Route exists (422)"
        elif code == 404:
            fc += 1; tag = "FAIL"; info = "404"
        elif code == 500:
            fc += 1; tag = "ERR!"; info = str(r2.text)[:60]
        else:
            wc += 1; tag = "WARN"; info = str(code)
        print(f"{tag:>4} {path:<62} {name:<20} {info}")
    except Exception as e:
        fc += 1
        print(f"ERR  {path:<62} {name:<20} {str(e)[:40]}")
print()
print(f"=== RESULTS: {pc} PASS, {fc} FAIL, {wc} WARN ===")
