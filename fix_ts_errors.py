import os
import re

frontend_dir = r"c:\Users\arda\.gemini\antigravity\scratch\restin-ai\frontend\src"

def file_replace(filepath, find, replace):
    path = os.path.join(frontend_dir, filepath)
    if not os.path.exists(path):
        return
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    new_content = content.replace(find, replace)
    if new_content != content:
        with open(path, "w", encoding="utf-8") as f:
            f.write(new_content)
        print(f"Fixed {filepath}")

# Fix useAuth
auth_files = [
    r"pages\inventory\ProductionManagementComplete.tsx",
    r"pages\inventory\RecipeManagementComplete.tsx",
    r"pages\inventory\StockTransfersComplete.tsx"
]
for p in auth_files:
    file_replace(p, "import { useAuth } from '../../hooks/useAuth';", "import { useAuth } from '@/context/AuthContext';")

# Fix CountdownTimer date math
file_replace(r"components\kds\CountdownTimer.tsx", "const target = new Date(targetTime);", "const target = new Date(targetTime).getTime();")
file_replace(r"components\kds\CountdownTimer.tsx", "const now = new Date();", "const now = new Date().getTime();")

# LoadingSpinner
spinner_path = os.path.join(frontend_dir, r"components\shared\LoadingSpinner.tsx")
try:
    with open(spinner_path, "r", encoding="utf-8") as f:
        content = f.read()
    # Replace "className: string" or "className: any" with "className?: string"
    new_content = re.sub(r'className\s*:\s*(string|any)', r'className?: string', content)
    if new_content != content:
        with open(spinner_path, "w", encoding="utf-8") as f:
            f.write(new_content)
        print("Fixed LoadingSpinner.tsx")
except Exception as e:
    print("Could not fix LoadingSpinner.tsx:", e)

# Fix PageContainer subtitle TS error
container_path = os.path.join(frontend_dir, r"layouts\PageContainer.tsx")
try:
    with open(container_path, "r", encoding="utf-8") as f:
        content = f.read()
    if "subtitle?:" not in content:
        new_content = re.sub(r'interface\s+PageContainerProps\s*\{', r'interface PageContainerProps {\n  subtitle?: string;\n  breadcrumb?: {label: string; href: string}[];', content)
        with open(container_path, "w", encoding="utf-8") as f:
            f.write(new_content)
        print("Fixed PageContainer.tsx")
except Exception as e:
    print("Could not fix PageContainer.tsx:", e)

print("TS automatic fixes applied.")
