# Restin.AI Super Owner Audit Report

> Generated: 18 February 2026

---

## 1. Architecture Overview

| Area | Count |
|---|---|
| Route modules | 11 (system, hr, inventory, ai, posKds, reports, procurement, collab, public, legacy) |
| Total routes | ~120 active + 30 legacy redirects |
| Manager layout routes | ~90 (under `/manager/*`) |
| Standalone routes | POS, KDS standalone screens |
| Public routes | Login, Landing, Booking, Modules, Payroll, 404 |
| Database collections | 111 |
| Active recipes | 3,103 unique |

---

## 2. Route Permission Map

All `/manager/*` routes use `RoleRoute` consistently:

| Guard Level | Route Examples |
|---|---|
| `OWNER` | settings, billing, access-control, data-export, users, feature-flags, audit-logs, smart-home |
| `MANAGER` | dashboard, devices, printers, floor-plans, reservations, crm, analytics, reporting |
| `STAFF` | my-google, staff-gamification |

**Verdict:** Permission guards are consistently applied. No unguarded manager routes found.

---

## 3. Dashboard Files (18 found)

| File | Routed? | Status |
|---|---|---|
| `SystemDashboard.jsx` | /manager/dashboard | Active (main) |
| `HiveDashboard.tsx` | /manager/collab/chat | Active |
| `BillingDashboard.tsx` | /manager/billing | Active |
| `SmartHomeDashboard.tsx` | /manager/smart-home | Active |
| `SyncDashboard.tsx` | /manager/sync | Active |
| `MonitoringDashboard.jsx` | /manager/monitoring | Active |
| `SystemHealthDashboard.jsx` | /manager/system-health-advanced | Active |
| `GoogleSyncDashboard.tsx` | /manager/google-sync | Active |
| `GamificationDashboard.tsx` | /manager/staff-gamification | Active |
| `ForecastingDashboard.jsx` | /manager/restin/insight | Active |
| `POSDashboard.jsx` | /manager/posdashboard | Active |
| `SummaryDashboard.jsx` | /manager/hr/summary | Active |
| `FinanceDashboard.js` | /manager/finance | Active |
| **`Dashboard.tsx`** | Not routed | **ORPHAN** |
| **`Dashboard_old.js`** | Not routed | **DEAD CODE** |
| **`ForecastingDashboard.js`** | Not routed | **DUPLICATE** (.jsx version is active) |
| `TrustDashboard.jsx` | Not routed directly | Embedded in Observability |

### Action Items

- [ ] Delete `Dashboard_old.js` (dead code)
- [ ] Delete `ForecastingDashboard.js` (`.jsx` version is active)
- [ ] Review `Dashboard.tsx` — either route it or delete it

---

## 4. Legacy Redirect Coverage (30+ routes)

Legacy redirects are well-organized in `legacyRedirects.tsx`, covering:

- `/admin/*` catch-all -> `/manager/*`
- Old menu paths (documents, menu-import, guests, operations)
- Old module paths (content-studio, automations, connectors)
- Old HR paths (payroll-calculator, payroll-malta)
- Old system paths (trust, system-health, diagnostics)

**Verdict:** Clean. No orphan redirects pointing to missing targets.

---

## 5. Database Cleanup (Completed)

| Action | Result |
|---|---|
| Dropped `RecipesEngineered` | 2,859 docs removed |
| Dropped `recipes_engineered` | 37,181 docs removed |
| Active `recipes` | 3,103 docs (untouched) |
| Collections | 113 -> 111 |
| Empty collections | `device_bindings` (0), `logs` (0) |

### Potential Additional Cleanup

- [ ] `device_bindings` (0 docs — empty)
- [ ] `logs` (0 docs — empty, `system_logs` has 4,952 docs)
- [ ] `ProductionBatches` vs `production_batches` (PascalCase duplicate pattern, 1 vs 7 docs)

---

## 6. Code Quality Findings

### Stale Comments (Fixed)

- `apicbase.py:632` — Comment said "RecipesEngineered" but code used `db.recipes` -> **FIXED**
- `reset_recipes.py:18` — Same issue -> **FIXED**

### No `is_super_owner` Found

- This permission flag does not exist in the codebase.
- Current system uses role-based guards: `OWNER`, `MANAGER`, `STAFF`
- If a Super Owner concept is needed, it would require adding to the auth system.

---

## Summary

| Category | Status |
|---|---|
| Route organization | Clean (domain-based modules) |
| Permission guards | Consistent (RoleRoute on all manager routes) |
| Legacy redirects | Well-maintained (30+ clean redirects) |
| Dashboard duplication | 3 orphan files found (cleanup recommended) |
| DB collections | 2 legacy recipe collections dropped |
| Code comments | 2 stale references fixed |
