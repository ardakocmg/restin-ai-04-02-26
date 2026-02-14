"""Quick test: trigger sync, wait, check devices."""
import requests
import time

s = requests.Session()

# Login
r = s.post("http://127.0.0.1:8000/api/auth/login/pin?pin=0000&app=admin")
token = r.json().get("accessToken") or r.json().get("token")
headers = {"Authorization": f"Bearer {token}"}
print(f"Logged in, token: {token[:30]}...")

# Trigger sync
print("\n=== Triggering sync ===")
r2 = s.post("http://127.0.0.1:8000/api/smart-home/sync", headers=headers)
print(r2.json())

# Wait for sync to complete
print("\nWaiting 20s for sync to complete...")
time.sleep(20)

# Check sync status
print("=== Sync Status ===")
r_status = s.get("http://127.0.0.1:8000/api/smart-home/sync/status", headers=headers)
print(r_status.json())

# Check devices
print("\n=== Devices ===")
r3 = s.get("http://127.0.0.1:8000/api/smart-home/devices", headers=headers)
data = r3.json()
print(f"Total: {data['total']}, Online: {data['online']}, Offline: {data['offline']}")
print(f"Syncing: {data.get('syncing')}, Error: {data.get('last_sync_error')}")
for dev in data["devices"]:
    print(f"  - {dev['name']} ({dev['provider']}) online={dev['online']} is_on={dev['is_on']}")
