import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import {
  Search,
  ShoppingCart,
  Users,
  Package,
  Utensils,
  Calendar,
  FileText,
  Settings,
  TrendingUp,
  ArrowRight,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '../../lib/api';
import { useVenue } from '../../context/VenueContext';
import { useAuth } from '../../features/auth/AuthContext';
import { buildSearchIndex } from '@/lib/searchRegistry';

const ENTITY_ICONS = {
  menu_items: Utensils,
  users: Users,
  guests: Users,
  orders: ShoppingCart,
  inventory: Package,
  menu_item: Utensils,
  employee: Users,
  supplier: TrendingUp,
  item: Package,
};

export default function GlobalSearch({ open, onOpenChange }) {
  const navigate = useNavigate();
  const { activeVenue } = useVenue();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [dataResults, setDataResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Build page search index from shared registry
  const pageIndex = useMemo(() => buildSearchIndex(user?.role), [user?.role]);

  // Client-side page search
  const pageResults = useMemo(() => {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();
    return pageIndex
      .filter(item =>
        item.title.toLowerCase().includes(q) ||
        item.breadcrumb.toLowerCase().includes(q) ||
        item.path.toLowerCase().includes(q) ||
        item.keywords.some(kw => kw.includes(q))
      )
      .slice(0, 6);
  }, [query, pageIndex]);

  // API data search with debounce
  const performDataSearch = useCallback(
    async (searchQuery) => {
      if (!searchQuery || searchQuery.length < 2) {
        setDataResults({});
        return;
      }

      setLoading(true);
      try {
        // Use correct backend API endpoint: /search
        const response = await api.get(`/search?q=${encodeURIComponent(searchQuery)}&venue_id=${activeVenue?.id}`);
        // Backend returns { results: { menu_items: [...], users: [...], guests: [...], orders: [...] } }
        setDataResults(response.data?.results || {});
      } catch (error) {
        // Silently fail — page results will still appear
        setDataResults({});
      } finally {
        setLoading(false);
      }
    },
    [activeVenue?.id]
  );

  // Debounce API search
  useEffect(() => {
    const timer = setTimeout(() => {
      performDataSearch(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, performDataSearch]);

  // Build the unified result list: Pages first, then Data groups
  const allItems = useMemo(() => {
    const items = [];

    // Add page results
    for (const page of pageResults) {
      items.push({ kind: 'page', data: page });
    }

    // Add data results grouped by type
    for (const [type, entities] of Object.entries(dataResults)) {
      if (Array.isArray(entities) && entities.length > 0) {
        for (const entity of entities.slice(0, 5)) {
          items.push({
            kind: 'data',
            type,
            data: entity,
            name: entity.name || entity.order_id || entity.email || 'Unknown',
            subtitle: entity.email || entity.phone || entity.table_name || entity.sku || '',
          });
        }
      }
    }

    return items;
  }, [pageResults, dataResults]);

  // Reset index on results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [allItems.length, query]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!open) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, allItems.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && allItems[selectedIndex]) {
        e.preventDefault();
        handleSelect(allItems[selectedIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, allItems, selectedIndex]);

  const handleSelect = (item) => {
    if (item.kind === 'page') {
      navigate(item.data.path);
    } else {
      // Navigate to the relevant section/page for data results
      const entityId = item.data.id || item.data._id;
      if (item.type === 'menu_items') navigate(`/admin/products`);
      else if (item.type === 'users') navigate(`/admin/hr/people`);
      else if (item.type === 'guests') navigate(`/admin/crm`);
      else if (item.type === 'orders') navigate(`/admin/posdashboard`);
      else navigate('/admin/dashboard');
    }
    onOpenChange(false);
    setQuery('');
    setDataResults({});
  };

  // Determine section headers: show "Pages" header if page results exist, "Data" header for data results
  const hasPages = pageResults.length > 0;
  const hasData = Object.values(dataResults).some(v => Array.isArray(v) && v.length > 0);

  // Track where data section starts for headers
  const dataStartIdx = pageResults.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 bg-zinc-950 border-white/10" aria-describedby="search-description">
        <DialogHeader className="sr-only">
          <DialogTitle>Global Search</DialogTitle>
          <DialogDescription id="search-description">
            Search across pages, orders, guests, items, staff, and more
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center border-b border-white/10 px-4 py-3">
          <Search className="h-5 w-5 text-zinc-500 mr-3" />
          <Input
            placeholder="Search pages, orders, guests, staff..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-0 focus-visible:ring-0 text-base bg-transparent text-white placeholder:text-zinc-600"
            autoFocus
            autoComplete="off"
          />
          <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-zinc-800 bg-zinc-900 px-1.5 font-mono text-[10px] font-medium text-zinc-500">
            ESC
          </kbd>
        </div>

        <ScrollArea className="max-h-[400px]">
          {loading && !hasPages && (
            <div className="p-6 text-center text-sm text-zinc-500">
              Searching...
            </div>
          )}

          {!loading && query && query.length >= 2 && allItems.length === 0 && (
            <div className="p-6 text-center text-sm text-zinc-500">
              No results found for "{query}"
            </div>
          )}

          {allItems.length > 0 && (
            <div className="p-2">
              {/* Pages Section Header */}
              {hasPages && (
                <div className="px-2 py-1.5 text-[10px] font-bold text-zinc-600 uppercase tracking-widest flex items-center gap-2">
                  <Layers className="h-3 w-3" />
                  Pages & Features
                </div>
              )}

              {/* Page Results */}
              {pageResults.map((page, idx) => {
                const Icon = page.icon;
                return (
                  <button
                    key={`page-${page.path}-${idx}`}
                    onClick={() => handleSelect({ kind: 'page', data: page })}
                    className={cn(
                      'w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-center gap-3',
                      selectedIndex === idx ? 'bg-red-500/10' : 'hover:bg-white/5'
                    )}
                  >
                    <div className={cn(
                      "w-7 h-7 rounded-md flex items-center justify-center border transition-all shrink-0",
                      selectedIndex === idx
                        ? "bg-red-500/10 border-red-500/30"
                        : "bg-zinc-900 border-white/5"
                    )}>
                      <Icon className={cn("h-3.5 w-3.5", selectedIndex === idx ? "text-red-500" : "text-zinc-500")} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={cn("text-sm font-medium truncate", selectedIndex === idx ? "text-white" : "text-zinc-300")}>
                        {page.title}
                      </div>
                      <div className="text-[10px] uppercase tracking-wider text-zinc-600 truncate">
                        {page.breadcrumb}
                      </div>
                    </div>
                    <ArrowRight className={cn("h-3 w-3 shrink-0", selectedIndex === idx ? "text-red-400" : "text-zinc-700")} />
                  </button>
                );
              })}

              {/* Data Section Header */}
              {hasData && (
                <div className={cn("px-2 py-1.5 text-[10px] font-bold text-zinc-600 uppercase tracking-widest flex items-center gap-2", hasPages && "mt-3 border-t border-white/5 pt-3")}>
                  <Search className="h-3 w-3" />
                  Data Results {loading && '...'}
                </div>
              )}

              {/* Data Results */}
              {Object.entries(dataResults).map(([type, entities]) => {
                if (!Array.isArray(entities) || entities.length === 0) return null;
                const TypeIcon = ENTITY_ICONS[type] || Package;

                return (
                  <div key={type} className="mb-2">
                    <div className="px-3 py-1 text-[10px] font-semibold text-zinc-600 uppercase tracking-wider flex items-center gap-1.5">
                      <TypeIcon className="h-3 w-3" />
                      {type.replace(/_/g, ' ')}
                    </div>
                    {entities.slice(0, 5).map((entity, entityIdx) => {
                      // Calculate globalIndex for this entity
                      let globalIdx = dataStartIdx;
                      for (const [t, ents] of Object.entries(dataResults)) {
                        if (t === type) {
                          globalIdx += entityIdx;
                          break;
                        }
                        if (Array.isArray(ents)) globalIdx += Math.min(ents.length, 5);
                      }

                      const entityName = entity.name || entity.order_id || entity.email || 'Unknown';
                      const entitySub = entity.email || entity.phone || entity.table_name || entity.sku || '';

                      return (
                        <button
                          key={entity.id || entity._id || `${type}-${entityIdx}`}
                          onClick={() => handleSelect({ kind: 'data', type, data: entity })}
                          className={cn(
                            'w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between',
                            selectedIndex === globalIdx ? 'bg-red-500/10' : 'hover:bg-white/5'
                          )}
                        >
                          <div className="flex-1 min-w-0">
                            <div className={cn("text-sm font-medium truncate", selectedIndex === globalIdx ? "text-white" : "text-zinc-300")}>
                              {entityName}
                            </div>
                            {entitySub && (
                              <div className="text-xs text-zinc-600 truncate">{entitySub}</div>
                            )}
                          </div>
                          <Badge variant="outline" className="ml-2 shrink-0 text-[9px] border-zinc-800 text-zinc-500">
                            {type.replace(/_/g, ' ')}
                          </Badge>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <div className="border-t border-white/10 px-4 py-2 text-xs text-zinc-600 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-zinc-800 bg-zinc-900 px-1.5 font-mono text-[10px]">
                ↑↓
              </kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-zinc-800 bg-zinc-900 px-1.5 font-mono text-[10px]">
                ↵
              </kbd>
              select
            </span>
          </div>
          <span>Press ⌘K or Ctrl+K to search anytime</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
