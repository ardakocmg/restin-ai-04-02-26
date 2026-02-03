import { useState } from 'react';
import PageContainer from '../../../layouts/PageContainer';
import { Card, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import api from '../../../lib/api';

export default function VarianceAnalysis() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchVariances = async () => {
    setLoading(true);
    try {
      const venueId = localStorage.getItem('currentVenueId');
      const response = await api.get(`/venues/${venueId}/invoices/ai`, { params: { status: 'variance_detected' } });
      setInvoices(response.data || []);
    } catch (error) {
      console.error('Failed to fetch variances:', error);
    } finally {
      setLoading(false);
    }
  };

  useState(() => {
    fetchVariances();
  }, []);

  return (
    <PageContainer title="Variance Analysis" description="Detect and analyze PO vs Invoice variances">
      <div className="space-y-4">
        {loading ? <Card><CardContent className="p-8 text-center">Loading...</CardContent></Card> : invoices.length === 0 ? <Card><CardContent className="p-8 text-center text-slate-400">No variances detected</CardContent></Card> : invoices.map((invoice) => (
          <Card key={invoice.id} className="border-yellow-500/30 bg-yellow-950/10"><CardContent className="p-6"><div className="flex items-start gap-4"><AlertTriangle className="h-6 w-6 text-yellow-400" /><div className="flex-1"><div className="flex items-center gap-3 mb-2"><h3 className="text-lg font-semibold text-slate-50">{invoice.invoice_number}</h3><Badge className="bg-yellow-600/20 text-yellow-100">{invoice.variances?.length || 0} variances</Badge></div><p className="text-sm text-slate-400 mb-3">{invoice.supplier_name}</p><div className="space-y-2">{invoice.variances?.map((v, i) => (<div key={i} className="p-3 bg-slate-800 rounded"><div className="flex justify-between items-start"><div><p className="font-medium text-yellow-400">{v.type}</p><p className="text-sm text-slate-300">{v.item_description}</p></div><p className="font-bold text-red-400">${Math.abs(v.variance_amount).toFixed(2)}</p></div>{v.variance_percentage && <p className="text-xs text-slate-400 mt-1">{v.variance_percentage.toFixed(1)}% variance</p>}</div>))}</div></div></div></CardContent></Card>
        ))}
      </div>
    </PageContainer>
  );
}
