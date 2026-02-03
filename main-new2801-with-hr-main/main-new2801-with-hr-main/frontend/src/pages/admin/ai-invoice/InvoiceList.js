import { useState, useEffect } from 'react';
import PageContainer from '../../../layouts/PageContainer';
import { Card, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import api from '../../../lib/api';

export default function InvoiceList() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchInvoices();
  }, [filter]);

  const fetchInvoices = async () => {
    try {
      const venueId = localStorage.getItem('currentVenueId');
      const status = filter !== 'all' ? filter : undefined;
      const response = await api.get(`/venues/${venueId}/invoices/ai`, { params: { status } });
      setInvoices(response.data || []);
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    if (status === 'matched') return <CheckCircle className="h-5 w-5 text-green-400" />;
    if (status === 'variance_detected') return <AlertTriangle className="h-5 w-5 text-yellow-400" />;
    if (status === 'rejected') return <XCircle className="h-5 w-5 text-red-400" />;
    return null;
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-gray-600/20 text-gray-100',
      ocr_processing: 'bg-blue-600/20 text-blue-100',
      ocr_complete: 'bg-blue-600/20 text-blue-100',
      matched: 'bg-green-600/20 text-green-100',
      variance_detected: 'bg-yellow-600/20 text-yellow-100',
      approved: 'bg-green-600/20 text-green-100',
      rejected: 'bg-red-600/20 text-red-100'
    };
    return colors[status] || 'bg-gray-600/20 text-gray-100';
  };

  return (
    <PageContainer title="Invoice List" description="All processed invoices">
      <div className="space-y-6">
        <div className="flex gap-2">
          <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded ${filter === 'all' ? 'bg-blue-600' : 'bg-slate-700'}`}>All</button>
          <button onClick={() => setFilter('matched')} className={`px-4 py-2 rounded ${filter === 'matched' ? 'bg-blue-600' : 'bg-slate-700'}`}>Matched</button>
          <button onClick={() => setFilter('variance_detected')} className={`px-4 py-2 rounded ${filter === 'variance_detected' ? 'bg-blue-600' : 'bg-slate-700'}`}>Variances</button>
          <button onClick={() => setFilter('approved')} className={`px-4 py-2 rounded ${filter === 'approved' ? 'bg-blue-600' : 'bg-slate-700'}`}>Approved</button>
        </div>

        <div className="space-y-4">
          {loading ? (
            <Card><CardContent className="p-8 text-center">Loading...</CardContent></Card>
          ) : invoices.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-slate-400">No invoices found</CardContent></Card>
          ) : (
            invoices.map((invoice) => (
              <Card key={invoice.id} className="border-slate-700">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getStatusIcon(invoice.status)}
                        <h3 className="text-lg font-semibold text-slate-50">{invoice.invoice_number}</h3>
                        <Badge className={getStatusColor(invoice.status)}>{invoice.status}</Badge>
                      </div>
                      <p className="text-sm text-slate-400 mb-3">{invoice.supplier_name}</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-slate-400">Total Amount</p>
                          <p className="font-medium text-green-400">${invoice.total_amount}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Invoice Date</p>
                          <p className="font-medium">{new Date(invoice.invoice_date).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Line Items</p>
                          <p className="font-medium">{invoice.line_items?.length || 0}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Variances</p>
                          <p className="font-medium text-yellow-400">{invoice.variances?.length || 0}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </PageContainer>
  );
}
