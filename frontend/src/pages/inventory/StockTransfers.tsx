import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

import { ArrowRightLeft, Plus, Building2, Package } from 'lucide-react';

import axios from 'axios';

import { toast } from 'sonner';

import { Button } from '../../components/ui/button';

import { Input } from '../../components/ui/input';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function StockTransfers() {
  const [transfers, setTransfers] = useState([]); // In a real app we'd fetch ledger entries filtering by 'transfer'
  const [items, setItems] = useState([]);
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [venueId] = useState(localStorage.getItem('currentVenueId') || 'venue-caviar-bull');

  const [formData, setFormData] = useState({
    item_id: '',
    to_venue_id: '',
    quantity: 0,
    reason: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('restin_token');
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch Inventory items and All Venues
      const [itemsRes, venuesRes] = await Promise.all([
        axios.get(`${API_URL}/api/venues/${venueId}/inventory`, { headers }),
        axios.get(`${API_URL}/api/venues`, { headers }) // Assuming this exists or similar
      ]);

      setItems(itemsRes.data.items || []);
      setVenues(venuesRes.data.venues || []); // Adjust based on actual API response structure for venues
      // In a real implementation we would query the ledger
    } catch (error: any) {
      logger.error(error);
      // toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      if (!formData.item_id || !formData.to_venue_id || !formData.quantity) {
        toast.error("Please fill all fields");
        return;
      }

      const token = localStorage.getItem('restin_token');
      await axios.post(
        `${API_URL}/api/venues/${venueId}/inventory/transfer`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('Transfer successful');
      setShowCreateModal(false);
      // Add simplified record to local state for demo purposes since we don't fetch full history yet
      const item = items.find(i => i.id === formData.item_id);
      const venue = venues.find(v => v.id === formData.to_venue_id);

      setTransfers(prev => [{
        id: Date.now(),
        item_name: item?.name || 'Unknown Item',
        to_venue_name: venue?.name || 'Unknown Venue',
        quantity: formData.quantity,
        date: new Date().toLocaleDateString()
      }, ...prev]);

    } catch (error: any) {
      logger.error(error);
      toast.error(error.response?.data?.detail || 'Transfer failed');
    }
  };

  if (loading) return <div className="p-6 text-foreground">Loading...</div>;

  return (
    <div className="min-h-screen bg-background p-6 font-body text-secondary-foreground">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground mb-2">Stock Transfers</h1>
          <p className="text-muted-foreground">Move inventory items between venues.</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="bg-red-600 hover:bg-red-700 text-foreground font-bold">
          <ArrowRightLeft className="w-4 h-4 mr-2" />
          New Transfer
        </Button>
      </div>

      <div className="space-y-4">
        {transfers.length === 0 ? (
          <div className="text-center py-20 bg-card/50 rounded-xl border border-dashed border-border">
            <Package className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-muted-foreground">No Recent Transfers</h3>
            <p className="text-muted-foreground">Transfers will appear here after you create them.</p>
          </div>
        ) : (
          transfers.map((t, idx) => (
            <div key={idx} className="bg-card/50 border border-border rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-secondary text-muted-foreground">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-foreground">{t.item_name}</h4>
                  <p className="text-xs text-muted-foreground">To: {t.to_venue_name}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="block font-bold text-red-500 text-lg">{t.quantity}</span>
                <span className="text-xs text-muted-foreground">{t.date}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="bg-background border-border text-secondary-foreground">
          <DialogHeader>
            <DialogTitle className="text-foreground">New Stock Transfer</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-xs uppercase font-bold text-muted-foreground">Item</label>
              <Select onValueChange={(val) => setFormData({ ...formData, item_id: val })}>
                <SelectTrigger className="bg-card border-border"><SelectValue placeholder="Select Item to Transfer" /></SelectTrigger>
                <SelectContent className="bg-card border-border text-secondary-foreground">
                  {items.map(item => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} (Stock: {item.current_stock} {item.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs uppercase font-bold text-muted-foreground">Destination Venue</label>
              <Select onValueChange={(val) => setFormData({ ...formData, to_venue_id: val })}>
                <SelectTrigger className="bg-card border-border"><SelectValue placeholder="Select Destination" /></SelectTrigger>
                <SelectContent className="bg-card border-border text-secondary-foreground">
                  {venues.filter(v => v.id !== venueId).map(v => (
                    <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs uppercase font-bold text-muted-foreground">Quantity</label>
              <Input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                className="bg-card border-border"
              />
            </div>

            <div>
              <label className="text-xs uppercase font-bold text-muted-foreground">Reason / Note</label>
              <Input
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="bg-card border-border"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button onClick={handleSubmit} className="bg-red-600 text-foreground">Confirm Transfer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}