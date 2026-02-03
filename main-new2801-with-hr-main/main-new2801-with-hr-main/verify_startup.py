import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

print("Attempting to import server app...")
try:
    from server import app
    print("SUCCESS: Server app imported successfully.")
except Exception as e:
    print(f"FAILURE: Could not import server app. Error: {e}")
    import traceback
    traceback.print_exc()
