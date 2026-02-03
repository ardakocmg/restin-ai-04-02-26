import pandas as pd
import os
from pathlib import Path

DOWNLOADS_DIR = Path(r"C:\Users\MG Group\Downloads")

def inspect_excel(filename):
    path = DOWNLOADS_DIR / filename
    if not path.exists():
        print(f"File {filename} not found.")
        return
    
    print(f"\n--- Inspecting {filename} ---")
    try:
        # Read only headers and first 5 rows
        df = pd.read_excel(path, nrows=5)
        print("Headers:")
        print(df.columns.tolist())
        print("\nSample Data:")
        print(df.to_string())
    except Exception as e:
        print(f"Error reading {filename}: {e}")

if __name__ == "__main__":
    files = [
        "ingredient_list_export.xlsx",
        "recipe_list_export.xlsx",
        "ALL_BOMs_ALL_SHEETS.xlsx"
    ]
    for f in files:
        inspect_excel(f)
