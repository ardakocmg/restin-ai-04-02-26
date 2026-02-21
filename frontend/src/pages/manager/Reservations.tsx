import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVenue } from '../../context/VenueContext';
import api from '../../lib/api';
import { toast } from 'sonner';
import PageContainer from '../../layouts/PageContainer';
import DataTable from '../../components/shared/DataTable';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Plus, Calendar, ShieldAlert, Users } from 'lucide-react';
import ReservationModal from './ReservationModal';
import { logger } from '@/lib/logger';

const STATUS_COLORS = {
  confirmed: 'bg-blue-600/20 text-blue-400 border border-blue-500/30 font-black uppercase text-[10px]',
  seated: 'bg-green-600/20 text-green-400 border border-green-500/30 font-black uppercase text-[10px]',
  completed: 'bg-zinc-600/20 text-secondary-foreground border border-zinc-500/30 font-black uppercase text-[10px]',
  cancelled: 'bg-red-600/20 text-red-400 border border-red-500/30 font-black uppercase text-[10px]',
  no_show: 'bg-orange-600/20 text-orange-400 border border-orange-500/30 font-black uppercase text-[10px]'
};

export default function Reservations() {
  const { activeVenue } = useVenue();
  const navigate = useNavigate();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (activeVenue?.id) {
      loadReservations();
      loadAnalytics();
    }
  }, [activeVenue?.id]);

  const loadReservations = async () => {
    try {
      const response = await api.get(`/venues/${activeVenue.id}/reservations`);
      setReservations(response.data);
    } catch (error) {
      logger.error('Failed to load reservations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      const res = await api.get(`/reservations/analytics/summary?venue_id=${activeVenue.id}`);
      setAnalytics(res.data);
    } catch (e) { logger.error(e); }
  };

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/reservations/${id}/status`, { status });
      toast.success(`Reservation marked as ${status}`);
      loadReservations();
      loadAnalytics();
    } catch (e) {
      toast.error("Failed to update status");
    }
  };

  return (
    <PageContainer
      title="Reservations"
      description="Guest bookings and table management"
      actions={
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => navigate('/manager/reservations/timeline')}>
            <Calendar className="w-4 h-4 mr-2" />
            Timeline View
          </Button>
          <Button size="sm" onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Reservation
          </Button>
        </div>
      }
    >
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-background border-border shadow-xl border-b-2" style={{ borderBottomColor: '#2563eb'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>
          <CardContent className="p-4">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Total Bookings</p>
            <div className="flex items-end gap-2">
              <p className="text-2xl font-black text-foreground">{analytics?.total_reservations || 0}</p>
              {analytics?.growth_rate != null && <span className={`text-[10px] font-bold mb-1 ${analytics.growth_rate >= 0 ? 'text-green-500' : 'text-red-500'}`}>{analytics.growth_rate >= 0 ? '+' : ''}{analytics.growth_rate}%</span>}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-background border-border shadow-xl border-b-2" style={{ borderBottomColor: '#ef4444'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>
          <CardContent className="p-4">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">No-Show Rate</p>
            <p className="text-2xl font-black text-red-500">{analytics?.no_show_rate || 0}%</p>
          </CardContent>
        </Card>
        <Card className="bg-background border-border shadow-xl border-b-2" style={{ borderBottomColor: '#3b82f6'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>
          <CardContent className="p-4">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Top Channel</p>
            <p className="text-sm font-black text-blue-600 dark:text-blue-400 uppercase mt-1 truncate">
              {Object.keys(analytics?.channel_distribution || {})[0] || 'N/A'}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-background border-border shadow-xl border-b-2" style={{ borderBottomColor: '#10b981'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>
          <CardContent className="p-4">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Conversion</p>
            <p className="text-2xl font-black text-green-500">{analytics?.conversion_rate != null ? `${analytics.conversion_rate}%` : '0%'}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-background border-border shadow-2xl">
        <CardContent className="p-0">
          <DataTable
            columns={[
              {
                key: 'guest_name',
                label: 'Guest',
                render: (row) => <span className="text-sm font-black text-foreground uppercase tracking-tight">{row.guest_name}</span>
              },
              {
                key: 'date',
                label: 'Date',
                render: (row) => <span className="text-sm font-bold text-secondary-foreground">{row.date}</span>
              },
              {
                key: 'time',
                label: 'Time',
                render: (row) => (
                  <div className="flex items-center gap-2 px-2 py-1 bg-card border border-border rounded-md w-fit">
                    <Calendar className="w-3 h-3 text-red-500" />
                    <span className="text-xs font-black text-foreground">{row.time}</span>
                  </div>
                )
              },
              { key: 'party_size', label: 'Guests', render: (row) => <span className="text-xs font-bold text-muted-foreground">{row.party_size || row.guest_count} pax</span> },
              {
                key: 'status',
                label: 'Status',
                render: (row) => (
                  <Badge className={STATUS_COLORS[row.status] || 'bg-gray-600/20 text-gray-300'}>
                    {row.status}
                  </Badge>
                )
              },
              { key: 'source', label: 'Source', render: (row) => <span className="text-[10px] font-bold text-muted-foreground uppercase">{row.source || row.channel}</span> },
              {
                key: 'actions',
                label: '',
                render: (row) => (
                  <div className="flex gap-1">
                    {row.status === 'confirmed' && (
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 text-green-600 dark:text-green-400 hover:bg-green-500/10"
                        onClick={() => updateStatus(row.id, 'seated')}
                      >
                        <Users className="h-3 w-3" />
                      </Button>
                    )}
                    {row.status === 'seated' && (
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
                        onClick={() => updateStatus(row.id, 'completed')}
                      >
                        <Calendar className="h-3 w-3" />
                      </Button>
                    )}
                    {['pending', 'confirmed'].includes(row.status) && (
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 text-red-600 dark:text-red-400 hover:bg-red-500/10"
                        onClick={() => updateStatus(row.id, 'no_show')}
                      >
                        <ShieldAlert className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                )
              }
            ]}
            data={reservations}
            loading={loading}
            emptyMessage="No reservations"
          />
        </CardContent>
      </Card>

      <ReservationModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        venueId={activeVenue?.id}
        onCreated={() => {
          loadReservations();
          loadAnalytics();
        }}
      />
    </PageContainer>
  );
}
