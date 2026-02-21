import { useState, useEffect } from 'react';
import PageContainer from '../../../layouts/PageContainer';
import { Card, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Plus, X, Settings } from 'lucide-react';
import api from '../../../lib/api';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

export default function AutoOrderRules() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    item_id: '',
    supplier_id: '',
    reorder_point: 10,
    order_quantity: 50,
    lead_time_days: 3
  });

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      const venueId = localStorage.getItem('currentVenueId');
      const response = await api.get(`/venues/${venueId}/procurement/auto-order-rules`);
      setRules(response.data || []);
    } catch (error) {
      logger.error('Failed to fetch rules:', error);
      setRules([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const venueId = localStorage.getItem('currentVenueId');
      await api.post(`/venues/${venueId}/procurement/auto-order-rules`, formData);
      setShowModal(false);
      fetchRules();
    } catch (error) {
      logger.error('Failed to create rule:', error);
      toast.error('Failed to create auto-order rule');
    }
  };

  return (
    <PageContainer
      title="Auto-Ordering Rules"
      description="Configure automatic reorder points and quantities"
      actions={
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-foreground rounded-lg hover:bg-purple-700">
          <Plus className="h-4 w-4" />
          New Rule
        </button>
      }
    >
      <div className="space-y-4">
        {loading ? (
          <Card><CardContent className="p-8 text-center">Loading...</CardContent></Card>
        ) : rules.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-slate-400">{"No "}auto-order rules configured</CardContent></Card>
        ) : (
          rules.map((rule) => (
            <Card key={rule.id} className="border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Settings className="h-5 w-5 text-purple-400" />
                      <h3 className="text-lg font-semibold text-slate-50">Item ID: {rule.item_id}</h3>
                      <Badge className={rule.active ? 'bg-green-600/20 text-green-100' : 'bg-gray-600/20 text-gray-100'}>
                        {rule.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-slate-400">Reorder Point</p>
                        <p className="font-medium text-slate-50">{rule.reorder_point}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Order Quantity</p>
                        <p className="font-medium text-slate-50">{rule.order_quantity}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Lead Time</p>
                        <p className="font-medium text-slate-50">{rule.lead_time_days} days</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Supplier</p>
                        <p className="font-medium text-slate-50">{rule.supplier_id}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold">Create Auto-Order Rule</h3>
                <button onClick={() => setShowModal(false)}><X className="h-5 w-5" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Item ID</label>
                  <input type="text" value={formData.item_id} onChange={(e) = aria-label="Input field"> setFormData({ ...formData, item_id: e.target.value })} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Supplier ID</label>
                  <input type="text" value={formData.supplier_id} onChange={(e) = aria-label="Input field"> setFormData({ ...formData, supplier_id: e.target.value })} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Reorder Point</label>
                    <input type="number" value={formData.reorder_point} onChange={(e) = aria-label="Input field"> setFormData({ ...formData, reorder_point: parseFloat(e.target.value) })} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Order Quantity</label>
                    <input type="number" value={formData.order_quantity} onChange={(e) = aria-label="Input field"> setFormData({ ...formData, order_quantity: parseFloat(e.target.value) })} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Lead Time (days)</label>
                    <input type="number" value={formData.lead_time_days} onChange={(e) = aria-label="Input field"> setFormData({ ...formData, lead_time_days: parseInt(e.target.value) })} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded" />
                  </div>
                </div>
                <div className="flex gap-2 pt-4">
                  <button onClick={handleCreate} className="flex-1 px-4 py-2 bg-purple-600 text-foreground rounded hover:bg-purple-700">Create Rule</button>
                  <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-slate-700 rounded hover:bg-slate-600">Cancel</button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </PageContainer>
  );
}
