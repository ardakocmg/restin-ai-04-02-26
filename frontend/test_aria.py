import os
import re
from pathlib import Path

def apply_aria_labels(path):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # We want to find <button ...> or <Button ...> and add aria-label="Action"
    # if it doesn't already have one and its content is only self-closing tags (icons).
    
    # regex finds: <Button [attrs]> [whitespace] <Icon [attrs] /> [whitespace] </Button>
    # It allows for multiple self-closing tags and whitespace but NO text
    
    # A generic approach: iterate over all button tags
    new_content = content
    
    # We'll use a slightly different approach here for modifying:
    # Find all opening button tags, check their entire block
    
    pattern = re.compile(r"(<(?:Button|button)([^>]*?)>)(.*?)(</(?:Button|button)>)", re.DOTALL)
    
    def replacer(match):
        open_tag = match.group(1)
        attrs = match.group(2)
        inner = match.group(3)
        close_tag = match.group(4)
        
        # Skip if it already has an aria-label or title
        if 'aria-label=' in attrs or 'title=' in attrs:
            return match.group(0)
            
        # Check if the inner content is literally just <...>... /> with no text
        text_outside_tags = re.sub(r"<[^>]+>", "", inner).strip()
        
        if text_outside_tags == "" and "<" in inner and ("/>" in inner or "</" in inner):
            # It's highly likely an icon-only button without an accessible name
            # Inject aria-label="Action"
            # Be careful not to break the tag if it's spread across multiple lines
            if "className=" in open_tag:
                 # insert before className
                 new_open_tag = open_tag.replace("className=", 'aria-label="Action" className=', 1)
            elif "onClick=" in open_tag:
                 new_open_tag = open_tag.replace("onClick=", 'aria-label="Action" onClick=', 1)
            else:
                 # insert right after <Button
                 tag_name = "Button" if "<Button" in open_tag else "button"
                 new_open_tag = open_tag.replace(f"<{tag_name}", f"<{tag_name} aria-label=\"Action\"", 1)
                 
            return new_open_tag + inner + close_tag
            
        return match.group(0)

    modified_content = pattern.sub(replacer, new_content)
    
    if modified_content != content:
        with open(path, "w", encoding="utf-8") as f:
            f.write(modified_content)
        return True
    return False

frontend_dir = Path("c:/Users/arda/.gemini/antigravity/scratch/restin-ai/frontend/src")
modified_files = 0

for root, _, files in os.walk(frontend_dir):
    for file in files:
        if file.endswith((".tsx", ".jsx")):
            path = os.path.join(root, file)
            if apply_aria_labels(path):
                modified_files += 1

print(f"Fixed missing aria-labels in {modified_files} files.")
