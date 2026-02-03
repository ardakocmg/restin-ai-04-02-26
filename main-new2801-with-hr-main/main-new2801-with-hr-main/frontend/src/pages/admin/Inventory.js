import { useState, useEffect } from 'react';
import { useVenue } from '../../context/VenueContext';
import api from '../../lib/api';
import { downloadCsv } from '../../lib/csv';
import { toast } from 'sonner';
import PageContainer from '../../layouts/PageContainer';
import DataTable from '../../components/shared/DataTable';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Plus, Package, AlertTriangle } from 'lucide-react';

export default function Inventory() {
  const { activeVenue } = useVenue();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [tableQuery, setTableQuery] = useState({
    pageIndex: 0,
    pageSize: 20,
    sorting: [],
    globalSearch: '',
    filters: {}
  });

  const inventoryBlueprint = [
    {
      title: 'Stock Ledger (Immutable)',
      items: ['Hash-linked ledger entries', 'Reversal-only corrections', 'Audit-first traceability']
    },
    {
      title: 'Cost Methods',
      items: ['FIFO layers', 'Weighted Average Cost (WAC)', 'COGS sync with finance']
    },
    {
      title: 'Lot & Expiry Tracking',
      items: ['Batch-level quantities', 'Expiry alerts', 'Recall-ready history']
    },
    {
      title: 'Waste & Yield',
      items: ['Waste journal entries', 'Shrinkage % on recipes', 'Variance reporting']
    },
    {
      title: 'Multi-Location Transfers',
      items: ['Transfer in/out ledger pair', 'Central kitchen routing', 'Cost carry-over']
    },
    {
      title: 'Read Models',
      items: ['CurrentStock projection', 'Low stock alerts', 'Real-time availability']
    }
  ];

  useEffect(() => {
    if (activeVenue?.id) {
      loadInventory();
    }
  }, [activeVenue?.id, tableQuery]);

  const loadInventory = async (query = tableQuery) => {
    try {
      const params = {
        page: query.pageIndex + 1,
        page_size: query.pageSize,
        search: query.globalSearch || undefined
      };

      const filters = query.filters || {};
      if (filters.unit?.length) params.unit = filters.unit.join(',');
      if (filters.current_stock?.min) params.current_stock_min = filters.current_stock.min;
      if (filters.current_stock?.max) params.current_stock_max = filters.current_stock.max;
      if (filters.min_stock?.min) params.min_stock_min = filters.min_stock.min;
      if (filters.min_stock?.max) params.min_stock_max = filters.min_stock.max;

      if (query.sorting?.length) {
        const sort = query.sorting[0];
        const sortMap = {
          name: 'name',
          sku: 'sku',
          unit: 'unit',
          current_stock: 'current_stock',
          min_stock: 'min_stock'
        };
        params.sort_by = sortMap[sort.id] || 'updated_at';
        params.sort_dir = sort.desc ? 'desc' : 'asc';
      }

      const response = await api.get(`/venues/${activeVenue.id}/inventory`, { params });
      setItems(response.data.items || []);
      setTotalCount(response.data.total || 0);
    } catch (error) {
      console.error('Failed to load inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (query) => {
    try {
      const params = {
        page: 1,
        page_size: 1000,
        search: query.globalSearch || undefined
      };
      const filters = query.filters || {};
      if (filters.unit?.length) params.unit = filters.unit.join(',');
      if (filters.current_stock?.min) params.current_stock_min = filters.current_stock.min;
      if (filters.current_stock?.max) params.current_stock_max = filters.current_stock.max;
      if (filters.min_stock?.min) params.min_stock_min = filters.min_stock.min;
      if (filters.min_stock?.max) params.min_stock_max = filters.min_stock.max;
      const response = await api.get(`/venues/${activeVenue.id}/inventory`, { params });
      const rows = (response.data.items || []).map((item) => ({
        name: item.name,
        sku: item.sku,
        current_stock: item.current_stock,
        unit: item.unit,
        min_stock: item.min_stock
      }));
      downloadCsv('inventory-items.csv', rows, [
        { key: 'name', label: 'Item' },
        { key: 'sku', label: 'SKU' },
        { key: 'current_stock', label: 'Current Stock' },
        { key: 'unit', label: 'Unit' },
        { key: 'min_stock', label: 'Min Stock' }
      ]);
    } catch (error) {
      console.error('Failed to export inventory:', error);
    }
  };

  return (
    <PageContainer
      title="Inventory"
      description="Stock management and tracking"
      actions={
        <Button className="bg-zinc-950 hover:bg-zinc-900 text-white border border-white/10 font-black uppercase tracking-widest text-[10px] h-10 px-6 shadow-2xl">
          <Plus className="w-4 h-4 mr-2 text-red-500" />
          Add Item
        </Button>
      }
    >
      <div className="space-y-6">
        <Card className="border border-indigo-500/20 bg-slate-950/60" data-testid="inventory-blueprint">
          <CardContent className="p-6 space-y-4">
            <div>
              <p className="text-xs text-indigo-200 uppercase tracking-[0.3em]">Ultimate Inventory</p>
              <h2 className="text-xl font-semibold text-indigo-50">Inventory Feature Blueprint</h2>
              <p className="text-sm text-slate-300">Audit-first, offline-ready, domain-boundary compliant inventory controls.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {inventoryBlueprint.map((section) => (
                <div key={section.title} className="rounded-lg border border-indigo-400/20 bg-indigo-950/30 p-4" data-testid={`inventory-blueprint-${section.title.toLowerCase().replace(/\s/g, '-')}`}>
                  <h3 className="text-sm font-semibold text-indigo-100 mb-2">{section.title}</h3>
                  <ul className="space-y-1 text-xs text-slate-200">
                    {section.items.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-950 border-white/5 shadow-2xl overflow-hidden">
          <CardContent className="p-0">
            <DataTable
              columns={[
                {
                  key: 'name',
                  label: 'Item',
                  filterType: 'text',
                  render: (row) => <span className="text-sm font-black text-white uppercase tracking-tight">{row.name}</span>
                },
                {
                  key: 'sku',
                  label: 'SKU',
                  filterType: 'text',
                  render: (row) => <span className="text-[10px] font-mono text-zinc-600 font-bold">{row.sku}</span>
                },
                {
                  key: 'current_stock',
                  label: 'Stock',
                  filterType: 'numberRange',
                  render: (row) => {
                    const isLow = row.current_stock <= row.min_stock;
                    return (
                      <div className="flex items-center gap-2">
                        <span className={isLow ? 'text-red-600 font-medium' : ''}>
                          {row.current_stock}
                        </span>
                        {isLow && <AlertTriangle className="w-4 h-4 text-red-500" />}
                      </div>
                    );
                  }
                },
                { key: 'unit', label: 'Unit', filterType: 'text' },
                {
                  key: 'min_stock',
                  label: 'Min Stock',
                  filterType: 'numberRange',
                  render: (row) => (
                    <Badge variant="outline">{row.min_stock}</Badge>
                  )
                }
              ]}
              data={items}
              loading={loading}
              onQueryChange={setTableQuery}
              totalCount={totalCount}
              tableId="inventory-items"
              onExport={handleExport}
              emptyMessage="No inventory items"
            />
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
