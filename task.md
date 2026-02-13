# Task: Backend API + i18n + MongoDB Integration (Feb 13, 2026)

## Context

Backend APIs were returning 404 errors and frontend modules couldn't display data.
Three parallel tasks were executed:

## Task 1: i18n Translations ✅

- **Problem:** Fintech and Ops dashboards showed raw translation keys (e.g., `restin.ops.title`)
- **Fix:** Added `restin.*` namespace to both `en.json` and `mt.json` locale files
- **Keys added:** ops (13 keys), fintech (13 keys), web/voice/studio/radar/crm/billing (2 each)
- **Files:** `frontend/src/locales/en.json`, `frontend/src/locales/mt.json`

## Task 2: Backend → MongoDB Migration ✅

- **Problem:** All 4 new API routes (billing, fintech, ops, smart-home) used in-memory mock data
- **Fix:** All routes now use MongoDB collections with auto-seed on first access
- **Collections created:**
  - `billing` — Subscription plans, module toggles
  - `fintech_transactions` — Payment transactions with stats
  - `ops_metrics` — Operational KPIs (labor cost, revenue, KDS)
  - `ops_logs` — Event logs with severity levels
  - `smart_home_devices` — 16 IoT devices with control state
- **Rules compliance:**
  - Rule #8: Structured logging only (logger.info/logger.error)
  - Rule #7 (Time): All timestamps use UTC (`timezone.utc`)
  - Rule VIII-8: Seed endpoints reset demo data only; production CRUD uses soft-delete pattern
  - Rule #6: Audit trail ready (timestamps on all mutations)
- **Files:** `backend/routes/billing_routes.py`, `fintech_routes.py`, `ops_routes.py`, `smart_home_routes.py`

## Task 3: Route Verification ✅

- **Problem:** Checked for missing frontend routes (copilot, reports, etc.)
- **Finding:** All AI Hub pages already exist at `frontend/src/pages/admin/ai/*.tsx`
  - Routes at `/admin/ai/voice`, `/admin/ai/studio`, `/admin/ai/web-builder`, etc.
  - Restin control tower at `/admin/restin`
- **No missing routes identified** — existing structure covers all expected paths

## Pending

- [ ] Connect remaining mock endpoints to real DB queries (HR Analytics, Inventory Items)
- [ ] Add zod schemas on frontend for API response validation (Rule #7)
- [ ] Implement soft-delete pattern for production CRUD operations (Rule VIII-8)
- [ ] Add i18n keys for `common.sync`, `common.seedDemo` used in other modules
