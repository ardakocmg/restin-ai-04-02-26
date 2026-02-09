import React, { useState, useEffect } from 'react';
import { useVenue } from '../../../context/VenueContext';
import api from '../../../lib/api';
import PageContainer from '../../../layouts/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog';
import { Label } from '../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Plus, Search, Filter, Package, AlertTriangle, Edit2, Trash2, Loader2, RefreshCw } from 'lucide-react';
import DataTable from '../../../components/shared/DataTable';
import { toast } from 'sonner';

import { logger } from '@/lib/logger';
export default function InventoryItemsNew() {
  const { activeVenue } = useVenue();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    category: 'General',
    unit: 'EA',
    min_stock: 0,
    cost_price: 0
  });

  useEffect(() => {
    if (activeVenue?.id) {
      loadItems();
    }
  }, [activeVenue?.id]);

  const loadItems = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/inventory/items?venue_id=${activeVenue.id}`);
      setItems(res.data || []);
    } catch (error) {
      logger.error("Failed to load inventory items:", error);
      toast.error("Failed to load inventory");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name) return toast.error("Name is required");

    try {
      const payload = {
        venue_id: activeVenue.id,
        ...formData,
        min_stock: parseFloat(formData.min_stock),
        cost_price: parseFloat(formData.cost_price),
        quantity: editingItem ? editingItem.quantity : 0 // Preserve qty on edit
      };

      if (editingItem) {
        await api.put(`/inventory/items/${editingItem.id}`, payload);
        toast.success("Item updated");
      } else {
        await api.post('/inventory/items', payload);
        toast.success("Item created");
      }

      setIsModalOpen(false);
      setEditingItem(null);
      setFormData({ name: '', category: 'General', unit: 'EA', min_stock: 0, cost_price: 0 });
      loadItems();
    } catch (error) {
      logger.error(error);
      toast.error("Failed to save item");
    }
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category || 'General',
      unit: item.unit || 'EA',
      min_stock: item.min_stock || 0,
      cost_price: item.cost_price || 0
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure? This cannot be undone.")) return;
    try {
      await api.delete(`/inventory/items/${id}`);
      toast.success("Item deleted");
      loadItems();
    } catch (e) {
      toast.error("Failed to delete item");
    }
  };

  // Filtering
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.sku || '').toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Unique Categories
  const categories = ['General', ...new Set(items.map(i => i.category).filter(Boolean))];

  return (
    <PageContainer
      title="Inventory Items"
      description="Manage ingredients, recipes, and stock levels"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadItems}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => { setEditingItem(null); setIsModalOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>
      }
    >
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Search items by name or SKU..."
            className="pl-10 bg-zinc-950 border-white/10"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px] bg-zinc-950 border-white/10">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card className="bg-zinc-950 border-white/10">
        <CardContent className="p-0">
          <DataTable
            columns={[
              {
                key: 'name',
                label: 'Name',
                render: (row) => (
                  <div className="flex flex-col">
                    <span className="font-bold text-white">{row.name}</span>
                    <span className="text-[10px] text-zinc-500">{row.sku || row.display_id || 'NO-SKU'}</span>
                  </div>
                )
              },
              {
                key: 'category',
                label: 'Category',
                render: (row) => <Badge variant="outline" className="text-[10px] uppercase">{row.category}</Badge>
              },
              {
                key: 'quantity',
                label: 'Stock',
                render: (row) => (
                  <div className={`flex items-center gap-2 ${row.quantity <= (row.min_stock || 0) ? 'text-red-500 font-bold' : 'text-zinc-300'}`}>
                    {row.quantity <= (row.min_stock || 0) && <AlertTriangle className="w-3 h-3" />}
                    {row.quantity} <span className="text-[10px] text-zinc-500">{row.unit}</span>
                  </div>
                )
              },
              {
                key: 'cost',
                label: 'Cost',
                render: (row) => <span className="text-zinc-400">€{(row.cost_price || 0).toFixed(2)}</span>
              },
              {
                key: 'actions',
                label: '',
                render: (row) => (
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(row)} className="h-7 w-7 text-blue-400 hover:bg-blue-900/20">
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(row.id)} className="h-7 w-7 text-red-400 hover:bg-red-900/20">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                )
              }
            ]}
            data={filteredItems}
            loading={loading}
            emptyMessage="No inventory items found. Add one to get started."
          />
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-zinc-950 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Item' : 'New Inventory Item'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="bg-zinc-900 border-white/10"
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Input
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                  className="bg-zinc-900 border-white/10"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Unit (UOM)</Label>
                <Select
                  value={formData.unit}
                  onValueChange={v => setFormData({ ...formData, unit: v })}
                >
                  <SelectTrigger className="bg-zinc-900 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EA">EA (Each)</SelectItem>
                    <SelectItem value="KG">KG</SelectItem>
                    <SelectItem value="L">L</SelectItem>
                    <SelectItem value="G">G (Gram)</SelectItem>
                    <SelectItem value="ML">ML</SelectItem>
                    <SelectItem value="PORTION">Portion</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Min Stock</Label>
                <Input
                  type="number"
                  value={formData.min_stock}
                  onChange={e => setFormData({ ...formData, min_stock: e.target.value })}
                  className="bg-zinc-900 border-white/10"
                />
              </div>
              <div className="space-y-2">
                <Label>Cost (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.cost_price}
                  onChange={e => setFormData({ ...formData, cost_price: e.target.value })}
                  className="bg-zinc-900 border-white/10"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} className="bg-red-600 hover:bg-red-700">Save Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
