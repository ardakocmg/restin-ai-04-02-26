import { logger } from '@/lib/logger';
import { CheckCircle2,Plus } from 'lucide-react';
import { useEffect,useState } from 'react';
import DataTable from '../../components/shared/DataTable';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card,CardContent,CardDescription,CardHeader,CardTitle } from '../../components/ui/card';
import { useVenue } from '../../context/VenueContext';
import PageContainer from '../../layouts/PageContainer';
import api from '../../lib/api';

export default function ReceivingPage() {
  const { activeVenue } = useVenue();
  const [grns, setGrns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeVenue?.id) {
      loadGRNs();
    }
  }, [activeVenue?.id]);

  const loadGRNs = async () => {
    try {
      const res = await api.get(`/inventory/receiving/grns?venue_id=${activeVenue.id}`);
      setGrns(res.data || []);
    } catch (error) {
      logger.error('Failed to load GRNs:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer
      title="Goods Receiving"
      description="Record deliveries and update stock levels"
      actions={
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create GRN
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Goods Received Notes</CardTitle>
          <CardDescription>Track all deliveries and stock receipts</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { key: 'display_id', label: 'GRN #' },
              { key: 'supplier_name', label: 'Supplier' },
              { key: 'po_display_id', label: 'PO #' },
              {
                key: 'lines',
                label: 'Items',
                render: (row) => row.lines?.length || 0
              },
              {
                key: 'posted_at',
                label: 'Status',
                render: (row) => row.posted_at ? (
                  <Badge className="bg-green-100 text-green-700">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Posted
                  </Badge>
                ) : (
                  <Badge variant="outline">Draft</Badge>
                )
              },
              {
                key: 'created_at',
                label: 'Created',
                render: (row) => new Date(row.created_at).toLocaleDateString()
              }
            ]}
            data={grns}
            loading={loading}
            emptyMessage="No goods received notes"
          />
        </CardContent>
      </Card>
    </PageContainer>
  );
}
