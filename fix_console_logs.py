import os
import re

frontend_dir = r"c:\Users\arda\.gemini\antigravity\scratch\restin-ai\frontend\src"

console_pattern = re.compile(r'console\.(log|warn|error|debug|info)\(')
logger_import = "import { logger } from '@/lib/logger';\n"

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Skip files that intentionally use console or are tests
    if "setupProxy" in filepath or "// keep" in content:
        return False

    if not console_pattern.search(content):
        return False

    # Replace console.x with logger.x
    new_content = re.sub(r'console\.(log|warn|error|debug|info)', r'logger.\1', content)

    # Check if we need to add import
    if "import { logger }" not in new_content and "import logger" not in new_content:
        # Find the last import statement
        import_match = list(re.finditer(r'^import .*;\n', new_content, flags=re.MULTILINE))
        if import_match:
            last_import = import_match[-1]
            insert_pos = last_import.end()
            new_content = "".join([new_content[:insert_pos], logger_import, new_content[insert_pos:]])
        else:
            new_content = logger_import + new_content

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    return True

changed_count = 0
for root, _, files in os.walk(frontend_dir):
    for file in files:
        if file.endswith(('.ts', '.tsx')):
            filepath = os.path.join(root, file)
            if process_file(filepath):
                changed_count += 1
                print(f"Fixed console.log in: {filepath}")

print(f"Total files fixed: {changed_count}")
