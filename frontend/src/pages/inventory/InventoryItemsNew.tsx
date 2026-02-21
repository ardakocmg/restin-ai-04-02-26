import { logger } from '@/lib/logger';
import {
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Download,
  Package,
  Plus,
  Printer,
  TrendingDown,
  Upload
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import ItemDetailDrawer from '../../components/inventory/ItemDetailDrawer';
import DataTable from '../../components/shared/DataTable';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { useVenue } from '../../context/VenueContext';
import PageContainer from '../../layouts/PageContainer';
import api from '../../lib/api';

// ── Column Definitions ─────────────────────────────────────────────
const COLUMNS = [
  {
    key: 'name',
    label: 'Item Name',
    enableSorting: true,
    size: 250,
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
    size: 130,
    filterType: 'select',
    filterOptions: [
      { value: 'produce', label: 'Produce' },
      { value: 'protein', label: 'Protein' },
      { value: 'dairy', label: 'Dairy' },
      { value: 'dry_goods', label: 'Dry Goods' },
      { value: 'beverages', label: 'Beverages' },
      { value: 'seafood', label: 'Seafood' },
      { value: 'bakery', label: 'Bakery' },
      { value: 'frozen', label: 'Frozen' },
      { value: 'condiments', label: 'Condiments' },
      { value: 'spices', label: 'Spices' },
    ],
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
    key: 'quantity',
    label: 'Stock',
    enableSorting: true,
    size: 140,
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
    size: 100,
    render: (row) => {
      const min = row.min_stock ?? row.min_quantity ?? 0;
      return (
        <span className="text-sm tabular-nums text-muted-foreground">
          {min > 0 ? `${min.toFixed(2)} ${row.unit || ''}` : '—'}
        </span>
      );
    },
  },
  {
    key: 'unit',
    label: 'Unit',
    size: 70,
    render: (row) => <span className="text-sm">{row.unit || 'EA'}</span>,
  },
  {
    key: 'allergens',
    label: 'Allergens',
    size: 90,
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
    key: 'status',
    label: 'Status',
    size: 100,
    filterType: 'select',
    filterOptions: [
      { value: 'ok', label: 'OK' },
      { value: 'low', label: 'Low Stock' },
      { value: 'negative', label: 'Negative' },
    ],
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
];

// ── KPI Stat Card ──────────────────────────────────────────────────
interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subtext?: string;
  color?: string;
}

function StatCard({ icon: Icon, label, value, subtext, color = 'text-foreground' }: StatCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 flex items-center gap-4">
        <div className={`p-2.5 rounded-lg bg-muted`}>
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

// ── Main Page ──────────────────────────────────────────────────────
export default function InventoryItemsNew() {
  const { activeVenue } = useVenue();
  const [searchParams] = useSearchParams();

  // State
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 50, total: 0 });

  // Detail Drawer
  const [selectedItem, setSelectedItem] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

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
    const totalItems = items.length;
    let lowStockCount = 0;
    let negativeCount = 0;
    let okCount = 0;
    let totalValue = 0;

    for (const item of items) {
      const qty = item.quantity ?? item.current_stock ?? 0;
      const min = item.min_stock ?? item.min_quantity ?? 0;
      const cost = item.cost ?? item.unit_cost ?? 0;

      totalValue += qty * cost;

      if (qty < 0) negativeCount++;
      else if (qty <= min && min > 0) lowStockCount++;
      else okCount++;
    }

    return { totalItems, lowStockCount, negativeCount, okCount, totalValue };
  }, [items]);

  // ── Bulk Actions ──
  const bulkActions = [
    { id: 'archive', label: 'Archive Selected', variant: 'destructive' as const },
    { id: 'set_category', label: 'Set Category' },
    { id: 'export', label: 'Export Selected' },
  ];

  const handleBulkAction = (actionId, selectedRows) => {
    toast.info(`${actionId}: ${selectedRows.length} items selected`);
  };

  return (
    <PageContainer
      title="Ingredients"
      description="Manage your ingredients — stock levels, allergens, nutrition, and supplier pricing"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => toast.info('Print coming soon')}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm" onClick={() => toast.info('Export coming soon')}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={() => toast.info('Import coming soon')}>
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button size="sm" onClick={() => toast.info('Add Item coming soon')}>
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
      }
    >
      {/* ── KPI Stat Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={Package}
          label="Total Items"
          value={stats.totalItems}
          color="text-blue-600 dark:text-blue-400"
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
          subtext={stats.negativeCount > 0 ? `${stats.negativeCount} negative` : undefined}
          color="text-orange-600 dark:text-orange-400"
        />
        <StatCard
          icon={DollarSign}
          label="Total Value"
          value={`€${stats.totalValue.toFixed(2)}`}
          color="text-emerald-600 dark:text-emerald-400"
        />
      </div>

      {/* ── Data Table ── */}
      <DataTable
        columns={COLUMNS}
        data={items}
        loading={loading}
        totalCount={stats.totalItems}
        pageCount={Math.ceil(stats.totalItems / pagination.pageSize)}
        enableGlobalSearch={true}
        enableFilters={true}
        enablePagination={true}
        // @ts-ignore
        bulkActions={bulkActions}
        onBulkAction={handleBulkAction}
        onRowClick={handleRowClick}
        emptyMessage="No ingredients found. Add your first ingredient to get started."
        tableId="inventory-ingredients"
        venueId={activeVenue?.id}
      />

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