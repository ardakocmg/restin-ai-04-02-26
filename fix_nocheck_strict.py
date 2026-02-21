import os
import re

frontend_dir = r"c:\Users\arda\.gemini\antigravity\scratch\restin-ai\frontend\src"

def fix_ts_violations_strictly():
    nocheck_fixed = 0
    any_fixed = 0
    
    for root, _, files in os.walk(frontend_dir):
        if "node_modules" in root: continue
        for file in files:
            if not file.endswith((".ts", ".tsx")): continue
            path = os.path.join(root, file)
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()

            new_content = content
            
            # Remove @ts-nocheck
            if "@ts-nocheck" in new_content:
                new_content = re.sub(r'//\s*@ts-nocheck\n?', '', new_content)
                nocheck_fixed += 1
                
            # Replace : any with : Record<string, unknown>
            if ": any" in new_content or "as any" in new_content:
                lines = new_content.split('\n')
                line_changed = False
                for i, line in enumerate(lines):
                    if "// eslint-disable" in line or "TODO" in line:
                        continue
                    if re.search(r':\s*any\b', line):
                        # Use Record<string, unknown> which safely allows object property access
                        # via type guards or as an object bucket, preventing raw unknown property access errors
                        lines[i] = re.sub(r':\s*any\b', r': Record<string, unknown>', line)
                        line_changed = True
                    if re.search(r'\bas\s+any\b', line):
                        lines[i] = re.sub(r'\bas\s+any\b', r'as unknown', line)
                        line_changed = True
                        
                if line_changed:
                    new_content = '\n'.join(lines)
                    any_fixed += 1

            if new_content != content:
                with open(path, "w", encoding="utf-8") as f:
                    f.write(new_content)

    print(f"Fixed {nocheck_fixed} files with @ts-nocheck.")
    print(f"Fixed {any_fixed} files with 'any' types.")

if __name__ == "__main__":
    fix_ts_violations_strictly()
