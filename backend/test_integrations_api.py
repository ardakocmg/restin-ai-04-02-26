import requests
import json

# Login
r = requests.post("http://localhost:8000/api/auth/pin", json={"pin": "0000"})
data = r.json()
token = data.get("access_token", "")
print(f"Login status: {r.status_code}")
print(f"Token prefix: {token[:30]}...")

# Get integrations
headers = {"Authorization": f"Bearer {token}"}
r2 = requests.get("http://localhost:8000/api/venues/venue-caviar-bull/integrations", headers=headers)
print(f"\nIntegrations status: {r2.status_code}")
integrations = r2.json()
print(f"Total integrations returned: {len(integrations)}")
print(f"\nAll integration keys:")
for item in integrations:
    print(f"  - key={item.get('key')}, enabled={item.get('enabled')}, status={item.get('status')}")

# Check specifically for TUYA and MEROSS
tuya = [i for i in integrations if 'tuya' in str(i.get('key','')).lower()]
meross = [i for i in integrations if 'meross' in str(i.get('key','')).lower()]
print(f"\nTuya found: {len(tuya)} records")
for t in tuya:
    print(f"  Full: {json.dumps(t, indent=2, default=str)}")
print(f"\nMeross found: {len(meross)} records") 
for m in meross:
    print(f"  Full: {json.dumps(m, indent=2, default=str)}")
