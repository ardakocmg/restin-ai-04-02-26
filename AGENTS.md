# Restin.AI — Agent Security Rules

## 🚨 RULE 73: ZERO HARDCODED SECRETS (IMMUTABLE)

**This rule is NON-NEGOTIABLE and applies to ALL code generation.**

### What is FORBIDDEN

1. **NEVER** write a real password, API key, token, or connection string directly in source code
2. **NEVER** use hardcoded fallback values for credentials (e.g., `os.environ.get("KEY", "actual-secret-here")`)
3. **NEVER** commit `.env` files or files containing credentials
4. **NEVER** log or print credentials, even partially

### What is REQUIRED

1. **ALL** secrets MUST come from `os.environ.get("VAR_NAME")` (Python) or `process.env.VAR_NAME` (JS/TS)
2. If an env var is missing, the script MUST **abort with a clear error** — never silently use a fallback
3. New scripts that need credentials MUST be added to `.gitignore` if they're one-off utilities
4. Connection strings MUST use env vars: `MONGO_URL`, `DATABASE_URL`, etc.
5. IoT credentials (Meross, Tuya, Nuki) MUST come from env vars or encrypted DB storage

### Acceptable Patterns

```python
# ✅ CORRECT
MONGO_URL = os.environ.get("MONGO_URL")
if not MONGO_URL:
    raise RuntimeError("MONGO_URL not set")

# ✅ CORRECT - non-secret fallback
DB_NAME = os.environ.get("DB_NAME", "restin_v2")

# ❌ FORBIDDEN
MONGO_URL = "mongodb+srv://user:password@cluster.mongodb.net/db"

# ❌ FORBIDDEN
PASSWORD = "Mg2026"
```

### Enforcement

- Pre-commit hook (`.githooks/pre-commit`) automatically scans for violations
- `/security-audit` workflow for periodic manual scans
- All credentials are encrypted at rest using Fernet (AES-128-CBC + HMAC)

## RULE 74: CREDENTIAL FILE HYGIENE

1. **One-off scripts** (migration, debug, audit, test) that need credentials:
   - MUST read from env vars, never hardcode
   - SHOULD be added to `.gitignore` if they won't be needed long-term
2. **Log files** (`stderr.txt`, `stdout.txt`, `*.log`) MUST be in `.gitignore`
3. Before every commit, mentally verify: *"Does this diff contain any secret?"*
