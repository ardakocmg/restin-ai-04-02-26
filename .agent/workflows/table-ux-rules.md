---
description: UX rules for data tables, stat cards, and sortable columns across all pages
---

# Table & Dashboard UX Rules

These rules MUST be applied whenever building or modifying any page that contains data tables or dashboard summary cards.

## 1. Sortable Table Columns

**Rule:** Every data table with > 1 column MUST have sortable headers.

### Implementation

1. Add `sortField` and `sortDirection` state (`'asc' | 'desc'`).
2. Default sort should be the most relevant column (usually `created_at` desc).
3. Each `<th>` must:
   - Be clickable (`cursor-pointer`, `select-none`).
   - Show a sort indicator icon:
     - Inactive: `ArrowUpDown` (dimmed/opacity-40).
     - Active ascending: `ArrowUp` (text-blue-400).
     - Active descending: `ArrowDown` (text-blue-400).
   - Have hover state: `hover:text-foreground transition-colors`.
4. Clicking a header toggles between `asc` → `desc`. Clicking a different header resets direction to `desc`.
5. Sort logic must be inside the `useMemo` that produces the filtered/sorted data array.
6. For priority & status columns, use ordinal mapping (e.g., `{ urgent: 4, high: 3, normal: 2, low: 1 }`).
7. For date columns, compare via `new Date(a).getTime()`.
8. For text columns, use `.localeCompare()`.

### Example SortIcon Component

```tsx
const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDirection === 'asc'
        ? <ArrowUp className="h-3 w-3 text-blue-400" />
        : <ArrowDown className="h-3 w-3 text-blue-400" />;
};
```

### Header Pattern

```tsx
<th
    onClick={() => handleSort(col.field)}
    className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors select-none"
>
    <span className="inline-flex items-center gap-1.5">
        {t(col.label)}
        <SortIcon field={col.field} />
    </span>
</th>
```

---

## 2. Clickable Stat/Summary Cards

**Rule:** Any stat cards (Pending: X, Approved: Y, etc.) displayed above a table MUST be clickable to filter that table.

### Implementation

1. Add `activeStatFilter` state (`string | null`).
2. Clicking a stat card sets the corresponding filter (e.g., clicking "Pending" sets `filters.status = 'pending'`).
3. Clicking the same card again clears the filter (toggle behavior).
4. Active card must show visual feedback:
   - Active border color matching the card's theme color.
   - `ring-1` glow effect.
   - `shadow-lg` for depth.
   - A small "✕ Clear" badge in the top-right of the label row.
5. All cards must have hover effects: `hover:scale-[1.02] active:scale-[0.98]`.
6. The "Total" card should clear all status filters when clicked.

### Visual Feedback Pattern

```tsx
className={`${card.bg} rounded-xl border p-4 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${
    activeStatFilter === card.key
        ? `${card.activeBorder} ring-1 ring-offset-0 ring-current shadow-lg`
        : 'border-border hover:border-muted-foreground/30'
}`}
```

---

## 3. Defensive Array Handling

**Rule:** NEVER call `.find()`, `.filter()`, `.map()`, or `.reduce()` on API response data without ensuring it's an array first.

### Implementation

```tsx
// When setting state from API response
const items = Array.isArray(res.data) ? res.data : (res.data?.items || []);
setItems(items);

// When using state in operations
const safeItems = Array.isArray(items) ? items : [];
const result = safeItems.find(i => i.id === targetId);
```

---

## 4. When to Apply These Rules

**MANDATORY — RETROACTIVE APPLICATION:**
Whenever you are working on ANY page that contains a data table or stat/summary cards, you MUST apply ALL of the above rules to that page **before completing the task**, even if the user did not explicitly request it. This is a standing order.

### Trigger Conditions

- **Creating** any new page with a data table → Apply Rules 1, 2, 3
- **Modifying** an existing table page (bug fix, feature, styling) → Check and apply Rules 1, 2, 3 if missing
- **Adding dashboard cards/stats** above a table → Apply Rule 2 (clickable filtering)
- **Building list views** with sortable data → Apply Rule 1 (sortable columns)
- **Touching any API data handling** → Apply Rule 3 (defensive array guards)

### Existing Pages Checklist (apply when you visit them)

- `ApprovalCenter.tsx` — ✅ Already done (reference implementation)
- `StockTransfersComplete.jsx` — ✅ Array guards done, ⬜ sorting + clickable cards pending
- `ClockingData.jsx` — ⬜ Needs sorting + clickable cards
- `ExpenseManagement.jsx` — ⬜ Needs sorting + clickable cards
- `PayrollMalta.jsx` — ⬜ Needs sorting + clickable cards
- `PurchaseOrdersNew.jsx` — ⬜ Needs sorting + clickable cards
- `WasteLog.jsx` — ⬜ Needs sorting + clickable cards
- `StockCount.jsx` — ⬜ Needs sorting + clickable cards
- `StockAdjustments.jsx` — ⬜ Needs sorting + clickable cards
- `GuestProfiles.jsx` — ⬜ Needs sorting + clickable cards
- `HACCPChecklists.jsx` — ⬜ Needs sorting + clickable cards

> **NOTE:** Do NOT batch-apply to all pages at once. Apply these patterns **incrementally** whenever you are already touching a page for another reason. This avoids introducing regressions.

Reference implementation: `ApprovalCenter.tsx`
