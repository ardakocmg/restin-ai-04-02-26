# Task: Sync & Integrations Consolidation (Feb 13, 2026)

## Context

Refactoring the sync and integrations pages into a unified "Integration Control Plane".
All venue/restaurant connections (POS, HR, Google, IoT, API Services) are centralized under `/admin/sync`.

## Task 1: Backend — Unified Integration API ✅

- **Problem:** SyncDashboard read from `venue_settings.integrations` but real data was in `integration_configs` (Tuya/Meross), `doors` (Nuki), and `google_settings` (Workspace).
- **Fix:** Rewrote `venue_integrations_routes.py` to read from **all 4 sources**:
  1. `integration_configs` — Tuya (CONNECTED), Meross (CONNECTED), and any new configs
  2. `doors` — Nuki Smart Lock (3 doors detected, auto-shows as CONNECTED)
  3. `google_settings` — Google Workspace domain config
  4. `venue_settings.integrations` — Legacy fallback
- **Audit trail:** Every config change writes `configured_by` (name), `configured_by_id` (user ID), `configured_at` timestamp
- **Audit logs:** Writes to `audit_logs` collection on configure/toggle actions
- **New endpoint:** `GET /venues/{id}/integrations/sync-history` — returns sync execution log
- **Soft delete:** Rule VIII-8 compliant — disables but preserves record

## Task 2: Frontend — SyncDashboard Redesign ✅

- **ProviderCard** now shows:
  - Configured by whom (user name)
  - Configured when (relative time: "3d ago")
  - Config summary (non-sensitive values like domain, device count)
  - Accent color per provider (Google blue, Stripe purple, etc.)
  - **Portal link** → directs to provider's API key management page
- **Portal URLs** added for all 16 providers:
  - Nuki: `web.nuki.io/#/pages/web-api`
  - Tuya: `iot.tuya.com`
  - Stripe: `dashboard.stripe.com/apikeys`
  - Google: `console.cloud.google.com/apis/credentials`
  - etc.
- **Configure dialog** includes portal link prominently
- **Category pills** show connected/total count (e.g., "IoT 2/4")
- **Sync History tab** loads from backend with triggered_by info

## Task 3: Route & Navigation Cleanup ✅

- `/admin/integrations` → Redirects to `/admin/sync`
- NewSidebar: Consolidated under "Integration Sync"
- Sidebar (legacy): Updated hrefs

## Verified

- [x] TypeScript: `npx tsc --noEmit` → 0 errors
- [x] Python: AST parse → OK
- [x] MongoDB data confirmed: Tuya CONNECTED, Meross CONNECTED, Nuki 3 doors

## Pending

- [ ] Add Organization/Group info to UserProfileSettings
- [ ] Create `/admin/profile/integrations` for personal Google integrations
- [ ] Owner should see their group (MG Group) and restaurants (Caviar & Bull, Don Royale, Sole by Tarragon)
