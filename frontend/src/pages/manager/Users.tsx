/**
 * User Accounts — Full Admin Management Hub
 * Connected to /venues/{id}/users + /venues/{id}/admin/users/* APIs
 * Links to: Roles (/manager/access-control), Employee Directory (/manager/hr/people)
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { useNavigate } from 'react-router-dom';
import { useVenue } from '../../context/VenueContext';
import api from '../../lib/api';
import { toast } from 'sonner';
import DataTable from '../../components/shared/DataTable';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '../../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../../components/ui/select';
import {
  Plus, Shield, Key, Users as UsersIcon, Search, Settings,
  Archive, RotateCcw, Link2, Unlink, Eye, Loader2, Lock, EyeOff,
  UserCheck, AlertCircle, CheckCircle2, XCircle, Clock
} from 'lucide-react';

const ROLES = [
  'owner', 'general_manager', 'manager', 'supervisor',
  'waiter', 'runner', 'bartender', 'kitchen', 'chef',
  'finance', 'it_admin', 'staff', 'host', 'barista',
];

const STATUS_CONFIG = {
  active: { color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: CheckCircle2 },
  archived: { color: 'bg-zinc-500/20 text-muted-foreground border-zinc-500/30', icon: Archive },
  suspended: { color: 'bg-rose-500/20 text-rose-400 border-rose-500/30', icon: XCircle },
};

export default function Users() {
  const navigate = useNavigate();
  const { activeVenueId } = useVenue();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('active');

  // Create user dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', role: 'staff', pin: '', email: '' });

  // Link employee dialog
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkingUserId, setLinkingUserId] = useState(null);
  const [linkableEmployees, setLinkableEmployees] = useState([]);
  const [linkSearch, setLinkSearch] = useState('');
  const [loadingLinkable, setLoadingLinkable] = useState(false);

  // Set password dialog
  const [showPwDialog, setShowPwDialog] = useState(false);
  const [pwTargetUser, setPwTargetUser] = useState(null);
  const [pwValue, setPwValue] = useState('');
  const [pwConfirmValue, setPwConfirmValue] = useState('');
  const [pwShowValue, setPwShowValue] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  // ─── Load Users ─────────────────────────────────────────────────────────
  const loadUsers = useCallback(async () => {
    if (!activeVenueId) return;
    setLoading(true);
    try {
      const response = await api.get(`/venues/${activeVenueId}/users`);
      setUsers(response.data || []);
    } catch (error) {
      logger.error('Failed to load users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [activeVenueId]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  // ─── Create User ───────────────────────────────────────────────────────
  const handleCreateUser = async () => {
    if (!newUser.name || !newUser.pin || newUser.pin.length !== 4) {
      toast.error('Name and 4-digit PIN required');
      return;
    }
    setCreating(true);
    try {
      await api.post('/users', { venue_id: activeVenueId, ...newUser });
      toast.success('User created');
      setShowCreateDialog(false);
      setNewUser({ name: '', role: 'staff', pin: '', email: '' });
      loadUsers();
    } catch (error) {
      logger.error('Failed to create user:', error);
      toast.error('Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  // ─── Archive / Restore ─────────────────────────────────────────────────
  const handleArchiveToggle = async (userId, isCurrentlyArchived) => {
    try {
      await api.post(`/venues/${activeVenueId}/admin/users/${userId}/archive`, {
        restore: isCurrentlyArchived
      });
      toast.success(isCurrentlyArchived ? 'User restored' : 'User archived');
      loadUsers();
    } catch (error) {
      logger.error('Archive toggle failed:', error);
      toast.error('Action failed');
    }
  };

  // ─── Reset PIN ─────────────────────────────────────────────────────────
  const handleResetPin = async (userId, userName) => {
    try {
      const res = await api.post(`/venues/${activeVenueId}/admin/users/${userId}/reset-pin`);
      toast.success(`PIN reset for ${userName}. New PIN: ${res.data.new_pin}`);
    } catch (error) {
      logger.error('PIN reset failed:', error);
      toast.error('Failed to reset PIN');
    }
  };

  // ─── Admin Set Password ────────────────────────────────────────────────
  const openSetPasswordDialog = (user) => {
    setPwTargetUser(user);
    setPwValue('');
    setPwConfirmValue('');
    setPwShowValue(false);
    setShowPwDialog(true);
  };

  const handleAdminSetPassword = async () => {
    if (!pwValue || pwValue.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    if (pwValue !== pwConfirmValue) { toast.error('Passwords do not match'); return; }
    setPwSaving(true);
    try {
      await api.post('/auth/admin/set-password', { user_id: pwTargetUser.id, new_password: pwValue });
      toast.success(`Password set for ${pwTargetUser.name}`);
      setShowPwDialog(false);
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to set password');
    } finally {
      setPwSaving(false);
    }
  };

  // ─── Link Employee ─────────────────────────────────────────────────────
  const openLinkDialog = async (userId) => {
    setLinkingUserId(userId);
    setShowLinkDialog(true);
    setLoadingLinkable(true);
    try {
      const res = await api.get(`/venues/${activeVenueId}/admin/linkable-employees`);
      setLinkableEmployees(res.data || []);
    } catch {
      setLinkableEmployees([]);
    } finally {
      setLoadingLinkable(false);
    }
  };

  const handleLinkEmployee = async (employeeId) => {
    try {
      await api.post(`/venues/${activeVenueId}/admin/users/${linkingUserId}/link-employee`, {
        employee_id: employeeId
      });
      toast.success('User linked to employee record');
      setShowLinkDialog(false);
      loadUsers();
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to link employee');
    }
  };

  const handleUnlinkEmployee = async (userId) => {
    try {
      await api.post(`/venues/${activeVenueId}/admin/users/${userId}/unlink-employee`);
      toast.success('Employee link removed');
      loadUsers();
    } catch {
      toast.error('Failed to unlink');
    }
  };

  // ─── Filtered Data ─────────────────────────────────────────────────────
  const filteredUsers = useMemo(() => {
    let list = users;

    // Tab filter
    if (activeTab === 'active') {
      list = list.filter(u => u.status !== 'archived' && !u.is_archived && u.status !== 'suspended');
    } else if (activeTab === 'archived') {
      list = list.filter(u => u.status === 'archived' || u.is_archived);
    } else if (activeTab === 'suspended') {
      list = list.filter(u => u.status === 'suspended');
    }

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(u =>
        (u.name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.role || '').toLowerCase().includes(q) ||
        (u.employee_id || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [users, activeTab, searchQuery]);

  const statusCounts = useMemo(() => ({
    all: users.length,
    active: users.filter(u => u.status !== 'archived' && !u.is_archived && u.status !== 'suspended').length,
    archived: users.filter(u => u.status === 'archived' || u.is_archived).length,
    suspended: users.filter(u => u.status === 'suspended').length,
  }), [users]);

  // ─── Linkable search filter ────────────────────────────────────────────
  const filteredLinkable = useMemo(() => {
    if (!linkSearch) return linkableEmployees;
    const q = linkSearch.toLowerCase();
    return linkableEmployees.filter(e =>
      `${e.first_name} ${e.last_name}`.toLowerCase().includes(q) ||
      (e.email || '').toLowerCase().includes(q)
    );
  }, [linkableEmployees, linkSearch]);

  // ─── Table Columns ─────────────────────────────────────────────────────
  const columns = useMemo(() => [
    {
      key: 'name',
      label: 'User',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-bold text-foreground">{row.name}</span>
          <span className="text-[10px] text-muted-foreground">{row.email || 'No email'}</span>
        </div>
      )
    },
    {
      key: 'role',
      label: 'Role',
      render: (row) => (
        <Badge variant="secondary" className="capitalize text-[10px] font-bold">
          {(row.role || 'staff').replace(/_/g, ' ')}
        </Badge>
      )
    },
    {
      key: 'employee_id',
      label: 'Employee Link',
      render: (row) => row.employee_id ? (
        <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/30 cursor-pointer"
          onClick={(e) => { e.stopPropagation(); navigate(`/manager/hr/people/${row.employee_id}`); }}>
          <Link2 className="h-3 w-3 mr-1" /> {row.employee_id}
        </Badge>
      ) : (
        <span className="text-muted-foreground text-xs italic">Not linked</span>
      )
    },
    {
      key: 'last_login',
      label: 'Last Login',
      render: (row) => (
        <span className="text-xs text-muted-foreground">
          {row.last_login ? new Date(row.last_login).toLocaleDateString() : 'NEVER'}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => {
        const status = row.status === 'archived' || row.is_archived ? 'archived' :
          row.status === 'suspended' ? 'suspended' : 'active';
        const cfg = STATUS_CONFIG[status];
        const StatusIcon = cfg.icon;
        return (
          <Badge className={`${cfg.color} border capitalize text-[10px] flex items-center gap-1 w-fit`}>
            <StatusIcon className="h-3 w-3" /> {status}
          </Badge>
        );
      }
    },
    {
      key: 'actions',
      label: '',
      render: (row) => {
        const isArchived = row.status === 'archived' || row.is_archived;
        return (
          <div className="flex gap-1">
            <Button size="icon" aria-label="Action" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground"
              title="Manage Access" onClick={(e) => { e.stopPropagation(); navigate(`/manager/users/${row.id}/access`); }}>
              <Shield className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" aria-label="Action" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-amber-400"
              title="Reset PIN" onClick={(e) => { e.stopPropagation(); handleResetPin(row.id, row.name); }}>
              <Key className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" aria-label="Action" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-violet-400"
              title="Set Password" onClick={(e) => { e.stopPropagation(); openSetPasswordDialog(row); }}>
              <Lock className="h-3.5 w-3.5" />
            </Button>
            {row.employee_id ? (
              <Button size="icon" aria-label="Action" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-rose-400"
                title="Unlink Employee" onClick={(e) => { e.stopPropagation(); handleUnlinkEmployee(row.id); }}>
                <Unlink className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button size="icon" aria-label="Action" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-blue-400"
                title="Link Employee" onClick={(e) => { e.stopPropagation(); openLinkDialog(row.id); }}>
                <Link2 className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button size="icon" aria-label="Action" variant="ghost"
              className={`h-7 w-7 ${isArchived ? 'text-muted-foreground hover:text-emerald-400' : 'text-muted-foreground hover:text-rose-400'}`}
              title={isArchived ? 'Restore' : 'Archive'}
              onClick={(e) => { e.stopPropagation(); handleArchiveToggle(row.id, isArchived); }}>
              {isArchived ? <RotateCcw className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
            </Button>
          </div>
        );
      }
    }
  ], [activeVenueId]);

  // ═══ RENDER ═══════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#0A0A0B] p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-foreground uppercase tracking-tighter">User Accounts</h1>
            <p className="text-muted-foreground font-medium">
              {loading ? 'Loading...' : `${users.length} users in system`}
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate('/manager/access-control')} variant="outline"
              className="border-border text-muted-foreground hover:text-foreground text-xs font-bold uppercase tracking-widest h-10">
              <Shield className="w-4 h-4 mr-2" /> Roles & Permissions
            </Button>
            <Button onClick={() => setShowCreateDialog(true)}
              className="bg-blue-600 hover:bg-blue-500 text-foreground font-bold h-10 px-6 rounded-xl shadow-lg shadow-blue-500/20 text-xs uppercase tracking-widest">
              <Plus className="w-4 h-4 mr-2" /> Add User
            </Button>
          </div>
        </div>

        {/* Search + Status Tabs */}
        <div className="flex items-center gap-4 bg-card/40 p-2 rounded-2xl border border-border backdrop-blur-md">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input aria-label="Search by name, email, role..."
              placeholder="Search by name, email, role..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 bg-transparent border-border text-secondary-foreground placeholder:text-muted-foreground h-10"
            />
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
            <TabsList className="bg-transparent h-10 gap-1">
              <TabsTrigger value="all" className="rounded-lg data-[state=active]:bg-white/10 data-[state=active]:text-foreground text-xs font-bold">
                All ({statusCounts.all})
              </TabsTrigger>
              <TabsTrigger value="active" className="rounded-lg data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-400 text-xs font-bold">
                Active ({statusCounts.active})
              </TabsTrigger>
              <TabsTrigger value="archived" className="rounded-lg data-[state=active]:bg-zinc-500/10 data-[state=active]:text-secondary-foreground text-xs font-bold">
                Archived ({statusCounts.archived})
              </TabsTrigger>
              <TabsTrigger value="suspended" className="rounded-lg data-[state=active]:bg-rose-500/10 data-[state=active]:text-rose-400 text-xs font-bold">
                Suspended ({statusCounts.suspended})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Data Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={filteredUsers}
            loading={false}
            onRowClick={(row) => navigate(`/manager/users/${row.id}/access`)}
            emptyMessage={searchQuery ? "No users match your search" : "No users found"}
            enableRowSelection={true}
            tableId="user-accounts"
          />
        )}

        {/* ─── Create User Dialog ───────────────────────────────────────── */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="bg-card border-border max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-foreground flex items-center gap-2">
                <Plus className="h-5 w-5 text-blue-400" /> Create New User
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Add a new user account with POS access
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Name</Label>
                  <Input aria-label="Input field"
                    value={newUser.name}
                    onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                    className="bg-background border-border text-secondary-foreground"
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Email</Label>
                  <Input aria-label="Input field"
                    type="email"
                    value={newUser.email}
                    onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                    className="bg-background border-border text-secondary-foreground"
                    placeholder="john@restaurant.com"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Role</Label>
                  <Select aria-label="Select option" value={newUser.role} onValueChange={val => setNewUser({ ...newUser, role: val })}>
                    <SelectTrigger aria-label="Select option" className="bg-background border-border text-secondary-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {ROLES.map(role => (
                        <SelectItem key={role} value={role} className="capitalize">
                          {role.replace(/_/g, ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">4-Digit PIN</Label>
                  <Input aria-label="Input field"
                    type="password"
                    maxLength={4}
                    value={newUser.pin}
                    onChange={e => setNewUser({ ...newUser, pin: e.target.value.replace(/\D/g, '') })}
                    className="bg-background border-border text-secondary-foreground font-mono tracking-[0.5em]"
                    placeholder="••••"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" className="border-border text-muted-foreground" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
                <Button onClick={handleCreateUser} disabled={creating} className="bg-blue-600 hover:bg-blue-500 text-foreground font-bold">
                  {creating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...</> : 'Create User'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ─── Link Employee Dialog ─────────────────────────────────────── */}
        <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
          <DialogContent className="bg-card border-border max-w-lg max-h-[70vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-foreground flex items-center gap-2">
                <Link2 className="h-5 w-5 text-blue-400" /> Link Employee Record
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Select an unlinked employee to connect to this user account
              </DialogDescription>
            </DialogHeader>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input aria-label="Search employees..."
                placeholder="Search employees..."
                value={linkSearch}
                onChange={e => setLinkSearch(e.target.value)}
                className="pl-9 bg-background border-border text-secondary-foreground"
              />
            </div>
            <div className="flex-1 overflow-y-auto space-y-1 max-h-[40vh] pr-1">
              {loadingLinkable ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredLinkable.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  {linkableEmployees.length === 0 ? 'All employees are already linked' : 'No matches found'}
                </div>
              ) : (
                filteredLinkable.map((emp, i) => (
                  <button
                    key={i}
                    onClick={() => handleLinkEmployee(emp.id || emp.employee_code)}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-background border border-border hover:border-blue-500/30 hover:bg-blue-500/5 transition-all text-left group"
                  >
                    <div>
                      <p className="text-sm font-bold text-secondary-foreground group-hover:text-foreground">
                        {emp.first_name} {emp.last_name}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {emp.role || emp.occupation} • {emp.email || 'No email'}
                      </p>
                    </div>
                    <UserCheck className="h-4 w-4 text-foreground group-hover:text-blue-400 transition-colors" />
                  </button>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* ─── Set Password Dialog ─────────────────────────────────────── */}
        <Dialog open={showPwDialog} onOpenChange={setShowPwDialog}>
          <DialogContent className="bg-card border-border max-w-md">
            <DialogHeader>
              <DialogTitle className="text-foreground flex items-center gap-2">
                <Lock className="h-5 w-5 text-violet-400" /> Set Password
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Set an elevation password for <span className="text-secondary-foreground font-bold">{pwTargetUser?.name}</span>. This allows the user to access sensitive areas.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">New Password</Label>
                <div className="relative">
                  <Input aria-label="Input field"
                    type={pwShowValue ? 'text' : 'password'}
                    value={pwValue}
                    onChange={e => setPwValue(e.target.value)}
                    className="bg-background border-border text-secondary-foreground pr-10"
                    placeholder="Min. 6 characters"
                  />
                  <Button type="button" variant="ghost" size="icon" aria-label="Action"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={() => setPwShowValue(!pwShowValue)}>
                    {pwShowValue ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Confirm Password</Label>
                <Input aria-label="Input field"
                  type="password"
                  value={pwConfirmValue}
                  onChange={e => setPwConfirmValue(e.target.value)}
                  className="bg-background border-border text-secondary-foreground"
                  placeholder="••••••••"
                />
              </div>
              {pwValue && pwConfirmValue && pwValue !== pwConfirmValue && (
                <p className="text-xs text-rose-400 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> Passwords do not match
                </p>
              )}
              {pwValue && pwValue.length > 0 && pwValue.length < 6 && (
                <p className="text-xs text-amber-400 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> Must be at least 6 characters
                </p>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" className="border-border text-muted-foreground" onClick={() => setShowPwDialog(false)}>Cancel</Button>
                <Button onClick={handleAdminSetPassword}
                  disabled={pwSaving || !pwValue || pwValue.length < 6 || pwValue !== pwConfirmValue}
                  className="bg-violet-600 hover:bg-violet-500 text-foreground font-bold">
                  {pwSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Setting...</> : 'Set Password'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
