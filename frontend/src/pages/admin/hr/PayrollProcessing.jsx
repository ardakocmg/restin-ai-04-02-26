import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

import PageContainer from '../../../layouts/PageContainer';

import { Card, CardContent } from '../../../components/ui/card';

import { Badge } from '../../../components/ui/badge';

import { Wallet, Download, Send } from 'lucide-react';

import api from '@/lib/api';

export default function PayrollProcessing() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRuns();
  }, []);

  const fetchRuns = async () => {
    try {
      const venueId = localStorage.getItem('currentVenueId');
      const response = await api.get(`/venues/${venueId}/hr/payroll/runs`);
      setRuns(response.data || []);
    } catch (error) {
      logger.error('Failed to fetch payroll runs:', error);
      setRuns([]);
    } finally {
      setLoading(false);
    }
  };

  const getStateColor = (state) => {
    const colors = { draft: 'bg-gray-600/20 text-gray-100', validated: 'bg-blue-600/20 text-blue-100', approved: 'bg-green-600/20 text-green-100', locked: 'bg-purple-600/20 text-purple-100', dispatched: 'bg-green-600/20 text-green-100' };
    return colors[state] || 'bg-gray-600/20 text-gray-100';
  };

  return (
    <PageContainer title="Advanced Payroll Processing" description="Payroll runs, payslips & dispatch">
      <div className="space-y-4">
        {loading ? <Card><CardContent className="p-8 text-center">Loading...</CardContent></Card> : runs.length === 0 ? <Card><CardContent className="p-8 text-center text-slate-400">No payroll runs</CardContent></Card> : runs.map((run) => (
          <Card key={run.id} className="border-slate-700"><CardContent className="p-6"><div className="flex items-start justify-between"><div className="flex-1"><div className="flex items-center gap-3 mb-2"><Wallet className="h-5 w-5 text-green-400" /><h3 className="text-lg font-semibold text-slate-50">{run.run_name}</h3><Badge className={getStateColor(run.state)}>{run.state}</Badge></div><p className="text-sm text-slate-400 mb-3">{run.period_start} - {run.period_end}</p><div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm"><div><p className="text-slate-400">Employees</p><p className="font-medium">{run.employee_count}</p></div><div><p className="text-slate-400">Total Gross</p><p className="font-medium text-green-400">${run.total_gross}</p></div><div><p className="text-slate-400">Total Net</p><p className="font-medium text-blue-400">${run.total_net}</p></div><div><p className="text-slate-400">Total Tax</p><p className="font-medium text-red-400">${run.total_tax}</p></div></div></div><div className="flex gap-2">{run.state === 'approved' && <button className="p-2 hover:bg-slate-700 rounded"><Download className="h-4 w-4" /></button>}{run.state === 'locked' && <button className="p-2 hover:bg-slate-700 rounded"><Send className="h-4 w-4" /></button>}</div></div></CardContent></Card>
        ))}
      </div>
    </PageContainer>
  );
}