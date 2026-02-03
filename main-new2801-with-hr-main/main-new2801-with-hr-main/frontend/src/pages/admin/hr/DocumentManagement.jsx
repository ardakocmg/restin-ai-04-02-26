import { useState, useEffect } from 'react';
import PageContainer from '@/layouts/PageContainer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, AlertTriangle } from 'lucide-react';
import api from '@/lib/api';

export default function DocumentManagementIndigo() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const venueId = localStorage.getItem('currentVenueId');
      const response = await api.get(`/venues/${venueId}/hr/documents`);
      setDocuments(response.data || []);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = { valid: 'bg-green-600/20 text-green-100', expiring_soon: 'bg-yellow-600/20 text-yellow-100', expired: 'bg-red-600/20 text-red-100' };
    return colors[status] || 'bg-gray-600/20 text-gray-100';
  };

  return (
    <PageContainer title="Document Management" description="Employee documents & certificates">
      <div className="space-y-4">
        {loading ? <Card><CardContent className="p-8 text-center">Loading...</CardContent></Card> : documents.length === 0 ? <Card><CardContent className="p-8 text-center text-slate-400">No documents</CardContent></Card> : documents.map((doc) => (
          <Card key={doc.id} className="border-slate-700"><CardContent className="p-6"><div className="flex items-start justify-between"><div className="flex-1"><div className="flex items-center gap-3 mb-2">{doc.status === 'expired' || doc.status === 'expiring_soon' ? <AlertTriangle className="h-5 w-5 text-yellow-400" /> : <FileText className="h-5 w-5 text-blue-400" />}<h3 className="text-lg font-semibold text-slate-50">{doc.document_name}</h3><Badge className={getStatusColor(doc.status)}>{doc.status}</Badge></div><div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm"><div><p className="text-slate-400">Type</p><p className="font-medium">{doc.document_type}</p></div><div><p className="text-slate-400">Expiry</p><p className="font-medium">{doc.expiry_date ? new Date(doc.expiry_date).toLocaleDateString() : 'N/A'}</p></div><div><p className="text-slate-400">Verified</p><p className="font-medium">{doc.verified ? 'Yes' : 'No'}</p></div></div></div></div></CardContent></Card>
        ))}
      </div>
    </PageContainer>
  );
}
