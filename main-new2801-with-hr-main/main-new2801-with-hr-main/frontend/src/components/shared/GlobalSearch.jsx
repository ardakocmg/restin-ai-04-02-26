import React, { useState, useEffect, useCallback } from 'react';
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
  TrendingUp
} from 'lucide-react';
import api from '../../lib/api';
import { useVenue } from '../../context/VenueContext';
import { toast } from 'sonner';

const ENTITY_ICONS = {
  order: ShoppingCart,
  guest: Users,
  item: Package,
  staff: Users,
  supplier: TrendingUp,
  reservation: Calendar,
  recipe: Utensils,
  device: Settings,
  report: FileText
};

const ENTITY_ROUTES = {
  order: '/admin/orders',
  guest: '/admin/guests',
  item: '/admin/inventory-detail',
  staff: '/admin/people',
  supplier: '/admin/suppliers',
  reservation: '/admin/reservations',
  recipe: '/admin/recipes',
  device: '/admin/devices',
  report: '/admin/reports'
};

export default function GlobalSearch({ open, onOpenChange }) {
  const navigate = useNavigate();
  const { activeVenue } = useVenue();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Search function with debounce
  const performSearch = useCallback(
    async (searchQuery) => {
      if (!searchQuery || searchQuery.length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const response = await api.get(`/search/global?q=${encodeURIComponent(searchQuery)}&venue_id=${activeVenue?.id}`);
        setResults(response.data?.results || []);
      } catch (error) {
        console.error('Search failed:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [activeVenue?.id]
  );

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, performSearch]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!open) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault();
        handleSelect(results[selectedIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, results, selectedIndex]);

  const handleSelect = (result) => {
    const route = ENTITY_ROUTES[result.type];
    if (route) {
      navigate(`${route}?id=${result.id}`);
      onOpenChange(false);
      setQuery('');
      setResults([]);
    }
  };

  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) acc[result.type] = [];
    acc[result.type].push(result);
    return acc;
  }, {});

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0" aria-describedby="search-description">
        <DialogHeader className="sr-only">
          <DialogTitle>Global Search</DialogTitle>
          <DialogDescription id="search-description">
            Search across orders, guests, items, staff, and more
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex items-center border-b px-4 py-3">
          <Search className="h-5 w-5 text-muted-foreground mr-3" />
          <Input
            placeholder="Search orders, guests, items, staff..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-0 focus-visible:ring-0 text-base"
            autoFocus
          />
          <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            ESC
          </kbd>
        </div>

        <ScrollArea className="max-h-[400px]">
          {loading && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Searching...
            </div>
          )}

          {!loading && query && results.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No results found for "{query}"
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="p-2">
              {Object.entries(groupedResults).map(([type, items]) => {
                const Icon = ENTITY_ICONS[type] || Package;
                return (
                  <div key={type} className="mb-4 last:mb-0">
                    <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <Icon className="h-3 w-3" />
                      {type}s
                    </div>
                    <div className="space-y-1">
                      {items.map((item, idx) => {
                        const globalIndex = results.indexOf(item);
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleSelect(item)}
                            className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                              selectedIndex === globalIndex
                                ? 'bg-accent'
                                : 'hover:bg-accent/50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{item.name}</div>
                                {item.subtitle && (
                                  <div className="text-sm text-muted-foreground truncate">
                                    {item.subtitle}
                                  </div>
                                )}
                              </div>
                              {item.badge && (
                                <Badge variant="outline" className="ml-2 shrink-0">
                                  {item.badge}
                                </Badge>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <div className="border-t px-4 py-2 text-xs text-muted-foreground flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px]">
                ↑↓
              </kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px]">
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
