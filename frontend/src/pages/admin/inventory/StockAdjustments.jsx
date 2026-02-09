
import React, { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { toast } from 'sonner';
import { Loader2, ClipboardList, Save } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../../components/ui/table';

import { logger } from '@/lib/logger';
export default function StockAdjustments() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adjustments, setAdjustments] = useState({});

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    try {
      const venueId = localStorage.getItem("restin_venue_id") || "venue-caviar-bull";
      const res = await api.get(`/inventory/items?venue_id=${venueId}`);
      setItems(res.data || []);
      setLoading(false);
    } catch (error) {
      logger.error(error);
      setLoading(false);
    }
  };

  const handleAdjustmentChange = (id, value, reason) => {
    setAdjustments(prev => ({
      ...prev,
      [id]: { ...prev[id], [reason ? 'reason' : 'qty']: value }
    }));
  };

  const submitAdjustments = async () => {
    const venueId = localStorage.getItem("restin_venue_id") || "venue-caviar-bull";
    const updates = Object.keys(adjustments).map(itemId => ({
      item_id: itemId,
      quantity_change: parseFloat(adjustments[itemId]?.qty || 0),
      reason: adjustments[itemId]?.reason || 'Manual Adjustment',
      action: 'ADJUST' // Backend should handle this
    })).filter(u => u.quantity_change !== 0);

    if (updates.length === 0) return;

    try {
      await Promise.all(updates.map(u =>
        api.post(`/inventory/ledger`, {
          venue_id: venueId,
          ...u
        })
      ));
      toast.success("Adjustments saved");
      setAdjustments({});
      loadInventory();
    } catch (error) {
      toast.error("Failed to save adjustments");
    }
  };

  if (loading) return <Loader2 className="animate-spin w-8 h-8 m-auto text-orange-500" />;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-orange-500" />
          Stock Adjustments
        </h1>
        <Button onClick={submitAdjustments} className="bg-orange-600 hover:bg-orange-700">
          <Save className="w-4 h-4 mr-2" /> Save Changes
        </Button>
      </div>

      <div className="bg-zinc-900 border border-white/10 rounded-xl overflow-hidden">
        <Table>
          <TableHeader className="bg-zinc-800">
            <TableRow>
              <TableHead className="text-white">Item</TableHead>
              <TableHead className="text-white">Current Stock</TableHead>
              <TableHead className="text-white">Adjustment (+/-)</TableHead>
              <TableHead className="text-white">Reason</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map(item => (
              <TableRow key={item.id} className="border-white/5">
                <TableCell className="font-medium text-white">{item.name}</TableCell>
                <TableCell>{item.quantity} {item.unit}</TableCell>
                <TableCell>
                  <Input
                    type="number"
                    placeholder="0"
                    className="w-32 bg-zinc-950 border-zinc-700"
                    value={adjustments[item.id]?.qty || ''}
                    onChange={e => handleAdjustmentChange(item.id, e.target.value, false)}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    placeholder="Reason (e.g. Spillage)"
                    className="w-full bg-zinc-950 border-zinc-700"
                    value={adjustments[item.id]?.reason || ''}
                    onChange={e => handleAdjustmentChange(item.id, e.target.value, true)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
