---
description: Rules for testing door access / Nuki integration - avoid real device triggers
---

# Door Access Testing Rules

## ⛔ NEVER test door access endpoints via browser or API unless absolutely critical

### Why

- Door access endpoints (`/unlock`, `/lock`, `/unlatch`) trigger **real Nuki API calls** that physically operate smart locks.
- Accidentally spamming unlock/lock commands wastes API quota and can cause physical security issues.

### Rules

1. **Do NOT** click Unlock/Lock/Unlatch buttons in the browser during testing.
2. **Do NOT** call `/api/access-control/doors/{door_id}/unlock` (or lock/unlatch) endpoints in test scripts.
3. If a fix **must** be verified against a real door, use **only** `door-1cd15673` (Sonata 0) and limit to **one single call**.
4. For permission/auth logic testing, verify using **read-only** endpoints like `/doors`, `/permissions`, `/audit-logs` instead.
5. If backend logic changes are made to `check_permission` or `execute_door_action`, verify correctness by reading the code — not by triggering real actions.

---

## ⚡ General Quality Rules

- **No Animation Delays:** NEVER use `setTimeout` to gate login, navigation, or submissions. Instant callbacks only.
- **No 404 Before Commit:** Every UI route/link MUST have a working backend + page. Fix or hide before commit.
