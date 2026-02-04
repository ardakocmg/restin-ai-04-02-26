# restin.ai - Enterprise Hospitality Operating System

## Original Problem Statement
Build a production-grade, security-hardened monorepo for an enterprise hospitality operating system named "restin.ai". Stage 1 implements a generic Restaurant Service Core supporting multiple restaurants/venues via configuration and selection. Phase 2 adds an **Ultra‑Resilient Offline‑First System** (Cloud → Edge → Device) and an **Observability Hub & Error Triage Panel** for safe testing, automated error capture, and secure retries.

## Architecture
- **Backend**: FastAPI (Python) with MongoDB
- **Frontend**: React + TypeScript + TailwindCSS + Shadcn/UI
- **Authentication**: JWT + PIN login + TOTP MFA for owners/managers
- **Database**: MongoDB with immutable ledger patterns
- **Edge Layer**: Node.js Edge Gateway + Device Mesh for offline resilience

## User Personas
1. **Owner**: Full access, MFA required, can override review blocks
2. **Manager**: Venue management, MFA required, can override medium-risk reviews
3. **Staff/Server**: POS access, order management
4. **Kitchen**: KDS access, ticket management
5. **Host**: Table management

## Core Requirements (Static)
- Multi-venue support with venue scoping on all data
- PIN-based authentication with MFA for elevated roles
- Seat-based ordering with course pacing
- Immutable audit logs with hash chaining
- Review risk scoring (0-100) with policy-based QR visibility
- Offline-first POS capability
- Device binding for POS/KDS terminals
- Observability Hub with Test Panel + Error Inbox + Retry Engine

## What's Been Implemented (Jan 2025)

### Backend APIs
- ✅ Authentication (PIN login, MFA setup/verify)
- ✅ Venue CRUD with multi-tenant scoping
- ✅ Zone & Table management
- ✅ Menu categories & items
- ✅ Order management (create, add items, send, transfer, split, merge, close)
- ✅ KDS ticket system with routing
- ✅ Inventory with immutable ledger
- ✅ Purchase orders & receiving
- ✅ Document upload with Excel parsing
- ✅ Review risk scoring engine
- ✅ Audit logs with hash chaining
- ✅ Device binding
- ✅ Observability Hub APIs (test panel runs, error inbox, action tokens, retry engine)
- ✅ Error capture middleware (4xx/5xx → inbox with severity + steps)
- ✅ Diagnostic error endpoint for observability testing (/api/health/diagnostic-error)
- ✅ Public Content API (versioned marketing/technical/modules content with approval workflow)
- ✅ Table Preferences API (user + venue column preferences)

### Frontend
- ✅ Login page with PIN pad & venue selection
- ✅ Admin Dashboard with stats
- ✅ Venue Settings (zones, tables, review policy)
- ✅ Menu Management
- ✅ Staff Management
- ✅ Inventory (stock levels, ledger, variance, POs)
- ✅ Document Hub
- ✅ Review Risk Dashboard
- ✅ Audit Logs with export
- ✅ POS Setup Wizard & Main Terminal
- ✅ KDS Setup Wizard & Ticket Rail
- ✅ Observability Hub UI: Test Panel + Error Inbox with filters & dynamic retry form
- ✅ Admin navigation cards for observability tools
- ✅ Marketing homepage with EU pricing packages + roadmap
- ✅ Technical Hub page with architecture, microservices, templates, and diagrams
- ✅ Module Catalog page + Admin Content Studio (draft → approve → auto-update)
- ✅ Content Studio enhancements: preview mode, diff viewer, rollback, scheduled publishing
- ✅ Module auto-sync from system registry (MODULE_REGISTRY)
- ✅ Visual editor for pricing + module cards
- ✅ Role-based approval workflow (drafter vs approver roles)
- ✅ Enterprise Data Table standard (server-authoritative, column control, filters, bulk actions)
- ✅ Table presets (role-scoped) + CSV export hooks
- ✅ Inventory + Error Inbox wired to server-side DataTable queries
- ✅ HR Hub redesigned to Indigo-style panel layout with parity checklist
- ✅ HR feature flags + audit trail (role-scoped) + blueprint PDF export
- ✅ Indigo accent styling applied across HR subpages
- ✅ Ultimate package technical documentation section added to Technical Hub
- ✅ Inventory page updated with Ultimate Inventory blueprint layout
- ✅ Removed external brand references from UI copy/content
- ✅ Technical Hub extended with frontend + backend schema lists
- ✅ Added menu diagram + route table to Technical Hub schemas section
- ✅ Added event flow (olay örgüsü) cards and hidden/planned menu items in schema table
- ✅ Expanded event flow catalog to cover procurement, invoices, forecasting, transfers, and observability
- ✅ Admin Updates system (change log + release notes, auto daily publish)

### Seed Data
- 3 venues: Le Grand Château (fine dining), Urban Bites (casual), The Copper Still (bar)
- 11 zones, 69 tables, 15 users
- 14 menu categories, 38 menu items
- 12 inventory items

### Offline/Resilience Layer
- ✅ PWA foundation + IndexedDB offline storage
- ✅ Edge Gateway services + Device Mesh redundancy

## Prioritized Backlog

### P0 - Critical (Next)
- [ ] Observability: Server-side Mermaid diagram generation
- [ ] Observability: Expand safe retry allowlist + richer retry plans
- [ ] Offline queue persistence and sync validation

### P1 - High
- [ ] Error Inbox detail drill-down (linked entities + timeline)
- [ ] Test Panel saved presets + run comparison
- [ ] Content Studio: preview mode + scheduled publishing
- [ ] Content Studio: Visual editor for hero + CTA blocks
- [ ] Bill split by item (not just seat)
- [ ] Table merge functionality
- [ ] Receipt generation
- [ ] Daily closeout reports

### P2 - Medium
- [ ] Mermaid diagram visualizer in UI
- [ ] OCR integration for document processing
- [ ] Menu item modifiers system
- [ ] Allergen tracking
- [ ] Scheduled reports
- [ ] Staff scheduling

### P3 - Deferred (Stage 2)
- [ ] Payment integration (Stripe, Apple Pay)
- [ ] Integration marketplace
- [ ] Advanced AI recommendations
- [ ] HR/Payroll
- [ ] Accounting integration

## Test Credentials
| Venue | Owner PIN | Manager PIN | Staff PIN |
|-------|-----------|-------------|-----------|
| Le Grand Château | 1234 | 2345 | 1111 |
| Urban Bites | 1234 | 2345 | 1111 |
| The Copper Still | 1234 | 2345 | 1111 |
