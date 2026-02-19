---
description: Critical architecture rules - entry points, file structure, auth format
---

# 🚨 Architecture Rules (IMMUTABLE)

These rules MUST be followed in EVERY conversation. Violating them causes data loss, 404 errors, and broken features.

---

## Rule 1: SINGLE ENTRY POINT — `app.main:app`

**ALWAYS** start the backend with:

```
python -m uvicorn app.main:app --reload --port 8000
```

**NEVER** use:

- ❌ `server.py` — merged into `app/main.py` on 2026-02-15
- ❌ `server:app`
- ❌ Any other entry point

**Why:** `server.py` was the original complete entry point (150+ routers, event bus, microservices). It was copied into `app/main.py` and extended with `app.domains.*` routers, vault endpoints, and AI gateway. The file `_server_legacy.py` is kept as a backup only.

**If you need to add new routes:**

- Add them to `app/main.py` (or to the relevant `routes/*.py` file and register in `app/main.py`)
- NEVER create or modify `server.py`

---

## Rule 2: AUTH TOKEN FORMAT

The login endpoint `POST /api/auth/login/pin?pin=XXXX&app=admin` returns `accessToken`, NOT `token`:

```json
{
  "accessToken": "eyJ...",
  "user": { "name": "Arda Koc", ... },
  "allowedVenueIds": ["venue-don-royale", "venue-sole-tarragon", "venue-caviar-bull"],
  "defaultVenueId": "venue-don-royale"
}
```

When writing test scripts or API calls:

```python
token = data.get("accessToken")  # ✅ CORRECT
token = data.get("token")         # ❌ WRONG — will be empty
```

**Login PINs:**

- `0000` = Arda Koc (Product Owner)
- `1234` = Legacy Admin (may not exist in current seed)

---

## Rule 3: ROUTE REGISTRATION

All routes MUST be registered in `app/main.py`. The file has three registration zones:

1. **`api_main = APIRouter(prefix="/api")`** — routes from `routes/` directory (factory pattern)
2. **`app.include_router(...)`** — `app.domains.*` routers (direct mount, wrapped in try/except)
3. **`@app.post/get(...)`** — standalone endpoints (vault, payroll, AI)

**If a route returns 404, the FIRST thing to check is whether it's registered in `app/main.py`.**

**NEVER create a second entry point or a new `server.py`.**

---

## Rule 4: FILE STRUCTURE

```
backend/
├── app/
│   ├── main.py              ← THE ONLY entry point (1000+ lines, ALL routers)
│   ├── core/                ← App-specific config, crypto, database
│   ├── domains/             ← Domain-driven modules (hr, pos, billing, etc.)
│   └── routes/              ← Auth JWKS routes
├── routes/                  ← 70+ route files (clocking, menu, orders, etc.)
├── core/                    ← Shared core (config, database, dependencies, middleware)
├── services/                ← Business logic services
├── models/                  ← Data models (Pydantic)
├── _server_legacy.py        ← BACKUP ONLY — DO NOT USE
├── _integrity_check.py      ← System-wide test script
└── _check_data.py           ← Quick data visibility test
```

---

## Rule 5: VENUE IDs

Default venues in database:

- `venue-caviar-bull` (main test venue)
- `venue-don-royale`
- `venue-sole-tarragon`
- `venue-marvin-group`
- `GLOBAL` (legacy/shared records)

**CRITICAL:** When filtering data by venue, ALWAYS include `GLOBAL` in the filter:

```python
venue_filter = list(set(allowed_venues + ["GLOBAL"]))
query["venue_id"] = {"$in": venue_filter}
```

Otherwise legacy records (clocking, employees, etc.) will be invisible.

---

## Rule 6: PYDANTIC MODELS MUST BE RESILIENT

Database records come from multiple sources (manual entry, import, seeder, frontend).
**NEVER** make fields `required` unless absolutely necessary.

**Pattern:**

```python
class ClockingRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")  # ← ALWAYS add this
    id: str = Field(default_factory=...)
    venue_id: str                              # Required: always present
    employee_name: str                         # Required: always present
    day_of_week: Optional[str] = None          # ← Optional with default
    cost_centre: Optional[str] = None          # ← Optional with default
    status: Literal["active", "completed", "approved", "rejected", "pending"] = "completed"
```

**Rules:**

- Use `extra="ignore"` on all models so unknown fields don't crash
- Status fields must accept ALL possible values: `active`, `completed`, `approved`, `rejected`, `pending`
- Timestamps, device info, remarks → always Optional
- Only `id`, `venue_id`, and the core identity field (e.g. `employee_name`) should be required

---

## Rule 7: DATABASE ACCESS

Two database modules exist — use the correct one:

| Module | Import | Used By |
|---|---|---|
| `core.database` | `from core.database import db, get_database` | `routes/*.py`, `server.py` patterns |
| `app.core.database` | `from app.core.database import get_database` | `app/domains/*.py` patterns |

Both connect to the SAME MongoDB Atlas. Do NOT mix them in the same file.

**Connection string:** `mongodb+srv://...@cluster0.5ndlsdd.mongodb.net/restin_v2`

---

## Rule 8: CORS & MIDDLEWARE

`app/main.py` has a full middleware stack:

1. RequestIDMiddleware (inner)
2. Subdomain middleware
3. RateLimitMiddleware (2000 req/min)
4. CORSMiddleware (outer) — allows localhost:3000, 3001, 8000 + restin.ai

**NEVER** use `allow_origins=["*"]` in production. The current setup already includes all needed origins.

---

## Rule 9: EVENT BUS & MICROSERVICES

`app/main.py` startup initializes 7 microservices:

- OrderService, InventoryService, AnalyticsService
- EmailService, NotificationService, PaymentService, PayrollService

Plus: EventBus, OutboxConsumer, ScheduledTasks

**These are critical for data consistency. If startup fails, check logs for specific service errors.**

---

## Rule 10: TESTING

Always use `_integrity_check.py` to verify system health after changes:

```
python -X utf8 _integrity_check.py
```

**Expected results:**

- 28+ PASS, 0 FAIL
- Clocking Data: 1700+ records
- HR Employees: 9
- Shifts: 275
- Orders: 50
- Menus: 1, Categories: 4, Items: 24

---

## Rule 11: NO ANIMATION DELAYS ON CRITICAL PATHS

**NEVER** use `setTimeout`, `requestAnimationFrame`, or CSS transition delays to gate login, navigation, or data submission.

- ❌ `setTimeout(() => handleLoginSuccess(data), 300)` — blocks the user for no reason
- ✅ `handleLoginSuccess(data)` — instant, no waiting

**Animations may run in parallel** (e.g., a checkmark fading in) but must NEVER block the next step.

**Applies to:** Login flows, page transitions, form submissions, API callbacks, post-auth navigation.

---

## Rule 12: NO 404 PAGES BEFORE COMMIT

**NEVER** commit code that results in a 404 or broken page. If a UI button/link/route exists, its backend MUST also exist and work.

**Pre-commit checklist:**

1. If you added a frontend route → verify the backend API exists and is registered in `app/main.py`.
2. If you added a sidebar link → verify the target page component exists and is routed in `App.tsx`.
3. If a 404 is found → trace the route, find the missing handler, implement it, THEN commit.
4. If a feature is incomplete → hide the UI element (don't show a dead link).

**Rule of thumb:** If clicking something shows a 404 or blank page, the commit is NOT ready.

---

## Rule 13: LOGIN PAGE VISUALS — LOCKED 🔒

The following elements in `Login.tsx` are **FINAL** and must **NEVER** be modified:

1. **Green success animation** (`setPinSuccess(true)` + `success-pulse` CSS class + green border/glow on PIN dots)
2. **Background image** (Unsplash restaurant kitchen photo + dark overlay)
3. **Frosted glass card** (backdrop-blur, semi-transparent dark bg, shadow, border)
4. **150ms delay** between green pulse and navigation (`await new Promise(r => setTimeout(r, 150))`)

**These are approved by the product owner and are part of the brand identity.** Do not remove, replace, or "optimize" them.
