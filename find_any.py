import os
import re
from pathlib import Path

def find_any(path):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # The analyze_precommit.py logic looks for exactly: 'any' but not in comments or strings.
    # To find exactly what's failing, let's just use regex for typical TS any usages:
    # `: any` or `<any>`
    pattern = re.compile(r"(:[ \t]*any[^a-zA-Z0-9_]|<any>)")
    
    matches = pattern.findall(content)
    if matches:
        # Check if they are actually in the live code
        return len(matches)
    return 0

frontend_dir = Path("c:/Users/arda/.gemini/antigravity/scratch/restin-ai/frontend")
backend_dir = Path("c:/Users/arda/.gemini/antigravity/scratch/restin-ai/backend")
web_dir = Path("c:/Users/arda/.gemini/antigravity/scratch/restin-ai/apps/web")

total = 0
for d in [frontend_dir, backend_dir, web_dir]:
    if not d.exists(): continue
    for root, _, files in os.walk(d):
        for file in files:
            if file.endswith((".tsx", ".ts")):
                path = os.path.join(root, file)
                count = find_any(path)
                if count > 0:
                    print(f"File {path} has {count} any violations.")
                    total += count

print(f"Total: {total}")
