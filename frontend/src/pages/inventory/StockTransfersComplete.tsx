import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';

import { Button } from '../../components/ui/button';

import { Input } from '../../components/ui/input';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';

import { ArrowRightLeft } from 'lucide-react';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../../components/ui/dialog';

import { Label } from '../../components/ui/label';

import PageContainer from '../../layouts/PageContainer';

import DataTable from '../../components/shared/DataTable';

import { toast } from 'sonner';

import api from '../../lib/api';

import { useAuth } from '../../hooks/useAuth';

export default function StockTransfersComplete() {
  const { user } = useAuth();
  const [transfers, setTransfers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [newTransfer, setNewTransfer] = useState({
    to_venue_id: '',
    item_id: '',
    quantity: '',
    reason: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setLoading(true);
      const [transfersRes, locationsRes, inventoryRes] = await Promise.all([
        api.get(`/venues/${user?.venueId}/inventory/transfer`).catch(() => ({ data: [] })),
        api.get('/venues'),
        api.get(`/venues/${user?.venueId}/inventory`)
      ]);
      setTransfers(transfersRes.data || []);
      setLocations(locationsRes.data || []);
      setInventoryItems(inventoryRes.data.items || []);
    } catch (error: any) {
      logger.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTransfer = async () => {
    if (!newTransfer.to_venue_id || !newTransfer.item_id || !newTransfer.quantity) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      await api.post(`/venues/${user?.venueId}/inventory/transfer`, {
        to_venue_id: newTransfer.to_venue_id,
        item_id: newTransfer.item_id,
        quantity: parseFloat(newTransfer.quantity),
        reason: newTransfer.reason || 'Stock Transfer'
      });
      toast.success('Transfer successful');
      setIsTransferOpen(false);
      setNewTransfer({ to_venue_id: '', item_id: '', quantity: '', reason: '' });
      loadData();
    } catch (error: any) {
      logger.error(error);
      toast.error('Failed to create transfer');
    }
  };

  const columns = [
    { key: 'transfer_id', label: 'Transfer ID' },
    { key: 'from_location', label: 'From' },
    { key: 'to_location', label: 'To' },
    { key: 'items_count', label: 'Items' },
    { key: 'status', label: 'Status' },
    { key: 'created_at', label: 'Date', render: (row) => new Date(row.created_at).toLocaleDateString() },
  ];

  return (
    <PageContainer
      title="Stock Transfers"
      description="Transfer inventory between locations"
      actions={
        <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
          <DialogTrigger asChild>
            <Button>
              <ArrowRightLeft className="h-4 w-4 mr-2" />
              New Transfer
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Stock Transfer</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="to_venue" className="text-right">To Venue</Label>
                <div className="col-span-3">
                  <Select
                    value={newTransfer.to_venue_id}
                    onValueChange={(val) => setNewTransfer({ ...newTransfer, to_venue_id: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Destination" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.filter(l => l.id !== user?.venueId).map(loc => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="item" className="text-right">Item</Label>
                <div className="col-span-3">
                  <Select
                    value={newTransfer.item_id}
                    onValueChange={(val) => setNewTransfer({ ...newTransfer, item_id: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Item" />
                    </SelectTrigger>
                    <SelectContent>
                      {inventoryItems.map(item => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name} ({item.current_stock} {item.unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="quantity" className="text-right">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={newTransfer.quantity}
                  onChange={(e) => setNewTransfer({ ...newTransfer, quantity: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="reason" className="text-right">Reason</Label>
                <Input
                  id="reason"
                  value={newTransfer.reason}
                  onChange={(e) => setNewTransfer({ ...newTransfer, reason: e.target.value })}
                  className="col-span-3"
                  placeholder="Optional"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateTransfer}>Transfer Stock</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      <DataTable columns={columns} data={transfers} loading={loading} />
    </PageContainer >
  );
}