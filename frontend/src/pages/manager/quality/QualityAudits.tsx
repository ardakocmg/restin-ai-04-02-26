import { useState, useEffect } from 'react';
import PageContainer from '../../../layouts/PageContainer';
import { Card, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { ShieldCheck, Plus, X } from 'lucide-react';
import api from '../../../lib/api';
import { logger } from '@/lib/logger';

export default function QualityAudits() {
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ audit_type: 'haccp', audit_date: '', checklist: [] });

  useEffect(() => {
    fetchAudits();
  }, []);

  const fetchAudits = async () => {
    try {
      const venueId = localStorage.getItem('currentVenueId');
      const response = await api.get(`/venues/${venueId}/quality/audits`);
      setAudits(response.data || []);
    } catch (error) {
      logger.error('Failed to fetch audits:', error);
      setAudits([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const venueId = localStorage.getItem('currentVenueId');
      await api.post(`/venues/${venueId}/quality/audits`, formData);
      setShowModal(false);
      fetchAudits();
    } catch (error) {
      logger.error('Failed to create audit:', error);
    }
  };

  return (
    <PageContainer title="Quality Audits" description="HACCP and safety audits" actions={<button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-foreground rounded-lg hover:bg-yellow-700"><Plus className="h-4 w-4" />New Audit</button>}>
      <div className="space-y-4">
        {loading ? <Card><CardContent className="p-8 text-center">Loading...</CardContent></Card> : audits.length === 0 ? <Card><CardContent className="p-8 text-center text-slate-400">{"No "}audits found</CardContent></Card> : audits.map((audit) => (
          <Card key={audit.id} className="border-slate-700"><CardContent className="p-6"><div className="flex items-start justify-between"><div className="flex-1"><div className="flex items-center gap-3 mb-2"><ShieldCheck className="h-5 w-5 text-yellow-400" /><h3 className="text-lg font-semibold text-slate-50">{audit.audit_type}</h3><Badge className="bg-blue-600/20 text-blue-100">Score: {audit.overall_score?.toFixed(0) || 0}%</Badge></div><div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm"><div><p className="text-slate-400">Date</p><p className="font-medium">{new Date(audit.audit_date).toLocaleDateString()}</p></div><div><p className="text-slate-400">Auditor</p><p className="font-medium">{audit.auditor_name}</p></div><div><p className="text-slate-400">Checklist Items</p><p className="font-medium">{audit.checklist?.length || 0}</p></div><div><p className="text-slate-400">Follow-up</p><p className="font-medium">{audit.follow_up_required ? 'Required' : 'None'}</p></div></div></div></div></CardContent></Card>
        ))}
      </div>
      {showModal && <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"><Card className="w-full max-w-2xl"><CardContent className="p-6"><div className="flex items-center justify-between mb-6"><h3 className="text-xl font-semibold">Create Audit</h3><button onClick={() => setShowModal(false)}><X className="h-5 w-5" /></button></div><div className="space-y-4"><div><label className="block text-sm font-medium mb-1">Audit Type</label><select value={formData.audit_type} onChange={(e) => setFormData({ ...formData, audit_type: e.target.value })} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded"><option value="haccp">HACCP</option><option value="quality">Quality</option><option value="safety">Safety</option><option value="allergen">Allergen</option></select></div><div><label className="block text-sm font-medium mb-1">Audit Date</label><input type="date" value={formData.audit_date} onChange={(e) => setFormData({ ...formData, audit_date: e.target.value })} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded" /></div><div className="flex gap-2 pt-4"><button onClick={handleCreate} className="flex-1 px-4 py-2 bg-yellow-600 text-foreground rounded hover:bg-yellow-700">Create Audit</button><button onClick={() => setShowModal(false)} className="px-4 py-2 bg-slate-700 rounded hover:bg-slate-600">Cancel</button></div></div></CardContent></Card></div>}
    </PageContainer>
  );
}
