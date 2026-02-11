
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../lib/api';
import { toast } from 'sonner';
import {
  Loader2, ShoppingCart, Plus, FileText, CheckCircle,
  Send, XCircle, Search, Truck
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../../components/ui/table';

import { logger } from '@/lib/logger';
export default function PurchaseOrdersNew() {
  const { user, isManager, isOwner } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  // Create Form State
  const [suppliers, setSuppliers] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [formData, setFormData] = useState({
    supplier_id: "",
    delivery_date: "",
    items: [] // { item_id, quantity, unit_cost }
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const venueId = localStorage.getItem("restin_venue_id") || "venue-caviar-bull";
      const [ordersRes, suppliersRes, itemsRes] = await Promise.all([
        api.get(`/inventory/purchase-orders?venue_id=${venueId}`),
        api.get(`/inventory/suppliers?venue_id=${venueId}`), // Warning: might fail if logic missing
        api.get(`/inventory/items?venue_id=${venueId}`)
      ]);

      setOrders(ordersRes.data || []);
      setSuppliers(suppliersRes.data || []);
      setInventoryItems(itemsRes.data || []);
    } catch (error) {
      logger.error("Failed to load PO data", error);
      logger.error("Failed to load PO data", error);
      toast.error("Failed to load procurement data from server");
      // STRICT MODE: No fallback
      setSuppliers([]);
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { item_id: "", quantity: 1, unit_cost: 0 }]
    });
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    setFormData({ ...formData, items: newItems });
  };

  const createPO = async () => {
    try {
      const venueId = localStorage.getItem("restin_venue_id") || "venue-caviar-bull";
      await api.post('/inventory/purchase-orders', {
        venue_id: venueId,
        supplier_id: formData.supplier_id,
        expected_delivery: formData.delivery_date,
        items: formData.items
      });
      toast.success("Purchase Order Created");
      setCreateOpen(false);
      setFormData({ supplier_id: "", delivery_date: "", items: [] });
      loadData();
    } catch (error) {
      toast.error("Failed to create PO");
    }
  };

  const handleAction = async (id, action) => {
    if (!confirm(`Are you sure you want to ${action} this PO?`)) return;
    try {
      await api.post(`/inventory/purchase-orders/${id}/${action}`);
      toast.success(`PO ${action} successful`);
      loadData();
    } catch (error) {
      toast.error(`Failed to ${action} PO`);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'DRAFT': return 'bg-zinc-500';
      case 'SUBMITTED': return 'bg-blue-500';
      case 'APPROVED': return 'bg-purple-500';
      case 'SENT': return 'bg-green-500';
      case 'RECEIVED': return 'bg-emerald-600';
      case 'CANCELLED': return 'bg-red-500';
      default: return 'bg-zinc-700';
    }
  };

  if (loading) return <Loader2 className="animate-spin w-8 h-8 m-auto text-blue-500" />;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 rounded-xl">
            <ShoppingCart className="w-8 h-8 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Purchase Orders</h1>
            <p className="text-zinc-400">Procurement & Supplier Management</p>
          </div>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" /> New PO
        </Button>
      </div>

      {/* List */}
      <div className="bg-zinc-900 border border-white/10 rounded-xl overflow-hidden">
        <Table>
          <TableHeader className="bg-zinc-800">
            <TableRow>
              <TableHead className="text-white">PO Number</TableHead>
              <TableHead className="text-white">Supplier</TableHead>
              <TableHead className="text-white">Date</TableHead>
              <TableHead className="text-white">Total</TableHead>
              <TableHead className="text-white">Status</TableHead>
              <TableHead className="text-right text-white">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-zinc-500">
                  No active purchase orders
                </TableCell>
              </TableRow>
            ) : (
              orders.map(po => (
                <TableRow key={po.id} className="border-white/5">
                  <TableCell className="font-mono text-zinc-300">{po.display_id || po.po_number || 'PO-####'}</TableCell>
                  <TableCell className="font-medium text-white">{po.supplier_name || 'Unknown Supplier'}</TableCell>
                  <TableCell>{new Date(po.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>€{(po.total_amount || 0).toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge className={`${getStatusColor(po.status)} text-white border-0`}>
                      {po.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    {po.status === 'DRAFT' && (
                      <Button size="sm" variant="ghost" className="text-blue-400" onClick={() => handleAction(po.id, 'submit')}>Submit</Button>
                    )}
                    {po.status === 'SUBMITTED' && ( // Manager
                      <Button size="sm" variant="ghost" className="text-purple-400" onClick={() => handleAction(po.id, 'approve')}>Approve</Button>
                    )}
                    {po.status === 'APPROVED' && (
                      <Button size="sm" variant="ghost" className="text-green-400" onClick={() => handleAction(po.id, 'send')}>Send Email</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-zinc-950 border-white/10 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Create Purchase Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-zinc-400 mb-1 block">Supplier</label>
                <select
                  className="w-full bg-zinc-900 border-zinc-700 rounded-md p-2 text-white"
                  value={formData.supplier_id}
                  onChange={e => setFormData({ ...formData, supplier_id: e.target.value })}
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-zinc-400 mb-1 block">Expected Delivery</label>
                <Input
                  type="date"
                  className="bg-zinc-900 border-zinc-700"
                  value={formData.delivery_date}
                  onChange={e => setFormData({ ...formData, delivery_date: e.target.value })}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm text-zinc-400">Items</label>
                <Button size="sm" variant="ghost" onClick={handleAddItem} className="text-blue-400"><Plus className="w-4 h-4 mr-1" /> Add Item</Button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {formData.items.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <select
                      className="flex-1 bg-zinc-900 border-zinc-700 rounded-md p-2 text-white text-sm"
                      value={item.item_id}
                      onChange={e => updateItem(idx, 'item_id', e.target.value)}
                    >
                      <option value="">Select Item</option>
                      {inventoryItems.map(i => (
                        <option key={i.id} value={i.id}>{i.name}</option>
                      ))}
                    </select>
                    <Input
                      type="number"
                      placeholder="Qty"
                      className="w-20 bg-zinc-900 border-zinc-700"
                      value={item.quantity}
                      onChange={e => updateItem(idx, 'quantity', parseFloat(e.target.value))}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={createPO} className="bg-blue-600 hover:bg-blue-700">Create PO</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
