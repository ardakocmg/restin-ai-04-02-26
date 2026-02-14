# Task: Premium Navigation & Layout System Overhaul

## User Request

Upgrade the sidebar, topbar, and breadcrumb navigation to a world-class premium design.
Make all navigation bars globally consistent and add intelligent breadcrumb routing.

---

## ✅ COMPLETED: Settings & Sidebar Refactoring (2026-02-14)

### What Was Done:

1. **Sidebar Audit** — Full audit of all MENU_ITEMS in `searchRegistry.ts`
2. **Moved to System Admin** (PRODUCT_OWNER only):
   - Observability (was Home)
   - Pre-Go-Live (was POS)
   - Audit Logs (was Finance)
   - Billing & Plans (was Org)
   - Feature Flags (was Org)
   - Data Export (was Org)
3. **Removed Duplicates**:
   - Content Studio (org) → exists in Restin OS
   - Content Editor (org) → exists in Restin OS
   - Headcount Analysis (reports) → exists in HR Reports
   - Turnover Analysis (reports) → exists in HR Reports
   - Tasks Kanban (POS) → exists in Collab
   - Inbox (POS) → exists in Collab
4. **New: Legal Entities** page added under Org Settings
   - Backend: `routes/legal_entities.py` (CRUD + venue assignment)
   - Frontend: `pages/admin/LegalEntities.tsx`
   - Route: `/admin/legal-entities`
5. **Renamed** Company Profile → Organization Profile
6. **SettingsHub** removed from routing (orphan → replaced by VenueSettings)

### 4-Tier Hierarchy Established:
```
Organization (Marvin Gauci Group)
  ├── Legal Entity (MG Hospitality Ltd) → VAT, PE, Reg
  │   ├── Venue: Caviar & Bull
  │   └── Venue: Don Royale
  └── Legal Entity (Sole Restaurant Ltd)
      └── Venue: Sole
```

---


## 🏗️ Current State Analysis

### Files Involved

| Component | File | Lines | Status |
| --- | --- | --- | --- |
| AdminLayout | `pages/admin/AdminLayout.js` | 112 | Shell (wraps sidebar + topbar + `<Outlet>`) |
| Domain Sidebar (Active) | `layouts/NewSidebar.jsx` | 362 | 3-pane: Domain bar + Accordion + Tertiary |
| Legacy Sidebar | `layouts/Sidebar.jsx` | 371 | Old accordion-only sidebar (UNUSED) |
| Top Bar | `layouts/NewTopBar.jsx` | 493 | Venue switcher + Search + User + Status |
| Page Layout (TS) | `layouts/PageLayout.tsx` | 78 | Sticky header + filters + content area |
| Page Container (JS) | `layouts/PageContainer.jsx` | 72 | Simple header + back button + content |
| Search Registry | `lib/searchRegistry.ts` | 365 | Single source of truth for all routes/domains |

### Current Architecture

```
┌─────────────────────────────────────────────────────┐
│ AdminLayout.js                                       │
│ ┌──────────────────────┐ ┌────────────────────────┐  │
│ │  NewSidebar.jsx       │ │  Main Content Area      │ │
│ │                       │ │  ┌──────────────────┐   │ │
│ │ [Pane1: Domain Icons] │ │  │ NewTopBar.jsx     │   │ │
│ │ [Pane2: Menu List   ] │ │  │ (venue,search,user│   │ │
│ │ [Pane3: Sub-items   ] │ │  └──────────────────┘   │ │
│ │                       │ │                          │ │
│ │                       │ │  <Outlet/> (page content)│ │
│ │                       │ │  ├ PageLayout.tsx         │ │
│ │                       │ │  └ PageContainer.jsx      │ │
│ └──────────────────────┘ └────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Pain Points

1. **No Breadcrumbs** — Users have no "where am I?" indicator
2. **Two Page Wrappers** — `PageLayout.tsx` (TS) vs `PageContainer.jsx` (JS) — inconsistent
3. **NewSidebar is .jsx** — Not TypeScript, no type safety
4. **NewTopBar is .jsx** — Same issue
5. **AdminLayout is .js** — Same issue
6. **Sidebar has inline styles** — `style={}` throughout instead of CSS classes
7. **No route transition animations** — Page switches are instant/jarring
8. **Pane 3 has broken URL queries** — `type = ${sub.id}` with extra spaces
9. **Legacy Sidebar.jsx** — Still exists but unused, creates confusion
10. **Some pages use neither wrapper** — Direct `<div>` rendering in Outlet

---

## 📋 IMPLEMENTATION PLAN

### Phase 1: Foundation (TypeScript Migration + Cleanup)

#### 1.1 Delete Legacy Files

- [ ] Delete `layouts/Sidebar.jsx` (unused)
- [ ] Delete `pages/admin/AdminLayout_old.js` (unused)

#### 1.2 Convert to TypeScript

- [ ] `AdminLayout.js` → `AdminLayout.tsx` (with proper prop types)
- [ ] `NewSidebar.jsx` → `NewSidebar.tsx` (with MenuItem/Domain types from searchRegistry)
- [ ] `NewTopBar.jsx` → `NewTopBar.tsx` (with typed props)
- [ ] `PageContainer.jsx` → Merge into `PageLayout.tsx` (consolidate to one wrapper)

#### 1.3 Fix Broken Pane 3 URLs

- [ ] Fix `type = ${sub.id}` → `type=${sub.id}` (remove spaces in query params)

---

### Phase 2: Premium Breadcrumb System

#### 2.1 Create `useBreadcrumb` Hook

- [ ] Create `hooks/useBreadcrumb.ts`
- [ ] Reads current `location.pathname` and matches against `searchRegistry`
- [ ] Produces: `[{ label: 'HR & People', icon: Users, path: '/admin/hr' }, { label: 'Clocking Data', path: '/admin/hr/clocking' }]`
- [ ] Supports dynamic segments: `/admin/hr/people/:id` → `Employee #123`
- [ ] Integrates with domain mapping for root-level breadcrumb

#### 2.2 Create `<Breadcrumb>` Component

- [ ] Create `components/shared/Breadcrumb.tsx`
- [ ] Premium design: `Home › HR & People › Clocking Data`
- [ ] Each segment is clickable and navigates
- [ ] Animated chevron separators with `framer-motion`
- [ ] Current page segment is highlighted (bold + accent color)
- [ ] Truncation for mobile (show only last 2 segments)

#### 2.3 Integrate into TopBar

- [ ] Add breadcrumb below the search bar or in a dedicated row
- [ ] Shows domain icon + text path, animated on route change

---

### Phase 3: Premium Sidebar Refinement

#### 3.1 Design Upgrades (NewSidebar.tsx)

- [ ] Replace all `style={}` attributes with Tailwind classes
- [ ] Add `framer-motion` page transition animations on domain switch
- [ ] Add tooltip badges showing notification counts per domain
- [ ] Active item gets a subtle gradient glow animation (breathing effect)
- [ ] Add keyboard navigation (arrow keys to traverse menu items)
- [ ] Pane 1 domain icons: add ambient gradient blob behind active icon
- [ ] Smooth `layout` transitions with `framer-motion` for expand/collapse

#### 3.2 Smart Features

- [ ] Remember last visited page per domain (e.g., switching back to HR remembers "Clocking Data")
- [ ] Pin frequently used pages (persist to localStorage)
- [ ] Command+click opens in new tab
- [ ] Visual distinction for different item types (settings vs data pages vs dashboards)

---

### Phase 4: Premium TopBar Refinement

#### 4.1 Design Upgrades (NewTopBar.tsx)

- [ ] Add glassmorphism effect with proper `backdrop-blur` and gradient borders
- [ ] Animated system status indicator (pulse for healthy, flash for degraded)
- [ ] Notification bell with flyout panel (real count, not just dot)
- [ ] Search spotlight: `⌘K` opens full-screen command palette (overlay)
- [ ] Add clock/timezone indicator (Malta Europe/Malta)

#### 4.2 Breadcrumb Row

- [ ] Below the main topbar, add a slim breadcrumb strip
- [ ] Shows: `🏠 Home › HR & People › Clocking Data`
- [ ] Animated transitions on route change (slide-in effect)
- [ ] Quick-action buttons contextual to current page (e.g., "Export" on reports)

---

### Phase 5: Page Transition System

#### 5.1 Create `<AnimatedOutlet>` Component

- [ ] Create `components/shared/AnimatedOutlet.tsx`
- [ ] Wrap `<Outlet>` with `framer-motion` `AnimatePresence`
- [ ] Transition types:
  - Domain switch: slide left/right (depends on direction)
  - Same-domain navigation: subtle fade + slide-up
  - Sub-item navigation: crossfade
- [ ] Keep transitions fast (150–250ms) for a snappy feel

#### 5.2 Unified Page Wrapper

- [ ] Merge `PageLayout.tsx` + `PageContainer.jsx` into single `PageShell.tsx`
- [ ] Props: `title`, `description`, `actions`, `filters`, `breadcrumbOverride`, `showDate`
- [ ] Always includes the standardized Command Bar + Filter Strip
- [ ] Auto-generates breadcrumbs from route if not overridden

---

### Phase 6: Route Hygiene

#### 6.1 Audit & Deduplicate Routes

- [ ] Remove duplicate routes (e.g., `posdashboard` + `pos-dashboard`)
- [ ] Ensure all sidebar items have matching routes in App.tsx
- [ ] Remove orphan routes (routes with no sidebar entry)

#### 6.2 Consistent URL Structure

- [ ] Namespace all routes properly:
  - `/admin/pos/...` (POS & Operations)
  - `/admin/hr/...` (HR & People)
  - `/admin/inventory/...` (Inventory)
  - `/admin/finance/...` (Finance)
  - `/admin/reports/...` (Analytics)
  - `/admin/restin/...` (Restin OS)
  - `/admin/collab/...` (Collaboration)
  - `/admin/settings/...` (Settings)
- [ ] Add redirects from old paths to new paths (backward compatibility)

---

## 🎯 Execution Order

```
Phase 1.1 → Delete legacy files
Phase 1.3 → Fix Pane 3 URL bug
Phase 2   → Breadcrumb system (hook + component + integration)
Phase 5.2 → Unified PageShell.tsx (merge PageLayout + PageContainer)
Phase 3.1 → Sidebar design upgrades (remove inline styles, add motion)
Phase 4   → TopBar upgrades (glassmorphism, breadcrumb row)
Phase 5.1 → Animated page transitions
Phase 1.2 → Convert remaining files to TypeScript
Phase 3.2 → Smart sidebar features (per-domain memory, pinning)
Phase 6   → Route audit (last, to avoid breaking changes mid-work)
```

---

## 🎨 Visual Target (Premium Inspiration)

- **Sidebar**: Linear.app / Notion sidebar feel (smooth, dark, minimalist)
- **TopBar**: Vercel dashboard style (clean, functional, subtle glass)
- **Breadcrumbs**: macOS Finder path bar (clickable, animated, contextual)
- **Page Transitions**: Apple's smooth crossfade between content areas
- **Overall**: Like a $500/mo SaaS product, not a $20/mo starter tool

---

## Status

- [x] Analysis Complete
- [ ] Phase 1: Foundation
- [ ] Phase 2: Breadcrumb System
- [ ] Phase 3: Premium Sidebar
- [ ] Phase 4: Premium TopBar
- [ ] Phase 5: Page Transitions
- [ ] Phase 6: Route Hygiene
