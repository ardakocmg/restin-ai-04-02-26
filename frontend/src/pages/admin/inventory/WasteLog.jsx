import React, { useState, useEffect } from 'react';
import { useVenue } from '../../../context/VenueContext';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../lib/api';
import PageContainer from '../../../layouts/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Trash2, AlertTriangle, RefreshCw, Loader2, History } from 'lucide-react';
import DataTable from '../../../components/shared/DataTable';
import { toast } from 'sonner';

import { logger } from '@/lib/logger';
export default function WasteLog() {
  const { activeVenue } = useVenue();
  const { user, isManager, isOwner } = useAuth();
  const [items, setItems] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    item_id: '',
    quantity: '',
    reason: 'Expired'
  });

  useEffect(() => {
    if (activeVenue?.id) {
      loadData();
    }
  }, [activeVenue?.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [itemsRes, logsRes] = await Promise.all([
        api.get(`/inventory/items?venue_id=${activeVenue.id}`),
        // Fetch recent ledger entries that look like waste (OUT action)
        api.get(`/venues/${activeVenue.id}/inventory/ledger`)
      ]);
      const itemsData = itemsRes.data;
      setItems(Array.isArray(itemsData) ? itemsData : (itemsData?.items || []));

      // Client side filter for "waste" like reasons or just OUT actions
      const allLogs = logsRes.data || [];
      const wasteLogs = allLogs.filter(l =>
        l.action === 'OUT' &&
        ['Expired', 'Damaged', 'Spillage', 'Mistake'].some(r => (l.reason || '').includes(r))
      );
      setLogs(wasteLogs);
    } catch (e) {
      logger.error(e);
      toast.error("Failed to load waste data");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.item_id || !formData.quantity) return toast.error("Please fill required fields");

    const qty = parseFloat(formData.quantity);
    if (isNaN(qty) || qty <= 0) return toast.error("Invalid quantity");

    setSubmitting(true);
    try {
      await api.post('/inventory/ledger', {
        item_id: formData.item_id,
        action: 'OUT',
        quantity: qty,
        reason: `[WASTE] ${formData.reason}`,
        venue_id: activeVenue.id
      });
      toast.success("Waste recorded successfully");
      setFormData({ item_id: '', quantity: '', reason: 'Expired' });
      loadData();
    } catch (e) {
      logger.error(e);
      toast.error("Failed to record waste");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedItem = items.find(i => i.id === formData.item_id);

  return (
    <PageContainer
      title="Waste Management"
      description="Record spillage, spoilage, and production waste"
      actions={
        <Button variant="outline" size="sm" onClick={loadData}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Log
        </Button>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Entry Form */}
        <Card className="bg-zinc-950 border-white/10 md:col-span-1 h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-500" />
              Record Waste
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Item</Label>
              <Select value={formData.item_id} onValueChange={v => setFormData({ ...formData, item_id: v })}>
                <SelectTrigger className="bg-zinc-900 border-white/10">
                  <SelectValue placeholder="Select Item..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {items.map(i => (
                    <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedItem && (
                <div className="text-xs text-zinc-500">
                  In Stock: {selectedItem.quantity} {selectedItem.unit}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Quantity Lost ({selectedItem?.unit || 'Units'})</Label>
              <Input
                type="number"
                value={formData.quantity}
                onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                className="bg-zinc-900 border-white/10"
              />
            </div>

            <div className="space-y-2">
              <Label>Reason</Label>
              <Select value={formData.reason} onValueChange={v => setFormData({ ...formData, reason: v })}>
                <SelectTrigger className="bg-zinc-900 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Expired">Expired / Spoilage</SelectItem>
                  <SelectItem value="Damaged">Droppage / Damaged</SelectItem>
                  <SelectItem value="Spillage">Spillage (Bar)</SelectItem>
                  <SelectItem value="Mistake">Presentation Error</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              className="w-full bg-red-600 hover:bg-red-700 font-bold"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "LOG WASTE"}
            </Button>
          </CardContent>
        </Card>

        {/* History Log */}
        <Card className="bg-zinc-950 border-white/10 md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-zinc-500" />
              Recent Waste Logs
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              columns={[
                {
                  key: 'created_at',
                  label: 'Time',
                  render: (row) => new Date(row.created_at).toLocaleString()
                },
                {
                  key: 'item',
                  label: 'Item',
                  render: (row) => items.find(i => i.id === row.item_id)?.name || row.item_id
                },
                {
                  key: 'qty',
                  label: 'Loss',
                  render: (row) => <span className="text-red-500 font-bold">-{row.quantity}</span>
                },
                { key: 'reason', label: 'Reason' }
              ]}
              data={logs}
              loading={loading}
              emptyMessage="No waste records found."
            />
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
