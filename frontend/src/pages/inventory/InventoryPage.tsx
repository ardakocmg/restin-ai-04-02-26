import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

import { useVenue } from '../../context/VenueContext';

import api from '../../lib/api';

import PageContainer from '../../layouts/PageContainer';

import SearchBar from '../../components/shared/SearchBar';


import ItemDetailDrawer from '../../components/inventory/ItemDetailDrawer';

import { Card, CardContent } from '../../components/ui/card';

import { Badge } from '../../components/ui/badge';

import { Button } from '../../components/ui/button';

import {
  Package, AlertTriangle, TrendingDown, CheckCircle2,
  Plus, RefreshCw
} from 'lucide-react';

export default function InventoryPage() {
  const { activeVenue } = useVenue();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [selectedItem, setSelectedItem] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (activeVenue?.id) {
      loadItems();
    }
  }, [activeVenue?.id, searchQuery, filters]);

  const loadItems = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        venue_id: activeVenue.id,
        page: '1',
        limit: '100'
      });

      if (searchQuery) params.append('q', searchQuery);
      if (Object.keys(filters).length > 0) params.append('filters', JSON.stringify(filters));

      const res = await api.get(`/inventory/items?${params}`);
      setItems(res.data?.items || []);
    } catch (error: any) {
      logger.error('Failed to load items:', error);
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleItemClick = (item: any) => {
    setSelectedItem(item);
    setDrawerOpen(true);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getStockStatus = (item: any) => {
    const balance = item.quantity || 0;
    const minStock = item.min_stock || item.min_quantity || 0;

    if (balance < 0) return { label: 'Negative', color: 'destructive', icon: AlertTriangle };
    if (balance <= minStock) return { label: 'Low Stock', color: 'outline', icon: TrendingDown, className: 'text-orange-600 dark:text-orange-400 border-orange-600' };
    return { label: 'OK', color: 'outline', icon: CheckCircle2, className: 'bg-green-50 text-green-700 dark:text-green-400 border-green-200' };
  };

  return (
    <PageContainer
      title="Inventory Management"
      description="Search, filter, and manage your inventory with detailed item views"
      actions={
        <div className="flex items-center gap-2">
          <Button onClick={loadItems} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
      }
    >
      <div className="mb-4">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search items by name, SKU, or category..."
          className=""
        />
      </div>

      <div className="flex items-center gap-3 p-4 rounded-lg bg-card border mb-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Status</label>
            <select
              value={filters.status || ''}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full p-2 border rounded"
            >
              <option value="">All</option>
              <option value="OK">OK</option>
              <option value="LOW">Low Stock</option>
              <option value="NEG">Negative</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Category</label>
            <input
              type="text"
              placeholder="Filter by category"
              value={filters.category || ''}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Min Stock Only</label>
            <input
              type="checkbox"
              checked={filters.min_stock_only || false}
              onChange={(e) => setFilters({ ...filters, min_stock_only: e.target.checked })}
              className="h-5 w-5 mt-2"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-12 text-slate-500">
            Loading...
          </div>
        ) : items.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-500">
            No items found
          </div>
        ) : (
          items.map((item: any) => {
            const status = getStockStatus(item);
            const StatusIcon = status.icon;

            return (
              <Card
                key={item.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => handleItemClick(item)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-slate-600" />
                      <span className="font-medium text-foreground">{item.name}</span>
                    </div>
                    <Badge variant={status.color as any} className={status.className}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {status.label}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">On Hand:</span>
                      <span className="font-medium text-foreground">
                        {item.quantity?.toFixed(2) || '0.00'} {item.unit}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Min Stock:</span>
                      <span className="text-slate-700">
                        {(item.min_stock || item.min_quantity || 0).toFixed(2)} {item.unit}
                      </span>
                    </div>
                    {item.category && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Category:</span>
                        <Badge variant="secondary" className="text-xs">{item.category}</Badge>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <ItemDetailDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        skuId={selectedItem?.id}
        venueId={activeVenue?.id}
      />
    </PageContainer>
  );
}