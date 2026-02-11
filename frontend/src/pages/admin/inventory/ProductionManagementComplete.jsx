import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import PageContainer from '../../../layouts/PageContainer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { Factory, Plus, Search, Calendar, Clock, CheckCircle2, AlertTriangle, Package, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../../lib/api';

export default function ProductionManagementComplete() {
  const { user, isManager, isOwner } = useAuth();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadBatches();
  }, []);

  const loadBatches = async () => {
    try {
      const venueId = localStorage.getItem('currentVenueId') || 'venue-caviar-bull';
      const res = await api.get(`/inventory/production?venue_id=${venueId}`);
      setBatches(res.data || []);
    } catch {
      setBatches([
        { id: 'PRD-001', recipe: 'Pizza Dough', quantity: 50, unit: 'balls', started: '2026-02-09T06:00', status: 'in_progress', yield_expected: 50, yield_actual: null, notes: 'Morning prep batch' },
        { id: 'PRD-002', recipe: 'Red Sauce Base', quantity: 20, unit: 'L', started: '2026-02-09T07:00', status: 'completed', yield_expected: 20, yield_actual: 19.5, notes: 'Slight evaporation' },
        { id: 'PRD-003', recipe: 'Tiramisu Batch', quantity: 12, unit: 'portions', started: '2026-02-09T08:00', status: 'in_progress', yield_expected: 12, yield_actual: null, notes: '' },
        { id: 'PRD-004', recipe: 'Fresh Pasta Sheets', quantity: 15, unit: 'kg', started: '2026-02-09T05:30', status: 'completed', yield_expected: 15, yield_actual: 14.8, notes: '' },
        { id: 'PRD-005', recipe: 'House Bread', quantity: 40, unit: 'loaves', started: '2026-02-08T06:00', status: 'completed', yield_expected: 40, yield_actual: 38, notes: '2 rejected' },
        { id: 'PRD-006', recipe: 'Chicken Stock', quantity: 30, unit: 'L', started: '2026-02-09T04:00', status: 'pending', yield_expected: 30, yield_actual: null, notes: 'Scheduled overnight' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      completed: { label: 'Completed', className: 'bg-green-500/10 text-green-500 border-green-500/20' },
      in_progress: { label: 'In Progress', className: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
      pending: { label: 'Pending', className: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
    };
    return map[status] || map.pending;
  };

  const filtered = batches
    .filter(b => filter === 'all' || b.status === filter)
    .filter(b => b.recipe.toLowerCase().includes(search.toLowerCase()));

  const completedToday = batches.filter(b => b.status === 'completed').length;
  const inProgress = batches.filter(b => b.status === 'in_progress').length;
  const yieldVariance = batches
    .filter(b => b.yield_actual !== null)
    .reduce((sum, b) => sum + ((b.yield_actual / b.yield_expected) * 100 - 100), 0);
  const avgVariance = batches.filter(b => b.yield_actual !== null).length
    ? (yieldVariance / batches.filter(b => b.yield_actual !== null).length).toFixed(1)
    : '0.0';

  return (
    <PageContainer
      title="Production Management"
      description="Central kitchen batch production and yield tracking"
      actions={
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> New Batch
        </Button>
      }
    >
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><Factory className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-2xl font-bold">{batches.length}</p>
                <p className="text-sm text-muted-foreground">Total Batches</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10"><Clock className="h-5 w-5 text-blue-500" /></div>
              <div>
                <p className="text-2xl font-bold">{inProgress}</p>
                <p className="text-sm text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10"><CheckCircle2 className="h-5 w-5 text-green-500" /></div>
              <div>
                <p className="text-2xl font-bold">{completedToday}</p>
                <p className="text-sm text-muted-foreground">Completed Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10"><AlertTriangle className="h-5 w-5 text-amber-500" /></div>
              <div>
                <p className="text-2xl font-bold">{avgVariance}%</p>
                <p className="text-sm text-muted-foreground">Yield Variance</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" placeholder="Search batches..." />
        </div>
        {['all', 'pending', 'in_progress', 'completed'].map(s => (
          <Button key={s} variant={filter === s ? 'default' : 'outline'} size="sm" onClick={() => setFilter(s)} className="capitalize">
            {s === 'all' ? 'All' : s.replace('_', ' ')}
          </Button>
        ))}
      </div>

      {/* Batches */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="animate-spin h-6 w-6" /></div>
          ) : (
            <div className="space-y-3">
              {filtered.map((batch) => {
                const status = getStatusBadge(batch.status);
                const yieldPct = batch.yield_actual !== null
                  ? ((batch.yield_actual / batch.yield_expected) * 100).toFixed(1)
                  : null;
                return (
                  <div key={batch.id} className="flex items-center gap-4 p-4 rounded-lg border hover:bg-accent/50 transition">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Factory className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm font-bold">{batch.id}</span>
                        <Badge className={status.className} variant="outline">{status.label}</Badge>
                      </div>
                      <div className="font-medium">{batch.recipe}</div>
                      {batch.notes && <div className="text-xs text-muted-foreground mt-1">{batch.notes}</div>}
                    </div>
                    <div className="text-right hidden sm:block">
                      <div className="text-sm font-medium">{batch.quantity} {batch.unit}</div>
                      {yieldPct && (
                        <div className={`text-xs ${parseFloat(yieldPct) >= 98 ? 'text-green-500' : 'text-amber-500'}`}>
                          Yield: {yieldPct}%
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {new Date(batch.started).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
