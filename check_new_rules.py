import os
import re

frontend_dir = r"c:\Users\arda\.gemini\antigravity\scratch\restin-ai\frontend\src"

def analyze_rules():
    violations_16_inline = []
    
    for root, _, files in os.walk(frontend_dir):
        if "node_modules" in root: continue
        for file in files:
            if not file.endswith(".tsx"): continue
            path = os.path.join(root, file)
            with open(path, "r", encoding="utf-8") as f:
                lines = f.readlines()
            
            for i, line in enumerate(lines):
                # Check 16: style={{
                if "style={{" in line:
                    if not any(x in line for x in ["width: `", "top:", "left:", "height: `", "transform:", "keep-inline", "eslint-disable"]):
                        violations_16_inline.append(f"{path}:{i+1}")
                        
    print("--- NEW RULES ANALYSIS ---")
    print(f"Rule 16 (Inline Styles): {len(violations_16_inline)}")
    print("--------------------------")
    
    if len(violations_16_inline) > 0 and len(violations_16_inline) < 20: 
        print("Details:")
        for v in violations_16_inline:
             print(v)

if __name__ == "__main__":
    analyze_rules()
