import { useState, useEffect } from 'react';
import { useVenue } from '../../context/VenueContext';
import api from '../../lib/api';
import { toast } from 'sonner';
import PageContainer from '../../layouts/PageContainer';
import DataTable from '../../components/shared/DataTable';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Upload, FileText } from 'lucide-react';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-700',
  processing: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700'
};

export default function Documents() {
  const { activeVenue } = useVenue();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeVenue?.id) {
      loadDocuments();
    }
  }, [activeVenue?.id]);

  const loadDocuments = async () => {
    try {
      const response = await api.get(`/venues/${activeVenue.id}/documents`);
      setDocuments(response.data);
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer
      title="Documents"
      description="Document management with OCR"
      actions={
        <Button size="sm">
          <Upload className="w-4 h-4 mr-2" />
          Upload
        </Button>
      }
    >
      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={[
              { key: 'filename', label: 'Filename' },
              { key: 'file_type', label: 'Type' },
              { 
                key: 'status', 
                label: 'Status',
                render: (row) => (
                  <Badge className={STATUS_COLORS[row.status] || 'bg-gray-100 text-gray-700'}>
                    {row.status}
                  </Badge>
                )
              },
              { 
                key: 'created_at',
                label: 'Uploaded',
                render: (row) => new Date(row.created_at).toLocaleDateString()
              }
            ]}
            data={documents}
            loading={loading}
            emptyMessage="No documents"
          />
        </CardContent>
      </Card>
    </PageContainer>
  );
}
