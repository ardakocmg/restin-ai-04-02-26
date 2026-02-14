"""
Meross Device Discovery - Windows DNS Fix
Monkey-patches aiohttp to use ThreadedResolver (OS-level DNS)
BEFORE meross-iot creates its own session.
"""
import asyncio
import os
import sys

# ============================================================
# CRITICAL: Monkey-patch aiohttp BEFORE importing meross_iot
# Force aiohttp to always use ThreadedResolver (OS DNS)
# instead of AsyncResolver (pycares) which fails on Windows.
# ============================================================
import aiohttp
import aiohttp.resolver

# Save original
_OrigAsyncResolver = aiohttp.resolver.AsyncResolver

# Replace AsyncResolver with ThreadedResolver globally
aiohttp.resolver.AsyncResolver = aiohttp.resolver.ThreadedResolver
aiohttp.DefaultResolver = aiohttp.resolver.ThreadedResolver

from dotenv import load_dotenv

# Load env
env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(env_path)

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from meross_iot.http_api import MerossHttpClient
from meross_iot.manager import MerossManager


async def main():
    print("=" * 55)
    print("  MEROSS DEVICE DISCOVERY (Windows DNS Patched)")
    print("=" * 55)
    print()

    email = os.environ.get("MEROSS_EMAIL", "arda@marvingauci.com")
    password = os.environ.get("MEROSS_PASSWORD")
    if not password:
        print("❌ MEROSS_PASSWORD env var not set. Aborting.")
        return
    api_base_url = "https://iotx-eu.meross.com"

    manager = None
    http_client = None

    try:
        print(f"Authenticating as {email}...")
        http_client = await MerossHttpClient.async_from_user_password(
            email=email,
            password=password,
            api_base_url=api_base_url,
        )
        print("Login OK!\n")

        manager = MerossManager(http_client=http_client)
        await manager.async_init()

        print("Discovering devices...")
        await manager.async_device_discovery()

        all_devices = manager.find_devices()
        print(f"\nFound {len(all_devices)} device(s):\n")

        if not all_devices:
            print("  (No devices found on this account)")
        else:
            for i, dev in enumerate(all_devices, 1):
                online = "ONLINE" if dev.online_status else "OFFLINE"
                name = dev.name.encode("ascii", "replace").decode()
                dev_type = dev.type
                uuid_str = dev.uuid
                fw = getattr(dev, "firmware_version", "N/A")
                hw = getattr(dev, "hardware_version", "N/A")

                print(f"  [{i}] {name}")
                print(f"      Type:   {dev_type}")
                print(f"      UUID:   {uuid_str}")
                print(f"      Status: {online}")
                print(f"      FW: {fw}  |  HW: {hw}")
                print()

    except Exception as e:
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        if manager:
            manager.close()
        if http_client:
            await http_client.async_logout()

    print("Done.")


if __name__ == "__main__":
    asyncio.run(main())
