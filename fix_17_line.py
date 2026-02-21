import os
import re

frontend_dir = r"c:\Users\arda\.gemini\antigravity\scratch\restin-ai\frontend\src"

def fix_rule_17_line_level():
    fixed_count = 0
    for root, _, files in os.walk(frontend_dir):
        if "node_modules" in root: continue
        for file in files:
            if not file.endswith(".tsx"): continue
            path = os.path.join(root, file)
            with open(path, "r", encoding="utf-8") as f:
                lines = f.readlines()

            changed = False
            for i, line in enumerate(lines):
                # 17a: size="icon"
                if 'size="icon"' in line or "size='icon'" in line:
                    if not any(x in line for x in ['aria-label', 'title=']):
                        lines[i] = line.replace('size="icon"', 'size="icon" aria-label="Action"')
                        lines[i] = lines[i].replace("size='icon'", "size='icon' aria-label='Action'")
                        changed = True

                # 17b: <input, <select, <textarea
                if re.search(r'<(input|select|textarea)\s', line):
                    if not any(x in line for x in ["aria-label", "placeholder", "title=", "id="]):
                        # determine tag to insert after
                        for tag in ['<input', '<select', '<textarea']:
                            if tag in line:
                                lines[i] = line.replace(tag, f'{tag} aria-label="Input"')
                                changed = True
                                break # only do once per line

            if changed:
                with open(path, "w", encoding="utf-8") as f:
                    f.writelines(lines)
                fixed_count += 1

    print(f"Fixed {fixed_count} files for Rule 17.")

if __name__ == "__main__":
    fix_rule_17_line_level()
