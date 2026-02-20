// /app/frontend/src/components/search/UniversalSearchBar.js
import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * UniversalSearchBar (credit-friendly skeleton)
 * - Debounced input
 * - Safe rendering (never crashes on undefined)
 * - Can be used in KDS/POS/Admin
 * - Does NOT navigate()
 *
 * Props:
 *  - context: "KDS" | "POS" | "ADMIN"
 *  - enabled: boolean
 *  - placeholder: string
 *  - scope: "local" | "global" | "auto"
 *  - station: "kitchen" | "bar" | "pass" | string (optional)
 *  - onResults: (results) => void (optional)
 *  - onSelect: (item) => void (optional)
 *  - searchFn: async ({ q, context, scope, station }) => results (optional)
 */
export default function UniversalSearchBar({
  context = "POS",
  enabled = true,
  placeholder = "Search…",
  scope = "auto",
  station = undefined,
  onResults = undefined,
  onSelect = undefined,
  searchFn = undefined,
}) {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState(null);

  const debounceMs = 250;
  const timerRef = useRef(null);
  const lastReqId = useRef(0);

  const safeString = (v, fallback = "") =>
    typeof v === "string" ? v : v == null ? fallback : String(v);

  const safeArray = (v) => (Array.isArray(v) ? v : []);

  const groups = useMemo(() => {
    const r = results || {};
    return [
      { key: "tickets", label: "Tickets", items: safeArray(r.tickets) },
      { key: "orders", label: "Orders", items: safeArray(r.orders) },
      { key: "tables", label: "Tables", items: safeArray(r.tables) },
      { key: "menu_items", label: "Menu Items", items: safeArray(r.menu_items) },
      { key: "guests", label: "Guests", items: safeArray(r.guests) },
      { key: "inventory", label: "Inventory", items: safeArray(r.inventory) },
      { key: "users", label: "Users", items: safeArray(r.users) },
    ].filter((g) => g.items.length > 0);
  }, [results]);

  async function defaultSearchFn(payload) {
    // If you already have SearchService, plug it here.
    // Example:
    // return searchService.search(payload);
    // For skeleton: return empty results (never crash).
    return {
      tickets: [],
      orders: [],
      tables: [],
      menu_items: [],
      guests: [],
      inventory: [],
      users: [],
    };
  }

  const runSearch = async (query) => {
    const trimmed = safeString(query).trim();
    if (!enabled) return;

    if (trimmed.length < 2) {
      setResults(null);
      setErr("");
      if (onResults) onResults(null);
      return;
    }

    const reqId = ++lastReqId.current;
    setLoading(true);
    setErr("");

    try {
      const fn = searchFn || defaultSearchFn;
      const res = await fn({
        q: trimmed,
        context,
        scope,
        station,
      });

      // Ignore out-of-order responses
      if (reqId !== lastReqId.current) return;

      setResults(res || null);
      if (onResults) onResults(res || null);
      setOpen(true);
    } catch (e: any) {
      if (reqId !== lastReqId.current) return;
      setErr("Search failed. Please try again.");
      setResults(null);
      if (onResults) onResults(null);
    } finally {
      if (reqId === lastReqId.current) setLoading(false);
    }
  };

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => runSearch(q), debounceMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, enabled, context, scope, station]);

  const pickLabel = (item) => {
    if (!item) return "Item";
    // Common fields across entities:
    return (
      safeString(item.title) ||
      safeString(item.name) ||
      safeString(item.menu_item_name) ||
      safeString(item.table_name) ||
      safeString(item.guest_name) ||
      safeString(item.id, "Item")
    );
  };

  const pickSub = (item) => {
    if (!item) return "";
    // Helpful secondary line:
    const a = safeString(item.status);
    const b = safeString(item.table);
    const c = safeString(item.course);
    const parts = [a, b, c].filter(Boolean);
    return parts.join(" • ");
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        {/* Left icon (simple, no external icon deps) */}
        <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          🔎
        </div>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            // small delay to allow click selection
            setTimeout(() => setOpen(false), 150);
          }}
          disabled={!enabled}
          placeholder={placeholder}
          className="w-full rounded-md border border-border bg-card py-2 pl-10 pr-24 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-zinc-600"
        />

        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {loading ? (
            <span className="text-xs text-muted-foreground">Searching…</span>
          ) : q.trim().length >= 2 ? (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => runSearch(q)}
              className="rounded-md bg-secondary px-2 py-1 text-xs text-secondary-foreground hover:bg-secondary/80"
            >
              Search
            </button>
          ) : (
            <span className="text-xs text-muted-foreground">min 2</span>
          )}
        </div>
      </div>

      {/* Dropdown */}
      {open && enabled && (err || groups.length > 0) && (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-md border border-border bg-background shadow-lg">
          {err ? (
            <div className="p-3 text-sm text-red-300">{err}</div>
          ) : (
            <div className="max-h-72 overflow-auto">
              {groups.map((g) => (
                <div key={g.key} className="border-b border-border last:border-b-0">
                  <div className="px-3 py-2 text-xs font-semibold text-muted-foreground">
                    {g.label}
                  </div>
                  {g.items.slice(0, 8).map((item, idx) => (
                    <button
                      key={(item && item.id ? item.id : `${g.key}-${idx}`)}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        if (onSelect) onSelect(item);
                        setOpen(false);
                      }}
                      className="flex w-full flex-col gap-1 px-3 py-2 text-left hover:bg-card"
                    >
                      <div className="text-sm text-foreground">{pickLabel(item)}</div>
                      {pickSub(item) ? (
                        <div className="text-xs text-muted-foreground">{pickSub(item)}</div>
                      ) : null}
                    </button>
                  ))}
                </div>
              ))}
              {groups.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground">No results</div>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
