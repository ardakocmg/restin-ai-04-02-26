import { useState, useEffect } from 'react';
import { useVenue } from '../../context/VenueContext';
import api from '../../lib/api';
import { toast } from 'sonner';
import PageContainer from '../../layouts/PageContainer';
import DataTable from '../../components/shared/DataTable';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Plus, Users } from 'lucide-react';

export default function StaffManagement() {
  const { activeVenue } = useVenue();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeVenue?.id) {
      loadStaff();
    }
  }, [activeVenue?.id]);

  const loadStaff = async () => {
    try {
      const response = await api.get(`/venues/${activeVenue.id}/users`);
      setStaff(response.data);
    } catch (error) {
      console.error('Failed to load staff:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer
      title="Staff Management"
      description="Manage staff schedules and assignments"
      actions={
        <Button size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Staff
        </Button>
      }
    >
      <Card className="bg-zinc-950 border-white/5 shadow-2xl">
        <CardContent className="p-0">
          <DataTable
            columns={[
              {
                key: 'name',
                label: 'Name',
                render: (row) => <span className="text-sm font-black text-white uppercase tracking-tight">{row.name}</span>
              },
              {
                key: 'role',
                label: 'Role',
                render: (row) => (
                  <Badge className="bg-red-600/20 text-red-400 border border-red-500/30 font-black uppercase text-[10px]">
                    {row.role?.replace('_', ' ')}
                  </Badge>
                )
              },
              { key: 'email', label: 'Email', render: (row) => <span className="text-xs font-bold text-zinc-400">{row.email || '-'}</span> },
              {
                key: 'last_login',
                label: 'Last Login',
                render: (row) => (
                  <span className="text-[10px] font-bold text-zinc-500">
                    {row.last_login ? new Date(row.last_login).toLocaleDateString() : 'NEVER'}
                  </span>
                )
              }
            ]}
            data={staff}
            loading={loading}
            emptyMessage="No staff members found"
          />
        </CardContent>
      </Card>
    </PageContainer>
  );
}
