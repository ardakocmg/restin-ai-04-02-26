import requests
import json

base_url = "http://localhost:8000/api"

def test_login():
    print("Testing PIN Login (1111)...")
    url = f"{base_url}/auth/login/pin?pin=1111&app=admin&deviceId=test_device"
    try:
        response = requests.post(url)
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_login()
