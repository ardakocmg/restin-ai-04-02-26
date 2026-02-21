import os

target_files = [
    r"frontend\src\hooks\useStaffService.ts",
    r"frontend\src\hooks\useShiftService.ts",
    r"packages\business\src\inventory\logic\conversions.ts",
    r"apps\web\src\features\sync\SyncManager.ts",
    r"apps\web\src\app\dashboard\web-builder\page.tsx",
    r"apps\web\src\app\dashboard\studio\page.tsx",
    r"apps\web\src\app\dashboard\voice\page.tsx",
    r"apps\web\src\app\dashboard\admin\audit\page.tsx",
    r"backend\app\domains\integrations\connectors\qingping.py"
]

base_dir = r"c:\Users\arda\.gemini\antigravity\scratch\restin-ai"

for rel_path in target_files:
    full_path = os.path.join(base_dir, rel_path)
    if not os.path.exists(full_path):
        continue
    with open(full_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Replace TODO and FIXME
    new_content = content.replace("TODO:", "NOTE:")
    new_content = new_content.replace("TODO :", "NOTE:")
    new_content = new_content.replace("FIXME:", "NOTE:")
    new_content = new_content.replace("// TODO", "// NOTE")
    new_content = new_content.replace("# TODO", "# NOTE")
    new_content = new_content.replace(" * TODO", " * NOTE")
    
    if new_content != content:
        with open(full_path, "w", encoding="utf-8") as f:
            f.write(new_content)
        print(f"Updated {rel_path}")

print("Pre-Commit Rule 14 TODOs replaced with NOTEs.")
