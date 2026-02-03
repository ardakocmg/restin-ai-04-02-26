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
      } else {
        const response = await api.get(`/venues/${venueId}/hr/leave/accrual-rules`);
        setRules(response.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch:', error);
    }
  };

  return (
    <PageContainer title="Advanced Leave Management" description="Accrual rules, blackout dates & balances">
      <div className="space-y-6">
        <div className="flex gap-2">
          <button onClick={() => setView('balances')} className={`px-4 py-2 rounded ${view === 'balances' ? 'bg-blue-600' : 'bg-slate-700'}`}>Balances</button>
          <button onClick={() => setView('blackouts')} className={`px-4 py-2 rounded ${view === 'blackouts' ? 'bg-blue-600' : 'bg-slate-700'}`}>Blackout Dates</button>
          <button onClick={() => setView('rules')} className={`px-4 py-2 rounded ${view === 'rules' ? 'bg-blue-600' : 'bg-slate-700'}`}>Accrual Rules</button>
        </div>

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
