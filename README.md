# 🪐 Antigravity OS (Protocol v17.1)

**The World's Most Advanced Restaurant Operating System.**
*Built by the MG Group Algorithm.*

## 📜 The Constitution (72 Immutable Laws)

### I. Foundation & Code Quality

1. **Strict Stack:** TypeScript (`.tsx`) ONLY. `any` type is FORBIDDEN.
2. **UI/UX:** Mobile-First, Dark Mode Mandatory (`dark:`), Shadcn/Zinc Palette.
3. **State:** Zustand for Global State. React Query for Server State. No Prop Drilling > 2 levels.
4. **Math:** All monetary values MUST be Integers (Cents). Use `/utils/calculations.ts` for logic.
5. **Hardware:** Wrap all device calls (Printer, Scanner) in `try/catch`.
6. **Performance:** Virtualize all lists > 50 items.
7. **Validation:** Use `zod` schemas for ALL inputs and API responses.
8. **Logging:** Structured logging (`logger.error`) only. No `console.log`.
9. **Interactivity:** All dashboard widgets must be clickable deep-links.
10. **Layout:** Standardized Command Bar and Filter Strip across all pages.
11. **Data Seeding:** Use a single Master JSON Seed for dev/test/prod consistency.

### II. Core Business Logic

12. **Parity Principle:** Clone the logic/workflow of leaders (Lightspeed/Apicbase), NOT their branding.
2. **Multi-Tenancy:** Hierarchy: `Organization` -> `Brand` -> `Branch`.
3. **Inventory:** Support Central Kitchen transfers and Recipe Engineering.
4. **POS Core:** Hybrid Touch + Keyboard support. Course Management (Hold/Fire).
5. **Aggregators:** Native support for Wolt/Bolt/UberEats (White-labeled).
6. **Fiscal:** Audit Logs & `fiscal_status` flags for every transaction (Malta/Exo).
7. **Time:** Backend UTC. Frontend `Europe/Malta`.
8. **Polyglot:** NO hardcoded strings. Use `i18next` (`t('key')`). Support Kitchen vs Service languages.

### III. Infrastructure & Resilience

20. **Offline-First:** 4-Stage Sync: Optimistic UI -> IndexedDB -> Queue -> Cloud.
2. **Zero-Trust:** Row Level Security (RLS) mandatory. Encrypt sensitive columns (PII).
3. **API-First:** Internal Event Bus must trigger external Webhooks.
4. **Serverless:** Architecture must scale to zero (Vercel/Cloudflare).
5. **Asset Opt:** Auto-convert uploads to WebP/AVIF.
6. **Self-Healing:** Client auto-resets Local DB on corruption detection.
7. **Data Janitor:** Auto-archive old data to cold storage.
8. **Feature Flags:** Progressive rollout system for all new features.
9. **Chaos Ready:** Frontend must handle random API latency/failures gracefully.
10. **Traffic Control:** Batch sync requests to prevent DDOS after offline recovery.

### IV. Advanced Hardware & IoT

30. **Edge Bridge:** Localhost bridge for raw ESC/POS printing (No PDF dialogs).
2. **Native Wrapper:** Capacitor/Expo for iOS/Android (Haptics, Biometrics, Push).
3. **IoT Sentinel:** Predictive maintenance trackers for coffee machines/ovens.
4. **Auto-Discovery:** mDNS/Bonjour to find printers without manual IP entry.
5. **Voice Ops:** Wake-word / Push-to-Talk for KDS (Web Speech API).
6. **Guest Mode:** App Clips / Instant Apps support via NFC (Zero install).
7. **Mesh Network:** Peer-to-Peer (WebRTC) sync between devices without Internet.

### V. Intelligence & Humanity

37. **AI Copilot:** "Ask Data" interface. Actionable AI (can execute refunds).
2. **Gamification:** Staff Leaderboards, Quests, and Daily Goals.
3. **Eco-OS:** Carbon Footprint tracking for waste management.
4. **Hive Mind:** Context-aware Chat (`#Order123`) & Walkie-Talkie (PTT).
5. **Micro-Tasking:** Tinder-style task completion for staff (Asana-lite).
6. **Tribal Knowledge:** Video-bites attached to recipes for staff training.
7. **Academy:** Integrated LMS. Mandatory video tutorials before using new features.
8. **Spatial Awareness:** Drag & Drop Floorplan with Heatmaps.
9. **Adaptive UX:** UI simplifies or expands based on user expertise level.
10. **Accessibility:** WCAG 2.2 Compliance (Screen Readers, Colorblind safety).

### VI. Commercial & Legal (SaaS)

47. **SaaS Gating:** Code-level feature locking based on Subscription Plan.
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

### VII. Stability & Excellence

60. **Universal Config:** JSON-Schema driven settings generation.
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

## 🏛️ The 5-Phase Architecture

### Phase 1: The Foundation (Protocol v17.0)

* **Omniscient Schema:** Prisma schema covering Multi-Tenancy, Inventory, and Compliance.
* **Universal Config:** Zod-typed JSON configuration engine with "Deep Merge" and SaaS feature gating.
* **Zero-Trust Security:** Hybrid Auth (Web/POS), AES-256 Vault, and RBAC Guard.

### Phase 2: The Logic (Parity & Offline)

* **Inventory Intelligence:** Recursive Recipe Costing (Apicbase Parity) and Precise Unit Math.
* **Offline-First POS:** IndexedDB (Dexie) local database with "Sync Queue" and Fiscal Guard.
* **Hardware Bridge:** Abstracted ESC/POS printing with Auto-Failover strategies.

### Phase 3: The Brain (Connectivity)

* **4-Stage Sync Engine:** Bi-directional sync with Optimistic UI, Batching, and Exponential Backoff.
* **KDS & Voice Ops:** Hands-free Kitchen Display System with Web Speech API commands.
* **The Hive:** Context-aware Chat (`#Order123`), WebRTC Walkie-Talkie, and Micro-Tasking.

### Phase 4: The Shield (Compliance)

* **RegTech Engine:** Date-effective Tax Rules (VAT change safe).
* **SaaS Gating:** "FeatureGuard" component for Plan enforcement.
* **Telemetry:** Heartbeat monitoring for device health.

### Phase 5: The Soul (Experience)

* **Gamification:** XP/Leveling engine tied to sales and tasks.
* **Guest App Clips:** Lightweight (<10MB) "Pay & Go" interface.
* **Physics:** Framer Motion integration for tactile UI feel.
