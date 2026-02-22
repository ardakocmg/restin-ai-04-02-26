import { logger } from '@/lib/logger';
import { Loader2, Plus, UserPlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import DataTable from '../../components/shared/DataTable';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Skeleton } from '../../components/ui/skeleton';
import { useVenue } from '../../context/VenueContext';
import PageContainer from '../../layouts/PageContainer';
import api from '../../lib/api';

export default function Guests() {
  const { activeVenue } = useVenue();
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newGuest, setNewGuest] = useState({ name: '', email: '', phone: '', preferences: '' });

  useEffect(() => {
    if (activeVenue?.id) {
      loadGuests();
    }
  }, [activeVenue?.id]);

  const loadGuests = async () => {
    try {
      const response = await api.get(`/venues/${activeVenue.id}/guests`);
      setGuests(response.data);
    } catch (error) {
      logger.error('Failed to load guests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGuest = async () => {
    if (!newGuest.name) {
      toast.error('Name required');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/guests', {
        venue_id: activeVenue.id,
        ...newGuest
      });
      toast.success('Guest created');
      setShowCreateDialog(false);
      setNewGuest({ name: '', email: '', phone: '', preferences: '' });
      loadGuests();
    } catch (error) {
      toast.error('Failed to create guest');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFormKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !submitting) {
      e.preventDefault();
      handleCreateGuest();
    }
  };

  return (
    <PageContainer
      title="Guests"
      description="Guest directory and preferences"
      actions={
        <Button onClick={() => setShowCreateDialog(true)} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Guest
        </Button>
      }
    >
      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={[
              { key: 'name', label: 'Name' },
              { key: 'email', label: 'Email', render: (row) => row.email || '-' },
              { key: 'phone', label: 'Phone', render: (row) => row.phone || '-' },
              { key: 'visit_count', label: 'Visits' },
              {
                key: 'total_spend',
                label: 'Total Spend',
                render: (row) => `€${row.total_spend?.toFixed(2) || '0.00'}`
              }
            ]}
            data={guests}
            loading={loading}
            emptyMessage="No guests found"
          />
        </CardContent>
      </Card>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Guest</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4" onKeyDown={handleFormKeyDown} role="form">
            <div>
              <Label>Name *</Label>
              <Input aria-label="Input field"
                value={newGuest.name}
                onChange={(e) => setNewGuest({ ...newGuest, name: e.target.value })}
                placeholder="Guest name"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input aria-label="Input field"
                type="email"
                value={newGuest.email}
                onChange={(e) => setNewGuest({ ...newGuest, email: e.target.value })}
                placeholder="guest@example.com"
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input aria-label="Input field"
                value={newGuest.phone}
                onChange={(e) => setNewGuest({ ...newGuest, phone: e.target.value })}
                placeholder="+356..."
              />
            </div>
            <div>
              <Label>Preferences</Label>
              <Input aria-label="Input field"
                value={newGuest.preferences}
                onChange={(e) => setNewGuest({ ...newGuest, preferences: e.target.value })}
                placeholder="Window seat, no salt..."
              />
            </div>
            <Button onClick={handleCreateGuest} className="w-full focus-visible:ring-2 focus-visible:ring-ring" disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
              {submitting ? 'Creating...' : 'Create Guest'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
