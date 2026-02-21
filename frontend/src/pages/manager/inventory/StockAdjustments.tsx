import DataTable from '@/components/shared/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card,CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useVenue } from '@/context/VenueContext';
import PageContainer from '@/layouts/PageContainer';
import api from '@/lib/api';
import { logger } from '@/lib/logger';
import type { LucideIcon } from 'lucide-react';
import {
AlertTriangle,
ArrowUpDown,
CheckCircle2,
ClipboardList,
Package,
RefreshCw,
Save,
} from 'lucide-react';
import { useCallback,useEffect,useMemo,useState } from 'react';
import { toast } from 'sonner';

interface InventoryItem {
  id: string;
  name: string;
  category?: string;
  quantity: number;
  unit?: string;
  [key: string]: unknown;
}

interface AdjustmentEntry {
  qty?: string;
  reason?: string;
}

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  subtext?: string;
  color?: string;
}

// ── KPI Stat Card ──────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, subtext, color = 'text-foreground' }: StatCardProps) {
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

export default function StockAdjustments() {
  const { activeVenue } = useVenue();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adjustments, setAdjustments] = useState<Record<string, AdjustmentEntry>>({});

  useEffect(() => {
    if (activeVenue?.id) {
      loadInventory();
    }
  }, [activeVenue?.id]);

  const loadInventory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/inventory/items?venue_id=${activeVenue!.id}`);
      const data = res.data;
      setItems(Array.isArray(data) ? data : (data?.items || []));
      setAdjustments({});
    } catch (error: unknown) {
      logger.error('Failed to load inventory:', { error: String(error) });
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }, [activeVenue?.id]);

  const handleAdjustmentChange = (id: string, field: string, value: string) => {
    setAdjustments((prev: Record<string, AdjustmentEntry>) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const submitAdjustments = async () => {
    const updates = Object.entries(adjustments)
      .map(([itemId, adj]: [string, AdjustmentEntry]) => ({
        item_id: itemId,
        quantity_change: parseFloat(adj.qty || '0'),
        reason: adj.reason || 'Manual Adjustment',
        action: 'ADJUST',
      }))
      .filter(u => u.quantity_change !== 0 && !isNaN(u.quantity_change));

    if (updates.length === 0) return toast.info('No adjustments to save');
    if (!window.confirm(`Apply ${updates.length} adjustment(s)?`)) return;

    setSaving(true);
    try {
      await Promise.all(updates.map(u =>
        api.post('/inventory/ledger', {
          venue_id: activeVenue!.id,
          ...u,
        })
      ));
      toast.success('Adjustments saved successfully');
      setAdjustments({});
      loadInventory();
    } catch (error: unknown) {
      logger.error('Failed to save adjustments:', { error: String(error) });
      toast.error('Failed to save adjustments');
    } finally {
      setSaving(false);
    }
  };

  // ── KPI Calculations ──
  const stats = useMemo(() => {
    const totalItems = items.length;
    let adjustedCount = 0;
    let positiveAdj = 0;
    let negativeAdj = 0;

    for (const [_id, adj] of Object.entries(adjustments) as [string, AdjustmentEntry][]) {
      const qty = parseFloat(adj.qty || '0');
      if (qty !== 0 && !isNaN(qty)) {
        adjustedCount++;
        if (qty > 0) positiveAdj++;
        else negativeAdj++;
      }
    }

    return { totalItems, adjustedCount, positiveAdj, negativeAdj };
  }, [items, adjustments]);

  // ── Column Definitions ──
  const COLUMNS = useMemo(() => [
    {
      key: 'name',
      label: 'Item Name',
      enableSorting: true,
      size: 220,
      render: (row: InventoryItem) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center shrink-0">
            <Package className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <div className="font-medium truncate">{row.name}</div>
            <div className="text-xs text-muted-foreground">{row.category || '—'}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'quantity',
      label: 'Current Stock',
      enableSorting: true,
      size: 130,
      render: (row: InventoryItem) => (
        <span className="font-medium tabular-nums">
          {(row.quantity ?? 0).toFixed(2)} <span className="text-xs text-muted-foreground">{row.unit || 'EA'}</span>
        </span>
      ),
    },
    {
      key: 'adjustment',
      label: 'Adjustment (+/-)',
      size: 150,
      render: (row: InventoryItem) => {
        const val = adjustments[row.id]?.qty || '';
        const numVal = parseFloat(val);
        const hasValue = val !== '' && !isNaN(numVal) && numVal !== 0;
        return (
          <Input aria-label="0"
            type="number"
            step="0.01"
            placeholder="0"
            className={`w-28 h-8 text-right font-mono ${hasValue ? (numVal > 0 ? 'border-green-500 bg-green-900/10' : 'border-red-500 bg-red-900/10') : ''}`}
            value={val}
            onChange={e => handleAdjustmentChange(row.id, 'qty', e.target.value)}
          />
        );
      },
    },
    {
      key: 'new_stock',
      label: 'New Stock',
      size: 120,
      render: (row: InventoryItem) => {
        const adj = parseFloat(adjustments[row.id]?.qty || '0');
        if (isNaN(adj) || adj === 0) return <span className="text-muted-foreground">—</span>;
        const newQty = (row.quantity ?? 0) + adj;
        return (
          <span className={`font-bold tabular-nums ${newQty < 0 ? 'text-red-500' : 'text-foreground'}`}>
            {newQty.toFixed(2)}
          </span>
        );
      },
    },
    {
      key: 'reason',
      label: 'Reason',
      size: 200,
      render: (row: InventoryItem) => (
        <Input aria-label="e.g. Spillage, Received delivery..."
          placeholder="e.g. Spillage, Received delivery..."
          className="h-8 text-sm"
          value={adjustments[row.id]?.reason || ''}
          onChange={e => handleAdjustmentChange(row.id, 'reason', e.target.value)}
        />
      ),
    },
    {
      key: 'status',
      label: 'Status',
      size: 90,
      render: (row: InventoryItem) => {
        const adj = parseFloat(adjustments[row.id]?.qty || '0');
        if (isNaN(adj) || adj === 0) return <span className="text-muted-foreground text-xs">—</span>;
        return adj > 0 ? (
          <Badge variant="outline" className="text-xs text-green-600 dark:text-green-400 border-green-400 gap-1">
            <ArrowUpDown className="h-3 w-3" /> +
          </Badge>
        ) : (
          <Badge variant="outline" className="text-xs text-red-600 dark:text-red-400 border-red-400 gap-1">
            <ArrowUpDown className="h-3 w-3" /> -
          </Badge>
        );
      },
    },
  ], [adjustments]);

  return (
    <PageContainer
      title="Stock Adjustments"
      description="Manually adjust stock levels — corrections, received goods, and write-offs"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadInventory}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button
            size="sm"
            onClick={submitAdjustments}
            disabled={saving || stats.adjustedCount === 0}
            className={stats.adjustedCount > 0 ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : `Save ${stats.adjustedCount} Adjustments`}
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
          icon={ClipboardList}
          label="Adjusted"
          value={stats.adjustedCount}
          subtext={`of ${stats.totalItems}`}
          color="text-purple-600 dark:text-purple-400"
        />
        <StatCard
          icon={CheckCircle2}
          label="Additions (+)"
          value={stats.positiveAdj}
          color="text-green-600 dark:text-green-400"
        />
        <StatCard
          icon={AlertTriangle}
          label="Deductions (-)"
          value={stats.negativeAdj}
          color="text-red-600 dark:text-red-400"
        />
      </div>

      {/* ── Data Table ── */}
      <DataTable
        columns={COLUMNS}
        data={items}
        loading={loading}
        totalCount={items.length}
        enableGlobalSearch={true}
        enablePagination={true}
        emptyMessage="No inventory items found. Add items in the Ingredients page first."
        tableId="stock-adjustments"
        venueId={activeVenue?.id}
      />
    </PageContainer>
  );
}
