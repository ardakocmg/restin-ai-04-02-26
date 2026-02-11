import React, { useState, useEffect } from 'react';
import { useVenue } from '../../../context/VenueContext';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../lib/api';
import PageContainer from '../../../layouts/PageContainer';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { ArrowRightLeft, Truck, Package, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { logger } from '@/lib/logger';
export default function StockTransfers() {
  const { activeVenue } = useVenue();
  const { user, isManager, isOwner } = useAuth();
  const [items, setItems] = useState([]);
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    item_id: '',
    to_venue_id: '',
    quantity: '',
    reason: 'Stock Transfer'
  });

  useEffect(() => {
    if (!activeVenue) return;
    loadData();
  }, [activeVenue?.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [itemsRes, venuesRes] = await Promise.all([
        api.get(`/inventory/items?venue_id=${activeVenue.id}`),
        api.get('/venues')
      ]);
      setItems(itemsRes.data || []);
      // Filter out current venue from targets
      setVenues((venuesRes.data || []).filter(v => v.id !== activeVenue.id));
    } catch (e) {
      logger.error(e);
      toast.error("Failed to load transfer data");
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (!formData.item_id || !formData.to_venue_id || !formData.quantity) {
      return toast.error("Please fill all fields");
    }

    const qty = parseFloat(formData.quantity);
    if (isNaN(qty) || qty <= 0) return toast.error("Invalid quantity");

    // Check stock locally first
    const item = items.find(i => i.id === formData.item_id);
    if (item && item.quantity < qty) {
      return toast.error(`Insufficient stock! Available: ${item.quantity}`);
    }

    setLoading(true);
    try {
      await api.post(`/venues/${activeVenue.id}/inventory/transfer`, {
        item_id: formData.item_id,
        to_venue_id: formData.to_venue_id,
        quantity: qty,
        reason: formData.reason
      });
      toast.success("Transfer successful!");
      setFormData({ ...formData, quantity: '', item_id: '' }); // Reset partial
      loadData(); // Refresh stock
    } catch (e) {
      logger.error(e);
      toast.error(e.response?.data?.detail || "Transfer failed");
    } finally {
      setLoading(false);
    }
  };

  const selectedItem = items.find(i => i.id === formData.item_id);

  return (
    <PageContainer
      title="Stock Transfers"
      description="Move inventory between venues (Central Kitchen → Branch)"
    >
      <div className="max-w-2xl mx-auto space-y-8">
        <Card className="bg-zinc-950 border-white/10">
          <CardContent className="p-8 space-y-6">
            <div className="flex items-center justify-between text-zinc-400 mb-8">
              <div className="text-center">
                <div className="text-xs uppercase font-bold mb-2">From Source</div>
                <div className="p-3 bg-zinc-900 rounded-lg border border-white/5 font-bold text-white min-w-[120px]">
                  {activeVenue?.name || 'Loading...'}
                </div>
              </div>
              <ArrowRightLeft className="w-6 h-6 animate-pulse" />
              <div className="text-center">
                <div className="text-xs uppercase font-bold mb-2">To Destination</div>
                <Select value={formData.to_venue_id} onValueChange={v => setFormData({ ...formData, to_venue_id: v })}>
                  <SelectTrigger className="w-[180px] bg-zinc-900 border-white/10">
                    <SelectValue placeholder="Select Venue" />
                  </SelectTrigger>
                  <SelectContent>
                    {venues.map(v => (
                      <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Item to Transfer</Label>
                <Select value={formData.item_id} onValueChange={v => setFormData({ ...formData, item_id: v })}>
                  <SelectTrigger className="bg-zinc-900 border-white/10">
                    <SelectValue placeholder="Select Product..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {items.map(i => (
                      <SelectItem key={i.id} value={i.id}>
                        <span className="flex justify-between w-full min-w-[300px]">
                          <span>{i.name}</span>
                          <span className="text-zinc-500 text-xs">Stock: {i.quantity} {i.unit}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedItem && (
                  <p className="text-xs text-zinc-400 flex items-center gap-2">
                    <Package className="w-3 h-3" />
                    Available Stock: <span className="text-white font-bold">{selectedItem.quantity} {selectedItem.unit}</span>
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Quantity</Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={formData.quantity}
                    onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                    className="bg-zinc-900 border-white/10 pl-10"
                    placeholder="0.00"
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold text-xs">{selectedItem?.unit || 'QTY'}</div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Reference / Note</Label>
                <Input
                  value={formData.reason}
                  onChange={e => setFormData({ ...formData, reason: e.target.value })}
                  className="bg-zinc-900 border-white/10"
                />
              </div>

              <Button
                onClick={handleTransfer}
                disabled={loading || !formData.to_venue_id || !formData.item_id}
                className="w-full bg-blue-600 hover:bg-blue-700 h-10 font-bold tracking-wide"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Truck className="w-4 h-4 mr-2" />}
                EXECUTE TRANSFER
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
