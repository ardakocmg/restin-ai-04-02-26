import { useState, useEffect } from 'react';
import { useVenue } from '../../context/VenueContext';
import api from '../../lib/api';
import PageContainer from '../../layouts/PageContainer';
import DataTable from '../../components/shared/DataTable';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Plus, Printer, Monitor } from 'lucide-react';

const TYPE_COLORS = {
  pos: 'bg-orange-100 text-orange-700',
  kds: 'bg-red-100 text-red-700',
  printer: 'bg-blue-100 text-blue-700'
};

export default function DeviceMapping() {
  const { activeVenue } = useVenue();
  const [mappings, setMappings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeVenue?.id) {
      loadMappings();
    }
  }, [activeVenue?.id]);

  const loadMappings = async () => {
    try {
      const response = await api.get(`/venues/${activeVenue.id}/device-mappings`);
      setMappings(response.data || []);
    } catch (error: any) {
      console.error('Failed to load mappings:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer
      title="Device Mapping"
      description="Configure device assignments and printer zones"
      actions={
        <Button size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Mapping
        </Button>
      }
    >
      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={[
              { key: 'device_name', label: 'Device' },
              { 
                key: 'device_type', 
                label: 'Type',
                render: (row) => (
                  <Badge className={TYPE_COLORS[row.device_type] || 'bg-gray-100 text-gray-700'}>
                    {row.device_type}
                  </Badge>
                )
              },
              { key: 'zone_name', label: 'Zone' },
              { key: 'prep_area', label: 'Prep Area' }
            ]}
            data={mappings}
            loading={loading}
            emptyMessage="No device mappings"
          />
        </CardContent>
      </Card>
    </PageContainer>
  );
}
