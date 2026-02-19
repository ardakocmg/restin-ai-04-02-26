import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { useVenue } from '@/context/VenueContext';
import api from '@/lib/api';
import PageContainer from '@/layouts/PageContainer';
import DataTable from '@/components/shared/DataTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeftRight,
  Plus,
  RefreshCw,
  Package,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  Truck,
  Building2,
  ChefHat,
  FileText,
  Send,
  ClipboardList,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

// ── KPI Stat Card ──────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, subtext, color = 'text-foreground' }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 flex items-center gap-4">
        <div className="p-2.5 rounded-lg bg-muted">
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={`text-xl font-bold tabular-nums ${color}`}>{value}</p>
          {subtext && <p className="text-xs text-muted-foreground">{subtext}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Status Badge ───────────────────────────────────────────────────
function StatusBadge({ status }) {
  const config = {
    pending: { label: 'Pending', icon: Clock, className: 'text-yellow-600 dark:text-yellow-400 border-yellow-400' },
    in_transit: { label: 'In Transit', icon: Truck, className: 'text-blue-600 dark:text-blue-400 border-blue-400' },
    completed: { label: 'Completed', icon: CheckCircle2, className: 'text-green-600 dark:text-green-400 border-green-400' },
    cancelled: { label: 'Cancelled', icon: XCircle, className: 'text-red-600 dark:text-red-400 border-red-400' },
    // Gap 13: Internal order statuses
    requested: { label: 'Requested', icon: Send, className: 'text-purple-600 dark:text-purple-400 border-purple-400' },
    in_production: { label: 'In Production', icon: ChefHat, className: 'text-orange-600 dark:text-orange-400 border-orange-400' },
    ready: { label: 'Ready', icon: CheckCircle2, className: 'text-green-600 dark:text-green-400 border-green-400' },
  };
  const c = config[status] || config.pending;
  const IconComp = c.icon;
  return (
    <Badge variant="outline" className={`text-xs gap-1 ${c.className}`}>
      <IconComp className="h-3 w-3" /> {c.label}
    </Badge>
  );
}

// ── Order Type Badge (Gap 13) ──────────────────────────────────────
function OrderTypeBadge({ type }) {
  if (type === 'internal') {
    return <Badge variant="outline" className="text-xs text-purple-500 border-purple-400 gap-1"><ChefHat className="h-3 w-3" /> Internal</Badge>;
  }
  return <Badge variant="outline" className="text-xs text-blue-500 border-blue-400 gap-1"><Truck className="h-3 w-3" /> Transfer</Badge>;
}

export default function StockTransfersComplete() {
  const { activeVenue } = useVenue();
  const [transfers, setTransfers] = useState([]);
  const [items, setItems] = useState([]);
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Gap 13: Tab state for transfers vs internal orders
  const [activeTab, setActiveTab] = useState('all');

  const [formData, setFormData] = useState({
    destination_venue_id: '',
    items: [{ item_id: '', quantity: '' }],
    notes: '',
    order_type: 'transfer', // 'transfer' | 'internal'
    priority: 'normal', // 'normal' | 'urgent'
    needed_by: '',
  });

  useEffect(() => {
    if (activeVenue?.id) {
      loadTransfers();
      loadCreateData();
    }
  }, [activeVenue?.id]);

  const loadCreateData = useCallback(async () => {
    try {
      const [itemsRes, venuesRes] = await Promise.all([
        api.get(`/inventory/items?venue_id=${activeVenue.id}`),
        api.get('/venues').catch(() => ({ data: [] })),
      ]);
      const itemsData = itemsRes.data;
      setItems(Array.isArray(itemsData) ? itemsData : (itemsData?.items || []));
      const venuesList = Array.isArray(venuesRes.data) ? venuesRes.data : (venuesRes.data?.venues || []);
      setVenues(venuesList.filter(v => v.id !== activeVenue.id));
    } catch (e) {
      logger.error('Failed to load create data:', e);
    }
  }, [activeVenue?.id]);

  const loadTransfers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/inventory/transfers?venue_id=${activeVenue.id}`);
      const data = res.data;
      setTransfers(Array.isArray(data) ? data : (data?.transfers || getDemoTransfers()));
    } catch {
      setTransfers(getDemoTransfers());
    } finally {
      setLoading(false);
    }
  }, [activeVenue?.id]);

  // Gap 13: Demo data including internal orders
  function getDemoTransfers() {
    return [
      { id: 'TRF-001', display_id: 'TRF-001', destination_venue_name: 'Central Kitchen', items: [{}, {}, {}], created_at: '2026-02-14T09:00', status: 'completed', notes: 'Weekly restock', order_type: 'transfer' },
      { id: 'TRF-002', display_id: 'TRF-002', destination_venue_name: 'Branch Sliema', items: [{}, {}], created_at: '2026-02-13T14:30', status: 'in_transit', notes: 'Urgent seafood', order_type: 'transfer' },
      { id: 'INT-001', display_id: 'INT-001', destination_venue_name: 'Central Kitchen', items: [{}, {}, {}, {}], created_at: '2026-02-14T07:00', status: 'in_production', notes: 'Prep for Saturday service', order_type: 'internal', priority: 'urgent', needed_by: '2026-02-15T06:00' },
      { id: 'INT-002', display_id: 'INT-002', destination_venue_name: 'Central Kitchen', items: [{}, {}], created_at: '2026-02-13T16:00', status: 'ready', notes: 'Dessert prep batch', order_type: 'internal', priority: 'normal', needed_by: '2026-02-14T10:00' },
      { id: 'INT-003', display_id: 'INT-003', destination_venue_name: 'Central Kitchen', items: [{}], created_at: '2026-02-12T11:00', status: 'requested', notes: 'Special event order', order_type: 'internal', priority: 'urgent', needed_by: '2026-02-16T08:00' },
      { id: 'TRF-003', display_id: 'TRF-003', destination_venue_name: 'Branch Valletta', items: [{}], created_at: '2026-02-11T10:00', status: 'pending', notes: '', order_type: 'transfer' },
    ];
  }

  const handleCreateTransfer = async () => {
    const validItems = formData.items.filter(i => i.item_id && i.quantity && parseFloat(i.quantity) > 0);
    if (!formData.destination_venue_id) return toast.error('Select a destination');
    if (validItems.length === 0) return toast.error('Add at least one item');

    setSubmitting(true);
    try {
      await api.post('/inventory/transfers', {
        source_venue_id: activeVenue.id,
        destination_venue_id: formData.destination_venue_id,
        items: validItems.map(i => ({
          item_id: i.item_id,
          quantity: parseFloat(i.quantity),
        })),
        notes: formData.notes,
        order_type: formData.order_type,
        priority: formData.priority,
        needed_by: formData.needed_by || null,
      });
      toast.success(formData.order_type === 'internal' ? 'Internal order submitted' : 'Transfer created successfully');
      setShowCreate(false);
      setFormData({ destination_venue_id: '', items: [{ item_id: '', quantity: '' }], notes: '', order_type: 'transfer', priority: 'normal', needed_by: '' });
      loadTransfers();
    } catch (e) {
      logger.error('Failed to create transfer:', e);
      toast.error('Failed to create transfer');
    } finally {
      setSubmitting(false);
    }
  };

  const addTransferItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { item_id: '', quantity: '' }],
    }));
  };

  const updateTransferItem = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => i === index ? { ...item, [field]: value } : item),
    }));
  };

  // ── Filtered data by tab ──
  const filteredTransfers = useMemo(() => {
    if (activeTab === 'all') return transfers;
    if (activeTab === 'internal') return transfers.filter(t => t.order_type === 'internal');
    if (activeTab === 'transfers') return transfers.filter(t => t.order_type !== 'internal');
    return transfers;
  }, [transfers, activeTab]);

  // ── KPI Calculations ──
  const stats = useMemo(() => {
    const total = transfers.length;
    let pending = 0, inTransit = 0, completed = 0, internalOrders = 0, inProduction = 0;

    for (const t of transfers) {
      const status = t.status || 'pending';
      if (status === 'pending' || status === 'requested') pending++;
      else if (status === 'in_transit') inTransit++;
      else if (status === 'completed' || status === 'ready') completed++;
      if (status === 'in_production') inProduction++;
      if (t.order_type === 'internal') internalOrders++;
    }

    return { total, pending, inTransit, completed, internalOrders, inProduction };
  }, [transfers]);

  // ── Column Definitions ──
  const COLUMNS = useMemo(() => [
    {
      key: 'id', label: 'ID', enableSorting: true, size: 100,
      render: (row) => <span className="font-mono text-sm">{(row.display_id || row.id || '').substring(0, 12)}</span>,
    },
    // Gap 13: Order type column
    {
      key: 'order_type', label: 'Type', size: 90,
      render: (row) => <OrderTypeBadge type={row.order_type || 'transfer'} />,
    },
    {
      key: 'destination', label: 'Destination', size: 160,
      render: (row) => (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="truncate">{row.destination_venue_name || row.destination_venue_id || '—'}</span>
        </div>
      ),
    },
    { key: 'item_count', label: 'Items', size: 60, render: (row) => <Badge variant="outline" className="text-xs">{row.items?.length || 0}</Badge> },
    {
      key: 'created_at', label: 'Created', enableSorting: true, size: 110,
      render: (row) => <span className="text-sm tabular-nums text-muted-foreground">{row.created_at ? new Date(row.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}</span>,
    },
    // Gap 13: Needed by column for internal orders
    {
      key: 'needed_by', label: 'Needed By', size: 100,
      render: (row) => {
        if (!row.needed_by) return <span className="text-xs text-muted-foreground">—</span>;
        const date = new Date(row.needed_by);
        const isOverdue = date < new Date();
        return <span className={`text-xs tabular-nums ${isOverdue ? 'text-red-500 font-bold' : 'text-muted-foreground'}`}>{date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>;
      },
    },
    // Gap 13: Priority for internal orders
    {
      key: 'priority', label: 'Priority', size: 80,
      render: (row) => {
        if (row.priority === 'urgent') return <Badge variant="outline" className="text-xs text-red-500 border-red-400"><AlertTriangle className="h-3 w-3 mr-1" /> Urgent</Badge>;
        return <span className="text-xs text-muted-foreground">Normal</span>;
      },
    },
    {
      key: 'status', label: 'Status', size: 110,
      filterType: 'select',
      filterOptions: [
        { value: 'pending', label: 'Pending' }, { value: 'in_transit', label: 'In Transit' },
        { value: 'completed', label: 'Completed' }, { value: 'cancelled', label: 'Cancelled' },
        { value: 'requested', label: 'Requested' }, { value: 'in_production', label: 'In Production' },
        { value: 'ready', label: 'Ready' },
      ],
      render: (row) => <StatusBadge status={row.status || 'pending'} />,
    },
    {
      key: 'notes', label: 'Notes', size: 140,
      render: (row) => <span className="text-sm text-muted-foreground truncate block max-w-[130px]">{row.notes || '—'}</span>,
    },
  ], []);

  return (
    <PageContainer
      title="Stock Transfers & Internal Orders"
      description="Transfer inventory between locations or request from Central Kitchen"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadTransfers}>
            <RefreshCw className="h-4 w-4 mr-2" />Refresh
          </Button>
          <Button size="sm" onClick={() => { setFormData(prev => ({ ...prev, order_type: 'transfer' })); setShowCreate(true); }}>
            <Plus className="h-4 w-4 mr-2" />New Transfer
          </Button>
          {/* Gap 13: Internal Order button */}
          <Button size="sm" variant="outline" className="border-purple-400 text-purple-500 hover:bg-purple-500/10" onClick={() => { setFormData(prev => ({ ...prev, order_type: 'internal' })); setShowCreate(true); }}>
            <ChefHat className="h-4 w-4 mr-2" />Internal Order
          </Button>
        </div>
      }
    >
      {/* ── KPI Stat Cards (Enhanced) ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <StatCard icon={ArrowLeftRight} label="Total" value={stats.total} color="text-blue-600 dark:text-blue-400" />
        <StatCard icon={Clock} label="Pending" value={stats.pending} color="text-yellow-600 dark:text-yellow-400" />
        <StatCard icon={Truck} label="In Transit" value={stats.inTransit} color="text-blue-600 dark:text-blue-400" />
        <StatCard icon={CheckCircle2} label="Completed" value={stats.completed} color="text-green-600 dark:text-green-400" />
        <StatCard icon={ChefHat} label="Internal Orders" value={stats.internalOrders} color="text-purple-600 dark:text-purple-400" />
        <StatCard icon={Package} label="In Production" value={stats.inProduction} color="text-orange-600 dark:text-orange-400" />
      </div>

      {/* Gap 13: Tabs for All / Transfers / Internal */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
        <TabsList>
          <TabsTrigger value="all">All ({transfers.length})</TabsTrigger>
          <TabsTrigger value="transfers">Transfers ({transfers.filter(t => t.order_type !== 'internal').length})</TabsTrigger>
          <TabsTrigger value="internal">Internal Orders ({transfers.filter(t => t.order_type === 'internal').length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* ── Data Table ── */}
      <DataTable
        columns={COLUMNS}
        data={filteredTransfers}
        loading={loading}
        totalCount={filteredTransfers.length}
        enableGlobalSearch={true}
        enableFilters={true}
        enablePagination={true}
        emptyMessage="No stock transfers found. Create your first transfer."
        tableId="stock-transfers"
        venueId={activeVenue?.id}
      />

      {/* ── Create Transfer / Internal Order Dialog ── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {formData.order_type === 'internal' ? <ChefHat className="h-5 w-5 text-purple-500" /> : <ArrowLeftRight className="h-5 w-5" />}
              {formData.order_type === 'internal' ? 'Internal Production Order' : 'New Stock Transfer'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Gap 13: Order Type Toggle */}
            <div className="flex gap-2">
              <Button size="sm" variant={formData.order_type === 'transfer' ? 'default' : 'outline'} onClick={() => setFormData(p => ({ ...p, order_type: 'transfer' }))}>
                <Truck className="h-3.5 w-3.5 mr-1.5" /> Transfer
              </Button>
              <Button size="sm" variant={formData.order_type === 'internal' ? 'default' : 'outline'} className={formData.order_type === 'internal' ? 'bg-purple-600 hover:bg-purple-700' : ''} onClick={() => setFormData(p => ({ ...p, order_type: 'internal' }))}>
                <ChefHat className="h-3.5 w-3.5 mr-1.5" /> Internal Order
              </Button>
            </div>

            <div className="space-y-2">
              <Label>{formData.order_type === 'internal' ? 'Central Kitchen' : 'Destination'}</Label>
              <Select value={formData.destination_venue_id} onValueChange={v => setFormData({ ...formData, destination_venue_id: v })}>
                <SelectTrigger><SelectValue placeholder={formData.order_type === 'internal' ? 'Select central kitchen...' : 'Select destination venue...'} /></SelectTrigger>
                <SelectContent>
                  {venues.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                  {venues.length === 0 && <SelectItem value="none" disabled>No other venues available</SelectItem>}
                </SelectContent>
              </Select>
            </div>

            {/* Gap 13: Priority + Needed By for internal orders */}
            {formData.order_type === 'internal' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={formData.priority} onValueChange={v => setFormData(p => ({ ...p, priority: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="urgent">🔴 Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Needed By</Label>
                  <Input type="datetime-local" value={formData.needed_by} onChange={e => setFormData(p => ({ ...p, needed_by: e.target.value }))} />
                </div>
              </div>
            )}

            <div className="space-y-3">
              <Label>Items {formData.order_type === 'internal' ? 'to Produce' : 'to Transfer'}</Label>
              {formData.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-5 gap-2">
                  <div className="col-span-3">
                    <Select value={item.item_id} onValueChange={v => updateTransferItem(idx, 'item_id', v)}>
                      <SelectTrigger><SelectValue placeholder="Select item..." /></SelectTrigger>
                      <SelectContent className="max-h-60">
                        {items.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Input type="number" step="0.01" placeholder="Qty" value={item.quantity} onChange={e => updateTransferItem(idx, 'quantity', e.target.value)} />
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addTransferItem} className="w-full">
                <Plus className="h-3 w-3 mr-1" /> Add Item
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder="Transfer notes..." />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreateTransfer} disabled={submitting} className={formData.order_type === 'internal' ? 'bg-purple-600 hover:bg-purple-700' : ''}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : formData.order_type === 'internal' ? <Send className="h-4 w-4 mr-2" /> : <ArrowLeftRight className="h-4 w-4 mr-2" />}
              {formData.order_type === 'internal' ? 'Submit Request' : 'Create Transfer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
