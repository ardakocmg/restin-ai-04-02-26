import os
import re
from pathlib import Path

def apply_a11y_labels(path):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Target UI components common in Shadcn/Radix/Tailwind
    target_components = ["Input", "input", "Textarea", "textarea", "Select", "select", "SelectTrigger", "CmdInput"]
    modified = content
    
    for tag in target_components:
        # Regex to find tags like <Input className="..." />
        # Group 1: Opening bracket and tag name <Input
        # Group 2: All attributes
        # Group 3: Closing bracket (/> or >)
        pattern = re.compile(rf"(<{tag}\b)([^>]*?)(/?>)", re.DOTALL)
        
        def replacer(match):
            prefix = match.group(1)
            attrs = match.group(2)
            suffix = match.group(3)
            
            # Skip if it already has an accessible name attribute
            if 'aria-label=' in attrs or 'aria-labelledby=' in attrs or 'title=' in attrs or 'type="hidden"' in attrs or "type='hidden'" in attrs:
                return match.group(0)
                
            # Attempt to derive a meaningful label
            label = "Input field"
            if tag.lower() in ["select", "selecttrigger"]:
                label = "Select option"
            
            placeholder_match = re.search(r'placeholder=(["\'])(.*?)\1', attrs)
            if placeholder_match and placeholder_match.group(2):
                label = placeholder_match.group(2)
            else:
                id_match = re.search(r'id=(["\'])(.*?)\1', attrs)
                if id_match and id_match.group(2):
                    label = id_match.group(2).replace("-", " ").replace("_", " ").title()
                else:
                    name_match = re.search(r'name=(["\'])(.*?)\1', attrs)
                    if name_match and name_match.group(2):
                        label = name_match.group(2).replace("-", " ").replace("_", " ").title()

            # Fix edge case where the label contains double quotes
            label = label.replace('"', '&quot;')
            
            # Inject aria-label right after the tag name
            return f'{prefix} aria-label="{label}"{attrs}{suffix}'
            
        modified = pattern.sub(replacer, modified)
        
    if modified != content:
        with open(path, "w", encoding="utf-8") as f:
            f.write(modified)
        return True
    return False

frontend_dir = Path("c:/Users/arda/.gemini/antigravity/scratch/restin-ai/frontend/src")
modified_files = 0

for root, _, files in os.walk(frontend_dir):
    for file in files:
        if file.endswith((".tsx", ".jsx", ".ts")):
            path = os.path.join(root, file)
            if apply_a11y_labels(path):
                modified_files += 1

print(f"Fixed missing accessible names for inputs/selects in {modified_files} files.")
