
import asyncio
import os
import sys
import json
from dotenv import load_dotenv

# Load env
load_dotenv()

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

# Bypass Prisma for now
from app.domains.integrations.connectors.tuya import TuyaConnector

async def main():
    print("Starting Tuya Debug (No DB)...")
    
    creds = {
        "access_id": "nxf5urua4fa5gxfknyfh",
        "access_secret": "1b0fd259fa764b37acbe4df516f63789",
        "endpoint": "https://openapi.tuyaeu.com"
    }
    
    connector = TuyaConnector("test", creds, {})
    openapi = connector._get_api()
    
    # 1. IoT Core Devices
    print("\n1. Testing /v1.0/iot-03/devices")
    try:
        res = openapi.get("/v1.0/iot-03/devices")
        print(f"Result: {json.dumps(res, indent=2)}")
    except Exception as e:
        print(f"Error: {e}")

    # 2. Legacy Devices
    print("\n2. Testing /v1.0/devices")
    try:
        res = openapi.get("/v1.0/devices")
        print(f"Result: {json.dumps(res, indent=2)}")
    except Exception as e:
        print(f"Error: {e}")

    # 3. User List (to check linkage)
    print("\n3. Testing /v1.0/users (Needs permission)")
    try:
        res = openapi.get("/v1.0/users")
        print(f"Result: {json.dumps(res, indent=2)}")
    except Exception as e:
        print(f"Error: {e}")

    # 4. Home Management (Smart Home specific)
    print("\n4. Testing /v1.0/homes")
    try:
        res = openapi.get("/v1.0/homes")
        print(f"Result: {json.dumps(res, indent=2)}")
    except Exception as e:
        print(f"Error: {e}")

    print("\nDebug Complete")

if __name__ == "__main__":
    asyncio.run(main())
