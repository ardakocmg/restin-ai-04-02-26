import re
import os

frontend_dir = r"c:\Users\arda\.gemini\antigravity\scratch\restin-ai\frontend\src"
file_path = os.path.join(frontend_dir, "pages", "pos", "POSRuntimeEnhanced.tsx")
css_path = os.path.join(frontend_dir, "pages", "pos", "pos-shared.css") # Assume it's here or index.css

def camel_to_kebab(name):
    s1 = re.sub('(.)([A-Z][a-z]+)', r'\1-\2', name)
    return re.sub('([a-z0-9])([A-Z])', r'\1-\2', s1).lower()

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Extract the `const styles = { ... };` block
styles_match = re.search(r'const styles = \{(.*?)\};\n', content, re.DOTALL)
if not styles_match:
    print("Could not find styles block.")
    exit(1)

styles_body = styles_match.group(1)

# 2. Parse styles into CSS
css_output = []
css_output.append("/* ═══════════════════════════════════════════════════════════════════")
css_output.append("   STYLES — POSRuntimeEnhanced Extracted")
css_output.append("   ═══════════════════════════════════════════════════════════════════ */")

# Very basic parsing, not perfect for nested objects but styles here are flat:
# key: { prop: 'val', prop2: val },
pattern = re.compile(r'([a-zA-Z0-9_]+):\s*\{([^}]+)\},?')
matches = pattern.findall(styles_body)

for key, props in matches:
    class_name = f".pos-{camel_to_kebab(key)}"
    css_output.append(f"{class_name} {{")
    
    # parse props
    prop_matches = re.finditer(r'([a-zA-Z0-9_]+):\s*([^,]+),?', props)
    for p_match in prop_matches:
        prop = p_match.group(1)
        val = p_match.group(2).strip().strip("'").strip('"')
        
        # handle react specific names
        css_prop = camel_to_kebab(prop)
        if css_prop == "web-kit-line-clamp": css_prop = "-webkit-line-clamp"
        if css_prop == "web-kit-box-orient": css_prop = "-webkit-box-orient"
        
        # handle numbers missing 'px' (basic heuristic)
        if val.isdigit() and css_prop not in ['font-weight', 'z-index', 'flex', 'flex-grow', 'flex-shrink', 'opacity', 'line-height', '-webkit-line-clamp']:
            if val != '0':
                val += 'px'
                
        css_output.append(f"  {css_prop}: {val};")
        
    css_output.append("}\n")

with open(css_path, "a", encoding="utf-8") as f:
    f.write("\n".join(css_output))

# 3. Replace style={styles.key} with className="pos-key"
new_content = content
for key, _ in matches:
    new_content = new_content.replace(f'style={{styles.{key}}}', f'className="pos-{camel_to_kebab(key)}"')

# 4. Remove the `styles` object from the file
new_content = new_content.replace(styles_match.group(0), "")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(new_content)

print("Successfully extracted styles to pos-shared.css and updated POSRuntimeEnhanced.tsx")
