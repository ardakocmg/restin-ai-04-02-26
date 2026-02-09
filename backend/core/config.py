import os
from pathlib import Path
from dotenv import load_dotenv
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

# Frontend build directory
FRONTEND_BUILD_DIR = os.getenv("FRONTEND_BUILD_DIR", "/app/frontend/build")
STATIC_DIR = Path(FRONTEND_BUILD_DIR) / "static"
INDEX_FILE = Path(FRONTEND_BUILD_DIR) / "index.html"

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', "mongodb://localhost:27017")
DB_NAME = os.environ.get('DB_NAME', "restin_v2")

# JWT Settings - FAIL FAST
JWT_SECRET = os.environ.get('JWT_SECRET', '')
if not JWT_SECRET or len(JWT_SECRET) < 16:
    raise RuntimeError("JWT_SECRET misconfigured (missing/too short). Refuse to start.")

JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 12

# Build metadata - MUST CHANGE PER DEPLOY
BUILD_ID = os.getenv("BUILD_ID") or os.getenv("EMERGENT_DEPLOY_ID") or os.getenv("GIT_SHA") or "local"
GIT_SHA = os.getenv("GIT_SHA", "uncommitted")
BUILT_AT = os.getenv("BUILT_AT") or datetime.now(timezone.utc).isoformat()

# Nuki Smart Lock OAuth2
NUKI_CLIENT_ID = os.environ.get("NUKI_CLIENT_ID", "")
NUKI_CLIENT_SECRET = os.environ.get("NUKI_CLIENT_SECRET", "")
NUKI_REDIRECT_URI = os.environ.get("NUKI_REDIRECT_URI", "")
