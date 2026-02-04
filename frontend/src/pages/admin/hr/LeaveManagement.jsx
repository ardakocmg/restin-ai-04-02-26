import { useState, useEffect } from 'react';
import PageContainer from '../../../layouts/PageContainer';
import { Card, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Calendar, Ban, TrendingUp, Plus } from 'lucide-react';
import api from '@/lib/api';

export default function LeaveManagement() {
  const [view, setView] = useState('balances');
  const [balances, setBalances] = useState([]);
  const [blackouts, setBlackouts] = useState([]);
  const [rules, setRules] = useState([]);

  const [requests, setRequests] = useState([]);

  useEffect(() => {
    fetchData();
  }, [view]);

  const fetchData = async () => {
    const venueId = localStorage.getItem('currentVenueId') || 'venue-caviar-bull';
    try {
      if (!venueId) {
        console.warn('Venue ID not found, using default');
      }
      if (view === 'balances') {
        const response = await api.get(`/venues/${venueId}/hr/leave/balance/emp_001`);
        setBalances(response.data || []);
      } else if (view === 'blackouts') {
        const response = await api.get(`/venues/${venueId}/hr/leave/blackout-dates`);
        setBlackouts(response.data || []);
      } else if (view === 'requests') {
        const response = await api.get(`/venues/${venueId}/hr/leave/requests`);
        setRequests(response.data || []);
      } else {
        const response = await api.get(`/venues/${venueId}/hr/leave/accrual-rules`);
        setRules(response.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch:', error);
    }
  };

  const handleAction = async (id, action) => {
    const venueId = localStorage.getItem('currentVenueId') || 'venue-caviar-bull';
    try {
      if (action === 'approve') {
        await api.post(`/venues/${venueId}/hr/leave/requests/${id}/approve`);
      } else {
        await api.post(`/venues/${venueId}/hr/leave/requests/${id}/reject`, { reason: 'Admin Action' });
      }
      fetchData(); // Refresh
    } catch (e) {
      console.error("Action failed", e);
    }
  };

  return (
    <PageContainer title="Advanced Leave Management" description="Accrual rules, blackout dates & balances">
      <div className="space-y-6">
        <div className="flex gap-2">
          <button onClick={() => setView('requests')} className={`px-4 py-2 rounded ${view === 'requests' ? 'bg-blue-600' : 'bg-slate-700'}`}>Requests</button>
          <button onClick={() => setView('balances')} className={`px-4 py-2 rounded ${view === 'balances' ? 'bg-blue-600' : 'bg-slate-700'}`}>Balances</button>
          <button onClick={() => setView('blackouts')} className={`px-4 py-2 rounded ${view === 'blackouts' ? 'bg-blue-600' : 'bg-slate-700'}`}>Blackout Dates</button>
          <button onClick={() => setView('rules')} className={`px-4 py-2 rounded ${view === 'rules' ? 'bg-blue-600' : 'bg-slate-700'}`}>Accrual Rules</button>
        </div>

        {view === 'requests' && (
          <div className="space-y-4">
            {requests.length === 0 ? <Card><CardContent className="p-6 text-center text-slate-400">No leave requests found</CardContent></Card> : requests.map(r => (
              <Card key={r.id} className="border-l-4 border-l-blue-500">
                <CardContent className="p-6 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-lg">{r.employee_name} <span className="text-sm font-normal text-slate-400">({r.leave_type})</span></p>
                    <p className="text-sm text-slate-300">{r.start_date} to {r.end_date} • {r.days} Days</p>
                    <p className="text-xs text-slate-500 mt-1 uppercase tracking-wide">{r.status}</p>
                  </div>
                  {r.status === 'pending' && (
                    <div className="flex gap-2">
                      <button onClick={() => handleAction(r.id, 'approve')} className="px-3 py-1 bg-green-600 text-xs rounded hover:bg-green-500">Approve</button>
                      <button onClick={() => handleAction(r.id, 'reject')} className="px-3 py-1 bg-red-600 text-xs rounded hover:bg-red-500">Reject</button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {view === 'balances' && (
          <div className="grid gap-4 md:grid-cols-3">
            {balances.length === 0 ? <Card><CardContent className="p-6 text-center text-slate-400">No balance data</CardContent></Card> : balances.map(b => (
              <Card key={b.id}><CardContent className="p-6"><div className="flex items-center justify-between mb-2"><span className="font-medium">{b.leave_type}</span><Badge className="bg-green-600/20 text-green-100">{b.balance} days</Badge></div><div className="text-sm text-slate-400"><p>Accrued: {b.accrued}</p><p>Used: {b.used}</p><p>Pending: {b.pending}</p></div></CardContent></Card>
            ))}
          </div>
        )}

        {view === 'blackouts' && (
          <div className="space-y-4">
            {blackouts.length === 0 ? <Card><CardContent className="p-6 text-center text-slate-400">No blackout dates</CardContent></Card> : blackouts.map(b => (
              <Card key={b.id}><CardContent className="p-6"><div className="flex items-center gap-3"><Ban className="h-5 w-5 text-red-400" /><div><p className="font-medium">{b.name}</p><p className="text-sm text-slate-400">{b.start_date} to {b.end_date}</p><p className="text-sm text-slate-400">{b.reason}</p></div></div></CardContent></Card>
            ))}
          </div>
        )}

        {view === 'rules' && (
          <div className="space-y-4">
            {rules.length === 0 ? <Card><CardContent className="p-6 text-center text-slate-400">No accrual rules</CardContent></Card> : rules.map(r => (
              <Card key={r.id}><CardContent className="p-6"><div className="flex items-center gap-3"><TrendingUp className="h-5 w-5 text-green-400" /><div><p className="font-medium">{r.leave_type} - {r.accrual_method}</p><p className="text-sm text-slate-400">Rate: {r.accrual_rate} days, Max: {r.max_balance || 'Unlimited'}</p></div></div></CardContent></Card>
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
