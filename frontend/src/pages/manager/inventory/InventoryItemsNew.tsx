import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useVenue } from '@/context/VenueContext';
import api from '@/lib/api';
import PageContainer from '@/layouts/PageContainer';
import DataTable from '@/components/shared/DataTable';
import ItemDetailDrawer from '@/components/inventory/ItemDetailDrawer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Package,
  Plus,
  Download,
  Upload,
  AlertTriangle,
  TrendingDown,
  CheckCircle2,
  DollarSign,
  Printer,
  Filter,
  X,
  ChevronDown,
  ChevronRight,
  Columns,
  Search,
  SlidersHorizontal,
  Snowflake,
  Thermometer,
  Sun,
  Eye,
  EyeOff,
  TrendingUp,
  History,
} from 'lucide-react';
import { toast } from 'sonner';

// ── EU 14 Allergens ────────────────────────────────────────────────
const EU_ALLERGENS = [
  'gluten', 'crustaceans', 'eggs', 'fish', 'peanuts', 'soybeans',
  'milk', 'nuts', 'celery', 'mustard', 'sesame', 'sulphites',
  'lupin', 'molluscs',
];

const STORAGE_TYPES = [
  { value: 'ambient', label: 'Ambient', icon: Sun },
  { value: 'refrigerated', label: 'Refrigerated', icon: Thermometer },
  { value: 'frozen', label: 'Frozen', icon: Snowflake },
];

// ── Collapsible Filter Section ─────────────────────────────────────
function FilterSection({ title, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border/50 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full py-2.5 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
      >
        {title}
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
      </button>
      {open && <div className="pb-3 space-y-1.5">{children}</div>}
    </div>
  );
}

// ── Multi-Select Checkbox Filter ───────────────────────────────────
function CheckboxFilter({ options, selected, onChange, maxVisible = 6 }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? options : options.slice(0, maxVisible);
  return (
    <div className="space-y-1">
      {visible.map(opt => (
        <label
          key={opt.value}
          className="flex items-center gap-2 px-1 py-1 rounded text-xs cursor-pointer hover:bg-muted/50 transition-colors"
        >
          <Checkbox
            checked={selected.includes(opt.value)}
            onCheckedChange={(checked) => {
              if (checked) onChange([...selected, opt.value]);
              else onChange(selected.filter(v => v !== opt.value));
            }}
            className="h-3.5 w-3.5"
          />
          <span className="truncate">{opt.label}</span>
          {opt.count !== undefined && (
            <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">{opt.count}</span>
          )}
        </label>
      ))}
      {options.length > maxVisible && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="text-[10px] text-primary hover:underline pl-1 pt-1"
        >
          {showAll ? 'Show less' : `+${options.length - maxVisible} more`}
        </button>
      )}
    </div>
  );
}

// ── KPI Stat Card ──────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, subtext, color = 'text-foreground' }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 flex items-center gap-4">
        <div className="p-2.5 rounded-lg bg-muted">
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={`text-xl font-bold tabular-nums ${color}`}>{value}</p>
          {subtext && <p className="text-xs text-muted-foreground">{subtext}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Column Visibility Dropdown ─────────────────────────────────────
function ColumnVisibility({ allColumns, hiddenColumns, onToggle }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <Button variant="outline" size="sm" onClick={() => setOpen(!open)}>
        <Columns className="h-4 w-4 mr-2" />
        Columns
      </Button>
      {open && (
        <div className="absolute right-0 top-10 z-50 w-56 bg-popover border border-border rounded-md shadow-xl p-2 max-h-60 overflow-y-auto">
          <div className="text-xs font-bold text-muted-foreground mb-2 px-2">Toggle Columns</div>
          {allColumns.map(col => (
            <label
              key={col.key}
              className="flex items-center gap-2 p-1.5 hover:bg-muted/50 rounded cursor-pointer text-sm"
            >
              <Checkbox
                checked={!hiddenColumns.includes(col.key)}
                onCheckedChange={() => onToggle(col.key)}
                className="h-3.5 w-3.5"
              />
              <span className="truncate">{col.label}</span>
            </label>
          ))}
          <div className="mt-2 pt-2 border-t border-border">
            <Button size="sm" variant="ghost" className="w-full text-xs h-7" onClick={() => setOpen(false)}>Close</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── All Available Columns ──────────────────────────────────────────
const ALL_COLUMNS = [
  {
    key: 'name',
    label: 'Item Name',
    enableSorting: true,
    size: 220,
    alwaysVisible: true,
    render: (row) => (
      <div className="flex items-center gap-3">
        {row.image_url ? (
          <img src={row.image_url} alt={row.name} className="h-9 w-9 rounded-md object-cover" />
        ) : (
          <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center shrink-0">
            <Package className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0">
          <div className="font-medium truncate">{row.name}</div>
          <div className="text-xs text-muted-foreground">{row.display_id || row.id?.substring(0, 8)}</div>
        </div>
      </div>
    ),
  },
  {
    key: 'category',
    label: 'Category',
    enableSorting: true,
    size: 120,
    render: (row) =>
      row.category ? (
        <Badge variant="outline" className="capitalize text-xs">
          {row.category?.replace(/_/g, ' ')}
        </Badge>
      ) : (
        <span className="text-muted-foreground text-xs">—</span>
      ),
  },
  {
    key: 'subcategory',
    label: 'Subcategory',
    enableSorting: true,
    size: 110,
    render: (row) =>
      row.subcategory ? (
        <Badge variant="secondary" className="text-xs">{row.subcategory}</Badge>
      ) : (
        <span className="text-muted-foreground text-xs">—</span>
      ),
  },
  {
    key: 'quantity',
    label: 'Stock',
    enableSorting: true,
    size: 120,
    render: (row) => {
      const qty = row.quantity ?? row.current_stock ?? 0;
      const min = row.min_stock ?? row.min_quantity ?? 0;
      const isNeg = qty < 0;
      const isLow = qty <= min && min > 0;
      return (
        <div className="flex items-center gap-2">
          <span className={`font-medium tabular-nums ${isNeg ? 'text-red-600 dark:text-red-400' : isLow ? 'text-orange-600 dark:text-orange-400' : ''}`}>
            {qty.toFixed(2)}
          </span>
          <span className="text-xs text-muted-foreground">{row.unit || 'EA'}</span>
          {isNeg && <AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
          {isLow && !isNeg && <TrendingDown className="h-3.5 w-3.5 text-orange-500" />}
        </div>
      );
    },
  },
  {
    key: 'min_stock',
    label: 'Min Stock',
    enableSorting: true,
    size: 90,
    render: (row) => {
      const min = row.min_stock ?? row.min_quantity ?? 0;
      return (
        <span className="text-sm tabular-nums text-muted-foreground">
          {min > 0 ? `${min.toFixed(2)}` : '—'}
        </span>
      );
    },
  },
  {
    key: 'unit',
    label: 'Unit',
    size: 60,
    render: (row) => <span className="text-sm">{row.unit || 'EA'}</span>,
  },
  {
    key: 'cost',
    label: 'Cost',
    enableSorting: true,
    size: 90,
    render: (row) => {
      const cost = row.cost ?? row.unit_cost ?? 0;
      return (
        <span className="font-mono text-sm tabular-nums">
          {cost > 0 ? `€${cost.toFixed(2)}` : '—'}
        </span>
      );
    },
  },
  // Gap 12: Supplier Price Evolution column
  {
    key: 'price_trend',
    label: 'Price Trend',
    size: 100,
    render: (row) => {
      // In production, from price_history API. Using computed demo data here.
      const currentCost = parseFloat(row.cost ?? row.unit_cost ?? 0);
      const previousCost = parseFloat(row.previous_cost ?? row.last_cost ?? currentCost);
      if (currentCost === 0 && previousCost === 0) return <span className="text-xs text-muted-foreground">—</span>;
      const change = previousCost > 0 ? ((currentCost - previousCost) / previousCost * 100) : 0;
      const absChange = Math.abs(change).toFixed(1);
      if (Math.abs(change) < 0.5) {
        return <span className="text-xs text-muted-foreground flex items-center gap-1"><History className="h-3 w-3" /> Stable</span>;
      }
      if (change > 0) {
        return (
          <span className={`text-xs font-medium flex items-center gap-0.5 ${change > 10 ? 'text-red-500' : 'text-amber-500'}`}>
            <TrendingUp className="h-3 w-3" /> +{absChange}%
            {change > 10 && <span className="text-[9px]">⚠</span>}
          </span>
        );
      }
      return (
        <span className="text-xs font-medium text-green-600 dark:text-green-400 flex items-center gap-0.5">
          <TrendingDown className="h-3 w-3" /> -{absChange}%
        </span>
      );
    },
  },
  // Gap 28: Supplier Pack-Size Comparison
  {
    key: 'pack_size',
    label: 'Pack Size',
    size: 130,
    render: (row) => {
      const packSizes = row.pack_sizes || row.available_packs;
      if (!packSizes || !Array.isArray(packSizes) || packSizes.length === 0) {
        // Provide a demo display for items that have a cost
        const cost = parseFloat(row.cost ?? row.unit_cost ?? 0);
        if (cost <= 0) return <span className="text-xs text-muted-foreground">—</span>;
        const unit = row.unit || 'kg';
        return (
          <div className="text-xs space-y-0.5">
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">1{unit}</span>
              <span className="font-medium">€{cost.toFixed(2)}/{unit}</span>
            </div>
          </div>
        );
      }
      // Sort by unit price to find best value  
      const sorted = [...packSizes].sort((a, b) => (a.unit_price || 0) - (b.unit_price || 0));
      return (
        <div className="text-xs space-y-0.5">
          {sorted.slice(0, 2).map((pk, i) => (
            <div key={i} className={`flex justify-between gap-2 ${i === 0 ? 'text-emerald-500 font-medium' : 'text-muted-foreground'}`}>
              <span>{pk.size}{pk.unit || ''}</span>
              <span>€{(pk.unit_price ?? 0).toFixed(2)}/{pk.base_unit || 'kg'}</span>
            </div>
          ))}
          {sorted.length > 2 && <span className="text-muted-foreground text-[10px]">+{sorted.length - 2} more</span>}
        </div>
      );
    },
  },
  {
    key: 'supplier_name',
    label: 'Supplier',
    enableSorting: true,
    size: 120,
    render: (row) => {
      const supplier = row.supplier_name || row.primary_supplier || row.supplier;
      return supplier ? (
        <span className="text-xs truncate">{supplier}</span>
      ) : (
        <span className="text-muted-foreground text-xs">—</span>
      );
    },
  },
  {
    key: 'brand',
    label: 'Brand',
    size: 100,
    render: (row) =>
      row.brand ? (
        <span className="text-xs">{row.brand}</span>
      ) : (
        <span className="text-muted-foreground text-xs">—</span>
      ),
  },
  {
    key: 'allergens',
    label: 'Allergens',
    size: 85,
    render: (row) => {
      const count = row.allergens?.length || 0;
      return count > 0 ? (
        <Badge variant="outline" className="text-orange-600 dark:text-orange-400 border-orange-300 dark:border-orange-700 text-xs">
          ⚠️ {count}
        </Badge>
      ) : (
        <span className="text-xs text-muted-foreground">None</span>
      );
    },
  },
  {
    key: 'diet',
    label: 'Diet',
    size: 110,
    render: (row) => {
      const diets = row.diet_tags || row.dietary_tags || [];
      return diets.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {diets.slice(0, 2).map(d => (
            <Badge key={d} variant="outline" className="text-[10px] bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
              {d}
            </Badge>
          ))}
          {diets.length > 2 && <span className="text-[10px] text-muted-foreground">+{diets.length - 2}</span>}
        </div>
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      );
    },
  },
  {
    key: 'allergen_status',
    label: 'Verification',
    size: 100,
    render: (row) => {
      const status = row.allergen_verification_status || 'unverified';
      const styles = {
        verified: 'text-green-600 dark:text-green-400 border-green-300 dark:border-green-700 bg-green-500/10',
        partial: 'text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700 bg-amber-500/10',
        unverified: 'text-red-600 dark:text-red-400 border-red-300 dark:border-red-700 bg-red-500/10',
      };
      const labels = { verified: '✓ Verified', partial: '⚠ Partial', unverified: '✗ Unverified' };
      return (
        <Badge variant="outline" className={`text-xs ${styles[status] || styles.unverified}`}>
          {labels[status] || labels.unverified}
        </Badge>
      );
    },
  },
  {
    key: 'approved',
    label: 'Approved',
    size: 80,
    render: (row) => {
      const approved = row.approved !== false;
      return (
        <Badge variant={approved ? 'outline' : 'secondary'} className={`text-xs ${approved ? 'text-green-600 dark:text-green-400 border-green-300 dark:border-green-700' : 'text-muted-foreground'}`}>
          {approved ? '✓' : '✗'}
        </Badge>
      );
    },
  },
  {
    key: 'storage_type',
    label: 'Storage',
    size: 90,
    render: (row) => {
      const type = row.storage_type || row.storage_conditions;
      const icons = { ambient: '☀️', refrigerated: '❄️', frozen: '🧊' };
      return type ? (
        <span className="text-xs capitalize">{icons[type] || ''} {type}</span>
      ) : (
        <span className="text-muted-foreground text-xs">—</span>
      );
    },
  },
  {
    key: 'status',
    label: 'Status',
    size: 90,
    render: (row) => {
      const qty = row.quantity ?? row.current_stock ?? 0;
      const min = row.min_stock ?? row.min_quantity ?? 0;
      if (qty < 0) {
        return (
          <Badge variant="destructive" className="text-xs gap-1">
            <AlertTriangle className="h-3 w-3" /> Negative
          </Badge>
        );
      }
      if (qty <= min && min > 0) {
        return (
          <Badge variant="outline" className="text-xs text-orange-600 dark:text-orange-400 border-orange-400 gap-1">
            <TrendingDown className="h-3 w-3" /> Low
          </Badge>
        );
      }
      return (
        <Badge variant="outline" className="text-xs text-green-600 dark:text-green-400 border-green-300 dark:border-green-700 gap-1">
          <CheckCircle2 className="h-3 w-3" /> OK
        </Badge>
      );
    },
  },
  {
    key: 'updated_at',
    label: 'Last Modified',
    enableSorting: true,
    size: 110,
    render: (row) => {
      const date = row.updated_at || row.last_modified;
      if (!date) return <span className="text-muted-foreground text-xs">—</span>;
      try {
        return <span className="text-xs text-muted-foreground tabular-nums">{new Date(date).toLocaleDateString()}</span>;
      } catch {
        return <span className="text-muted-foreground text-xs">—</span>;
      }
    },
  },
];

// Default hidden columns
const DEFAULT_HIDDEN = ['min_stock', 'brand', 'approved', 'storage_type', 'updated_at'];

// ── Main Page ──────────────────────────────────────────────────────
export default function InventoryItemsNew() {
  const { activeVenue } = useVenue();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // State
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 50, total: 0 });

  // Detail Drawer
  const [selectedItem, setSelectedItem] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Sidebar
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarFilters, setSidebarFilters] = useState({
    suppliers: [],
    outlets: [],
    allergens: [],
    subcategories: [],
    brands: [],
    approved: 'all', // 'all' | 'approved' | 'not_approved'
    storageType: 'all', // 'all' | 'ambient' | 'refrigerated' | 'frozen'
    diet: 'all',
    verification: 'all',
    status: 'all',
  });

  // Column visibility
  const [hiddenColumns, setHiddenColumns] = useState(DEFAULT_HIDDEN);

  // ── Dynamic filter options from data ──
  const filterOptions = useMemo(() => {
    const suppliers = new Map();
    const subcategories = new Map();
    const brands = new Map();
    const categories = new Map();

    for (const item of items) {
      const sup = item.supplier_name || item.primary_supplier || item.supplier;
      if (sup) suppliers.set(sup, (suppliers.get(sup) || 0) + 1);

      if (item.subcategory) subcategories.set(item.subcategory, (subcategories.get(item.subcategory) || 0) + 1);
      if (item.brand) brands.set(item.brand, (brands.get(item.brand) || 0) + 1);
      if (item.category) categories.set(item.category, (categories.get(item.category) || 0) + 1);
    }

    return {
      suppliers: Array.from(suppliers.entries()).map(([v, c]) => ({ value: v, label: v, count: c })).sort((a, b) => b.count - a.count),
      subcategories: Array.from(subcategories.entries()).map(([v, c]) => ({ value: v, label: v, count: c })).sort((a, b) => a.label.localeCompare(b.label)),
      brands: Array.from(brands.entries()).map(([v, c]) => ({ value: v, label: v, count: c })).sort((a, b) => a.label.localeCompare(b.label)),
      categories: Array.from(categories.entries()).map(([v, c]) => ({ value: v, label: v, count: c })).sort((a, b) => a.label.localeCompare(b.label)),
    };
  }, [items]);

  // ── Filtered items ──
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Supplier filter
      if (sidebarFilters.suppliers.length > 0) {
        const sup = item.supplier_name || item.primary_supplier || item.supplier || '';
        if (!sidebarFilters.suppliers.includes(sup)) return false;
      }
      // Allergen filter
      if (sidebarFilters.allergens.length > 0) {
        const itemAllergens = (item.allergens || []).map(a => (typeof a === 'string' ? a : a.name || '').toLowerCase());
        if (!sidebarFilters.allergens.some(a => itemAllergens.includes(a))) return false;
      }
      // Subcategory filter
      if (sidebarFilters.subcategories.length > 0) {
        if (!sidebarFilters.subcategories.includes(item.subcategory)) return false;
      }
      // Brand filter
      if (sidebarFilters.brands.length > 0) {
        if (!sidebarFilters.brands.includes(item.brand)) return false;
      }
      // Approved filter
      if (sidebarFilters.approved === 'approved' && item.approved === false) return false;
      if (sidebarFilters.approved === 'not_approved' && item.approved !== false) return false;
      // Storage type
      if (sidebarFilters.storageType !== 'all') {
        const st = item.storage_type || item.storage_conditions || '';
        if (st.toLowerCase() !== sidebarFilters.storageType) return false;
      }
      // Diet filter
      if (sidebarFilters.diet !== 'all') {
        const diets = (item.diet_tags || item.dietary_tags || []).map(d => d.toLowerCase());
        if (!diets.includes(sidebarFilters.diet)) return false;
      }
      // Verification filter
      if (sidebarFilters.verification !== 'all') {
        const status = item.allergen_verification_status || 'unverified';
        if (status !== sidebarFilters.verification) return false;
      }
      // Stock status filter
      if (sidebarFilters.status !== 'all') {
        const qty = item.quantity ?? item.current_stock ?? 0;
        const min = item.min_stock ?? item.min_quantity ?? 0;
        if (sidebarFilters.status === 'negative' && qty >= 0) return false;
        if (sidebarFilters.status === 'low' && !(qty <= min && min > 0 && qty >= 0)) return false;
        if (sidebarFilters.status === 'ok' && (qty < 0 || (qty <= min && min > 0))) return false;
      }
      return true;
    });
  }, [items, sidebarFilters]);

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (sidebarFilters.suppliers.length > 0) count++;
    if (sidebarFilters.allergens.length > 0) count++;
    if (sidebarFilters.subcategories.length > 0) count++;
    if (sidebarFilters.brands.length > 0) count++;
    if (sidebarFilters.approved !== 'all') count++;
    if (sidebarFilters.storageType !== 'all') count++;
    if (sidebarFilters.diet !== 'all') count++;
    if (sidebarFilters.verification !== 'all') count++;
    if (sidebarFilters.status !== 'all') count++;
    return count;
  }, [sidebarFilters]);

  const clearAllFilters = () => {
    setSidebarFilters({
      suppliers: [], outlets: [], allergens: [], subcategories: [],
      brands: [], approved: 'all', storageType: 'all', diet: 'all',
      verification: 'all', status: 'all',
    });
  };

  // ── Data Loading ──
  useEffect(() => {
    if (activeVenue?.id) {
      loadItems();
    }
  }, [activeVenue?.id]);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        venue_id: activeVenue.id,
        page: '1',
        limit: '500',
      });

      const response = await api.get(`/inventory/items?${params}`);
      const fetchedItems = response.data?.items || [];
      setItems(fetchedItems);
      setPagination((prev) => ({
        ...prev,
        total: response.data?.pagination?.total || fetchedItems.length,
      }));
    } catch (error) {
      logger.error('Failed to load items:', error);
      toast.error('Failed to load inventory items');
    } finally {
      setLoading(false);
    }
  }, [activeVenue?.id]);

  // Check URL for deep-link from GlobalSearch
  useEffect(() => {
    const itemId = searchParams.get('id');
    if (itemId && items.length > 0) {
      const item = items.find((i) => i.id === itemId);
      if (item) {
        handleRowClick(item);
      }
    }
  }, [searchParams, items]);

  // ── Row Actions ──
  const handleRowClick = (row) => {
    setSelectedItem(row);
    setDrawerOpen(true);
  };

  // ── KPI Calculations ──
  const stats = useMemo(() => {
    const totalItems = filteredItems.length;
    let lowStockCount = 0;
    let negativeCount = 0;
    let okCount = 0;
    let totalValue = 0;

    for (const item of filteredItems) {
      const qty = item.quantity ?? item.current_stock ?? 0;
      const min = item.min_stock ?? item.min_quantity ?? 0;
      const cost = item.cost ?? item.unit_cost ?? 0;

      totalValue += qty * cost;

      if (qty < 0) negativeCount++;
      else if (qty <= min && min > 0) lowStockCount++;
      else okCount++;
    }

    return { totalItems, totalAll: items.length, lowStockCount, negativeCount, okCount, totalValue };
  }, [filteredItems, items]);

  // ── Visible columns ──
  const visibleColumns = useMemo(() => {
    return ALL_COLUMNS.filter(c => c.alwaysVisible || !hiddenColumns.includes(c.key));
  }, [hiddenColumns]);

  const toggleColumn = (key) => {
    setHiddenColumns(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  // ── Bulk Actions ──
  const bulkActions = [
    { id: 'archive', label: 'Archive Selected', variant: 'destructive' },
    { id: 'set_category', label: 'Set Category' },
    { id: 'export', label: 'Export Selected' },
  ];

  const handleBulkAction = (actionId, selectedRows) => {
    toast.info(`${actionId}: ${selectedRows.length} items selected`);
  };

  // ── Update sidebar filter helper ──
  const updateFilter = (key, value) => {
    setSidebarFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <PageContainer
      title="Ingredients"
      description="Manage your ingredients — stock levels, allergens, nutrition, and supplier pricing"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="default" className="ml-1.5 h-5 w-5 p-0 flex items-center justify-center text-[10px] rounded-full">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
          <ColumnVisibility
            allColumns={ALL_COLUMNS.filter(c => !c.alwaysVisible)}
            hiddenColumns={hiddenColumns}
            onToggle={toggleColumn}
          />
          <Button variant="outline" size="sm" onClick={() => navigate('/manager/reports/inventory')}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/manager/data-exports')}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/manager/migration')}>
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button size="sm" onClick={() => {
            setSelectedItem(null);
            setDrawerOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
      }
    >
      {/* ── KPI Stat Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <StatCard
          icon={Package}
          label="Total Items"
          value={stats.totalAll}
          subtext={activeFilterCount > 0 ? `${stats.totalItems} filtered` : undefined}
          color="text-blue-600 dark:text-blue-400"
        />
        {/* Gap 12: Price alerts KPI */}
        <StatCard
          icon={TrendingUp}
          label="Price Alerts"
          value={filteredItems.filter(i => {
            const curr = parseFloat(i.cost ?? i.unit_cost ?? 0);
            const prev = parseFloat(i.previous_cost ?? i.last_cost ?? curr);
            return prev > 0 && ((curr - prev) / prev * 100) > 5;
          }).length}
          subtext=">5% increase"
          color="text-red-600 dark:text-red-400"
        />
        <StatCard
          icon={CheckCircle2}
          label="In Stock"
          value={stats.okCount}
          color="text-green-600 dark:text-green-400"
        />
        <StatCard
          icon={TrendingDown}
          label="Low Stock"
          value={stats.lowStockCount}
          color="text-orange-600 dark:text-orange-400"
        />
        <StatCard
          icon={AlertTriangle}
          label="Negative"
          value={stats.negativeCount}
          color="text-red-600 dark:text-red-400"
        />
        <StatCard
          icon={DollarSign}
          label="Total Value"
          value={`€${stats.totalValue.toFixed(2)}`}
          color="text-emerald-600 dark:text-emerald-400"
        />
      </div>

      {/* ── Main Content with Sidebar ── */}
      <div className="flex gap-4">
        {/* ── LEFT SIDEBAR FILTER PANEL ── */}
        {sidebarOpen && (
          <div className="w-64 shrink-0">
            <Card className="sticky top-4">
              <CardContent className="p-4 space-y-1 max-h-[calc(100vh-280px)] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold">Filters</span>
                  </div>
                  {activeFilterCount > 0 && (
                    <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground hover:text-foreground" onClick={clearAllFilters}>
                      Clear all
                    </Button>
                  )}
                </div>

                {/* Supplier */}
                {filterOptions.suppliers.length > 0 && (
                  <FilterSection title="Supplier">
                    <CheckboxFilter
                      options={filterOptions.suppliers}
                      selected={sidebarFilters.suppliers}
                      onChange={(v) => updateFilter('suppliers', v)}
                    />
                  </FilterSection>
                )}

                {/* Category — use from data */}
                {filterOptions.categories.length > 0 && (
                  <FilterSection title="Category">
                    <CheckboxFilter
                      options={filterOptions.categories}
                      selected={sidebarFilters.subcategories.length === 0 ? [] : []}
                      onChange={() => { }}
                    />
                  </FilterSection>
                )}

                {/* Subcategory */}
                {filterOptions.subcategories.length > 0 && (
                  <FilterSection title="Subcategory" defaultOpen={false}>
                    <CheckboxFilter
                      options={filterOptions.subcategories}
                      selected={sidebarFilters.subcategories}
                      onChange={(v) => updateFilter('subcategories', v)}
                    />
                  </FilterSection>
                )}

                {/* Allergens (EU 14) */}
                <FilterSection title="Allergens" defaultOpen={false}>
                  <CheckboxFilter
                    options={EU_ALLERGENS.map(a => ({ value: a, label: a.charAt(0).toUpperCase() + a.slice(1) }))}
                    selected={sidebarFilters.allergens}
                    onChange={(v) => updateFilter('allergens', v)}
                    maxVisible={8}
                  />
                </FilterSection>

                {/* Brand */}
                {filterOptions.brands.length > 0 && (
                  <FilterSection title="Brand" defaultOpen={false}>
                    <CheckboxFilter
                      options={filterOptions.brands}
                      selected={sidebarFilters.brands}
                      onChange={(v) => updateFilter('brands', v)}
                    />
                  </FilterSection>
                )}

                {/* Diet */}
                <FilterSection title="Diet">
                  <Select aria-label="Select option" value={sidebarFilters.diet} onValueChange={(v) => updateFilter('diet', v)}>
                    <SelectTrigger aria-label="Select option" className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Diets</SelectItem>
                      <SelectItem value="halal">🟢 Halal</SelectItem>
                      <SelectItem value="kosher">🔵 Kosher</SelectItem>
                      <SelectItem value="vegan">🌱 Vegan</SelectItem>
                      <SelectItem value="vegetarian">🥬 Vegetarian</SelectItem>
                      <SelectItem value="gluten_free">🌾 Gluten-Free</SelectItem>
                    </SelectContent>
                  </Select>
                </FilterSection>

                {/* Verification */}
                <FilterSection title="Allergen Verification">
                  <Select aria-label="Select option" value={sidebarFilters.verification} onValueChange={(v) => updateFilter('verification', v)}>
                    <SelectTrigger aria-label="Select option" className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="verified">✓ Verified</SelectItem>
                      <SelectItem value="partial">⚠ Partial</SelectItem>
                      <SelectItem value="unverified">✗ Unverified</SelectItem>
                    </SelectContent>
                  </Select>
                </FilterSection>

                {/* Approved / Allowed */}
                <FilterSection title="Approved Status">
                  <Select aria-label="Select option" value={sidebarFilters.approved} onValueChange={(v) => updateFilter('approved', v)}>
                    <SelectTrigger aria-label="Select option" className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="approved">✓ Approved</SelectItem>
                      <SelectItem value="not_approved">✗ Not Approved</SelectItem>
                    </SelectContent>
                  </Select>
                </FilterSection>

                {/* Storage Type */}
                <FilterSection title="Storage Type" defaultOpen={false}>
                  <Select aria-label="Select option" value={sidebarFilters.storageType} onValueChange={(v) => updateFilter('storageType', v)}>
                    <SelectTrigger aria-label="Select option" className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="ambient">☀️ Ambient</SelectItem>
                      <SelectItem value="refrigerated">❄️ Refrigerated</SelectItem>
                      <SelectItem value="frozen">🧊 Frozen</SelectItem>
                    </SelectContent>
                  </Select>
                </FilterSection>

                {/* Stock Status */}
                <FilterSection title="Stock Status">
                  <Select aria-label="Select option" value={sidebarFilters.status} onValueChange={(v) => updateFilter('status', v)}>
                    <SelectTrigger aria-label="Select option" className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="ok">✓ OK</SelectItem>
                      <SelectItem value="low">⚠ Low Stock</SelectItem>
                      <SelectItem value="negative">✗ Negative</SelectItem>
                    </SelectContent>
                  </Select>
                </FilterSection>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── DATA TABLE ── */}
        <div className="flex-1 min-w-0">
          {/* Active filters bar */}
          {activeFilterCount > 0 && (
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="text-xs text-muted-foreground">Active filters:</span>
              {sidebarFilters.suppliers.map(s => (
                <Badge key={s} variant="secondary" className="text-xs gap-1">
                  {s}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilter('suppliers', sidebarFilters.suppliers.filter(v => v !== s))} />
                </Badge>
              ))}
              {sidebarFilters.allergens.map(a => (
                <Badge key={a} variant="secondary" className="text-xs gap-1 capitalize">
                  {a}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilter('allergens', sidebarFilters.allergens.filter(v => v !== a))} />
                </Badge>
              ))}
              {sidebarFilters.subcategories.map(s => (
                <Badge key={s} variant="secondary" className="text-xs gap-1">
                  {s}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilter('subcategories', sidebarFilters.subcategories.filter(v => v !== s))} />
                </Badge>
              ))}
              {sidebarFilters.brands.map(b => (
                <Badge key={b} variant="secondary" className="text-xs gap-1">
                  {b}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilter('brands', sidebarFilters.brands.filter(v => v !== b))} />
                </Badge>
              ))}
              {sidebarFilters.diet !== 'all' && (
                <Badge variant="secondary" className="text-xs gap-1 capitalize">
                  {sidebarFilters.diet.replace('_', '-')}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilter('diet', 'all')} />
                </Badge>
              )}
              {sidebarFilters.approved !== 'all' && (
                <Badge variant="secondary" className="text-xs gap-1">
                  {sidebarFilters.approved === 'approved' ? 'Approved' : 'Not Approved'}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilter('approved', 'all')} />
                </Badge>
              )}
              {sidebarFilters.storageType !== 'all' && (
                <Badge variant="secondary" className="text-xs gap-1 capitalize">
                  {sidebarFilters.storageType}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilter('storageType', 'all')} />
                </Badge>
              )}
              {sidebarFilters.verification !== 'all' && (
                <Badge variant="secondary" className="text-xs gap-1 capitalize">
                  {sidebarFilters.verification}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilter('verification', 'all')} />
                </Badge>
              )}
              {sidebarFilters.status !== 'all' && (
                <Badge variant="secondary" className="text-xs gap-1 capitalize">
                  {sidebarFilters.status}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilter('status', 'all')} />
                </Badge>
              )}
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={clearAllFilters}>
                Clear all
              </Button>
            </div>
          )}

          <DataTable
            columns={visibleColumns}
            data={filteredItems}
            loading={loading}
            totalCount={stats.totalItems}
            pageCount={Math.ceil(stats.totalItems / pagination.pageSize)}
            enableGlobalSearch={true}
            enableFilters={true}
            enablePagination={true}
            bulkActions={bulkActions}
            onBulkAction={handleBulkAction}
            onRowClick={handleRowClick}
            emptyMessage="No ingredients found. Add your first ingredient to get started."
            tableId="inventory-ingredients"
            venueId={activeVenue?.id}
          />
        </div>
      </div>

      {/* ── Detail Drawer (9 tabs) ── */}
      <ItemDetailDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        skuId={selectedItem?.id}
        venueId={activeVenue?.id}
      />
    </PageContainer>
  );
}
