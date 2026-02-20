# Restin.AI — Agent Security Rules

> ⚠️ **MANDATORY FIRST READ:** Before doing ANY work, read the Master Rules at:
> `C:\Users\arda\Documents\restin-setup\RULES.md`
> This file contains ALL project conventions, including TypeScript-only policy, deployment rules, and architecture guidelines.
> **FAILURE TO READ THIS FILE BEFORE CODING IS UNACCEPTABLE.**

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

## 🚨 RULE 75: TYPESCRIPT ONLY — NO JSX/JS (IMMUTABLE)

**This rule is NON-NEGOTIABLE and applies to ALL frontend code generation.**

### What is FORBIDDEN

1. **NEVER** create new files with `.jsx` or `.js` extensions in the `frontend/src/` directory
2. **NEVER** write React components without TypeScript interfaces/types for props, state, and API responses
3. **NEVER** use `any` type unless absolutely necessary in catch blocks — prefer proper error typing
4. **NEVER** skip typing API response data — always define interfaces matching the backend response shape

### What is REQUIRED

1. **ALL** new React components MUST use `.tsx` extension
2. **ALL** new utility/helper/hook files MUST use `.ts` extension
3. **ALL** component props MUST have TypeScript interfaces defined
4. **ALL** `useState` hooks MUST have explicit type annotations (e.g., `useState<MyType[]>([])`)
5. **ALL** API response data MUST have matching TypeScript interfaces
6. **ALL** event handlers MUST use proper React event types (e.g., `React.ChangeEvent<HTMLInputElement>`)
7. When converting existing `.jsx`/`.js` → `.tsx`/`.ts`, the old file MUST be deleted after migration

### Acceptable Patterns

```tsx
// ✅ CORRECT — .tsx with typed state and interfaces
interface JobPosting {
    id: string;
    title: string;
    department: string;
}

const [jobs, setJobs] = useState<JobPosting[]>([]);

// ✅ CORRECT — typed API response
const res = await api.get<{ data: JobPosting[] }>(`/venues/${venueId}/hr/hiring/jobs`);

// ❌ FORBIDDEN — creating HiringATS.jsx
// ❌ FORBIDDEN — untyped state: useState([])
// ❌ FORBIDDEN — untyped API: res.data (without interface)
```

### Enforcement

- Every new frontend file MUST have `.tsx` or `.ts` extension — no exceptions
- Code review MUST reject any PR introducing new `.jsx`/`.js` files
- Existing `.jsx`/`.js` files should be migrated to `.tsx`/`.ts` when touched

