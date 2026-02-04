import pandas as pd
from pathlib import Path

DOWNLOADS_DIR = Path(r"C:\Users\MG Group\Downloads")

files_to_check = [
    "Caviar and Bull Sales Reports 10.11.25 till 17.11.25.xlsx",
    "outlet_procurement-don-royale-2025-10-01-2025-10-31.xlsx",
    "Don Royale Food Menu.xlsx",
    "Don_Royale_QC_REPORT_v2.xlsx"
]

def inspect_excel(filename):
    path = DOWNLOADS_DIR / filename
    if not path.exists():
        print(f"Skipping {filename} (not found)")
        return
    
    print(f"\n--- {filename} ---")
    try:
        df = pd.read_excel(path, nrows=3)
        print(f"Columns: {list(df.columns)}")
        print(df.head(2).to_string())
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    for f in files_to_check:
        inspect_excel(f)
