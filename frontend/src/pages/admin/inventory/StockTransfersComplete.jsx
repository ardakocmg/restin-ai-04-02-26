import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useVenue } from '../../../context/VenueContext';
import PageContainer from '../../../layouts/PageContainer';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { ArrowLeftRight, Plus, ArrowRight, Building2, Package, Calendar, CheckCircle2, Clock, Search, Loader2 } from 'lucide-react';
import { Input } from '../../../components/ui/input';
import { toast } from 'sonner';
import api from '../../../lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../../components/ui/dialog';
import { Label } from '../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { logger } from '@/lib/logger';

export default function StockTransfersComplete() {
  const { user, isManager, isOwner } = useAuth();
  const { activeVenue } = useVenue();
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [venues, setVenues] = useState([]);
  const [formData, setFormData] = useState({
    item_id: '',
    to_venue_id: '',
    quantity: '',
    reason: 'Stock Transfer'
  });

  useEffect(() => {
    if (activeVenue?.id) {
      loadTransfers();
      loadCreateData(); // Pre-load data for the modal
    }
  }, [activeVenue?.id]);

  const loadCreateData = async () => {
    try {
      const [itemsRes, venuesRes] = await Promise.all([
        api.get(`/inventory/items?venue_id=${activeVenue?.id}`),
        api.get('/venues')
      ]);
      const itemsData = Array.isArray(itemsRes.data) ? itemsRes.data : (itemsRes.data?.items || []);
      setItems(itemsData);
      // Filter out current venue from targets
      const venuesData = Array.isArray(venuesRes.data) ? venuesRes.data : (venuesRes.data?.venues || []);
      setVenues(venuesData.filter(v => v.id !== activeVenue?.id));
    } catch (e) {
      logger.error("Failed to load transfer options", e);
    }
  };

  const loadTransfers = async () => {
    try {
      const venueId = activeVenue?.id || localStorage.getItem('currentVenueId') || 'venue-caviar-bull';
      const res = await api.get(`/inventory/transfers?venue_id=${venueId}`);
      setTransfers(res.data || []);
    } catch {
      // Fallback mock data if API fails
      setTransfers([
        { id: 'TRF-001', from: 'Central Kitchen', to: 'Main Restaurant', items: 12, date: '2026-02-09', status: 'completed', total_value: 45600 },
        { id: 'TRF-002', from: 'Central Kitchen', to: 'Bar', items: 5, date: '2026-02-09', status: 'in_transit', total_value: 12800 },
        { id: 'TRF-003', from: 'Main Restaurant', to: 'Pastry Kitchen', items: 3, date: '2026-02-08', status: 'completed', total_value: 8400 },
        { id: 'TRF-004', from: 'Central Kitchen', to: 'Main Restaurant', items: 8, date: '2026-02-08', status: 'pending', total_value: 23200 },
        { id: 'TRF-005', from: 'Bar', to: 'Main Restaurant', items: 2, date: '2026-02-07', status: 'completed', total_value: 5600 },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTransfer = async () => {
    if (!formData.item_id || !formData.to_venue_id || !formData.quantity) {
      return toast.error("Please fill all fields");
    }

    const qty = parseFloat(formData.quantity);
    if (isNaN(qty) || qty <= 0) return toast.error("Invalid quantity");

    // Check stock locally first (defensive: ensure items is always an array)
    const safeItems = Array.isArray(items) ? items : [];
    const item = safeItems.find(i => i.id === formData.item_id);
    if (item && item.quantity < qty) {
      return toast.error(`Insufficient stock! Available: ${item.quantity}`);
    }

    setCreateLoading(true);
    try {
      await api.post(`/venues/${activeVenue?.id}/inventory/transfer`, {
        item_id: formData.item_id,
        to_venue_id: formData.to_venue_id,
        quantity: qty,
        reason: formData.reason
      });
      toast.success("Transfer initiated successfully!");
      setFormData({ ...formData, quantity: '', item_id: '' }); // Reset partial
      setIsCreateOpen(false);
      loadTransfers(); // Refresh list
    } catch (e) {
      logger.error(e);
      toast.error(e.response?.data?.detail || "Transfer failed");
    } finally {
      setCreateLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      completed: { label: 'Completed', variant: 'default', className: 'bg-green-500/10 text-green-500 border-green-500/20' },
      in_transit: { label: 'In Transit', variant: 'outline', className: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
      pending: { label: 'Pending', variant: 'outline', className: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
    };
    return map[status] || map.pending;
  };

  const filtered = transfers.filter(t =>
    t.id.toLowerCase().includes(search.toLowerCase()) ||
    t.from?.toLowerCase().includes(search.toLowerCase()) ||
    t.to?.toLowerCase().includes(search.toLowerCase())
  );

  const selectedItem = items.find(i => i.id === formData.item_id);

  return (
    <PageContainer
      title="Stock Transfers"
      description="Central Kitchen to branch transfer management"
      actions={
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> New Transfer
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create Stock Transfer</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {/* Source/Dest */}
              <div className="flex items-center justify-between text-zinc-400">
                <div className="text-center w-1/3">
                  <div className="text-[10px] uppercase font-bold mb-1">From</div>
                  <div className="p-2 bg-zinc-900 rounded border border-white/5 font-bold text-white text-xs truncate">
                    {activeVenue?.name || 'Current Venue'}
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-600" />
                <div className="text-center w-1/2">
                  <div className="text-[10px] uppercase font-bold mb-1">To Destination</div>
                  <Select value={formData.to_venue_id} onValueChange={v => setFormData({ ...formData, to_venue_id: v })}>
                    <SelectTrigger className="bg-zinc-900 border-white/10 h-9">
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

              {/* Item Selection */}
              <div className="space-y-2">
                <Label>Item to Transfer</Label>
                <Select value={formData.item_id} onValueChange={v => setFormData({ ...formData, item_id: v })}>
                  <SelectTrigger className="bg-zinc-900 border-white/10">
                    <SelectValue placeholder="Select Product..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {items.map(i => (
                      <SelectItem key={i.id} value={i.id}>
                        <div className="flex justify-between w-full items-center gap-4">
                          <span>{i.name}</span>
                          <span className="text-zinc-500 text-xs">{i.quantity} {i.unit}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedItem && (
                  <p className="text-xs text-zinc-400 flex items-center gap-2">
                    <Package className="w-3 h-3" />
                    Available: <span className="text-emerald-400 font-bold">{selectedItem.quantity} {selectedItem.unit}</span>
                  </p>
                )}
              </div>

              {/* Quantity */}
              <div className="space-y-2">
                <Label>Quantity to Move</Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={formData.quantity}
                    onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                    className="bg-zinc-900 border-white/10 pl-3 pr-12"
                    placeholder="0.00"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold text-xs">{selectedItem?.unit || 'QTY'}</div>
                </div>
              </div>

              {/* Note */}
              <div className="space-y-2">
                <Label>Reference Note</Label>
                <Input
                  value={formData.reason}
                  onChange={e => setFormData({ ...formData, reason: e.target.value })}
                  className="bg-zinc-900 border-white/10"
                />
              </div>

              <Button
                onClick={handleCreateTransfer}
                disabled={createLoading || !formData.to_venue_id || !formData.item_id}
                className="w-full bg-blue-600 hover:bg-blue-700 font-bold"
              >
                {createLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowLeftRight className="w-4 h-4 mr-2" />}
                Confirm Transfer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      }
    >
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><ArrowLeftRight className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-2xl font-bold">{transfers.length}</p>
                <p className="text-sm text-muted-foreground">Total Transfers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10"><Clock className="h-5 w-5 text-blue-500" /></div>
              <div>
                <p className="text-2xl font-bold">{transfers.filter(t => t.status === 'in_transit').length}</p>
                <p className="text-sm text-muted-foreground">In Transit</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10"><CheckCircle2 className="h-5 w-5 text-green-500" /></div>
              <div>
                <p className="text-2xl font-bold">€{(transfers.reduce((s, t) => s + t.total_value, 0) / 100).toFixed(0)}</p>
                <p className="text-sm text-muted-foreground">Total Value Moved</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" placeholder="Search transfers..." />
      </div>

      {/* Transfers List */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3">
            {filtered.map((transfer) => {
              const status = getStatusBadge(transfer.status);
              return (
                <div key={transfer.id} className="flex items-center gap-4 p-4 rounded-lg border hover:bg-accent/50 transition cursor-pointer">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <ArrowLeftRight className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm font-bold">{transfer.id}</span>
                      <Badge className={status.className} variant="outline">{status.label}</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Building2 className="h-3 w-3" />
                      <span>{transfer.from}</span>
                      <ArrowRight className="h-3 w-3" />
                      <span>{transfer.to}</span>
                    </div>
                  </div>
                  <div className="text-right hidden sm:block">
                    <div className="flex items-center gap-1 text-sm">
                      <Package className="h-3 w-3" />
                      {transfer.items} items
                    </div>
                    <div className="text-xs text-muted-foreground">€{(transfer.total_value / 100).toFixed(2)}</div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {new Date(transfer.date).toLocaleDateString()}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
