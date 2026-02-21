import os
import re

SRC_DIR = r"frontend\src"

def find_exact_any():
    for root, _, files in os.walk(SRC_DIR):
        for file in files:
            if not (file.endswith(".tsx") or file.endswith(".ts")):
                continue
                
            path = os.path.join(root, file)
            with open(path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
                
            matches = re.finditer(r"(?:\:\s*any(?![_A-Za-z])|as\s+any)", content)
            for m in matches:
                line_no = content.count('\n', 0, m.start()) + 1
                line_text = content.split('\n')[line_no - 1]
                print(f"{path}:{line_no}: {line_text.strip()}")

if __name__ == "__main__":
    find_exact_any()
