"""Quick API test - login then check integrations"""
import requests, json

# Login
r = requests.post("http://localhost:8000/api/auth/login/pin?pin=0000&app=admin", timeout=5)
login_data = r.json()
token = login_data.get("accessToken", "")
print(f"Login OK, token: {token[:30]}...")

# Get integrations
headers = {"Authorization": f"Bearer {token}"}
ri = requests.get("http://localhost:8000/api/venues/venue-caviar-bull/integrations", headers=headers, timeout=5)
print(f"\nIntegrations: {ri.status_code}")
if ri.status_code == 200:
    data = ri.json()
    items = data if isinstance(data, list) else data.get("data", [])
    print(f"Total returned: {len(items)}")
    for item in items:
        print(f"  - key={item.get('key')}, enabled={item.get('enabled')}, status={item.get('status')}")
else:
    print(f"Error: {ri.text[:300]}")
