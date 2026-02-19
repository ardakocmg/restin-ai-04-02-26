# 🚨 RESTIN.AI — MASTER RULES (For All Antigravity Agents)

> **IMPORTANT:** If you are a new Antigravity agent on a different PC, READ THIS FILE FIRST.
> These are the project's immutable rules. Follow them without exception.
> Also read all workflows in `.agent/workflows/` — especially `dual-pc.md`.

---

## I. FOUNDATION & CODE QUALITY

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

## II. CORE BUSINESS LOGIC (CLONING PARITY)

1. **Parity Principle:** Clone the logic/workflow of leaders (Lightspeed/Apicbase), NOT their branding.
2. **Multi-Tenancy:** Hierarchy: `Organization` -> `Brand` -> `Branch`.
3. **Inventory:** Support Central Kitchen transfers and Recipe Engineering.
4. **POS Core:** Hybrid Touch + Keyboard support. Course Management (Hold/Fire).
5. **Aggregators:** Native support for Wolt/Bolt/UberEats (White-labeled).
6. **Fiscal:** Audit Logs & `fiscal_status` flags for every transaction (Malta/Exo).
7. **Time:** Backend UTC. Frontend `Europe/Malta`.
8. **Polyglot:** NO hardcoded strings. Use `i18next` (`t('key')`). Support Kitchen vs Service languages.

## III. INFRASTRUCTURE & RESILIENCE

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

## IV. ADVANCED HARDWARE & IOT

1. **Edge Bridge:** Localhost bridge for raw ESC/POS printing (No PDF dialogs).
2. **Native Wrapper:** Capacitor/Expo for iOS/Android (Haptics, Biometrics, Push).
3. **IoT Sentinel:** Predictive maintenance trackers for coffee machines/ovens.
4. **Auto-Discovery:** mDNS/Bonjour to find printers without manual IP entry.
5. **Voice Ops:** Wake-word / Push-to-Talk for KDS (Web Speech API).
6. **Guest Mode:** App Clips / Instant Apps support via NFC (Zero install).
7. **Mesh Network:** Peer-to-Peer (WebRTC) sync between devices without Internet.

## V. INTELLIGENCE & HUMANITY

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

## VI. COMMERCIAL & LEGAL (SAAS)

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

## VII. STABILITY & EXCELLENCE

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

## VIII. THE COMPLETENESS PROTOCOL

1. **Deep Completion:** NEVER build a UI without the supporting backend logic. If a button exists, it MUST work.
2. **No "Happy Path" Only:** Handle edge cases, errors, and loading states immediately.
3. **No Ghost Features:** If a feature is too complex for now, hide it. Do not leave "Coming Soon" or non-functional UI elements unless explicitly requested.
4. **Full Stack Integrity:** A task is ONLY done when the Database, API, Logic, and UI are all synchronized and functional.
5. **Deep Integration & Relations:** When building a module, ensure all related entities are linked in schema and logic.
6. **Reporting Readiness:** A feature is not complete until its data is queryable and visualizable.
7. **Evolutionary Architecture:** NEVER delete a working feature. Improve, Refactor, or Deprecate, but do not remove capability.
8. **Data Sanctity:** ZERO DATA LOSS. Migrations must be additive. Deletions are strictly soft-deletes (`deletedAt`).
9. **Structure Hygiene:** STOP & LOOK before creating new Pages or Sidebar items. Audit existing navigation first.
10. **Unified Data State:** MongoDB Local and Atlas MUST be fully integrated and synchronized.
11. **Transparency & Traceability:** BEFORE starting work, add your understanding to `task.md`.

---

## 🪐 MASTER PLAN: PILLAR ARCHITECTURE

| Pillar | Name | Description |
|--------|------|-------------|
| 0 | **Commercial Engine** | Billing, Subscription Plans, AI Broker, Storage Billing |
| 1 | **AI Infrastructure** | Vendor-agnostic AI (Google-first), Model selection, Grounding |
| 2 | **Web Architect** | Drag & Drop website synced with Inventory |
| 3 | **Autopilot CRM** | Autonomous retention, churn detection, personalized campaigns |
| 4 | **Voice AI** | 24/7 Receptionist, RAG system, call logging |
| 5 | **Studio** | Generative content with Reality-First Protocol |
| 6 | **Deep Intelligence** | Market Radar, Allergen Guard, Yield Management |
| 7 | **Ops & Aggregator** | UberEats/Wolt injection, Smart HR |
| 8 | **Fintech** | Omni-payment, Kiosk Mode, Split Pay |

---

## 🛡️ DUAL-PC DEVELOPMENT RULES

> See `.agent/workflows/dual-pc.md` for detailed workflow.

1. **Always check `.worklock`** before editing any file
2. **Always `git pull`** before starting work
3. **Lock files** you're working on via `.\scripts\worklock.ps1 lock`
4. **Push immediately** after every commit
5. **Small atomic commits** — don't batch 20 files
6. **Unlock when done** via `.\scripts\worklock.ps1 unlock`
