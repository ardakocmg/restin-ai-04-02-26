import { useState, useEffect } from 'react';
import { useVenue } from '../../context/VenueContext';
import api from '../../lib/api';
import { toast } from 'sonner';
import PageContainer from '../../layouts/PageContainer';
import DataTable from '../../components/shared/DataTable';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Plus, Monitor } from 'lucide-react';
import { logger } from '@/lib/logger';

const TYPE_COLORS = {
  pos: 'bg-orange-100 text-orange-700',
  kds: 'bg-red-100 text-red-700',
  printer: 'bg-blue-100 text-blue-700',
  scanner: 'bg-purple-100 text-purple-700'
};

const STATUS_COLORS = {
  online: 'bg-green-100 text-green-700',
  offline: 'bg-gray-100 text-gray-700'
};

export default function DeviceHub() {
  const { activeVenue } = useVenue();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeVenue?.id) {
      loadDevices();
    }
  }, [activeVenue?.id]);

  const loadDevices = async () => {
    try {
      const response = await api.get(`/venues/${activeVenue.id}/devices`);
      setDevices(response.data);
    } catch (error) {
      logger.error('Failed to load devices:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer
      title="Device Hub"
      description="Manage POS, KDS, and printer devices"
      actions={
        <Button size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Device
        </Button>
      }
    >
      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={[
              { key: 'name', label: 'Device Name' },
              { 
                key: 'device_type', 
                label: 'Type',
                render: (row) => (
                  <Badge className={TYPE_COLORS[row.device_type] || 'bg-gray-100 text-gray-700'}>
                    {row.device_type?.toUpperCase()}
                  </Badge>
                )
              },
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
                key: 'last_seen_at',
                label: 'Last Seen',
                render: (row) => row.last_seen_at ? new Date(row.last_seen_at).toLocaleString() : 'Never'
              }
            ]}
            data={devices}
            loading={loading}
            emptyMessage="No devices registered"
          />
        </CardContent>
      </Card>
    </PageContainer>
  );
}
