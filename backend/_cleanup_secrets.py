"""Remove hardcoded MongoDB URIs from utility scripts — replace with os.environ.get()"""
import os
import re

files = [
    r"c:\Users\MG Group\.gemini\antigravity\scratch\restin-ai\backend\_fix_venue_ids.py",
    r"c:\Users\MG Group\.gemini\antigravity\scratch\restin-ai\backend\_check_venues.py",
    r"c:\Users\MG Group\.gemini\antigravity\scratch\restin-ai\backend\seed_integrations.py",
    r"c:\Users\MG Group\.gemini\antigravity\scratch\restin-ai\backend\fix_openai_phantom.py",
    r"c:\Users\MG Group\.gemini\antigravity\scratch\restin-ai\backend\data_audit.py",
    r"c:\Users\MG Group\.gemini\antigravity\scratch\restin-ai\backend\collection_audit.py",
    r"c:\Users\MG Group\.gemini\antigravity\scratch\restin-ai\backend\migrate_to_atlas.py",
    r"c:\Users\MG Group\.gemini\antigravity\scratch\restin-ai\backend\scripts\db_inspect.py",
    r"c:\Users\MG Group\.gemini\antigravity\scratch\restin-ai\backend\scripts\db_cleanup.py",
]

pattern = re.compile(r'"mongodb\+srv://[^"]+"')
replacement = 'os.environ.get("MONGODB_URI", "mongodb://localhost:27017/restin_v2")'

for f in files:
    if not os.path.exists(f):
        print(f"SKIP (not found): {f}")
        continue
    content = open(f, "r", encoding="utf-8").read()
    if "import os" not in content:
        content = "import os\n" + content
    new_content = pattern.sub(replacement, content)
    open(f, "w", encoding="utf-8").write(new_content)
    print(f"FIXED: {os.path.basename(f)}")

print("All done!")
