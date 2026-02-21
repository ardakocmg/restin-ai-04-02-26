import subprocess
import json
from collections import Counter

def run():
    try:
        # Run eslint with JSON formatter so we can easily parse the results
        result = subprocess.run(
            ["npx", "eslint", "src", "--ext", ".ts,.tsx", "--format", "json"], 
            cwd="frontend", 
            capture_output=True, 
            text=True
        )
        
        # ESLint exits with code 1 if there are errors, so we don't check returncode for success
        try:
            data = json.loads(result.stdout)
        except json.JSONDecodeError:
            print("Failed to parse ESLint output. Raw stdout:")
            print(result.stdout[:1000])
            return
            
        rule_counts = Counter()
        total_errors = 0
        total_warnings = 0
        
        for file in data:
            for message in file.get('messages', []):
                rule_id = message.get('ruleId') or 'parse_error'
                rule_counts[rule_id] += 1
                if message.get('severity') == 2:
                    total_errors += 1
                else:
                    total_warnings += 1
                    
        print(f"Total Errors: {total_errors}")
        print(f"Total Warnings: {total_warnings}")
        print(f"Total Pending IDE Issues: {total_errors + total_warnings}\n")
        print("Breakdown by ESLint Rule:")
        for rule, count in rule_counts.most_common():
            print(f" - {rule}: {count}")
            
    except Exception as e:
        print(f"Error executing ESLint analysis: {e}")

if __name__ == "__main__":
    run()
