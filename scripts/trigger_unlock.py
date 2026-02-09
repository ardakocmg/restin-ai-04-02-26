import httpx
import asyncio
import sys

# Windows coloring
import os
os.system('color')

API_URL = "http://localhost:8000/api"
VENUE_ID = "venue-caviar-bull"
USER_ID = "admin"

async def main():
    print(f"\nConnecting to {API_URL} for Venue: {VENUE_ID}...")
    
    async with httpx.AsyncClient() as client:
        # 0. Force Sync
        print("Syncing devices from Nuki...")
        try:
            resp = await client.post(f"{API_URL}/access-control/doors/sync", params={"venue_id": VENUE_ID})
            print(f"Sync Result: {resp.status_code} {resp.text}")
        except Exception as e:
            print(f"Sync failed: {e}")

        # 1. Get Doors
        try:
            resp = await client.get(f"{API_URL}/access-control/doors", params={"venue_id": VENUE_ID})
            if resp.status_code != 200:
                print(f"Failed to list doors: {resp.status_code} {resp.text}")
                return
            doors = resp.json()
        except Exception as e:
            print(f"Connection error: {e}")
            print("Make sure the backend server is running on localhost:8000!")
            return

        target_door = None
        print(f"Available Doors ({len(doors)}):")
        for d in doors:
            d_name = d.get('display_name', 'Unknown')
            d_id = d.get('id')
            print(f"   - {d_name} [{d_id}]")
            
            # Fuzzy match
            if "sonata" in d_name.lower() or "60521d27" in d_id:
                target_door = d

        if not target_door:
            print("\nCould not find a door matching 'Sonata' or '60521d27'.")
            return

        print(f"\nTarget Found: {target_door['display_name']} ({target_door['id']})")
        print(f"Initiating UNLOCK action as user '{USER_ID}'...")
        
        # 2. Unlock
        try:
            resp = await client.post(
                f"{API_URL}/access-control/doors/{target_door['id']}/unlock",
                params={"venue_id": VENUE_ID, "user_id": USER_ID}
            )
            
            if resp.status_code == 200:
                result = resp.json()
                if result.get("success"):
                    print(f"\nSUCCESS! Door unlocked.")
                    print(f"   Provider: {result.get('provider_path')}")
                    print(f"   Duration: {result.get('duration_ms')}ms")
                else:
                    print(f"\nAction completed but returned failure: {result}")
            else:
                print(f"\nFAILED. HTTP {resp.status_code}")
                print(f"   Error: {resp.text}")
                
        except Exception as e:
            print(f"Error calling unlock: {e}")

if __name__ == "__main__":
    asyncio.run(main())
