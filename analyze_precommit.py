import os
import re

SRC_DIR = r"frontend\src"

class Stats:
    def __init__(self):
        self.ts_nocheck = 0
        self.any_type = 0
        self.error_any = 0
        self.console_log = 0
        self.hardcoded_strings = 0
        self.empty_catch = 0
        self.todo_fixme = 0
        self.img_no_alt = 0

def analyze():
    stats = Stats()
    
    for root, _, files in os.walk(SRC_DIR):
        for file in files:
            if not (file.endswith(".tsx") or file.endswith(".ts")):
                continue
                
            path = os.path.join(root, file)
            with open(path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
                
            if "@ts-nocheck" in content:
                stats.ts_nocheck += 1
                
            # any type: : any or as any
            stats.any_type += len(re.findall(r"(?:\:\s*any(?![_A-Za-z])|as\s+any)", content))
            
            # error: any
            stats.error_any += len(re.findall(r"catch\s*\(\s*\w+\s*:\s*any\s*\)", content))
            
            # console.log
            lines = content.split('\n')
            for line in lines:
                if "// eslint-disable" in line or "// keep" in line:
                    continue
                if re.search(r"console\.(log|warn|error|debug|info)", line):
                    stats.console_log += 1
                    
                # empty catch
                if re.search(r"catch\s*(\([^)]*\))?\s*\{\s*\}", line):
                    stats.empty_catch += 1
                    
                # TODO/FIXME
                if re.search(r"TODO|FIXME|HACK|XXX", line):
                    stats.todo_fixme += 1
                    
            if file.endswith(".tsx"):
                # hardcoded strings
                stats.hardcoded_strings += len(re.findall(r">(No |Error |Loading |Are you sure|Delete |Save |Cancel |Submit |Success)", content))
                # missing alt
                stats.img_no_alt += len(re.findall(r"<img(?![^>]*\balt=)[^>]*>", content))

    print("--- 16-POINT PRE-COMMIT ANALYSIS ---")
    for key, val in vars(stats).items():
        print(f"{key}: {val}")

if __name__ == "__main__":
    analyze()
