import os
import shutil
from pathlib import Path

DOWNLOADS_DIR = Path(r"C:\Users\MG Group\Downloads")
BACKEND_DIR = Path(os.path.dirname(os.path.abspath(__file__)))
STATIC_DIR = BACKEND_DIR / "static" / "venue_assets"

def migrate_branding():
    print("Starting Branding Asset Migration...")
    os.makedirs(STATIC_DIR, exist_ok=True)
    
    # Files to look for based on user mention of Logos/Menus
    keywords = ["logo", "menu", "brand", "identity", "caviar", "don_royale", "donroyale"]
    extensions = [".pdf", ".png", ".jpg", ".jpeg", ".svg", ".heic"]
    
    count = 0
    if not DOWNLOADS_DIR.exists():
        print(f"Error: {DOWNLOADS_DIR} not found.")
        return
        
    for file_path in DOWNLOADS_DIR.iterdir():
        if file_path.is_file() and file_path.suffix.lower() in extensions:
            if any(key in file_path.name.lower() for key in keywords):
                target_path = STATIC_DIR / file_path.name
                print(f"Migrating: {file_path.name} -> {target_path}")
                try:
                    shutil.copy2(file_path, target_path)
                    count += 1
                except Exception as e:
                    print(f"Failed to copy {file_path.name}: {e}")
                    
    print(f"Migration complete. {count} assets moved to {STATIC_DIR}")

if __name__ == "__main__":
    migrate_branding()
