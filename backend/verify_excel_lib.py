import pandas as pd
try:
    import openpyxl
    print(f"SUCCESS: openpyxl {openpyxl.__version__} is installed.")
except ImportError:
    print("ERROR: openpyxl is NOT installed.")

try:
    df = pd.DataFrame({'Data': [10, 20, 30]})
    print("SUCCESS: pandas is working.")
except Exception as e:
    print(f"ERROR: pandas issue: {e}")
