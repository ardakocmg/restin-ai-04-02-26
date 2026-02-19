---
description: STRICT quality rules - Zero fake data, zero placeholder pages, zero non-functional UI. Everything must be real and working.
---

# NO FAKES PROTOCOL — Immutable Rules

## CORE PHILOSOPHY: BUILD EVERYTHING, BUILD IT REAL

**Never skip. Never fake. Never half-do.**
If a feature needs a backend — BUILD the backend.
If a feature needs an API — BUILD the API.
If a feature needs data — SEED or MIGRATE real data.
Then build the UI on top of the REAL foundation.

## MANDATORY BUILD ORDER (for every feature)

### STEP 1: Database Schema & Collection

- Create/update MongoDB collection
- Add indexes for query performance
- Seed with real or realistic data if empty

### STEP 2: Backend API

- Create FastAPI route with full CRUD
- Add proper validation (zod/pydantic)
- Add venue_id filtering and auth
- Test the endpoint returns real data

### STEP 3: Frontend UI

- Build component that calls the REAL API
- Loading, error, and empty states included
- Every button, form, and action is WIRED to the API
- CRUD works end-to-end

### STEP 4: Verify

- Test the full flow: Create -> Read -> Update -> Delete
- Confirm data persists in MongoDB

## FORBIDDEN PATTERNS (instant rejection)

```
NEVER DO THESE:
- "Coming Soon" or "Feature not available"
- "TODO: implement" anywhere in shipped code
- onClick={() => {}}  (empty click handlers)
- const data = [{id: 1, name: "Test"}]  (hardcoded fake data)
- Math.random() for stats/metrics
- setTimeout(() => setLoading(false)) without real API call
- Empty modal/drawer that opens but does nothing
- Sidebar items that navigate to blank/placeholder pages
- UI components without a working backend behind them
- Forms that don't submit to a real endpoint
- Tables showing hardcoded arrays instead of API data
```

## REQUIRED PATTERNS (must always be present)

```
ALWAYS DO THESE:
- Loading states (skeleton/spinner) while fetching
- Error states with retry button
- Empty states ("No items yet. Create your first...")
- Real API integration for EVERY data display
- Toast/notification on every mutation (create/update/delete)
- Confirmation dialog before destructive actions
- Proper form validation with error messages
- Backend endpoint exists BEFORE frontend calls it
```

## THE COMPLETENESS TEST

Before marking ANY feature as done, ALL must be true:

1. Can a user CREATE a new item? -> Works end-to-end (UI -> API -> DB)
2. Can a user READ/LIST items? -> Fetches from real API with pagination
3. Can a user UPDATE an item? -> Persists to database
4. Can a user DELETE an item? -> Soft-delete with confirmation dialog
5. Does error handling work? -> Shows real error messages
6. Does empty state work? -> Proper empty state UI when no data

## NEVER HIDE — ALWAYS BUILD

```
OLD RULE (wrong):  "If too complex, hide the UI element"
NEW RULE (correct): "If it needs backend, BUILD the backend. Then build the UI."
```

There is NO excuse for skipping backend work. Every feature ships COMPLETE.
