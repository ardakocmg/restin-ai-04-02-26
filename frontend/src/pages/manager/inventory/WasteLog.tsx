import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { useVenue } from '@/context/VenueContext';
import api from '@/lib/api';
import PageContainer from '@/layouts/PageContainer';
import DataTable from '@/components/shared/DataTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Trash2,
  AlertTriangle,
  RefreshCw,
  Loader2,
  History,
  DollarSign,
  TrendingDown,
  Package,
  ChefHat,
  BarChart3,
} from 'lucide-react';
import { toast } from 'sonner';

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

// ── Waste Reasons ──────────────────────────────────────────────────
const WASTE_REASONS = [
  { value: 'Expired', label: 'Expired / Spoilage' },
  { value: 'Damaged', label: 'Droppage / Damaged' },
  { value: 'Spillage', label: 'Spillage (Bar)' },
  { value: 'Overproduction', label: 'Overproduction' },
  { value: 'Mistake', label: 'Presentation Error' },
  { value: 'Quality', label: 'Quality Rejected' },
  { value: 'RecipeWaste', label: 'Recipe Trim / Peel Waste' },
  { value: 'CustomerReturn', label: 'Customer Return' },
  { value: 'StaffMeal', label: 'Staff Meal / Consumption' },
  { value: 'Other', label: 'Other' },
];

interface WasteItem {
  id: string;
  name?: string;
  category?: string;
  unit?: string;
  quantity?: number;
  cost?: number;
  unit_cost?: number;
  [key: string]: unknown;
}

interface WasteRecipe {
  id: string;
  _id?: string;
  name?: string;
  recipe_name?: string;
  [key: string]: unknown;
}

interface WasteLogEntry {
  item_id?: string;
  quantity?: number;
  reason?: string;
  action?: string;
  created_at?: string;
  [key: string]: unknown;
}

interface WasteFormData {
  item_id: string;
  recipe_id: string;
  quantity: string;
  reason: string;
  portions: string;
  notes?: string;
}

export default function WasteLog() {
  const { activeVenue } = useVenue();
  const [items, setItems] = useState<WasteItem[]>([]);
  const [recipes, setRecipes] = useState<WasteRecipe[]>([]);
  const [logs, setLogs] = useState<WasteLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [wasteType, setWasteType] = useState('ingredient'); // 'ingredient' | 'recipe'

  const [formData, setFormData] = useState<WasteFormData>({
    item_id: '',
    recipe_id: '',
    quantity: '',
    reason: 'Expired',
    portions: '1',
  });

  useEffect(() => {
    if (activeVenue?.id) {
      loadData();
    }
  }, [activeVenue?.id]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [itemsRes, recipesRes] = await Promise.all([
        api.get(`/inventory/items?venue_id=${activeVenue?.id}`),
        api.get(`/inventory/recipes?venue_id=${activeVenue?.id}&page_size=500`).catch(() => ({ data: { items: [] } })),
      ]);
      const itemsData = itemsRes.data;
      setItems(Array.isArray(itemsData) ? itemsData : (itemsData?.items || []));
      setRecipes(recipesRes.data?.items || recipesRes.data || []);

      // Try dedicated waste logs endpoint first
      try {
        const wasteRes = await api.get(`/inventory/waste?venue_id=${activeVenue?.id}`);
        setLogs(wasteRes.data?.logs || []);
      } catch {
        // Fallback: filter waste entries from stock ledger
        const logsRes = await api.get(`/venues/${activeVenue?.id}/inventory/ledger`).catch(() => ({ data: [] }));
        const allLogs: WasteLogEntry[] = logsRes.data || [];
        const wasteLogs = allLogs.filter((l: WasteLogEntry) =>
          l.action === 'OUT' &&
          ['Expired', 'Damaged', 'Spillage', 'Mistake', 'Overproduction', 'Quality', 'WASTE', 'RecipeWaste', 'CustomerReturn', 'StaffMeal'].some((r: string) => (l.reason || '').includes(r))
        );
        setLogs(wasteLogs);
      }
    } catch (e: unknown) {
      logger.error('Failed to load waste data:', { error: e instanceof Error ? e.message : String(e) });
      toast.error('Failed to load waste data');
    } finally {
      setLoading(false);
    }
  }, [activeVenue?.id]);

  const handleSubmit = async () => {
    if (wasteType === 'ingredient' && (!formData.item_id || !formData.quantity)) return toast.error('Please fill required fields');
    if (wasteType === 'recipe' && (!formData.recipe_id || !formData.portions)) return toast.error('Please select recipe and portions');

    setSubmitting(true);
    try {
      if (wasteType === 'ingredient') {
        const qty = parseFloat(formData.quantity);
        if (isNaN(qty) || qty <= 0) return toast.error('Invalid quantity');
        const selectedItemForSubmit = items.find((i: WasteItem) => i.id === formData.item_id);
        await api.post('/inventory/waste', {
          venue_id: activeVenue?.id,
          item_id: formData.item_id,
          item_name: selectedItemForSubmit?.name || 'Unknown',
          item_type: 'INGREDIENT',
          quantity: qty,
          unit: selectedItemForSubmit?.unit || 'units',
          reason: formData.reason,
          notes: formData.notes || null,
        });
      } else {
        // Recipe waste
        const portions = parseInt(formData.portions) || 1;
        const recipe = recipes.find((r: WasteRecipe) => r.id === formData.recipe_id || r._id === formData.recipe_id);
        await api.post('/inventory/waste', {
          venue_id: activeVenue?.id,
          item_id: formData.recipe_id,
          item_name: recipe?.name || recipe?.recipe_name || 'Recipe',
          item_type: 'RECIPE',
          quantity: portions,
          unit: 'portions',
          reason: formData.reason,
          notes: formData.notes || null,
        });
      }
      toast.success('Waste recorded successfully');
      setFormData({ item_id: '', recipe_id: '', quantity: '', reason: 'Expired', portions: '1' });
      loadData();
    } catch (e: unknown) {
      logger.error('Failed to record waste:', { error: e instanceof Error ? e.message : String(e) });
      toast.error('Failed to record waste');
    } finally {
      setSubmitting(false);
    }
  };

  // ── KPI Calculations ──
  const stats = useMemo(() => {
    const totalEntries = logs.length;
    let totalUnits = 0;
    let totalValue = 0;
    const reasonCounts: Record<string, number> = {};

    for (const log of logs) {
      totalUnits += log.quantity || 0;
      const item = items.find(i => i.id === log.item_id);
      totalValue += (log.quantity || 0) * (item?.cost ?? item?.unit_cost ?? 0);

      const reason = (log.reason || '').replace('[WASTE] ', '');
      reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
    }

    const topReason = Object.entries(reasonCounts).sort((a: [string, number], b: [string, number]) => b[1] - a[1])[0];

    return { totalEntries, totalUnits, totalValue, topReason: topReason?.[0] || '—', reasonCounts };
  }, [logs, items]);

  // ── Waste Analytics: by-reason breakdown ──
  const reasonBreakdown = useMemo(() => {
    const entries = Object.entries(stats.reasonCounts || {}).sort((a: [string, number], b: [string, number]) => b[1] - a[1]);
    const max = entries.length > 0 ? entries[0][1] : 1;
    return entries.map(([reason, count]: [string, number]) => ({ reason, count, pct: Math.round((count / max) * 100) }));
  }, [stats.reasonCounts]);

  // ── Top wasted items ──
  const topWastedItems = useMemo(() => {
    const itemWaste: Record<string, { qty: number; value: number; name: string }> = {};
    for (const log of logs) {
      const key = log.item_id;
      if (!key) continue;
      if (!itemWaste[key]) itemWaste[key] = { qty: 0, value: 0, name: '' };
      itemWaste[key].qty += log.quantity || 0;
      const item = items.find(i => i.id === key);
      itemWaste[key].value += (log.quantity || 0) * (item?.cost ?? item?.unit_cost ?? 0);
      itemWaste[key].name = item?.name || key.substring(0, 12);
    }
    return Object.values(itemWaste).sort((a: { qty: number; value: number; name: string }, b: { qty: number; value: number; name: string }) => b.value - a.value).slice(0, 5);
  }, [logs, items]);

  const selectedItem = items.find(i => i.id === formData.item_id);

  // ── History Table Columns ──
  const LOG_COLUMNS = useMemo(() => [
    {
      key: 'created_at',
      label: 'Time',
      enableSorting: true,
      size: 160,
      render: (row: WasteLogEntry) => (
        <span className="text-sm tabular-nums">
          {new Date(row.created_at || '').toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </span>
      ),
    },
    {
      key: 'item_id',
      label: 'Item',
      size: 200,
      render: (row: WasteLogEntry) => {
        const item = items.find(i => i.id === row.item_id);
        return (
          <div className="min-w-0">
            <div className="font-medium truncate">{item?.name || row.item_id?.substring(0, 12)}</div>
            <div className="text-xs text-muted-foreground">{item?.category || ''}</div>
          </div>
        );
      },
    },
    {
      key: 'quantity',
      label: 'Loss',
      size: 100,
      render: (row: WasteLogEntry) => (
        <span className="text-red-500 dark:text-red-400 font-bold tabular-nums">
          -{(row.quantity || 0).toFixed(2)}
        </span>
      ),
    },
    {
      key: 'reason',
      label: 'Reason',
      size: 160,
      render: (row: WasteLogEntry) => {
        const reason = (row.reason || '').replace('[WASTE] ', '');
        const reasonColors = {
          Expired: 'text-orange-500 border-orange-500',
          Damaged: 'text-red-500 border-red-500',
          Spillage: 'text-blue-500 border-blue-500',
          Overproduction: 'text-purple-500 border-purple-500',
          Mistake: 'text-yellow-500 border-yellow-500',
          Quality: 'text-pink-500 border-pink-500',
        };
        const colorClass = Object.entries(reasonColors).find(([key]) => reason.includes(key))?.[1] || '';
        return <Badge variant="outline" className={`text-xs ${colorClass}`}>{reason}</Badge>;
      },
    },
  ], [items]);

  return (
    <PageContainer
      title="Waste Management"
      description="Record and track food waste — spoilage, spillage, and production errors"
      actions={
        <Button variant="outline" size="sm" onClick={loadData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      }
    >
      {/* ── KPI Stat Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={Trash2}
          label="Total Entries"
          value={stats.totalEntries}
          color="text-red-600 dark:text-red-400"
        />
        <StatCard
          icon={Package}
          label="Total Units Lost"
          value={stats.totalUnits.toFixed(1)}
          color="text-orange-600 dark:text-orange-400"
        />
        <StatCard
          icon={DollarSign}
          label="Total Value Lost"
          value={`€${stats.totalValue.toFixed(2)}`}
          color="text-red-600 dark:text-red-400"
        />
        <StatCard
          icon={AlertTriangle}
          label="Top Reason"
          value={stats.topReason}
          color="text-yellow-600 dark:text-yellow-400"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Entry Form ── */}
        <Card className="lg:col-span-1 h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trash2 className="h-5 w-5 text-red-500" />
              Record Waste
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Waste Type Toggle */}
            <div className="space-y-2">
              <Label>Waste Type</Label>
              <div className="flex gap-2">
                <Button
                  variant={wasteType === 'ingredient' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setWasteType('ingredient')}
                >
                  <Package className="h-3.5 w-3.5 mr-1.5" /> Ingredient
                </Button>
                <Button
                  variant={wasteType === 'recipe' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setWasteType('recipe')}
                >
                  <ChefHat className="h-3.5 w-3.5 mr-1.5" /> Recipe
                </Button>
              </div>
            </div>

            {wasteType === 'ingredient' ? (
              <>
                <div className="space-y-2">
                  <Label>Item</Label>
                  <Select value={formData.item_id} onValueChange={v => setFormData({ ...formData, item_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select item..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {items.map(i => (
                        <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedItem && (
                    <div className="text-xs text-muted-foreground">
                      In Stock: {(selectedItem.quantity ?? 0).toFixed(2)} {selectedItem.unit}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Quantity Lost ({selectedItem?.unit || 'Units'})</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.quantity}
                    onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Recipe</Label>
                  <Select value={formData.recipe_id} onValueChange={v => setFormData({ ...formData, recipe_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select recipe..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {recipes.map(r => (
                        <SelectItem key={r.id || r._id || ''} value={r.id || r._id || ''}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Portions Wasted</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.portions}
                    onChange={e => setFormData({ ...formData, portions: e.target.value })}
                    placeholder="1"
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Reason</Label>
              <Select value={formData.reason} onValueChange={v => setFormData({ ...formData, reason: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WASTE_REASONS.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              className="w-full bg-red-600 hover:bg-red-700 font-bold"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'LOG WASTE'}
            </Button>
          </CardContent>
        </Card>

        {/* ── History Log ── */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-5 w-5 text-muted-foreground" />
              Recent Waste Logs
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              columns={LOG_COLUMNS}
              data={logs}
              loading={loading}
              enablePagination={true}
              emptyMessage="No waste records found. Log your first waste entry."
              tableId="waste-log"
              venueId={activeVenue?.id}
            />
          </CardContent>
        </Card>
      </div>

      {/* ── Waste Analytics ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {/* Waste by Reason */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-orange-500" />
              Waste by Reason
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(reasonBreakdown.length === 0 ? WASTE_REASONS.map(r => ({ reason: r.label, count: 0, pct: 0 })) : reasonBreakdown).map((r, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{r.reason}</span>
                  <span className="tabular-nums font-medium">{r.count}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-red-500/70 transition-all" style={{ width: `${r.pct}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Top Wasted Items */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              Top Wasted Items (by Value)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(topWastedItems.length === 0 ? Array.from({ length: 5 }, (_, i) => ({ name: '—', qty: 0, value: 0 })) : topWastedItems).map((item, i) => (
                <div key={i} className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="w-6 h-6 rounded-full p-0 flex items-center justify-center text-[10px]">{i + 1}</Badge>
                    <span className="truncate max-w-[150px]">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-red-500 font-bold tabular-nums">€{item.value.toFixed(2)}</span>
                    <span className="text-xs text-muted-foreground ml-1">({item.qty.toFixed(1)} units)</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
