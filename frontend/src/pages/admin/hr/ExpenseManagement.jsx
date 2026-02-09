import { useState, useEffect } from 'react';import { logger } from '@/lib/logger';

import PageContainer from '@/layouts/PageContainer';import { logger } from '@/lib/logger';

import { Card, CardContent } from '@/components/ui/card';import { logger } from '@/lib/logger';

import { Badge } from '@/components/ui/badge';import { logger } from '@/lib/logger';

import { Receipt, Plus } from 'lucide-react';import { logger } from '@/lib/logger';

import api from '@/lib/api';

import { logger } from '@/lib/logger';
export default function ExpenseManagementIndigo() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClaims();
  }, []);

  const fetchClaims = async () => {
    try {
      const venueId = localStorage.getItem('currentVenueId');
      const response = await api.get(`/venues/${venueId}/hr/expense/claims`);
      setClaims(response.data || []);
    } catch (error) {
      logger.error('Failed to fetch claims:', error);
      setClaims([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = { draft: 'bg-gray-600/20 text-gray-100', submitted: 'bg-blue-600/20 text-blue-100', approved: 'bg-green-600/20 text-green-100', rejected: 'bg-red-600/20 text-red-100', reimbursed: 'bg-green-600/20 text-green-100' };
    return colors[status] || 'bg-gray-600/20 text-gray-100';
  };

  return (
    <PageContainer title="Expense Management" description="Claims, receipts & approvals" actions={<button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Plus className="h-4 w-4" />New Claim</button>}>
      <div className="space-y-4">
        {loading ? <Card><CardContent className="p-8 text-center">Loading...</CardContent></Card> : claims.length === 0 ? <Card><CardContent className="p-8 text-center text-slate-400">No expense claims</CardContent></Card> : claims.map((claim) => (
          <Card key={claim.id} className="border-slate-700"><CardContent className="p-6"><div className="flex items-start justify-between"><div className="flex-1"><div className="flex items-center gap-3 mb-2"><Receipt className="h-5 w-5 text-blue-400" /><h3 className="text-lg font-semibold text-slate-50">{claim.claim_number}</h3><Badge className={getStatusColor(claim.status)}>{claim.status}</Badge></div><p className="text-sm text-slate-400 mb-3">{claim.employee_name} - {claim.category_name}</p><div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm"><div><p className="text-slate-400">Amount</p><p className="font-medium text-green-400">${claim.amount}</p></div><div><p className="text-slate-400">Date</p><p className="font-medium">{new Date(claim.expense_date).toLocaleDateString()}</p></div><div><p className="text-slate-400">Receipt</p><p className="font-medium">{claim.receipt ? 'Attached' : 'None'}</p></div></div></div></div></CardContent></Card>
        ))}
      </div>
    </PageContainer>
  );
}
