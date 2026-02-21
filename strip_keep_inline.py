import os
import re

def clean_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Remove all occurrences of /* keep-inline */
    new_content = content.replace("/* keep-inline */", "")
    # Remove lines containing // keep-inline... completely, or just the comment part
    new_content = re.sub(r'//\s*keep-inline.*', '', new_content)
    
    if new_content != content:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        return True
    return False

c = 0
for root, _, files in os.walk('frontend/src'):
    for file in files:
        if file.endswith(('.tsx', '.ts')):
            if clean_file(os.path.join(root, file)):
                c += 1

print(f"Cleaned {c} files")
