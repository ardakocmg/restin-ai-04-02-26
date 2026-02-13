# Restin.AI — Active Task List
>
> Last Updated: 2026-02-13 02:19 CET

## Session: API Stability & App Health (Feb 13, 2026)

### ✅ COMPLETED: API Endpoint Mismatches

- [x] Fix double `/api/` prefix in 7 files (POSSalesReport, ProductionManagement, StockTransfers, RecipeManagement, MonitoringDashboard, AddClockEntry, ForecastingDashboard)
- [x] Fix incorrect endpoint paths in 8 files (ManualClocking, ApprovalSettings, EmployeesSetupPage, 5x HR Reports)
- [x] Fix ApprovalSettings venueId source (`user?.venueId` → `useVenue().activeVenueId`)

---

### TASK 1: Fix DesignSystemContext.tsx Crash 🔴 CRITICAL

- **Status:** 🔲 In Progress
- **Problem:** TypeError crashes originating from DesignSystemContext.tsx prevent app from loading
- **Impact:** Entire application is non-functional
- **Files:** `frontend/src/context/DesignSystemContext.tsx`

### TASK 2: Start Dev Servers & Smoke Test 🟡 HIGH

- **Status:** 🔲 Pending
- **Problem:** Need to verify all API endpoint fixes work end-to-end
- **Steps:**
  - Start backend (Python/FastAPI on port 8000)
  - Start frontend (React on port 3000)
  - Verify login flow works
  - Check key pages load without 404s

### TASK 3: Clean Unused Imports 🟢 MEDIUM

- **Status:** 🔲 Pending
- **Problem:** 100+ eslint warnings for unused imports across modified files
- **Files:** All files touched in this session + other flagged files

### TASK 4: Implement Missing Backend Endpoints 🟡 HIGH

- **Status:** 🔲 Pending
- **Problem:** Frontend calls endpoints that don't exist on the backend
- **Known Missing:**
  - `GET /api/pos/dashboard` — POSDashboard.jsx depends on this
  - Verify `/api/reports/pos-sales` exists
  - Verify `/api/forecasting/weekly` and `/api/forecasting/summary` exist
  - Verify `/api/system/health` exists
