import os
import re

routes_dir = 'backend/routes'
main_file = 'backend/app/main.py'

if not os.path.exists(main_file):
    print(f"Error: {main_file} not found")
    exit(1)

with open(main_file, "r", encoding="utf-8") as f:
    main_content = f.read()

route_files = [f for f in os.listdir(routes_dir) if f.endswith(".py") and f != "__init__.py"]

missing = []
for file in route_files:
    module_name = file.replace(".py", "")
    # Check if this module is imported or mounted in main.py
    if module_name not in main_content:
        missing.append(file)

if missing:
    print("MISSING ROUTES NOT MOUNTED IN MAIN.PY:")
    for m in missing:
        print(m)
else:
    print("ALL ROUTES MOUNTED")
