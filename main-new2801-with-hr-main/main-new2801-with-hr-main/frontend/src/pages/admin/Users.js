import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVenue } from '../../context/VenueContext';
import api from '../../lib/api';
import { toast } from 'sonner';
import PageContainer from '../../layouts/PageContainer';
import DataTable from '../../components/shared/DataTable';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Plus, Shield, Key, Users as UsersIcon, Search, Settings } from 'lucide-react';

const ROLES = [
  'owner', 'general_manager', 'manager', 'supervisor',
  'waiter', 'runner', 'bartender', 'kitchen', 'finance', 'it_admin', 'staff', 'host'
];

export default function Users() {
  const navigate = useNavigate();
  const { activeVenueId } = useVenue();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', role: 'staff', pin: '' });
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (activeVenueId) {
      loadUsers();
    }
  }, [activeVenueId]);

  const loadUsers = async () => {
    try {
      const response = await api.get(`/venues/${activeVenueId}/users`);
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.name || !newUser.pin || newUser.pin.length !== 4) {
      toast.error('Name and 4-digit PIN required');
      return;
    }

    try {
      await api.post('/users', {
        venue_id: activeVenueId,
        ...newUser
      });
      toast.success('User created');
      setShowCreateDialog(false);
      setNewUser({ name: '', role: 'staff', pin: '' });
      loadUsers();
    } catch (error) {
      toast.error('Failed to create user');
    }
  };

  const [showArchived, setShowArchived] = useState(false);

  // ... (inside loadUsers)
  // const response = await api.get(`/venues/${activeVenueId}/users?archived=${showArchived}`);
  // keeping simple filtered locally for now if API returns all, or assuming API update later.
  // actually let's just filter locally if API returns 'status'

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.role?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesArchived = showArchived ? true : (user.status !== 'archived' && !user.is_archived);

    return matchesSearch && matchesArchived;
  });

  return (
    <PageContainer
      title="Users"
      description="Manage platform and access control"
      actions={
        <div className="flex gap-2 items-center">
          <label className="flex items-center gap-2 text-sm text-zinc-400 mr-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="rounded border-zinc-700 bg-zinc-900"
            />
            Show Archived
          </label>
          <Button onClick={() => navigate('/admin/access-control')} size="sm" variant="outline">
            <Shield className="w-4 h-4 mr-2" />
            Access Control
          </Button>
          <Button onClick={() => setShowCreateDialog(true)} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        </div>
      }
    >
      <Card>
        <CardContent className="pt-6">
          {/* Search Bar */}
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Search users by name, email, or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <DataTable
            columns={[
              { key: 'name', label: 'Name' },
              {
                key: 'role',
                label: 'Role',
                render: (row) => (
                  <Badge variant="secondary" className="capitalize">
                    {row.role?.replace('_', ' ')}
                  </Badge>
                )
              },
              {
                key: 'email',
                label: 'Email',
                render: (row) => row.email || '-'
              },
              {
                key: 'last_login',
                label: 'Last Login',
                render: (row) => (
                  <span className="text-xs text-zinc-500">
                    {row.last_login ? new Date(row.last_login).toLocaleDateString() : 'NEVER'}
                  </span>
                )
              },
              {
                key: 'status',
                label: 'Status',
                render: (row) => (
                  <Badge variant={row.status === 'archived' || row.is_archived ? 'destructive' : 'outline'}>
                    {row.status === 'archived' || row.is_archived ? 'Archived' : 'Active'}
                  </Badge>
                )
              },
              {
                key: 'actions',
                label: 'Actions',
                render: (row) => (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={() => navigate(`/admin/users/${row.id}/access`)}
                  >
                    <Settings className="h-4 w-4 text-zinc-400 hover:text-white" />
                  </Button>
                )
              }
            ]}
            data={filteredUsers}
            loading={loading}
            emptyMessage={searchQuery ? "No users match your search" : "No users found"}
          />
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Name</Label>
              <Input
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={newUser.role} onValueChange={(value) => setNewUser({ ...newUser, role: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map(role => (
                    <SelectItem key={role} value={role} className="capitalize">
                      {role.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>4-Digit PIN</Label>
              <Input
                type="password"
                maxLength={4}
                value={newUser.pin}
                onChange={(e) => setNewUser({ ...newUser, pin: e.target.value })}
                placeholder="••••"
              />
            </div>
            <Button onClick={handleCreateUser} className="w-full">
              Create User
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
