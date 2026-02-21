// @ts-nocheck
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
import {
  ShoppingCart,
  Plus,
  RefreshCw,
  Loader2,
  CheckCircle2,
  Clock,
  Send,
  XCircle,
  FileText,
  DollarSign,
  Truck,
  Package,
  Receipt,
  AlertTriangle,
  BarChart3,
  CalendarClock,
  Star,
  TrendingUp,
  Bookmark,
  Copy,
  Repeat,
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
function POStatusBadge({ status }) {
  const config = {
    DRAFT: { label: 'Draft', icon: FileText, className: 'text-muted-foreground border-zinc-400' },
    SUBMITTED: { label: 'Submitted', icon: Send, className: 'text-blue-600 dark:text-blue-400 border-blue-400' },
    APPROVED: { label: 'Approved', icon: CheckCircle2, className: 'text-purple-600 dark:text-purple-400 border-purple-400' },
    SENT: { label: 'Sent', icon: Truck, className: 'text-green-600 dark:text-green-400 border-green-400' },
    RECEIVED: { label: 'Received', icon: Package, className: 'text-emerald-600 dark:text-emerald-400 border-emerald-400' },
    CANCELLED: { label: 'Cancelled', icon: XCircle, className: 'text-red-600 dark:text-red-400 border-red-400' },
  };
  const c = config[status] || config.DRAFT;
  const Icon = c.icon;
  return (
    <Badge variant="outline" className={`text-xs gap-1 ${c.className}`}>
      <Icon className="h-3 w-3" /> {c.label}
    </Badge>
  );
}

export default function PurchaseOrdersNew() {
  const { activeVenue } = useVenue();
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Gap 18: Order Templates & Recurring
  const [orderTemplates, setOrderTemplates] = useState([
    {
      id: 'tpl-1', name: 'Weekly Dry Goods', supplier_id: '', items: [
        { item_id: '', quantity: '10', unit_cost: '12.50' },
        { item_id: '', quantity: '5', unit_cost: '8.00' },
      ], schedule: 'weekly', last_used: '2026-02-10'
    },
    {
      id: 'tpl-2', name: 'Daily Dairy & Produce', supplier_id: '', items: [
        { item_id: '', quantity: '20', unit_cost: '3.50' },
        { item_id: '', quantity: '15', unit_cost: '2.20' },
      ], schedule: 'daily', last_used: '2026-02-15'
    },
    {
      id: 'tpl-3', name: 'Monthly Cleaning Supplies', supplier_id: '', items: [
        { item_id: '', quantity: '4', unit_cost: '25.00' },
      ], schedule: 'monthly', last_used: '2026-01-28'
    },
  ]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateSchedule, setTemplateSchedule] = useState('none');

  const saveAsTemplate = () => {
    if (!templateName.trim()) { toast.error('Enter a template name'); return; }
    const newTpl = {
      id: `tpl-${Date.now()}`,
      name: templateName,
      supplier_id: formData.supplier_id,
      items: formData.items.filter(i => i.item_id || i.quantity),
      schedule: templateSchedule,
      last_used: new Date().toISOString().split('T')[0],
    };
    setOrderTemplates(prev => [...prev, newTpl]);
    setTemplateName('');
    toast.success(`Template "${templateName}" saved`);
  };

  const loadTemplate = (tpl) => {
    setFormData(prev => ({
      ...prev,
      supplier_id: tpl.supplier_id || prev.supplier_id,
      items: tpl.items.length > 0 ? tpl.items.map(i => ({ ...i })) : prev.items,
    }));
    setShowTemplates(false);
    setShowCreate(true);
    toast.success(`Loaded template: ${tpl.name}`);
  };

  const [formData, setFormData] = useState({
    supplier_id: '',
    delivery_date: '',
    delivery_time: '',
    delivery_notes: '',
    invoice_ref: '',
    items: [{ item_id: '', quantity: '', unit_cost: '' }],
  });

  useEffect(() => {
    if (activeVenue?.id) {
      loadData();
    }
  }, [activeVenue?.id]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [ordersRes, suppliersRes, itemsRes] = await Promise.all([
        api.get(`/inventory/purchase-orders?venue_id=${activeVenue.id}`).catch(() => ({ data: [] })),
        api.get(`/inventory/suppliers?venue_id=${activeVenue.id}`).catch(() => ({ data: [] })),
        api.get(`/inventory/items?venue_id=${activeVenue.id}`).catch(() => ({ data: [] })),
      ]);

      const ordersData = ordersRes.data;
      setOrders(Array.isArray(ordersData) ? ordersData : (ordersData?.orders || []));
      const suppData = suppliersRes.data;
      setSuppliers(Array.isArray(suppData) ? suppData : (suppData?.suppliers || []));
      const itemsData = itemsRes.data;
      setInventoryItems(Array.isArray(itemsData) ? itemsData : (itemsData?.items || []));
    } catch (error) {
      logger.error('Failed to load PO data:', error);
      toast.error('Failed to load procurement data');
    } finally {
      setLoading(false);
    }
  }, [activeVenue?.id]);

  const createPO = async () => {
    if (!formData.supplier_id) return toast.error('Select a supplier');
    const validItems = formData.items.filter(i => i.item_id && parseFloat(i.quantity) > 0);
    if (validItems.length === 0) return toast.error('Add at least one item');

    setSubmitting(true);
    try {
      await api.post('/inventory/purchase-orders', {
        venue_id: activeVenue.id,
        supplier_id: formData.supplier_id,
        expected_delivery: formData.delivery_date || undefined,
        items: validItems.map(i => ({
          item_id: i.item_id,
          quantity: parseFloat(i.quantity),
          unit_cost: parseFloat(i.unit_cost) || 0,
        })),
      });
      toast.success('Purchase Order created');
      setShowCreate(false);
      setFormData({ supplier_id: '', delivery_date: '', delivery_time: '', delivery_notes: '', invoice_ref: '', items: [{ item_id: '', quantity: '', unit_cost: '' }] });
      loadData();
    } catch (e) {
      logger.error('Failed to create PO:', e);
      toast.error('Failed to create PO');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAction = async (id, action) => {
    if (!window.confirm(`Are you sure you want to ${action} this PO?`)) return;
    try {
      await api.post(`/inventory/purchase-orders/${id}/${action}`);
      toast.success(`PO ${action} successful`);
      loadData();
    } catch (e) {
      logger.error(`Failed to ${action} PO:`, e);
      toast.error(`Failed to ${action} PO`);
    }
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { item_id: '', quantity: '', unit_cost: '' }],
    }));
  };

  const updateItem = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => i === index ? { ...item, [field]: value } : item),
    }));
  };

  // ── KPI Calculations ──
  const stats = useMemo(() => {
    const total = orders.length;
    let draft = 0;
    let active = 0;
    let totalValue = 0;

    for (const o of orders) {
      if (o.status === 'DRAFT') draft++;
      else if (['SUBMITTED', 'APPROVED', 'SENT'].includes(o.status)) active++;
      totalValue += o.total_amount || 0;
    }

    return { total, draft, active, totalValue };
  }, [orders]);

  // ── Supplier Performance Metrics ──
  const supplierPerformance = useMemo(() => {
    const perfMap = {};
    for (const o of orders) {
      const s = o.supplier_name || 'Unknown';
      if (!perfMap[s]) perfMap[s] = { total: 0, onTime: 0, rejected: 0, leadDays: [] };
      perfMap[s].total++;
      if (o.status === 'RECEIVED') {
        perfMap[s].onTime++;
        if (o.created_at && o.received_at) {
          perfMap[s].leadDays.push(
            Math.round((new Date(o.received_at) - new Date(o.created_at)) / (1000 * 60 * 60 * 24))
          );
        }
      }
      if (o.status === 'CANCELLED') perfMap[s].rejected++;
    }
    return Object.entries(perfMap).map(([name, data]) => ({
      name,
      orderCount: data.total,
      onTimePct: data.total > 0 ? Math.round((data.onTime / data.total) * 100) : 0,
      avgLeadDays: data.leadDays.length > 0
        ? Math.round(data.leadDays.reduce((a, b) => a + b, 0) / data.leadDays.length)
        : 0,
      rejectionPct: data.total > 0 ? Math.round((data.rejected / data.total) * 100) : 0,
    })).sort((a, b) => b.orderCount - a.orderCount);
  }, [orders]);

  // ── Column Definitions ──
  const COLUMNS = useMemo(() => [
    {
      key: 'display_id',
      label: 'PO Number',
      enableSorting: true,
      size: 130,
      render: (row) => (
        <span className="font-mono text-sm">{row.display_id || row.po_number || `PO-${row.id?.substring(0, 6)}`}</span>
      ),
    },
    {
      key: 'supplier_name',
      label: 'Supplier',
      enableSorting: true,
      size: 180,
      render: (row) => (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="font-medium truncate">{row.supplier_name || 'Unknown'}</span>
        </div>
      ),
    },
    {
      key: 'created_at',
      label: 'Date',
      enableSorting: true,
      size: 120,
      render: (row) => (
        <span className="text-sm tabular-nums text-muted-foreground">
          {row.created_at ? new Date(row.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
        </span>
      ),
    },
    {
      key: 'total_amount',
      label: 'Total',
      enableSorting: true,
      size: 100,
      render: (row) => (
        <span className="font-bold tabular-nums">€{(row.total_amount || 0).toFixed(2)}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      size: 130,
      filterType: 'select',
      filterOptions: [
        { value: 'DRAFT', label: 'Draft' },
        { value: 'SUBMITTED', label: 'Submitted' },
        { value: 'APPROVED', label: 'Approved' },
        { value: 'SENT', label: 'Sent' },
        { value: 'RECEIVED', label: 'Received' },
        { value: 'CANCELLED', label: 'Cancelled' },
      ],
      render: (row) => <POStatusBadge status={row.status} />,
    },
    {
      key: 'invoice_match',
      label: 'Invoice Match',
      size: 130,
      render: (row) => {
        const hasInvoice = row.invoice_ref || row.invoice_matched;
        const hasGRN = row.grn_id || row.status === 'RECEIVED';
        if (hasInvoice && hasGRN) {
          return <Badge variant="outline" className="text-xs text-green-600 dark:text-green-400 border-green-400 gap-1"><CheckCircle2 className="h-3 w-3" /> 3-Way Match</Badge>;
        }
        if (hasGRN) {
          return <Badge variant="outline" className="text-xs text-amber-600 dark:text-amber-400 border-amber-400 gap-1"><AlertTriangle className="h-3 w-3" /> GRN Only</Badge>;
        }
        if (hasInvoice) {
          return <Badge variant="outline" className="text-xs text-blue-600 dark:text-blue-400 border-blue-400 gap-1"><Receipt className="h-3 w-3" /> Invoice Pending</Badge>;
        }
        return <Badge variant="outline" className="text-xs text-muted-foreground gap-1"><Clock className="h-3 w-3" /> Unmatched</Badge>;
      },
    },
    {
      key: 'expected_delivery',
      label: 'Delivery',
      size: 120,
      render: (row) => {
        const ed = row.expected_delivery || row.delivery_date;
        if (!ed) return <span className="text-muted-foreground text-xs">—</span>;
        const d = new Date(ed);
        const isPast = d < new Date() && row.status !== 'RECEIVED';
        return (
          <span className={`text-xs tabular-nums ${isPast ? 'text-red-500 font-bold' : 'text-muted-foreground'}`}>
            {d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
            {isPast && ' ⯈ Late'}
          </span>
        );
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      size: 120,
      render: (row) => (
        <div className="flex items-center gap-1">
          {row.status === 'DRAFT' && (
            <Button size="sm" variant="ghost" className="h-7 text-xs text-blue-500" onClick={() => handleAction(row.id, 'submit')}>
              Submit
            </Button>
          )}
          {row.status === 'SUBMITTED' && (
            <Button size="sm" variant="ghost" className="h-7 text-xs text-purple-500" onClick={() => handleAction(row.id, 'approve')}>
              Approve
            </Button>
          )}
          {row.status === 'APPROVED' && (
            <Button size="sm" variant="ghost" className="h-7 text-xs text-green-500" onClick={() => handleAction(row.id, 'send')}>
              Send
            </Button>
          )}
          {!['RECEIVED', 'CANCELLED'].includes(row.status) && (
            <Button size="sm" variant="ghost" className="h-7 text-xs text-red-500" onClick={() => handleAction(row.id, 'cancel')}>
              <XCircle className="h-3 w-3" />
            </Button>
          )}
        </div>
      ),
    },
  ], []);

  return (
    <PageContainer
      title="Purchase Orders"
      description="Create and manage procurement orders to suppliers"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowTemplates(true)}>
            <Bookmark className="h-4 w-4 mr-2" />
            Templates ({orderTemplates.length})
          </Button>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New PO
          </Button>
        </div>
      }
    >
      {/* ── KPI Stat Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={ShoppingCart}
          label="Total Orders"
          value={stats.total}
          color="text-blue-600 dark:text-blue-400"
        />
        <StatCard
          icon={FileText}
          label="Drafts"
          value={stats.draft}
          color="text-muted-foreground"
        />
        <StatCard
          icon={Truck}
          label="Active (In Progress)"
          value={stats.active}
          color="text-green-600 dark:text-green-400"
        />
        <StatCard
          icon={DollarSign}
          label="Total Value"
          value={`€${stats.totalValue.toLocaleString()}`}
          color="text-amber-600 dark:text-amber-400"
        />
        <StatCard
          icon={Repeat}
          label="Saved Templates"
          value={orderTemplates.length}
          subtext={`${orderTemplates.filter(t => t.schedule !== 'none').length} recurring`}
          color="text-purple-600 dark:text-purple-400"
        />
      </div>

      {/* ── Data Table ── */}
      <DataTable
        columns={COLUMNS}
        data={orders}
        loading={loading}
        totalCount={orders.length}
        enableGlobalSearch={true}
        enableFilters={true}
        enablePagination={true}
        emptyMessage="No purchase orders found. Create your first PO."
        tableId="purchase-orders"
        venueId={activeVenue?.id}
      />

      {/* ── Create PO Dialog ── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Create Purchase Order
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Supplier *</Label>
                <Select value={formData.supplier_id} onValueChange={v => setFormData({ ...formData, supplier_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier..." />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                    {suppliers.length === 0 && (
                      <SelectItem value="none" disabled>{"No "}suppliers — add one first</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Expected Delivery</Label>
                <Input
                  type="date"
                  value={formData.delivery_date}
                  onChange={e => setFormData({ ...formData, delivery_date: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Delivery Time Slot</Label>
                <Select value={formData.delivery_time} onValueChange={v => setFormData({ ...formData, delivery_time: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">Morning (6-12)</SelectItem>
                    <SelectItem value="afternoon">Afternoon (12-17)</SelectItem>
                    <SelectItem value="evening">Evening (17-22)</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Invoice Reference</Label>
                <Input
                  placeholder="INV-1234"
                  value={form.invoice_number}
                  onChange={(e) => setForm(prev => ({ ...prev, invoice_number: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Delivery Notes</Label>
                <Input
                  placeholder="Back door, dock B..."
                  value={formData.delivery_notes}
                  onChange={e => setFormData({ ...formData, delivery_notes: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Order Items</Label>
                <Button variant="outline" size="sm" onClick={addItem}>
                  <Plus className="h-3 w-3 mr-1" /> Add Item
                </Button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {formData.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-6 gap-2">
                    <div className="col-span-3">
                      <Select value={item.item_id} onValueChange={v => updateItem(idx, 'item_id', v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select item..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {inventoryItems.map(i => (
                            <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-1">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={e => updateItem(idx, 'quantity', e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Unit Cost €"
                        value={item.unit_cost}
                        onChange={e => updateItem(idx, 'unit_cost', e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Gap 18: Save as Template */}
          <div className="border-t border-border pt-3 mt-2 space-y-2">
            <p className="text-xs text-muted-foreground font-medium flex items-center gap-1"><Bookmark className="h-3 w-3" /> Save as Template</p>
            <div className="flex gap-2">
              <Input placeholder="Template name..." value={templateName} onChange={(e) => setTemplateName(e.target.value)} className="flex-1" />
              <Select value={templateSchedule} onValueChange={setTemplateSchedule}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">One-time</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Bi-Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={saveAsTemplate}>
                <Copy className="h-3 w-3 mr-1" /> Save
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={createPO} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShoppingCart className="h-4 w-4 mr-2" />}
              Create PO
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Gap 18: Order Templates Dialog */}
      <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bookmark className="h-5 w-5 text-purple-500" />
              Order Templates
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {orderTemplates.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">{"No "}templates saved yet. Create a PO and save it as a template.</p>
            )}
            {orderTemplates.map(tpl => (
              <div key={tpl.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-primary/30 hover:bg-accent/10 transition-all">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Bookmark className="h-4 w-4 text-purple-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{tpl.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {tpl.items.length} items · Last used: {tpl.last_used}
                    {tpl.schedule !== 'none' && (
                      <Badge variant="outline" className="ml-1 text-[9px] px-1">
                        <Repeat className="h-2 w-2 mr-0.5" />{tpl.schedule}
                      </Badge>
                    )}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => loadTemplate(tpl)}>
                  <Copy className="h-3 w-3 mr-1" /> Use
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Supplier Performance ── */}
      {supplierPerformance.length > 0 && (
        <Card className="mt-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-emerald-500" />
              Supplier Performance Tracker
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Supplier</th>
                    <th className="text-center py-2 px-3 font-medium text-muted-foreground">Orders</th>
                    <th className="text-center py-2 px-3 font-medium text-muted-foreground">On-Time %</th>
                    <th className="text-center py-2 px-3 font-medium text-muted-foreground">Avg Lead (days)</th>
                    <th className="text-center py-2 px-3 font-medium text-muted-foreground">Rejection %</th>
                    <th className="text-center py-2 px-3 font-medium text-muted-foreground">Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {supplierPerformance.slice(0, 8).map((sp, i) => {
                    const rating = Math.max(1, Math.min(5, Math.round((sp.onTimePct / 20) - (sp.rejectionPct / 25))));
                    return (
                      <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-2 px-3 font-medium">{sp.name}</td>
                        <td className="py-2 px-3 text-center tabular-nums">{sp.orderCount}</td>
                        <td className="py-2 px-3 text-center">
                          <span className={`font-bold tabular-nums ${sp.onTimePct >= 80 ? 'text-green-500' : sp.onTimePct >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                            {sp.onTimePct}%
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center tabular-nums">{sp.avgLeadDays || '—'}</td>
                        <td className="py-2 px-3 text-center">
                          <span className={`tabular-nums ${sp.rejectionPct > 10 ? 'text-red-500 font-bold' : 'text-muted-foreground'}`}>
                            {sp.rejectionPct}%
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          {'★'.repeat(Math.max(1, rating))}{'☆'.repeat(Math.max(0, 5 - Math.max(1, rating)))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </PageContainer>
  );
}
