import { useState, useEffect } from 'react';
import { useVenue } from '../../context/VenueContext';
import api from '../../lib/api';
import { toast } from 'sonner';
import PageContainer from '../../layouts/PageContainer';
import DataTable from '../../components/shared/DataTable';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { RefreshCw } from 'lucide-react';

export default function AuditLogs() {
  const { activeVenue } = useVenue();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeVenue?.id) {
      loadLogs();
    }
  }, [activeVenue?.id]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/venues/${activeVenue.id}/audit-logs`);
      setLogs(response.data);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer
      title="Audit Logs"
      description="System activity and change tracking"
      actions={
        <Button onClick={loadLogs} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      }
    >
      <Card className="bg-zinc-950 border-white/5 shadow-2xl overflow-hidden">
        <CardContent className="p-0">
          <DataTable
            columns={[
              {
                key: 'created_at',
                label: 'Time',
                render: (row) => (
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-zinc-100">{new Date(row.created_at).toLocaleDateString()}</span>
                    <span className="text-[10px] font-medium text-zinc-500">{new Date(row.created_at).toLocaleTimeString()}</span>
                  </div>
                )
              },
              {
                key: 'user_name',
                label: 'User',
                render: (row) => <span className="text-sm font-black text-white uppercase tracking-tight">{row.user_name}</span>
              },
              {
                key: 'action',
                label: 'Action',
                render: (row) => (
                  <Badge variant="outline" className="border-red-500/30 bg-red-500/10 text-red-400 font-bold uppercase text-[10px]">
                    {row.action}
                  </Badge>
                )
              },
              { key: 'resource_type', label: 'Resource', render: (row) => <span className="text-sm font-bold text-zinc-400">{row.resource_type}</span> },
              { key: 'resource_id', label: 'ID', render: (row) => <span className="text-[10px] font-mono text-zinc-600">{row.resource_id?.slice(0, 8)}</span> }
            ]}
            data={logs}
            loading={loading}
            emptyMessage="No audit logs"
          />
        </CardContent>
      </Card>
    </PageContainer>
  );
}
