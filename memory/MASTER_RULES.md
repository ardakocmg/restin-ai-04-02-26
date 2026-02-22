# 🚨 RESTIN.AI — MASTER ARCHITECT PROTOCOL v18.0

## IMMUTABLE LAWS — ALL 106 RULES

---

## I. FOUNDATION & CODE QUALITY (Rules 1–11)

1. **Strict Stack:** Frontend: TypeScript (`.tsx`) ONLY. Backend: Python (FastAPI). `any` is FORBIDDEN.
2. **UI/UX:** Mobile-First, Dual Theme Support (Light & Dark), Shadcn/Zinc Palette.
3. **State:** Zustand for Global State. React Query for Server State. No Prop Drilling > 2 levels.
4. **Math:** POS Values: Integers (Cents). Billing/AI Rates: High-Precision Decimals allowed. Use `/utils/calculations.ts`.
5. **Hardware:** Wrap all device calls (Printer, Scanner) in `try/catch`.
6. **Performance:** Virtualize all lists > 50 items.
7. **Validation:** Use `zod` schemas for ALL inputs and API responses.
8. **Logging:** Structured logging (`logger.error`) only. No `console.log`.
9. **Interactivity:** All dashboard widgets must be clickable deep-links.
10. **Layout:** Standardized Command Bar and Filter Strip across all pages.
11. **Data Seeding:** Use a single Master JSON Seed for dev/test/prod consistency.

---

## II. CORE BUSINESS LOGIC — CLONING PARITY (Rules 12–19)

1. **Parity Principle:** Clone the logic/workflow of leaders (Lightspeed/Apicbase), NOT their branding.
2. **Multi-Tenancy:** Hierarchy: `Organization` -> `Brand` -> `Branch`.
3. **Inventory:** Support Central Kitchen transfers and Recipe Engineering.
4. **POS Core:** Hybrid Touch + Keyboard support. Course Management (Hold/Fire).
5. **Aggregators:** Native support for Wolt/Bolt/UberEats (White-labeled).
6. **Fiscal:** Audit Logs & `fiscal_status` flags for every transaction (Malta/Exo).
7. **Time:** Backend UTC. Frontend `Europe/Malta`.
8. **Polyglot:** NO hardcoded strings. Use `i18next` (`t('key')`). Support Kitchen vs Service languages.

---

## III. INFRASTRUCTURE & RESILIENCE (Rules 20–29)

1. **Offline-First:** 4-Stage Sync: Optimistic UI -> IndexedDB -> Queue -> Cloud.
2. **Zero-Trust:** Row Level Security (RLS) mandatory. Encrypt sensitive columns (PII).
3. **API-First:** Internal Event Bus must trigger external Webhooks.
4. **Deployment Trinity:** Frontend -> **Vercel**. Backend -> **Render**. Database -> **MongoDB Atlas**. NO EXCEPTIONS.
5. **Asset Opt:** Auto-convert uploads to WebP/AVIF.
6. **Self-Healing:** Client auto-resets Local DB on corruption detection.
7. **Data Janitor:** Auto-archive old data to cold storage.
8. **Feature Flags:** Progressive rollout system for all new features.
9. **Chaos Ready:** Frontend must handle random API latency/failures gracefully.
10. **Traffic Control:** Batch sync requests to prevent DDOS after offline recovery.

---

## IV. ADVANCED HARDWARE & IOT (Rules 30–36)

1. **Edge Bridge:** Localhost bridge for raw ESC/POS printing (No PDF dialogs).
2. **Native Wrapper:** Capacitor/Expo for iOS/Android (Haptics, Biometrics, Push).
3. **IoT Sentinel:** Predictive maintenance trackers for coffee machines/ovens.
4. **Auto-Discovery:** mDNS/Bonjour to find printers without manual IP entry.
5. **Voice Ops:** Wake-word / Push-to-Talk for KDS (Web Speech API).
6. **Guest Mode:** App Clips / Instant Apps support via NFC (Zero install).
7. **Mesh Network:** Peer-to-Peer (WebRTC) sync between devices without Internet.

---

## V. INTELLIGENCE & HUMANITY (Rules 37–46)

1. **AI Copilot:** "Ask Data" interface. Actionable AI (can execute refunds).
2. **Gamification:** Staff Leaderboards, Quests, and Daily Goals.
3. **Eco-OS:** Carbon Footprint tracking for waste management.
4. **Hive Mind:** Context-aware Chat (`#Order123`) & Walkie-Talkie (PTT).
5. **Micro-Tasking:** Tinder-style task completion for staff (Asana-lite).
6. **Tribal Knowledge:** Video-bites attached to recipes for staff training.
7. **Academy:** Integrated LMS. Mandatory video tutorials before using new features.
8. **Spatial Awareness:** Drag & Drop Floorplan with Heatmaps.
9. **Adaptive UX:** UI simplifies or expands based on user expertise level.
10. **Accessibility:** WCAG 2.2 Compliance (Screen Readers, Colorblind safety).

---

## VI. COMMERCIAL & LEGAL — SAAS (Rules 47–59)

1. **SaaS Gating:** Code-level feature locking based on Subscription Plan.
2. **White-Label:** No competitor names in code. Generic naming only.
3. **Forensics:** Immutable Audit Trail with Geo-location for sensitive actions.
4. **Dynamic Pricing:** Rules engine for Happy Hours/Surge pricing.
5. **CDP Flywheel:** Link every order to a Guest Profile.
6. **Procurement:** Auto-generate POs to suppliers on low stock.
7. **Auto-HACCP:** Digital Food Safety Checklists (Compliance).
8. **RegTech:** Monitor legislative changes (Tax/Labor) and auto-suggest config updates.
9. **Impact Analysis:** Simulate policy changes before applying.
10. **Embedded Finance:** Loan eligibility scoring based on POS data.
11. **Provenance:** Blockchain tracing for premium ingredients.
12. **Data Sovereignty:** "Export Everything" button for customer freedom.
13. **Plugin SDK:** Allow 3rd party developers to extend the core.

---

## VII. STABILITY & EXCELLENCE (Rules 60–72)

1. **Universal Config:** JSON-Schema driven settings generation.
2. **Lazy Loading:** Component-level code splitting to keep bundles small.
3. **Circuit Breakers:** Isolate module failures (Chat death != POS death).
4. **Setup Wizard:** Hide complexity based on business type during onboarding.
5. **Golden Dataset:** Math must match competitor outputs exactly (Unit Test verified).
6. **Doc-Driven Logic:** Reverse engineer logic from competitor help centers.
7. **Shadow Mode:** Ability to run parallel to legacy systems for verification.
8. **Control Tower:** Super-Admin impersonation and remote diagnostics.
9. **Living Docs:** Auto-generated Storybook & Swagger.
10. **Physics:** Use `framer-motion` for tactile, realistic UI feel.
11. **Legal Timeline:** Version control for business logic changes.
12. **Shadow Test:** Unit tests must prove parity with legacy exports.
13. **Migration Bridge:** Full data import capability from major competitors.

---

## VIII. THE COMPLETENESS PROTOCOL (Rules 73–83)

1. **Zero Hardcoded Secrets:** NEVER write real credentials in source code. ALL secrets → `os.environ.get()` / `process.env`. Scripts MUST abort if env var missing. Pre-commit hook enforces.
2. **Credential File Hygiene:** One-off scripts → `.gitignore`. Log files → `.gitignore`. Verify before commit.
3. **Encryption Standards:** Fernet (AES-128-CBC) for at-rest tokens. PBKDF2-HMAC-SHA256 for passwords. XOR/Base64 are NOT encryption.
4. **Deep Completion:** NEVER build a UI without the supporting backend logic. If a button exists, it MUST work.
5. **No "Happy Path" Only:** Handle edge cases, errors, and loading states immediately.
6. **No Ghost Features:** If a feature is too complex for now, hide it. Do not leave "Coming Soon" or non-functional UI.
7. **Full Stack Integrity:** A task is ONLY done when Database, API, Logic, and UI are all synchronized.
8. **Deep Integration & Relations:** All related entities MUST be linked in schema and logic. No siloed data.
9. **Reporting Readiness:** A feature is not complete until its data is queryable in Reports.
10. **Evolutionary Architecture:** NEVER delete a working feature. Improve, Refactor, or Deprecate. Always build UP.
11. **Data Sanctity:** ZERO DATA LOSS. Migrations additive. Deletions are soft-deletes (`deletedAt`).

---

## IX. SECURITY PROTOCOL (Rules 84–88)

1. **Rate Limiting Tiers:** Auth endpoints: 20 req/min. Payment: 60 req/min. General: 2000 req/min.
2. **JWT Strength:** 64+ random characters in production. Startup validates strength.
3. **Audit Everything:** Login attempts, permission changes, data exports — all logged.
4. **Backward Compat:** New encryption MUST read legacy formats. Never break existing data.
5. **Structure Hygiene:** STOP & LOOK before creating new Pages/Sidebar items. Audit existing navigation first.

---

## X. DATA & ENVIRONMENT (Rules 89–92)

1. **Unified Data State:** MongoDB Local and Atlas MUST be synchronized. Data integrity paramount.
2. **Transparency:** BEFORE starting work, add understanding to `task.md`. Task list = source of truth.
3. **Deployment Trinity:** Frontend → Vercel. Backend → Render. Database → MongoDB Atlas. NO EXCEPTIONS.
4. **Time Zones:** Backend always UTC. Frontend always `Europe/Malta`. No exceptions.

---

## XI. PREMIUM UI & TABLE STANDARDS (Rules 93–100)

1. **Enterprise-Grade Tables:** Every data table MUST look like it belongs in Salesforce/HubSpot. Requirements:
   - Alternating row shading (subtle, theme-aware)
   - Sticky header with sort indicators
   - Row hover highlight with smooth transition
   - Column resizing handles
   - Proper number/currency alignment (right-aligned)
   - Status badges with semantic colors (not plain text)
   - Truncated text with tooltip on hover
   - Empty state with illustration, not just "No data"

2. **Stat Cards Above Tables:** Every list page MUST have summary stat cards (KPI bar) above the table showing:
   - Total count
   - Key metric (revenue, active %, etc.)
   - Trend indicator (↑↓) where applicable
   - Cards MUST be clickable (filter the table below)

3. **No Bare Text Values:** Monetary values → formatted with currency symbol (`€1,234.56`). Dates → relative ("2 hours ago") + tooltip with full date. Percentages → with color coding (green > target, red < target). Status fields → colored badges, never plain text.

4. **Micro-Animations Required:** Table row entrance → subtle fade-in. Stat card count-up → animated number. Sort change → smooth column transition. Filter apply → brief skeleton then data. Button clicks → ripple effect.

5. **Dark Mode Parity:** Every UI element MUST look equally premium in both Light and Dark mode. No washed-out colors, no invisible borders, no unreadable text. Test BOTH themes before marking complete.

6. **Loading States — No Lazy Shortcuts:** Use shimmer/skeleton loaders that match the EXACT layout of the content they replace (not generic gray rectangles). Error states MUST have a retry button + human-readable message.

7. **Responsive Tables:** Tables MUST be usable on tablet (1024px). On mobile (<768px), tables should collapse into card view or use horizontal scroll with frozen first column.

8. **Typography Hierarchy:** Page title → `text-2xl font-bold`. Section headers → `text-lg font-semibold`. Table headers → `text-xs font-medium uppercase tracking-wider text-muted-foreground`. Data cells → `text-sm`. Always use Inter/system font stack.

---

## XII. DATA INTEGRITY & REALISM (Rules 101–106)

1. **ZERO MOCK DATA:** NEVER use placeholder/dummy/lorem data in any UI. If a field says "John Doe" or "Lorem ipsum" or "Test Item" — it is WRONG. All visible data must come from the database or be seeded with realistic values.

2. **Realistic Seeding Standard:** When seeding data for development/testing, use Malta-specific realistic data:
   - **Names:** Real Maltese names (Borg, Camilleri, Vella, Grech, Farrugia, Zammit, Attard, Mifsud, Spiteri, Galea)
   - **Phone numbers:** `+356 7xxx xxxx` or `+356 2xxx xxxx` format
   - **Addresses:** Real Maltese locations (Valletta, Sliema, St. Julian's, Mdina, Rabat, Birgu, Marsaxlokk)
   - **Currency:** EUR (€), cent-based integers internally
   - **Menu items:** Real restaurant dishes with realistic prices (not ‪$1.00 test items)
   - **Dates:** Recent realistic date ranges, not "2020-01-01"

3. **Auto-Seed on Empty State:** When a page loads and the database collection is empty, the UI should show a compelling empty state with:
   - An illustration or icon (not just text)
   - A "Get Started" or "Import Data" action button
   - Optionally: a "Seed Sample Data" button for dev/demo mode (behind feature flag)

4. **No Orphan Pages:** If a page exists in the sidebar, it MUST show real data or a proper empty state. Pages that show nothing, return errors, or crash are UNACCEPTABLE. Fix the data source before shipping the UI.

5. **Seed Script Standard:** All seed scripts MUST:
   - Generate at least 7-30 days of historical data (not just "today")
   - Use randomized but realistic values (not all identical)
   - Create proper relationships between entities (orders → guests → venues)
   - Include edge cases (cancelled orders, no-shows, partial payments)
   - Read credentials from env vars (Rule 73)

6. **Visual Proof Required:** When building or modifying a table/page, the work is NOT complete until:
   - The table displays real (or realistically seeded) data
   - All columns render correctly (no `[object Object]`, no `undefined`, no `NaN`)
   - Sorting works on at least 2 columns
   - The page looks good in both Light and Dark mode
   - Stat cards (if present) show correct aggregated numbers

---

## XIII. FLEXIBLE THEMING, BRANDING & ESLINT GUARDRAILS (Rules 107–114)

1. **No Hardcoded Brand Colors:** NEVER use raw hex codes (`#FF0000`, `#3B82F6`) in JSX. Use Tailwind semantic tokens (`text-foreground`, `bg-card`, `border-border`, `text-muted-foreground`). Status colors (`emerald/yellow/red-400`) allowed — they encode meaning, not branding.
2. **No Hardcoded Logos/Names:** Dashboard titles, logos, brand names → tenant config or i18n. White-label ready at all times.
3. **Theme-Aware Colors:** Every `bg-` class MUST have a `dark:` counterpart OR use semantic tokens. `restin-guardrails/no-hardcoded-colors` ESLint rule enforces.
4. **TypeScript Soft Enforcement:** `strict: false` in tsconfig (legacy compat). Quality via ESLint: `@typescript-eslint/no-explicit-any` → warn, `no-console` → warn.
5. **ESLint > Compiler:** ESLint is primary code quality gate. AI agent NEVER uses `any` — rule is for human devs.
6. **Hyperscale Dashboard Config:** Widget panel colors → dynamic theme tokens. Status semantics (`emerald`/`yellow`/`red`) allowed.
7. **Style Inline Exception:** `style={{}}` ONLY for dynamic values (width %, positions). Mark `/* keep-inline */`. ESLint enforces.
8. **Dual-PC Sync:** When rules/settings change, update `memory/PC2_SYNC.md` so second agent can pull and apply.
