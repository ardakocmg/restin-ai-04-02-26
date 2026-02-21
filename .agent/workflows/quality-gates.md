---
description: Quality Gate Rules — Protect audit scores and system integrity during development
---

# Quality Gate Rules — Score Regression Prevention

These rules MUST be followed during ALL development sessions to prevent quality score regression.

## 🚨 CRITICAL RULES (Auto-enforced by pre-commit hook v2.0)

### 1. NEVER Disable TypeScript Strict Mode

- `"strict": true` must remain in `frontend/tsconfig.json`
- Pre-commit hook **blocks** the commit if strict is disabled

### 2. NEVER Delete Test Files

- Minimum test count: **10 files** (backend + frontend combined)
- Pre-commit hook **blocks** if test count drops below threshold
- If refactoring, **move** tests, never delete them

### 3. NEVER Delete Security Infrastructure

These files are protected — pre-commit **blocks** if any are missing:

- `backend/services/pii_encryption.py`
- `backend/core/security_middleware.py`
- `backend/services/audit_trail.py`

### 4. NEVER Delete Core Infrastructure

These files are protected — pre-commit **blocks** if any are missing:

- `Dockerfile`
- `backend/core/metrics_collector.py`
- `backend/services/event_bus.py`

### 5. NEVER Remove CI/CD

- `.github/workflows/` directory must exist with at least 1 workflow file

---

## ⚠️ ADVISORY RULES (Pre-commit warns, doesn't block)

### 6. Minimize `any` Type Usage

- Current count: ~1 instance (keep it low!)
- Each new `any` reduces TypeScript Strictness score
- Use proper interfaces/types instead

### 7. No `console.log` in Production Code

- Use `logger.error` / `logger.info` from structured logging
- Exception: `setupTests.ts` and `logger.ts`

### 8. No Hardcoded Secrets

- Use `os.environ.get("KEY")` for all credentials
- `mongodb+srv://` patterns are auto-detected and blocked

---

## 📋 SCORE-IMPACTING DEVELOPMENT GUIDELINES

### When Adding New Components

1. **Type all props** — use `interface ComponentProps { ... }`
2. **Add aria labels** — `aria-label`, `role` attributes boost Accessibility score
3. **Add loading states** — `isLoading` pattern boosts score
4. **Add error boundaries** — wrap new page-level components

### When Adding New Backend Routes

1. **Add docstrings** — `"""Route description."""` boosts API Documentation score
2. **Use Pydantic models** — for request/response validation (Security score)
3. **Use structured logging** — `logger.error(...)` (Observability score)
4. **Add corresponding tests** — new route = new test file

### When Adding New Services

1. **Register in event bus** — if service emits events
2. **Add health check endpoint** — if service is independently deployable
3. **Use dependency injection** — via `core/dependencies.py`

---

## 🔄 SCORE DIMENSION CHEATSHEET

| Dimension | Key Files | How to Boost |
|-----------|-----------|-------------|
| Code Volume | All source files | More features = more code |
| Architecture | `routes/`, `services/`, `stores/` | More services, Zustand stores |
| Testing | `tests/`, `__tests__/` | More test files, CI workflows |
| Security | `pii_encryption.py`, `audit_trail.py` | RBAC, encryption, input validation |
| Observability | `metrics_collector.py`, `event_bus.py` | Sentry, structured logging |
| Infrastructure | `Dockerfile`, `.github/workflows/` | Docker, CI/CD, env config |
| Prod Readiness | Derived from above | All infra must be present |
| TS Strictness | `tsconfig.json` | strict: true, reduce any count |
| API Docs | Route docstrings, `.storybook/` | Docstrings, Storybook stories |
| Accessibility | Components with `aria-*` | ARIA, dark mode, responsive, toast |

---

## 🔧 VERIFICATION COMMANDS

```bash
# Run all backend tests
python -m pytest tests/ -v

# Run frontend tests  
node node_modules/jest-cli/bin/jest.js --verbose

# Check TypeScript compilation
npx tsc --noEmit

# Check current audit score (requires backend running)
curl http://localhost:8000/api/system/audit-scores | python -m json.tool
```
