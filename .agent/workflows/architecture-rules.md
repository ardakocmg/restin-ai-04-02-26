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

---

## Rule 14: STRICT TYPESCRIPT — ZERO TOLERANCE 🔒

`tsconfig.json` has `"strict": true`. **ALL code MUST compile with zero errors.**

### 14a. Component Props Interface

Every component MUST have a typed props interface:

```tsx
// ❌ FORBIDDEN — implicit any on props
function OrderCard({ order, onSave }) { ... }

// ✅ REQUIRED — explicit interface
interface OrderCardProps {
    order: Order;
    onSave: (order: Order) => void;
}
function OrderCard({ order, onSave }: OrderCardProps) { ... }
```

### 14b. useState Must Be Typed

When initial value doesn't convey the full type, add a generic:

```tsx
// ❌ FORBIDDEN — infers never[]
const [items, setItems] = useState([]);

// ✅ REQUIRED — explicit generic
const [items, setItems] = useState<OrderItem[]>([]);
```

### 14c. No Implicit `any`

All callback parameters must be typed:

```tsx
// ❌ FORBIDDEN
items.map(item => item.name)
onClick={(e) => handleClick(e)}

// ✅ REQUIRED
items.map((item: OrderItem) => item.name)
onClick={(e: React.MouseEvent) => handleClick(e)}
```

### 14d. Style Objects Must Be Typed

```tsx
// ❌ FORBIDDEN — untyped object
const s = { root: { display: 'flex', flexDirection: 'column' } };

// ✅ REQUIRED — typed as CSSProperties
const s: Record<string, React.CSSProperties> = {
    root: { display: 'flex', flexDirection: 'column' },
};
```

### 14e. Pre-Commit Enforcement

`npx tsc --noEmit` must exit with code 0. **Any TS error blocks commit.**

---

## Rule 15: NO HARDCODED COLORS IN TSX 🎨

All colors in `.tsx` component files MUST use CSS variables from the design system. No raw hex, rgb, or hsl values.

```tsx
// ❌ FORBIDDEN in TSX files
style={{ backgroundColor: '#1a1a1a', color: '#fff', border: '1px solid #333' }}

// ✅ REQUIRED — use CSS variables
style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}

// ✅ BEST — use CSS classes
className="pos-card"
```

**Exceptions:**

- CSS files (`.css`) that define the variables themselves
- Keyframe animations
- SVG fills that reference design tokens

**Available CSS variable families:**

- `--bg-*` (primary, secondary, card, hover)
- `--text-*` (primary, secondary, muted)
- `--border-*` (primary, secondary)
- `--accent-*` (primary, success, warning, danger)

---

## Rule 16: NO INLINE STYLES IN TSX 🚫

`style={{}}` is BANNED in JSX. All visual styling must use Tailwind CSS classes.

```tsx
// ❌ FORBIDDEN — inline style with hardcoded values
<div style={{ padding: '24px 32px', fontSize: 28, color: '#f1f5f9' }}>

// ✅ REQUIRED — Tailwind classes
<div className="p-6 px-8 text-3xl text-slate-100">

// ✅ EXCEPTION — dynamic runtime values (mark with // keep-inline)
<div style={{ width: `${percent}%` }}> {/* keep-inline */}
<div style={{ top: contextMenu.y, left: contextMenu.x }}> {/* keep-inline */}
```

**Rules:**

- NEVER use `style={{}}` for padding, margin, font-size, color, border, display, gap
- Use Tailwind's arbitrary value syntax for dynamic colors: `className="bg-[#6366f1]"` not `style={{ backgroundColor: '#6366f1' }}`
- **Only exception**: Values computed at runtime that CANNOT be expressed as Tailwind classes
- Mark all legitimate exceptions with `// keep-inline` comment
- ESLint custom rule `restin-guardrails/no-inline-styles` enforces this automatically
- Pre-commit check 8.6 scans for violations

---

## Rule 17: ACCESSIBILITY — MANDATORY LABELS 🦮

All interactive elements MUST have accessible text. Screen readers and automated linting require this.

### 17a. Icon-Only Buttons MUST Have `aria-label`

```tsx
// ❌ FORBIDDEN — button has no text, screen reader says "button"
<Button size="icon" onClick={handleClose}>
    <X className="h-4 w-4" />
</Button>

// ✅ REQUIRED — add aria-label
<Button size="icon" onClick={handleClose} aria-label="Close">
    <X className="h-4 w-4" />
</Button>

// ✅ ALSO OK — use title attribute
<Button size="icon" onClick={handleClose} title="Close">
    <X className="h-4 w-4" />
</Button>
```

### 17b. Form Inputs MUST Have Labels

```tsx
// ❌ FORBIDDEN — input with no label
<input type="text" value={name} onChange={...} />

// ✅ REQUIRED — use aria-label or <label>
<input type="text" value={name} onChange={...} aria-label="Employee name" />

// ✅ ALSO OK — wrap with <label>
<label>
    Employee Name
    <input type="text" value={name} onChange={...} />
</label>
```

### 17c. Select Elements MUST Have Accessible Names

```tsx
// ❌ FORBIDDEN — select with no name
<select value={dept} onChange={...}>...</select>

// ✅ REQUIRED
<select value={dept} onChange={...} aria-label="Department">...</select>
```

**Rules:**

- EVERY `<Button>` with only icon children MUST have `aria-label` or `title`
- EVERY `<input>`, `<textarea>`, `<select>` MUST have `aria-label`, `placeholder`, `title`, or an associated `<label>`
- Pre-commit check 16 and 8.7 scan for violations
