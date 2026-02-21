"""
Utility scripts for database operations.

IMPORTANT: All scripts must use environment variables for connection strings.
Never hardcode credentials in source files.

Usage:
    MONGODB_URI=mongodb+srv://... python -m scripts.db_inspect
"""

import os

def get_mongodb_uri() -> str:
    """Get MongoDB URI from environment, never hardcode."""
    uri = os.environ.get("MONGODB_URI", "")
    if not uri:
        raise ValueError(
            "MONGODB_URI environment variable not set. "
            "Set it before running scripts: "
            "export MONGODB_URI='mongodb+srv://user:pass@cluster/db'"
        )
    return uri
