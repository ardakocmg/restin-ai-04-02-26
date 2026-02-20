import { useState, useEffect } from 'react';
import { useVenue } from '../../context/VenueContext';
import api from '../../lib/api';
import { toast } from 'sonner';
import PageContainer from '../../layouts/PageContainer';
import DataTable from '../../components/shared/DataTable';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Badge } from '../../components/ui/badge';
import { Plus, UserPlus } from 'lucide-react';

export default function Guests() {
  const { activeVenue } = useVenue();
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
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
    } catch (error: any) {
      console.error('Failed to load guests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGuest = async () => {
    if (!newGuest.name) {
      toast.error('Name required');
      return;
    }

    try {
      await api.post('/guests', {
        venue_id: activeVenue.id,
        ...newGuest
      });
      toast.success('Guest created');
      setShowCreateDialog(false);
      setNewGuest({ name: '', email: '', phone: '', preferences: '' });
      loadGuests();
    } catch (error: any) {
      toast.error('Failed to create guest');
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
          <div className="space-y-4 py-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={newGuest.name}
                onChange={(e) => setNewGuest({...newGuest, name: e.target.value})}
                placeholder="Guest name"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={newGuest.email}
                onChange={(e) => setNewGuest({...newGuest, email: e.target.value})}
                placeholder="guest@example.com"
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={newGuest.phone}
                onChange={(e) => setNewGuest({...newGuest, phone: e.target.value})}
                placeholder="+356..."
              />
            </div>
            <div>
              <Label>Preferences</Label>
              <Input
                value={newGuest.preferences}
                onChange={(e) => setNewGuest({...newGuest, preferences: e.target.value})}
                placeholder="Window seat, no salt..."
              />
            </div>
            <Button onClick={handleCreateGuest} className="w-full">
              <UserPlus className="w-4 h-4 mr-2" />
              Create Guest
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
