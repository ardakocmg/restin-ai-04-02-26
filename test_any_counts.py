import os
import re

SRC_DIR = r"frontend\src"

def analyze():
    any_count = 0
    for root, _, files in os.walk(SRC_DIR):
        for file in files:
            if not (file.endswith(".tsx") or file.endswith(".ts")):
                continue
                
            path = os.path.join(root, file)
            with open(path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()

            matches = re.findall(r"(?:\:\s*any(?![_A-Za-z])|as\s+any)", content)
            if matches:
                print(f"File {path}: {len(matches)} violations")
                any_count += len(matches)

    print(f"Total: {any_count}")

if __name__ == "__main__":
    analyze()
