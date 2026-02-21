import re

files_to_fix = [
    r"frontend/src/pages/pos/AllergenManager.tsx",
    r"frontend/src/pages/pos/ComboMeals.tsx",
    r"frontend/src/pages/pos/InventoryAlerts.tsx",
    r"frontend/src/pages/pos/ItemLibrary.tsx",
    r"frontend/src/pages/pos/POSUsersGroups.tsx",
    r"frontend/src/pages/pos/ProductionCenters.tsx",
]

for filepath in files_to_fix:
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
        
        # We need to replace `(e.target.value as unknown)` -> `e.target.value` or `(e.target.value as unknown as string)`
        # Let's replace `as unknown)` with `)` when assigned to something that strictly takes a string, or simply replace `unknown` with `any`? No, strictly TS.
        # The error is `e.target.value as unknown;` inside an onChange handler.
        # Let's just find `as unknown)` and replace it with `as string)`
        new_content, count = re.subn(r"as unknown\)", r"as string)", content)
        if count > 0:
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(new_content)
            print(f"Fixed {filepath}: {count} changes")
        else:
            print(f"NO MATCH: {filepath}")
    except Exception as e:
        print(f"Error {filepath}: {e}")
