import { useState, useEffect } from 'react';
import PageContainer from '../../../layouts/PageContainer';
import { Card, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Plus, Factory, X } from 'lucide-react';
import api from '../../../lib/api';
import { logger } from '@/lib/logger';

export default function ProductionBatches() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ batch_date: '', items: [{ item_id: '', item_name: '', target_quantity: 0, unit: 'kg' }] });

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    try {
      const venueId = localStorage.getItem('currentVenueId');
      const response = await api.get(`/venues/${venueId}/production/batches`);
      setBatches(response.data || []);
    } catch (error) {
      logger.error('Failed to fetch batches:', error);
      setBatches([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const venueId = localStorage.getItem('currentVenueId');
      await api.post(`/venues/${venueId}/production/batches`, formData);
      setShowModal(false);
      fetchBatches();
    } catch (error) {
      logger.error('Failed to create batch:', error);
    }
  };

  const getStatusColor = (status) => {
    const colors = { planned: 'bg-blue-600/20 text-blue-100', in_progress: 'bg-yellow-600/20 text-yellow-100', completed: 'bg-green-600/20 text-green-100', cancelled: 'bg-red-600/20 text-red-100' };
    return colors[status] || 'bg-gray-600/20 text-gray-100';
  };

  return (
    <PageContainer title="Production Batches" description="Manage central kitchen production runs" actions={<button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-foreground rounded-lg hover:bg-purple-700"><Plus className="h-4 w-4" />New Batch</button>}>
      <div className="space-y-4">
        {loading ? <Card><CardContent className="p-8 text-center">Loading...</CardContent></Card> : batches.length === 0 ? <Card><CardContent className="p-8 text-center text-slate-400">No production batches</CardContent></Card> : batches.map((batch) => (
          <Card key={batch.id} className="border-slate-700"><CardContent className="p-6"><div className="flex items-start justify-between"><div className="flex-1"><div className="flex items-center gap-3 mb-2"><Factory className="h-5 w-5 text-purple-400" /><h3 className="text-lg font-semibold text-slate-50">{batch.batch_number}</h3><Badge className={getStatusColor(batch.status)}>{batch.status}</Badge></div><div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm"><div><p className="text-slate-400">Date</p><p className="font-medium">{batch.batch_date}</p></div><div><p className="text-slate-400">Items</p><p className="font-medium">{batch.items?.length || 0}</p></div><div><p className="text-slate-400">Quality Check</p><p className="font-medium">{batch.quality_checked ? 'Passed' : 'Pending'}</p></div><div><p className="text-slate-400">Orders</p><p className="font-medium">{batch.internal_orders?.length || 0}</p></div></div></div></div></CardContent></Card>
        ))}
      </div>
      {showModal && <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"><Card className="w-full max-w-2xl"><CardContent className="p-6"><div className="flex items-center justify-between mb-6"><h3 className="text-xl font-semibold">Create Production Batch</h3><button onClick={() => setShowModal(false)}><X className="h-5 w-5" /></button></div><div className="space-y-4"><div><label className="block text-sm font-medium mb-1">Batch Date</label><input type="date" value={formData.batch_date} onChange={(e) => setFormData({ ...formData, batch_date: e.target.value })} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded" /></div><div className="flex gap-2 pt-4"><button onClick={handleCreate} className="flex-1 px-4 py-2 bg-purple-600 text-foreground rounded hover:bg-purple-700">Create Batch</button><button onClick={() => setShowModal(false)} className="px-4 py-2 bg-slate-700 rounded hover:bg-slate-600">Cancel</button></div></div></CardContent></Card></div>}
    </PageContainer>
  );
}
