import os
import glob
import re

hr_dir = r"c:\Users\arda\.gemini\antigravity\scratch\restin-ai\frontend\src\pages\manager\hr"
tsx_files = glob.glob(os.path.join(hr_dir, "*.tsx"))

for fpath in tsx_files:
    with open(fpath, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Remove @ts-nocheck
    content = re.sub(r'//\s*@ts-nocheck\n?', '', content)
    
    # 2. Convert catch(error: any) to catch(error: unknown)
    content = re.sub(r'catch\s*\(\s*(\w+)\s*:\s*any\s*\)', r'catch(\1: unknown)', content)

    # 3. Handle specific patterns
    # e.g., (e: any) -> (e: any) ... wait, we should replace `any` in function signatures or just globally replace `any` with `unknown` where safe
    # Actually just replacing globally is risky if it breaks third party types.
    # Let's target specific common patterns like `(e: any)`
    content = re.sub(r'\(\s*([a-zA-Z0-9_]+)\s*:\s*any\s*\)', r'(\1: unknown)', content)

    # Convert generic : any to : unknown in variables and return types
    # This might break things but it's what we did broadly yesterday.
    content = re.sub(r':\s*any\b', r': unknown', content)
    
    with open(fpath, "w", encoding="utf-8") as f:
        f.write(content)

print(f"Cleaned {len(tsx_files)} files in HR dir.")
