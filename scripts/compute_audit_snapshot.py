"""
Build-Time Audit Snapshot Generator

Runs locally (where both frontend/ and backend/ exist) to pre-compute
audit scores and store them as JSON. The backend API serves this
snapshot instead of doing runtime filesystem scanning.

Usage:
    python scripts/compute_audit_snapshot.py

Output:
    backend/data/audit_snapshot.json
"""

import sys
import json
import time
from pathlib import Path

# Add backend to path so we can import the scoring logic
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "backend"))

from routes.audit_scores_routes import compute_audit_scores

def main():
    print("[AUDIT] Computing audit scores from codebase...")
    
    # Force fresh computation (bypass cache)
    from routes import audit_scores_routes
    audit_scores_routes._cache.clear()
    
    scores = compute_audit_scores()
    
    # Add build metadata
    scores["_generated_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    scores["_generator"] = "compute_audit_snapshot.py"
    scores["_source"] = "build-time"
    
    # Write to backend/data/
    output_dir = ROOT / "backend" / "data"
    output_dir.mkdir(parents=True, exist_ok=True)
    output_file = output_dir / "audit_snapshot.json"
    
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(scores, f, indent=2, default=str)
    
    # Print summary
    s = scores.get("scores", {})
    total = scores.get("overall_score", 0)
    print(f"\n[OK] Audit snapshot saved to: {output_file}")
    print(f"   Overall Score: {total}/10")
    print(f"   Dimensions:")
    for key, val in s.items():
        print(f"     {key}: {val}")
    
    ev = scores.get("evidence", {}).get("code_volume", {})
    print(f"\n   Code Volume:")
    print(f"     Frontend files: {ev.get('frontend_files', '?')}")
    print(f"     Backend files:  {ev.get('backend_files', '?')}")
    print(f"     Total LOC:      {ev.get('total_loc', '?')}")


if __name__ == "__main__":
    main()
