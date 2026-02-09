import React, { useState, useEffect } from 'react';
import PageContainer from '../../../layouts/PageContainer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { Package, Search, Plus, Filter, ArrowUpDown, Edit, Trash2, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../../lib/api';

export default function InventoryItems() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const venueId = localStorage.getItem('currentVenueId') || 'venue-caviar-bull';
      const res = await api.get(`/inventory/items?venue_id=${venueId}`);
      setItems(res.data?.items || res.data || []);
    } catch {
      setItems([
        { id: '1', name: 'Olive Oil Extra Virgin', category: 'Oils & Fats', unit: 'L', stock: 12, min_stock: 5, cost_per_unit: 850, supplier: 'Mediterranean Foods' },
        { id: '2', name: 'San Marzano Tomatoes', category: 'Canned Goods', unit: 'kg', stock: 25, min_stock: 10, cost_per_unit: 320, supplier: 'Italian Imports Ltd' },
        { id: '3', name: 'Fresh Salmon Fillet', category: 'Seafood', unit: 'kg', stock: 3, min_stock: 5, cost_per_unit: 2400, supplier: 'Ocean Fresh' },
        { id: '4', name: 'Parmigiano Reggiano', category: 'Dairy', unit: 'kg', stock: 4, min_stock: 3, cost_per_unit: 3200, supplier: 'Italian Imports Ltd' },
        { id: '5', name: 'Arborio Rice', category: 'Dry Goods', unit: 'kg', stock: 15, min_stock: 8, cost_per_unit: 280, supplier: 'Mediterranean Foods' },
        { id: '6', name: 'Fresh Basil', category: 'Herbs', unit: 'bunch', stock: 2, min_stock: 5, cost_per_unit: 150, supplier: 'Local Farm Co.' },
        { id: '7', name: 'Chicken Breast', category: 'Meat', unit: 'kg', stock: 8, min_stock: 6, cost_per_unit: 980, supplier: 'Poultry Direct' },
        { id: '8', name: 'Heavy Cream', category: 'Dairy', unit: 'L', stock: 6, min_stock: 4, cost_per_unit: 420, supplier: 'Local Dairy' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['all', ...new Set(items.map(i => i.category))];

  const filtered = items
    .filter(i => filter === 'all' || i.category === filter)
    .filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'stock') return a.stock - b.stock;
      if (sortBy === 'cost') return (b.cost_per_unit || 0) - (a.cost_per_unit || 0);
      return 0;
    });

  const lowStockCount = items.filter(i => i.stock < i.min_stock).length;
  const totalValue = items.reduce((sum, i) => sum + (i.stock * (i.cost_per_unit || 0)), 0);

  return (
    <PageContainer
      title="Inventory Items"
      description="Manage your ingredient and supply catalog"
      actions={
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Add Item
        </Button>
      }
    >
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><Package className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-2xl font-bold">{items.length}</p>
                <p className="text-sm text-muted-foreground">Total Items</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10"><BarChart3 className="h-5 w-5 text-red-500" /></div>
              <div>
                <p className="text-2xl font-bold">{lowStockCount}</p>
                <p className="text-sm text-muted-foreground">Low Stock Alerts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10"><Package className="h-5 w-5 text-green-500" /></div>
              <div>
                <p className="text-2xl font-bold">€{(totalValue / 100).toFixed(0)}</p>
                <p className="text-sm text-muted-foreground">Total Stock Value</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" placeholder="Search items..." />
        </div>
        <div className="flex gap-1 flex-wrap">
          {categories.map(cat => (
            <Button
              key={cat}
              variant={filter === cat ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(cat)}
              className="capitalize"
            >
              {cat}
            </Button>
          ))}
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="name">Sort: Name</option>
          <option value="stock">Sort: Stock Level</option>
          <option value="cost">Sort: Cost</option>
        </select>
      </div>

      {/* Items Table */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading inventory...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 font-medium">Item</th>
                    <th className="pb-3 font-medium">Category</th>
                    <th className="pb-3 font-medium">Stock</th>
                    <th className="pb-3 font-medium">Min</th>
                    <th className="pb-3 font-medium">Unit Cost</th>
                    <th className="pb-3 font-medium">Supplier</th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((item) => {
                    const isLow = item.stock < item.min_stock;
                    return (
                      <tr key={item.id} className="hover:bg-accent/50 transition">
                        <td className="py-3 font-medium">{item.name}</td>
                        <td className="py-3 text-muted-foreground">{item.category}</td>
                        <td className="py-3">
                          <span className={isLow ? 'text-red-500 font-bold' : ''}>
                            {item.stock} {item.unit}
                          </span>
                        </td>
                        <td className="py-3 text-muted-foreground">{item.min_stock} {item.unit}</td>
                        <td className="py-3">€{((item.cost_per_unit || 0) / 100).toFixed(2)}</td>
                        <td className="py-3 text-muted-foreground">{item.supplier}</td>
                        <td className="py-3">
                          <Badge variant={isLow ? 'destructive' : 'outline'}>
                            {isLow ? 'Low Stock' : 'OK'}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
