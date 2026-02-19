"""
Backfill pin_index for all existing users.
Run once: python -m scripts.backfill_pin_index
"""
import asyncio
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from core.database import get_database
from core.security import compute_pin_index, hash_pin, verify_pin


async def backfill():
    db = get_database()
    users = await db.users.find(
        {"pin_hash": {"$exists": True, "$ne": ""}},
    ).to_list(length=1000)

    updated = 0
    skipped = 0

    for u in users:
        if u.get("pin_index"):
            skipped += 1
            continue

        # We can't reverse bcrypt, so we try common PINs
        common_pins = ["0000", "1234", "1111", "2222", "3333", "4444",
                        "5555", "6666", "7777", "8888", "9999",
                        "0001", "0002", "0003", "0004", "0005",
                        "1000", "2000", "3000", "4000", "5000"]
        
        matched_pin = None
        stored = u.get("pin_hash", "")
        
        for pin in common_pins:
            if verify_pin(pin, stored):
                matched_pin = pin
                break

        if matched_pin:
            idx = compute_pin_index(matched_pin)
            update_fields = {"pin_index": idx}
            unset_fields = {}

            # Auto-upgrade legacy SHA256 to bcrypt
            if len(stored) == 64 and all(c in '0123456789abcdef' for c in stored):
                update_fields["pin_hash"] = hash_pin(matched_pin)
                unset_fields["pin"] = ""

            update_op = {"$set": update_fields}
            if unset_fields:
                update_op["$unset"] = unset_fields

            await db.users.update_one({"_id": u["_id"]}, update_op)
            updated += 1
            print(f"  ✅ {u.get('name', '?')} (PIN={matched_pin}) → pin_index set")
        else:
            print(f"  ⚠️  {u.get('name', '?')} — PIN not in common set, will backfill on next login")

    print(f"\nDone: {updated} updated, {skipped} already had pin_index")


if __name__ == "__main__":
    print("🔧 Backfilling pin_index for all users...")
    asyncio.run(backfill())
