---
description: Run a comprehensive security audit to find hardcoded credentials and secrets
---

# Security Audit Workflow

Run this workflow periodically (or before every deploy) to catch credential leaks.

## Steps

// turbo-all

1. **Scan for MongoDB connection strings with passwords:**

```bash
git grep -i "mongodb+srv://.*:.*@" HEAD 2>&1
```

Expected: exit code 1 (no results). If results found, remove the hardcoded URI.

1. **Scan for hardcoded passwords:**

```bash
git grep -inE "(password|passwd|pwd)\s*[=:]\s*[\"'][A-Za-z0-9]{4,}" HEAD -- "*.py" "*.ts" "*.tsx" "*.js" 2>&1
```

Review results — filter out false positives (form labels, type annotations). Real passwords must be replaced with env vars.

1. **Scan for API keys/tokens:**

```bash
git grep -inE "(api_key|apikey|secret_key|access_secret|api_token)\s*[=:]\s*[\"'][a-zA-Z0-9_-]{15,}" HEAD -- "*.py" "*.ts" "*.tsx" 2>&1
```

Any long alphanumeric value is suspect. Replace with `os.environ.get()`.

1. **Scan for private keys:**

```bash
git grep -n "PRIVATE KEY" HEAD 2>&1
```

Expected: exit code 1. Private keys must NEVER be committed.

1. **Scan for .env files tracked by git:**

```bash
git ls-files "*.env" ".env*" 2>&1
```

Expected: no results. All .env files should be in .gitignore.

1. **Scan for known credential patterns:**

```bash
git grep -inE "(AKIA[0-9A-Z]{16}|AIzaSy[0-9A-Za-z_-]{33})" HEAD 2>&1
```

AWS and Google API keys. Expected: exit code 1.

1. **Verify .gitignore covers common secret files:**
Check that these patterns exist in `.gitignore`:

- `.env`
- `*.pem`
- `*.key`
- `stderr.txt` / `stdout.txt`

1. **Summary:**
If all scans return exit code 1 (no results), the codebase is clean.
If any scan finds results, fix them before deploying.

---

## ⚡ General Quality Rules

- **No Animation Delays:** NEVER use `setTimeout` to gate login, navigation, or submissions. Instant callbacks only.
- **No 404 Before Commit:** Every UI route/link MUST have a working backend + page. Fix or hide before commit.
