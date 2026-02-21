import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { useVenue } from '@/context/VenueContext';
import api from '@/lib/api';
import PageContainer from '@/layouts/PageContainer';
import DataTable from '@/components/shared/DataTable';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Building2,
  Plus,
  Mail,
  Phone,
  CheckCircle2,
  Archive,
  Clock,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

// ── KPI Stat Card ──────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function StatCard({ icon: Icon, label, value, subtext, color = 'text-foreground' }: { icon: /**/any; label: /**/any; value: /**/any; subtext?: /**/any; color?: string }) {
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

export default function SuppliersPage() {
  const { activeVenue } = useVenue();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    payment_terms_days: '30',
    lead_time_days: '3',
    notes: '',
  });

  useEffect(() => {
    if (activeVenue?.id) {
      loadSuppliers();
    }
  }, [activeVenue?.id]);

  const loadSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/inventory/suppliers?venue_id=${activeVenue.id}`);
      const data = res.data;
      setSuppliers(Array.isArray(data) ? data : (data?.suppliers || []));
    } catch (error) {
      logger.error('Failed to load suppliers:', error);
      toast.error('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  }, [activeVenue?.id]);

  const handleCreate = async () => {
    if (!formData.name.trim()) return toast.error('Supplier name is required');

    setSubmitting(true);
    try {
      await api.post('/inventory/suppliers', {
        venue_id: activeVenue.id,
        name: formData.name,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        address: formData.address || undefined,
        payment_terms_days: parseInt(formData.payment_terms_days) || 30,
        lead_time_days: parseInt(formData.lead_time_days) || 3,
        notes: formData.notes || undefined,
      });
      toast.success('Supplier created');
      setShowCreate(false);
      setFormData({ name: '', email: '', phone: '', address: '', payment_terms_days: '30', lead_time_days: '3', notes: '' });
      loadSuppliers();
    } catch (e) {
      logger.error('Failed to create supplier:', e);
      toast.error('Failed to create supplier');
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchive = async (id) => {
    if (!window.confirm('Archive this supplier?')) return;
    try {
      await api.put(`/inventory/suppliers/${id}`, { is_active: false });
      toast.success('Supplier archived');
      loadSuppliers();
    } catch (e) {
      logger.error('Failed to archive:', e);
      toast.error('Failed to archive supplier');
    }
  };

  // ── KPI Calculations ──
  const stats = useMemo(() => {
    const total = suppliers.length;
    const active = suppliers.filter(s => s.is_active !== false).length;
    const archived = total - active;
    const withEmail = suppliers.filter(s => s.email).length;

    return { total, active, archived, withEmail };
  }, [suppliers]);

  // ── Column Definitions ──
  const COLUMNS = useMemo(() => [
    {
      key: 'name',
      label: 'Supplier Name',
      enableSorting: true,
      size: 220,
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center shrink-0">
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <div className="font-medium truncate">{row.name}</div>
            <div className="text-xs text-muted-foreground">{row.display_id || row.code || row.id?.substring(0, 8)}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      label: 'Email',
      size: 180,
      render: (row) =>
        row.email ? (
          <div className="flex items-center gap-1.5 text-sm">
            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="truncate">{row.email}</span>
          </div>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        ),
    },
    {
      key: 'phone',
      label: 'Phone',
      size: 130,
      render: (row) =>
        row.phone ? (
          <div className="flex items-center gap-1.5 text-sm">
            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{row.phone}</span>
          </div>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        ),
    },
    {
      key: 'lead_time_days',
      label: 'Lead Time',
      enableSorting: true,
      size: 100,
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm tabular-nums">{row.lead_time_days ?? '—'} days</span>
        </div>
      ),
    },
    {
      key: 'payment_terms_days',
      label: 'Payment Terms',
      enableSorting: true,
      size: 120,
      render: (row) => (
        <Badge variant="outline" className="text-xs tabular-nums">
          {row.payment_terms_days || 30} days
        </Badge>
      ),
    },
    {
      key: 'is_active',
      label: 'Status',
      size: 100,
      filterType: 'select',
      filterOptions: [
        { value: 'true', label: 'Active' },
        { value: 'false', label: 'Archived' },
      ],
      render: (row) =>
        row.is_active !== false ? (
          <Badge variant="outline" className="text-xs text-green-600 dark:text-green-400 border-green-300 dark:border-green-700 gap-1">
            <CheckCircle2 className="h-3 w-3" /> Active
          </Badge>
        ) : (
          <Badge variant="outline" className="text-xs text-muted-foreground gap-1">
            <Archive className="h-3 w-3" /> Archived
          </Badge>
        ),
    },
  ], []);

  return (
    <PageContainer
      title="Suppliers"
      description="Manage vendors, lead times, and payment terms"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadSuppliers}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Supplier
          </Button>
        </div>
      }
    >
      {/* ── KPI Stat Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={Building2}
          label="Total Suppliers"
          value={stats.total}
          subtext=""
          color="text-blue-600 dark:text-blue-400"
        />
        <StatCard
          icon={CheckCircle2}
          label="Active"
          value={stats.active}
          subtext=""
          color="text-green-600 dark:text-green-400"
        />
        <StatCard
          icon={Archive}
          label="Archived"
          value={stats.archived}
          subtext=""
          color="text-muted-foreground"
        />
        <StatCard
          icon={Mail}
          label="With Email"
          value={stats.withEmail}
          subtext={`of ${stats.total}`}
          color="text-purple-600 dark:text-purple-400"
        />
      </div>

      {/* ── Data Table ── */}
      <DataTable
        columns={COLUMNS}
        data={suppliers}
        loading={loading}
        totalCount={suppliers.length}
        enableGlobalSearch={true}
        enableFilters={true}
        enablePagination={true}
        emptyMessage="No suppliers found. Add your first supplier."
        tableId="suppliers"
        venueId={activeVenue?.id}
      />

      {/* ── Create Supplier Dialog ── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Add New Supplier
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Supplier Name *</Label>
              <Input aria-label="Input field"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Premium Foods Ltd"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input aria-label="Input field"
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="orders@supplier.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input aria-label="Input field"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+356 1234 5678"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input aria-label="Input field"
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                placeholder="123 Warehouse St, Malta"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Lead Time (days)</Label>
                <Input aria-label="Input field"
                  type="number"
                  value={formData.lead_time_days}
                  onChange={e => setFormData({ ...formData, lead_time_days: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Payment Terms (days)</Label>
                <Input aria-label="Input field"
                  type="number"
                  value={formData.payment_terms_days}
                  onChange={e => setFormData({ ...formData, payment_terms_days: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input aria-label="Input field"
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Internal notes about this supplier..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Create Supplier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
