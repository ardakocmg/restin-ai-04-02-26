# Task: Premium Navigation & Layout System Overhaul

## User Request

Upgrade the sidebar, topbar, and breadcrumb navigation to a world-class premium design.
Make all navigation bars globally consistent and add intelligent breadcrumb routing.

---

## ✅ COMPLETED: Settings & Sidebar Refactoring (2026-02-14)

### What Was Done

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
6. **SettingsHub.js** — Deleted (orphan file, no longer routed)
7. **VenueSettings.js** — Refactored:
   - Removed "Legal & Branding" tab (legal info now in Legal Entities)
   - Added separate "Branding" tab (logo + accent color only)
   - Added Legal Entity dropdown in General tab (links to `/admin/legal-entities`)
8. **OrganizationProfile.tsx** — Created (replaces CompanySettings.jsx):
   - Clean TypeScript page with org-level data only
   - Sections: Company Identity, Address, Contact & Web, Regional & Tax
   - Legal Entities quick-view with navigation
   - DB-driven (no hardcoded data)
   - Route: `/admin/company-settings`
9. **Payroll ↔ Legal Entity Integration** (Backend):
   - `routes/payroll_mt.py`: shared `_resolve_employer()` helper
   - Pay Run generation embeds `employer` info (PE, VAT, name, address)
   - FS5, FS3 reports inject `employer` metadata from legal entity
   - Fallback to legacy `venue.legal_info` for backwards compatibility

### 4-Tier Hierarchy Established

```
Organization (Marvin Gauci Group)
  ├── Legal Entity (MG Hospitality Ltd) → VAT, PE, Reg
  │   ├── Venue: Caviar & Bull
  │   └── Venue: Don Royale
  └── Legal Entity (Sole Restaurant Ltd)
      └── Venue: Sole
```

### Responsibility Separation

```
📁 Organization Profile (/admin/company-settings)
   └── Org name, display name, description
   └── Registered address
   └── Contact info (tel, fax, email, website)
   └── Regional config (currency, timezone, locale)
   └── Legal Entities quick-view

📁 Venue Settings (/admin/settings)
   └── General: venue name, type, pacing, review policy, legal entity dropdown
   └── Branding: logo, accent color
   └── Zones: zone CRUD
   └── Tables: table CRUD
   └── Modules: feature toggles

📁 Legal Entities (/admin/legal-entities)
   └── Full CRUD: registered name, VAT, PE, company reg, address
   └── Venue assignment

📁 Payroll (Backend routes/payroll_mt.py)
   └── Pay Run embeds employer info from Legal Entity
   └── FS5/FS3/FS7 reports include PE/VAT from Legal Entity
```

---

## 🏗️ Current State Analysis

### Files Involved

| Component | File | Lines | Status |
| --- | --- | --- | --- |
| AdminLayout | `pages/admin/AdminLayout.js` | 105 | Shell (sidebar + topbar + breadcrumb + `<Outlet>`) |
| Domain Sidebar (Active) | `layouts/NewSidebar.jsx` | 343 | 3-pane: Domain bar + Accordion + Tertiary (cleaned) |
| ~~Legacy Sidebar~~ | ~~`layouts/Sidebar.jsx`~~ | ~~371~~ | 🗑️ DELETED |
| ~~AdminLayout_old~~ | ~~`pages/admin/AdminLayout_old.js`~~ | -- | 🗑️ DELETED |
| Top Bar | `layouts/NewTopBar.jsx` | 493 | Venue switcher + Search + User + Status |
| **Breadcrumb Hook** | `hooks/useBreadcrumb.ts` | 140 | ✅ NEW — Route→segment resolver |
| **Breadcrumb Component** | `components/shared/Breadcrumb.tsx` | 80 | ✅ NEW — Premium breadcrumb strip |
| **PageShell (Unified)** | `layouts/PageShell.tsx` | 120 | ✅ NEW — Replaces PageLayout + PageContainer |
| Page Layout (Legacy) | `layouts/PageLayout.tsx` | 78 | ⚠️ Deprecated — use PageShell |
| Page Container (Legacy) | `layouts/PageContainer.jsx` | 72 | ⚠️ Deprecated — use PageShell |
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

1. ~~**No Breadcrumbs**~~ ✅ FIXED — `useBreadcrumb` + `<Breadcrumb>` integrated into AdminLayout
2. ~~**Two Page Wrappers**~~ ✅ FIXED — Unified `PageShell.tsx` created
3. **NewSidebar is .jsx** — Not TypeScript (planned for Phase 1.2)
4. **NewTopBar is .jsx** — Same issue (planned for Phase 1.2)
5. **AdminLayout is .js** — Same issue (planned for Phase 1.2)
6. ~~**Sidebar has inline styles**~~ ✅ FIXED — All 3 `style={}` converted to Tailwind cn()
7. **No route transition animations** — Page switches are instant/jarring
8. ~~**Pane 3 has broken URL queries**~~ ✅ FIXED — `type=${sub.id}` (no spaces)
9. ~~**Legacy Sidebar.jsx**~~ ✅ DELETED
10. **Some pages use neither wrapper** — Need to migrate to PageShell

---

## 📋 IMPLEMENTATION PLAN

### Phase 1: Foundation (TypeScript Migration + Cleanup)

#### 1.1 Delete Legacy Files ✅ DONE

- [x] Delete `layouts/Sidebar.jsx` (unused)
- [x] Delete `pages/admin/AdminLayout_old.js` (unused)
- [x] Clean unused imports from AdminLayout.js (Button, pane width vars)
- [x] Clean 45+ unused icon imports from NewSidebar.jsx

#### 1.2 Convert to TypeScript

- [ ] `AdminLayout.js` → `AdminLayout.tsx` (with proper prop types)
- [ ] `NewSidebar.jsx` → `NewSidebar.tsx` (with MenuItem/Domain types from searchRegistry)
- [ ] `NewTopBar.jsx` → `NewTopBar.tsx` (with typed props)
- [x] `PageContainer.jsx` + `PageLayout.tsx` → Merged into `PageShell.tsx`

#### 1.3 Fix Broken Pane 3 URLs ✅ DONE

- [x] Fix `type = ${sub.id}` → `type=${sub.id}` (remove spaces in query params)

---

### Phase 2: Premium Breadcrumb System ✅ DONE

#### 2.1 Create `useBreadcrumb` Hook ✅

- [x] Create `hooks/useBreadcrumb.ts`
- [x] Reads current `location.pathname` and matches against `searchRegistry`
- [x] Produces: `[{ label, icon, href, isLast }]` hierarchical segments
- [x] Handles unregistered routes via URL parsing fallback
- [x] Integrates with domain mapping for root-level breadcrumb

#### 2.2 Create `<Breadcrumb>` Component ✅

- [x] Create `components/shared/Breadcrumb.tsx`
- [x] Premium design: `🏠 Home › HR & People › Clocking Data`
- [x] Each ancestor is clickable Link, current page is highlighted span
- [x] Chevron separators (lucide ChevronRight)
- [x] Current page: bold + accent color + subtle bg
- [x] Truncation for overflow (max-w + truncate)

#### 2.3 Integrate into AdminLayout ✅

- [x] Added breadcrumb strip between TopBar and `<Outlet>`
- [x] Styled: subtle bottom border + backdrop blur

---

### Phase 3: Premium Sidebar Refinement

#### 3.1 Design Upgrades (NewSidebar.jsx) ✅ DONE

- [x] Replace all `style={}` attributes with Tailwind `cn()` classes (3/3 done)
- [x] Add `framer-motion` AnimatePresence on domain switch (slide-in/out menu content)
- [x] Add notification badges showing counts per domain (red pill on Pane 1 icons)
- [x] Active item gets a breathing glow (animate-pulse on red dot)
- [x] Keyboard navigation: ↑↓ arrow keys traverse menu items, Enter to select/expand
- [x] Focus index resets on domain switch and search term changes
- [x] Pane 1 domain icons: ambient gradient blob (red-500/10 blur-xl) behind active icon
- [x] Smooth `motion.div` height transitions for expand/collapse children

#### 3.2 Smart Features ✅ DONE

- [x] Remember last visited page per domain (localStorage `restin:domain-memory`)
- [x] Pin frequently used pages (localStorage `restin:pinned-pages`, star icon on hover)
- [x] Pinned pages section at top of Pane 2 with amber styling
- [x] Cmd/Ctrl+click opens sidebar links in new tab (window.open + native Link handling)
- [x] Visual distinction: settings=amber border, dashboard=emerald, report=blue (inferred from href)

---

### Phase 4: Premium TopBar Refinement

#### 4.1 Design Upgrades (NewTopBar.jsx) ✅ DONE

- [x] Glassmorphism: replaced inline `style={}` with `backdrop-blur-xl` + `bg-[#0A0A0B]/95`
- [x] Animated system status indicator (pulsing green dot + degraded flash)
- [x] Notification bell: real count badge (number 3) instead of dot
- [x] `⌘K` / `Ctrl+K` global shortcut focuses search bar (Spotlight)
- [x] Escape to dismiss search overlay
- [x] Clock/timezone indicator (Malta `Europe/Malta`, HH:mm, updates every 30s)

#### 4.2 Breadcrumb Row ✅ DONE (Phase 2)

- [x] Breadcrumb strip below TopBar, above content
- [x] Shows: `🏠 Home › HR & People › Clocking Data`
- [x] Contextual quick-action buttons via `useBreadcrumbActions` hook
- [x] Route-aware: Export CSV/PDF on reports, Add Employee on HR, New PO on procurement, etc.
- [x] Actions emit CustomEvent `breadcrumb-action` for page-level handling
- [x] Visual variants: primary (red), default (subtle), ghost (minimal)

---

### Phase 5: Page Transition System ✅ DONE

#### 5.1 Create `<AnimatedOutlet>` Component ✅

- [x] Create `components/shared/AnimatedOutlet.tsx`
- [x] Wraps `useOutlet()` with `framer-motion` `AnimatePresence`
- [x] Transition: fade (0→1) + slide-up (6px→0) on route change
- [x] Fast transitions (180ms) for snappy feel
- [x] Integrated into AdminLayout (replaces `<Outlet />`)

#### 5.2 Unified Page Wrapper ✅

- [x] Merged `PageLayout.tsx` + `PageContainer.jsx` into `PageShell.tsx`
- [x] Props: `title`, `description`, `actions`, `filters`, `tabs`, `showDate`
- [x] Standardized Command Bar + Filter Strip
- [x] PageLayout/PageContainer marked deprecated

---

### Phase 6: Route Hygiene

#### 6.1 Audit & Deduplicate Routes ✅ DONE

- [x] `posdashboard` → redirect to canonical `pos-dashboard`
- [x] `inventory-items-list` → redirect to canonical `inventory-items`
- [x] `hr/summary` → redirect to canonical `hr/dashboard`

#### 6.2 TSX Migration (In Progress)

- [x] `AdminLayout.js` → `AdminLayout.tsx` (full TypeScript, typed state, explicit return)
- [ ] `NewSidebar.jsx` → `NewSidebar.tsx`
- [ ] `NewTopBar.jsx` → `NewTopBar.tsx`
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
