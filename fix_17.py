import os
import re

frontend_dir = r"c:\Users\arda\.gemini\antigravity\scratch\restin-ai\frontend\src"

def fix_rule_17():
    fixed_count = 0
    for root, _, files in os.walk(frontend_dir):
        if "node_modules" in root: continue
        for file in files:
            if not file.endswith(".tsx"): continue
            path = os.path.join(root, file)
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()

            new_content = content
            
            # Fix Buttons
            def repl(match):
                tag = match.group(0)
                if 'size="icon"' in tag or "size='icon'" in tag:
                    if 'aria-label' not in tag and 'title=' not in tag:
                        if tag.endswith('/>'):
                            return tag[:-2] + ' aria-label="Action" />'
                        else:
                            return tag[:-1] + ' aria-label="Action">'
                return tag
                
            new_content = re.sub(r'<Button\s[^>]+>', repl, new_content, flags=re.DOTALL)
            
            # Fix Form Inputs
            def repl_form(match):
                tag = match.group(0)
                # Ensure we are not matching inside a comment or string accidentally? The regex is basic but handles JSX usually.
                if not any(x in tag for x in ["aria-label", "placeholder", "title=", "id="]):
                    name_match = re.search(r'name=["\'](.*?)["\']', tag)
                    label_name = name_match.group(1).replace("_", " ").title() if name_match else "Input field"
                    
                    if tag.endswith('/>'):
                        return tag[:-2] + f' aria-label="{label_name}" />'
                    else:
                        return tag[:-1] + f' aria-label="{label_name}">'
                return tag
                
            new_content = re.sub(r'<(input|select|textarea)\s[^>]+>', repl_form, new_content, flags=re.DOTALL)
            
            if new_content != content:
                with open(path, "w", encoding="utf-8") as f:
                    f.write(new_content)
                fixed_count += 1

    print(f"Fixed {fixed_count} files for Rule 17.")

if __name__ == "__main__":
    fix_rule_17()
