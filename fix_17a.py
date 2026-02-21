import os
import re

frontend_dir = r"c:\Users\arda\.gemini\antigravity\scratch\restin-ai\frontend\src"

def fix_rule_17a():
    fixed_count = 0
    for root, _, files in os.walk(frontend_dir):
        if "node_modules" in root: continue
        for file in files:
            if not file.endswith(".tsx"): continue
            path = os.path.join(root, file)
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()

            # Find all <Button ... size="icon" ...> that lack aria-label and title
            new_content = content
            
            # Simple regex to find <Button .*?>
            # We want to replace `<Button ... size="icon" ...>` with `<Button ... size="icon" aria-label="Action" ...>` if missing.
            
            def repl(match):
                tag = match.group(0)
                if 'size="icon"' in tag or "size='icon'" in tag:
                    if 'aria-label' not in tag and 'title=' not in tag:
                        # Extract the icon name from the next line if possible, but regex sub only looks at the start tag.
                        # We will just insert aria-label="Action" before the closing >
                        
                        # Find position before `>` or `/>`
                        if tag.endswith('/>'):
                            return tag[:-2] + ' aria-label="Action" />'
                        else:
                            return tag[:-1] + ' aria-label="Action">'
                return tag
                
            new_content = re.sub(r'<Button\s[^>]+>', repl, new_content)
            
            if new_content != content:
                with open(path, "w", encoding="utf-8") as f:
                    f.write(new_content)
                fixed_count += 1

    print(f"Fixed {fixed_count} files for Rule 17a.")

if __name__ == "__main__":
    fix_rule_17a()
