import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PermissionGate from '@/components/shared/PermissionGate';
import { useAuditLog } from '@/hooks/useAuditLog';
import { logger } from '@/lib/logger';
import { useAuth } from '@/context/AuthContext';
import PageContainer from '@/layouts/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  Calendar,
  Ban,
  TrendingUp,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Palmtree,
  Heart,
  User,
  CalendarDays,
  ListChecks,
  ShieldCheck,
  Send,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import api from '@/lib/api';
import { toast } from 'sonner';
import { useVenue } from '@/context/VenueContext';

export default function LeaveManagement() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('requests');
  const [balances, setBalances] = useState([]);
  const [blackouts, setBlackouts] = useState([]);
  const [rules, setRules] = useState([]);
  const [requests, setRequests] = useState([]);
  const [myBalances, setMyBalances] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [newRequest, setNewRequest] = useState({ type: 'vacation', start: '', end: '', notes: '' });
  const { activeVenue } = useVenue();
  useAuditLog('LEAVE_MANAGEMENT_VIEWED', { resource: 'leave-management' });

  const venueId = activeVenue?.id || localStorage.getItem('currentVenueId') || 'venue-caviar-bull';

  useEffect(() => {
    fetchData();
  }, [activeTab, venueId]);

  const fetchData = async () => {
    try {
      if (activeTab === 'balances') {
        const response = await api.get(`/venues/${venueId}/hr/leave/balance/emp_001`);
        setBalances(response.data || []);
      } else if (activeTab === 'blackouts') {
        const response = await api.get(`/venues/${venueId}/hr/leave/blackout-dates`);
        setBlackouts(response.data || []);
      } else if (activeTab === 'requests') {
        const response = await api.get(`/venues/${venueId}/hr/leave/requests`);
        setRequests(response.data || []);
      } else if (activeTab === 'my-leave') {
        const [balRes, reqRes] = await Promise.all([
          api.get(`/hr/leave/balances/1001`).catch(() => ({ data: [] })),
          api.get(`/hr/leave/requests?employee_code=1001`).catch(() => ({ data: [] })),
        ]);
        setMyBalances(balRes.data || []);
        setMyRequests(reqRes.data || []);
      } else {
        const response = await api.get(`/venues/${venueId}/hr/leave/accrual-rules`);
        setRules(response.data || []);
      }
    } catch (error) {
      logger.error('Failed to fetch leave data:', error);
    }
  };

  const handleAction = async (id, action) => {
    try {
      if (action === 'approve') {
        await api.post(`/venues/${venueId}/hr/leave/requests/${id}/approve`);
        toast.success('Leave request approved');
      } else {
        await api.post(`/venues/${venueId}/hr/leave/requests/${id}/reject`, { reason: 'Admin Action' });
        toast.success('Leave request rejected');
      }
      fetchData();
    } catch (e) {
      logger.error('Action failed', e);
      toast.error('Action failed');
    }
  };

  const handleSubmitRequest = async () => {
    try {
      await api.post(`/venues/${venueId}/hr/leave/requests`, {
        employee_code: '1001',
        leave_type: newRequest.type,
        start_date: newRequest.start,
        end_date: newRequest.end,
        notes: newRequest.notes,
      });
      toast.success('Leave request submitted!');
      setShowNewRequest(false);
      setNewRequest({ type: 'vacation', start: '', end: '', notes: '' });
      setActiveTab('my-leave');
      fetchData();
    } catch (e) {
      logger.error('Submit failed', e);
      toast.error('Failed to submit leave request');
    }
  };

  const tabs = [
    { id: 'requests', label: 'Requests', icon: ListChecks },
    { id: 'my-leave', label: 'My Leave', icon: User },
    { id: 'balances', label: 'Balances', icon: CalendarDays },
    { id: 'blackouts', label: 'Blackout Dates', icon: Ban },
    { id: 'rules', label: 'Accrual Rules', icon: TrendingUp },
  ];

  return (
    <PermissionGate requiredRole="MANAGER">
      <PageContainer title="Leave Management" description="Unified leave hub — requests, balances, blackouts & accrual rules">
        <div className="p-6 space-y-6 max-w-[1400px] mx-auto">

          {/* ─── Tab Bar ──────────────────────────────── */}
          <div className="flex gap-1 bg-zinc-950/50 p-1 rounded-xl border border-white/5 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap',
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                    : 'text-zinc-500 hover:text-white hover:bg-white/5'
                )}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* ─── REQUESTS TAB (Admin) ──────────────────── */}
          {activeTab === 'requests' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-white uppercase tracking-widest">Pending Leave Requests</h3>
                <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 uppercase text-[9px] font-black">{requests.filter(r => r.status === 'pending').length} pending</Badge>
              </div>
              {requests.length === 0 ? (
                <Card className="bg-zinc-900/50 border-white/5">
                  <CardContent className="p-12 text-center">
                    <ListChecks className="h-12 w-12 mx-auto mb-3 text-zinc-700" />
                    <p className="text-zinc-500 font-bold">No leave requests found</p>
                  </CardContent>
                </Card>
              ) : requests.map(r => (
                <Card key={r.id} className="bg-zinc-900/50 border-white/5 hover:border-indigo-500/20 transition-all">
                  <CardContent className="p-5 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                        {r.leave_type === 'sick' ? <Heart className="h-5 w-5 text-rose-400" /> : <Palmtree className="h-5 w-5 text-indigo-400" />}
                      </div>
                      <div>
                        <p className="text-sm font-black text-white">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (r.employee_id || r.employee_code) navigate(`/admin/hr/people/${r.employee_id || r.employee_code}`);
                            }}
                            className="hover:text-blue-400 transition-colors hover:underline decoration-blue-500/40 underline-offset-2"
                          >
                            {r.employee_name}
                          </button>
                          <span className="text-xs font-normal text-zinc-500 ml-2">{r.leave_type?.toUpperCase()}</span>
                        </p>
                        <p className="text-xs text-zinc-400">{r.start_date} → {r.end_date} • {r.days} Days</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={cn(
                        'uppercase text-[9px] font-black tracking-widest',
                        r.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                          r.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                            'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      )}>{r.status}</Badge>
                      {r.status === 'pending' && (
                        <div className="flex gap-1">
                          <Button size="sm" onClick={() => handleAction(r.id, 'approve')} className="bg-emerald-600 hover:bg-emerald-500 text-white text-[9px] font-black uppercase h-7 px-3">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleAction(r.id, 'reject')} className="border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-[9px] font-black uppercase h-7 px-3">
                            <XCircle className="h-3 w-3 mr-1" /> Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* ─── MY LEAVE TAB (Employee Self-Service) ──── */}
          {activeTab === 'my-leave' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-white uppercase tracking-widest">My Leave Overview</h3>
                <Button size="sm" onClick={() => setShowNewRequest(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest">
                  <Plus className="h-3 w-3 mr-1" /> New Request
                </Button>
              </div>

              {/* My Balances */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(myBalances.length > 0 ? myBalances : [
                  { type: 'Vacation', balance: 18, total: 25, used: 7 },
                  { type: 'Sick Leave', balance: 10, total: 10, used: 0 },
                  { type: 'Personal', balance: 3, total: 5, used: 2 },
                ]).map((b, idx) => (
                  <Card key={idx} className="bg-zinc-900/50 border-white/5">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-black text-zinc-400 uppercase tracking-widest">{b.type || b.leave_type}</span>
                        <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] font-black">{b.balance} days</Badge>
                      </div>
                      <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full transition-all"
                          style={{ width: `${Math.min(100, ((b.total - b.balance) / (b.total || 1)) * 100)}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-zinc-500 mt-2">{b.used} used of {b.total || b.accrued || 25}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* My Requests */}
              <Card className="bg-zinc-900/50 border-white/5">
                <CardHeader>
                  <CardTitle className="text-sm font-black text-white uppercase tracking-widest">My Recent Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  {myRequests.length > 0 ? (
                    <div className="space-y-2">
                      {myRequests.map((r, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                          <div className="flex items-center gap-3">
                            <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center',
                              r.status === 'approved' ? 'bg-emerald-500/10' : r.status === 'rejected' ? 'bg-rose-500/10' : 'bg-amber-500/10'
                            )}>
                              {r.status === 'approved' ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> :
                                r.status === 'rejected' ? <XCircle className="h-4 w-4 text-rose-400" /> :
                                  <Clock className="h-4 w-4 text-amber-400" />}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-white">{r.leave_type?.toUpperCase()}</p>
                              <p className="text-[10px] text-zinc-500">{r.start_date} → {r.end_date}</p>
                            </div>
                          </div>
                          <Badge className={cn(
                            'uppercase text-[8px] font-black',
                            r.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' :
                              r.status === 'rejected' ? 'bg-rose-500/10 text-rose-400' :
                                'bg-amber-500/10 text-amber-400'
                          )}>{r.status}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-zinc-500">
                      <Calendar className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm font-bold">No leave requests yet</p>
                      <p className="text-xs">Click 'New Request' to apply for leave</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ─── BALANCES TAB ──────────────────────────── */}
          {activeTab === 'balances' && (
            <div className="grid gap-4 md:grid-cols-3">
              {balances.length === 0 ? (
                <Card className="bg-zinc-900/50 border-white/5 md:col-span-3">
                  <CardContent className="p-12 text-center text-zinc-500">
                    <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="font-bold">No balance data available</p>
                  </CardContent>
                </Card>
              ) : balances.map(b => (
                <Card key={b.id} className="bg-zinc-900/50 border-white/5">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black text-zinc-300 uppercase tracking-widest">{b.leave_type}</span>
                      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-black text-[10px]">{b.balance} days</Badge>
                    </div>
                    <div className="text-xs text-zinc-500 space-y-1">
                      <p>Accrued: <span className="text-zinc-300 font-mono">{b.accrued}</span></p>
                      <p>Used: <span className="text-zinc-300 font-mono">{b.used}</span></p>
                      <p>Pending: <span className="text-amber-400 font-mono">{b.pending}</span></p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* ─── BLACKOUT DATES TAB ──────────────────── */}
          {activeTab === 'blackouts' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-white uppercase tracking-widest">Blackout Dates</h3>
                <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-400 hover:text-white text-[10px] font-black uppercase">
                  <Plus className="h-3 w-3 mr-1" /> Add Blackout
                </Button>
              </div>
              {blackouts.length === 0 ? (
                <Card className="bg-zinc-900/50 border-white/5">
                  <CardContent className="p-12 text-center text-zinc-500">
                    <Ban className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="font-bold">No blackout dates configured</p>
                  </CardContent>
                </Card>
              ) : blackouts.map(b => (
                <Card key={b.id} className="bg-zinc-900/50 border-white/5 hover:border-rose-500/20 transition-all">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-rose-500/10 flex items-center justify-center">
                      <Ban className="h-5 w-5 text-rose-400" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-white">{b.name}</p>
                      <p className="text-xs text-zinc-400">{b.start_date} → {b.end_date}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{b.reason}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* ─── ACCRUAL RULES TAB ──────────────────── */}
          {activeTab === 'rules' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-white uppercase tracking-widest">Accrual Rules</h3>
                <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-400 hover:text-white text-[10px] font-black uppercase">
                  <Plus className="h-3 w-3 mr-1" /> Add Rule
                </Button>
              </div>
              {rules.length === 0 ? (
                <Card className="bg-zinc-900/50 border-white/5">
                  <CardContent className="p-12 text-center text-zinc-500">
                    <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="font-bold">No accrual rules configured</p>
                  </CardContent>
                </Card>
              ) : rules.map(r => (
                <Card key={r.id} className="bg-zinc-900/50 border-white/5 hover:border-emerald-500/20 transition-all">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-white">{r.leave_type} — <span className="text-zinc-400 font-normal">{r.accrual_method}</span></p>
                      <p className="text-xs text-zinc-400">Rate: {r.accrual_rate} days • Max: {r.max_balance || 'Unlimited'}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* ─── New Leave Request Dialog ──────────────── */}
          <Dialog open={showNewRequest} onOpenChange={setShowNewRequest}>
            <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
              <DialogHeader>
                <DialogTitle className="text-white flex items-center gap-2">
                  <Send className="h-5 w-5 text-indigo-400" /> Apply for Leave
                </DialogTitle>
                <DialogDescription className="text-zinc-500">
                  Submit a leave request for approval
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">Leave Type</label>
                  <select
                    value={newRequest.type}
                    onChange={e => setNewRequest(p => ({ ...p, type: e.target.value }))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  >
                    <option value="vacation">Vacation Leave</option>
                    <option value="sick">Sick Leave</option>
                    <option value="personal">Personal Leave</option>
                    <option value="parental">Parental Leave</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">Start Date</label>
                    <Input
                      type="date"
                      value={newRequest.start}
                      onChange={e => setNewRequest(p => ({ ...p, start: e.target.value }))}
                      className="bg-zinc-950 border-zinc-800 text-zinc-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">End Date</label>
                    <Input
                      type="date"
                      value={newRequest.end}
                      onChange={e => setNewRequest(p => ({ ...p, end: e.target.value }))}
                      className="bg-zinc-950 border-zinc-800 text-zinc-200"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">Notes</label>
                  <textarea
                    rows={3}
                    value={newRequest.notes}
                    onChange={e => setNewRequest(p => ({ ...p, notes: e.target.value }))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
                    placeholder="Optional notes..."
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 border-zinc-700 text-zinc-400" onClick={() => setShowNewRequest(false)}>Cancel</Button>
                  <Button className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-black" onClick={handleSubmitRequest}>Submit Request</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </PageContainer>
    </PermissionGate>
  );
}