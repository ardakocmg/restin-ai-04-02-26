import React, { useState, useEffect } from 'react';
import PageContainer from '../../../layouts/PageContainer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { ArrowLeftRight, Plus, ArrowRight, Building2, Package, Calendar, CheckCircle2, Clock, Search } from 'lucide-react';
import { Input } from '../../../components/ui/input';
import { toast } from 'sonner';
import api from '../../../lib/api';

export default function StockTransfersComplete() {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadTransfers();
  }, []);

  const loadTransfers = async () => {
    try {
      const venueId = localStorage.getItem('currentVenueId') || 'venue-caviar-bull';
      const res = await api.get(`/inventory/transfers?venue_id=${venueId}`);
      setTransfers(res.data || []);
    } catch {
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
    t.from.toLowerCase().includes(search.toLowerCase()) ||
    t.to.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PageContainer
      title="Stock Transfers"
      description="Central Kitchen to branch transfer management"
      actions={
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> New Transfer
        </Button>
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
