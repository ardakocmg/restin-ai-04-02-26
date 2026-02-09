import React, { useState, useEffect } from 'react';
import { useVenue } from '../../../context/VenueContext';
import api from '../../../lib/api';
import PageContainer from '../../../layouts/PageContainer';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { Search, Save, AlertTriangle, CheckCircle2, RefreshCw, Calculator } from 'lucide-react';
import DataTable from '../../../components/shared/DataTable';
import { toast } from 'sonner';

import { logger } from '@/lib/logger';
export default function StockCount() {
  const { activeVenue } = useVenue();
  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState({}); // { itemId: newQuantity }
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (activeVenue?.id) {
      loadData();
    }
  }, [activeVenue?.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/inventory/items?venue_id=${activeVenue.id}`);
      setItems(res.data || []);
      setCounts({}); // Reset counts on reload
    } catch (error) {
      logger.error(error);
      toast.error("Failed to load inventory");
    } finally {
      setLoading(false);
    }
  };

  const handleCountChange = (id, value) => {
    setCounts(prev => ({
      ...prev,
      [id]: value
    }));
  };

  const getVariance = (item) => {
    const newQty = parseFloat(counts[item.id]);
    if (isNaN(newQty)) return 0;
    return newQty - item.quantity;
  };

  const commitAdjustments = async () => {
    const updates = Object.entries(counts).filter(([id, val]) => {
      const item = items.find(i => i.id === id);
      return item && val !== '' && parseFloat(val) !== item.quantity;
    });

    if (updates.length === 0) return toast.info("No changes to save");

    if (!window.confirm(`Confirm updates for ${updates.length} items? This will reset system stock.`)) return;

    setSaving(true);
    try {
      // Process sequentially to ensure order (promise.all might hit rate limits or race conditions in simpler backends)
      // For 100+ items, we should have a bulk endpoint, but loop is fine for MVP speed.
      for (const [id, val] of updates) {
        await api.post('/inventory/ledger', {
          item_id: id,
          action: 'ADJUST',
          quantity: parseFloat(val),
          reason: 'Physical Stock Count',
          venue_id: activeVenue.id // Should be inferred by backend if item loaded, but safe to pass if needed
        });
      }
      toast.success("Stock count applied successfully");
      loadData();
    } catch (e) {
      logger.error(e);
      toast.error("Failed to save adjustments");
    } finally {
      setSaving(false);
    }
  };

  const filteredItems = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));

  // Count changes
  const pendingChanges = Object.keys(counts).length;

  return (
    <PageContainer
      title="Physical Stock Count"
      description="Reconcile system stock with actual physical inventory"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button
            size="sm"
            onClick={commitAdjustments}
            disabled={saving || pendingChanges === 0}
            className={pendingChanges > 0 ? "bg-green-600 hover:bg-green-700" : ""}
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : `Commit ${pendingChanges} Adjustments`}
          </Button>
        </div>
      }
    >
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Search items..."
            className="pl-10 bg-zinc-950 border-white/10"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="text-xs text-zinc-400 ml-auto">
          <span className="text-yellow-500 font-bold">Orange</span> indicates variance.
        </div>
      </div>

      <Card className="bg-zinc-950 border-white/10">
        <CardContent className="p-0">
          <DataTable
            columns={[
              {
                key: 'name',
                label: 'Item',
                render: (row) => (
                  <div>
                    <div className="font-bold text-white">{row.name}</div>
                    <div className="text-[10px] text-zinc-500">{row.sku}</div>
                  </div>
                )
              },
              {
                key: 'category',
                label: 'Category',
                render: (row) => <Badge variant="outline" className="text-[10px]">{row.category}</Badge>
              },
              {
                key: 'system_stock',
                label: 'System Stock',
                render: (row) => <span className="text-zinc-400">{row.quantity} {row.unit}</span>
              },
              {
                key: 'actual_stock',
                label: 'Physical Count',
                render: (row) => (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      className={`w-32 h-8 text-right font-mono ${counts[row.id] !== undefined && getVariance(row) !== 0 ? 'border-yellow-500 bg-yellow-900/10' : 'bg-zinc-900 border-white/10'}`}
                      placeholder={row.quantity.toString()}
                      value={counts[row.id] || ''}
                      onChange={(e) => handleCountChange(row.id, e.target.value)}
                    />
                    <span className="text-xs text-zinc-500">{row.unit}</span>
                  </div>
                )
              },
              {
                key: 'variance',
                label: 'Variance',
                render: (row) => {
                  const variance = getVariance(row);
                  if (counts[row.id] === undefined) return <span className="text-zinc-600">-</span>;
                  return (
                    <span className={`font-bold ${variance < 0 ? 'text-red-500' : variance > 0 ? 'text-green-500' : 'text-zinc-500'}`}>
                      {variance > 0 ? '+' : ''}{variance.toFixed(2)}
                    </span>
                  );
                }
              }
            ]}
            data={filteredItems}
            loading={loading}
          />
        </CardContent>
      </Card>
    </PageContainer>
  );
}
