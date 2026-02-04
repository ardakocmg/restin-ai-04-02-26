# RESTIN.AI Enterprise Data Table Standard

## Purpose
Single shared grid engine for all non‑POS modules (Admin, Ops, Observability, Inventory, HR, Reporting). Each screen supplies only:
- **columns** (definition + filter type)
- **data source** (endpoint + query adapter)
- **allowed actions** (bulk actions, row actions)

## Core Behaviors
1. **Column Control**: hide/show, reorder, resize, pin left.
2. **Filtering**: global search + column filters (text, number range, date range, multi‑select).
3. **Sorting & Pagination**: server-authoritative (manual mode).
4. **Row Selection & Bulk Actions**: multi‑select with action toolbar + backend mutation.
5. **Editing**: row drawer (preferred) or inline draft with backend validation.
6. **States**: loading, empty, error with retry.
7. **Accessibility**: keyboard row focus, sticky headers, dark theme.
8. **Export**: optional CSV export hook (backend-authoritative).

## Architecture Boundaries
- UI **collects intent only** (no business logic).
- Backend is **authoritative** for filter/sort/pagination decisions.
- Preferences are stored per user + venue, and can later be migrated server‑side without API changes.

## Integration Contract (Frontend)
Component: `DataTable`

Required props:
- `columns`: `{ key, label, render?, filterType?, filterOptions?, headerClassName?, cellClassName? }[]`
- `data`: row array

Optional props (server mode):
- `onQueryChange(query)` → { pageIndex, pageSize, sorting, globalSearch, filters }
- `totalCount` or `pageCount`

Optional UX props:
- `bulkActions`: [{ id, label, variant? }]
- `onBulkAction(actionId, selectedRows)`
- `renderRowDrawer(row)`
- `enableVirtualization`

## Preferences Storage
Backend collection: `table_preferences`
- key: `user_id + venue_id + table_id`
- fields: column visibility/order/pinning/sizing, page size

API:
- `GET /api/table-preferences?table_id=...&venue_id=...`
- `POST /api/table-preferences` (upsert)

## Presets (Role-Scoped)
Backend collection: `table_presets`
- scope: `USER` or `ROLE`
- state: { columnVisibility, columnOrder, columnPinning, columnSizing, pageSize, sorting, globalSearch, filters }

API:
- `GET /api/table-presets?table_id=...&venue_id=...`
- `POST /api/table-presets`
- `DELETE /api/table-presets/{id}`

## Notes
- Global search/filters/pagination UI only shown when `onQueryChange` is provided.
- Column pinning defaults to left pin (sticky).
- Future upgrades: virtualization default, inline edit, CSV export, and per‑column presets.
