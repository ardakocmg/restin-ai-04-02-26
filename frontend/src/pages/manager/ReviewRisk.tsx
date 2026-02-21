import { useState, useEffect } from 'react';
import { useVenue } from '../../context/VenueContext';
import api from '../../lib/api';
import PageContainer from '../../layouts/PageContainer';
import DataTable from '../../components/shared/DataTable';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { AlertTriangle, TrendingUp } from 'lucide-react';
import { logger } from '@/lib/logger';

const RISK_COLORS = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-red-100 text-red-700'
};

export default function ReviewRisk() {
  const { activeVenue } = useVenue();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeVenue?.id) {
      loadRiskyOrders();
    }
  }, [activeVenue?.id]);

  const loadRiskyOrders = async () => {
    try {
      const response = await api.get(`/venues/${activeVenue.id}/orders?risk=high`);
      setOrders(response.data || []);
    } catch (error) {
      logger.error('Failed to load risky orders:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer
      title="Review Risk"
      description="Monitor high-risk orders requiring attention"
    >
      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={[
              { key: 'display_id', label: 'Order #', render: (row) => row.display_id || row.id?.slice(0, 8) },
              { key: 'table_name', label: 'Table' },
              { 
                key: 'risk_score', 
                label: 'Risk Score',
                render: (row) => {
                  const level = row.risk_score > 60 ? 'high' : row.risk_score > 30 ? 'medium' : 'low';
                  return (
                    <div className="flex items-center gap-2">
                      <Badge className={RISK_COLORS[level]}>
                        {row.risk_score}/100
                      </Badge>
                    </div>
                  );
                }
              },
              { 
                key: 'risk_factors',
                label: 'Factors',
                render: (row) => (
                  <div className="flex flex-wrap gap-1">
                    {row.risk_factors?.slice(0, 2).map((factor, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {factor}
                      </Badge>
                    ))}
                  </div>
                )
              }
            ]}
            data={orders}
            loading={loading}
            emptyMessage="No high-risk orders"
          />
        </CardContent>
      </Card>
    </PageContainer>
  );
}
