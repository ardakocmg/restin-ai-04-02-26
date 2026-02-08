
import os
import re

FRONTEND_DIR = r"c:\Users\MG Group\.gemini\antigravity\scratch\main-new2801-with-hr\frontend\src"
BACKEND_DIR = r"c:\Users\MG Group\.gemini\antigravity\scratch\main-new2801-with-hr\backend\routes"

def scan_frontend(root_dir):
    api_calls = set()
    # Regex to capture /api/... strings
    # Matches: '/api/something', "${API_URL}/api/something"
    # Capture group 1 is the path starting with /api/
    regex = re.compile(r"['\"`](.*?)['\"`]") 
    
    for root, dirs, files in os.walk(root_dir):
        for file in files:
            if file.endswith(('.js', '.jsx', '.ts', '.tsx')):
                path = os.path.join(root, file)
                try:
                    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                        matches = regex.findall(content)
                        for m in matches:
                            if "/api/" in m and not m.startswith("http"): 
                                # Extract just the /api/... part if it's part of a template literal
                                # e.g. `${API_URL}/api/users` -> /api/users
                                # e.g. `/api/users/${id}` -> /api/users/{id}
                                clean = m
                                if "${" in clean:
                                     # Simplified cleanup for template literals
                                     # We want to match the static parts
                                     clean = clean.replace("${API_URL}", "")
                                     clean = clean.replace("${backendUrl}", "")
                                     clean = clean.replace("${process.env.REACT_APP_BACKEND_URL}", "")
                                     
                                     # Replace variable parts with {} for comparison
                                     clean = re.sub(r"\$\{.*?\}", "{}", clean)
                                
                                # Handle standard strings or simple concats
                                if "/api/" in clean:
                                    idx = clean.find("/api/")
                                    api_path = clean[idx:]
                                    # Normalized path: /api/users/{}
                                    api_calls.add(api_path)
                except Exception as e:
                    pass
    return api_calls

def scan_backend(root_dir):
    defined_routes = set()
    # Regex for FastAPI routes: @router.get("/users/{id}")
    regex = re.compile(r"@router\.(get|post|put|delete|patch|websocket)\s*\(\s*['\"](.*?)['\"]")
    
    for root, dirs, files in os.walk(root_dir):
        for file in files:
            if file.endswith('.py'):
                path = os.path.join(root, file)
                try:
                    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                        matches = regex.findall(content)
                        for method, route_path in matches:
                            # FastAPI routes are relative to the router prefix, but usually we don't know the prefix easily here without parsing main.py
                            # However, most routes in this project seem to use full paths or valid segments.
                            # We will collect the segment. To be comparable, we need the prefix.
                            # HEURISTIC: most files have a consistent prefix based on filename or just manual mapping.
                            # For now, let's just collect the raw route path.
                            
                            # Normalize {param} to {}
                            clean = re.sub(r"\{.*?\}", "{}", route_path)
                            defined_routes.add(clean)
                except Exception as e:
                    pass
    return defined_routes

def analyze():
    print("Scanning Frontend...")
    fe_apis = scan_frontend(FRONTEND_DIR)
    
    print("Scanning Backend...")
    be_routes = scan_backend(BACKEND_DIR)
    
    print(f"\nFound {len(fe_apis)} Frontend API calls.")
    print(f"Found {len(be_routes)} Backend Route definitions (partial/relative).")
    
    # Heuristic matching
    # Backend routes often look like "/{venue_id}/recipes" (relative to router)
    # Frontend looks like "/api/venues/{}/recipes"
    
    # We need to try to match them.
    # Common prefixes in backend:
    # /api is usually globally applied.
    
    missing = []
    
    for fe_path in sorted(fe_apis):
        # normalize fe_path for comparison
        # Remove /api prefix for matching against relative routes (sometimes)
        # But backend routes in this codebase seem to VARY.
        # Let's try to find *any* backend route that ends with the FE path or is a substantial suffix match.
        
        # Strategy: 
        # FE: /api/venues/{}/recipes
        # BE: /venues/{venue_id}/recipes  OR  /{venue_id}/recipes
        
        # 1. Strip /api
        core_path = fe_path.replace("/api", "")
        if not core_path: continue
        
        found = False
        for be_path in be_routes:
            # 1. Exact match (rare since BE is usually relative)
            if be_path == core_path:
                found = True
                break
            
            # 2. BE path is a suffix of FE path (e.g. BE: /stats, FE: /api/stats)
            if be_path == core_path:
                found = True
                break
                
            # 3. Handle the messy prefixes. 
            # If backend route is "/{venue_id}/recipes" and fe is "/venues/{}/recipes" -> mismatch unless we know router prefix.
            # Let's look for "significant overlap"
            
            # Normalize BE path to generic {}
            be_norm = re.sub(r"\{.*?\}", "{}", be_path)
            
            # Remove leading slashes for fuzzy search
            be_clean = be_norm.lstrip("/")
            fe_clean = core_path.lstrip("/")
            
            if be_clean and be_clean in fe_clean:
                 # Check if it covers the *end* of the path
                 if fe_clean.endswith(be_clean):
                     found = True
                     break
            
        if not found:
            missing.append(fe_path)
            
    print("\n--- POTENTIAL GAPS (Frontend calls this, but no likely Backend match found) ---")
    for m in sorted(missing)[:50]: # Limit output
        print(f"MISSING? {m}")

    print("\n(Note: False positives are possible due to router prefixes defined in main.py)")

if __name__ == "__main__":
    analyze()
