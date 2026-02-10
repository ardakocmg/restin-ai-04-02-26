
import asyncio
import os
import sys
import json
from dotenv import load_dotenv

# Load env
env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(env_path)

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

# Bypass Prisma
from app.domains.integrations.connectors.meross import MerossConnector

async def main():
    print("Starting Meross Direct Test (No DB)...")
    
    # Hardcoded Credentials from User
    creds = {
        "email": "arda@marvingauci.com",
        "password": "Mg2026"
    }
    
    # Dummy Org
    org_id = "test_org"
    
    print(f"Testing with Email: {creds['email']}")
    
    # Instantiate Connector
    connector = MerossConnector(org_id, creds, {})
    # Monkey patch or just rely on the connector using it internally? 
    # Wait, the connector uses self.credentials to call async_from_user_password internally.
    # I modified the connector class to use the hardcoded string "https://iot.meross.com".
    # So I don't need to change the test script UNLESS I am calling async_from_user_password directly in the test script?
    # No, the test script calls connector.validate_credentials() and connector.discover().
    # These methods inside MerossConnector class have been updated to use api_base_url.
    # So I DON'T need to update test_meross_direct.py, because it uses the connector class which I just updated.
    # But wait, did I update the test script to pass api_base_url in creds? No, the connector code I wrote HARDCODES it.
    # valid_credentials method:
    # http_api_client = await MerossHttpClient.async_from_user_password(..., api_base_url="https://iot.meross.com")
    # So the test script just needs to run.
    # I will just run the test script.

    
    # Validate
    print("Validating Credentials...")
    try:
        is_valid = await connector.validate_credentials()
        if is_valid:
            print("Credentials Valid!")
        else:
            print("Credentials Invalid!")
            return
    except Exception as e:
        print(f"Validation Error: {e}")
        return

    # Discover
    print("\nDiscovering Devices...")
    try:
        result = await connector.discover()
        
        if "error" in result:
            print(f"Error: {result['error']}")
        else:
            devices = result.get("devices", [])
            print(f"Found {len(devices)} devices:")
            for i, dev in enumerate(devices):
                status_text = "ONLINE" if dev.get('online') else "OFFLINE"
                # Encode to avoid emoji issues in console
                name = dev.get('name', 'Unknown')
                print(f"  [{i+1}] {name} (UUID: {dev.get('uuid')}) - {status_text}")
                
    except Exception as e:
        print(f"Discovery Error: {e}")
            
    print("\nTest Complete")

if __name__ == "__main__":
    asyncio.run(main())
