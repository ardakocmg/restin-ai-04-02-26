import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import PermissionGate from '@/components/shared/PermissionGate';
import { useAuditLog } from '@/hooks/useAuditLog';

import PageContainer from '@/layouts/PageContainer';

import { Card, CardContent } from '@/components/ui/card';

import { Badge } from '@/components/ui/badge';

import { Plus, X, DollarSign } from 'lucide-react';

import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function SFMAccounting() {
  const { user, isManager, isOwner } = useAuth();
  const { logAction } = useAuditLog();
  const [view, setView] = useState('gl');
  const [accounts, setAccounts] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [vat, setVat] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ account_code: '', account_name: '', account_type: 'asset' });

  useEffect(() => {
    if (view === 'gl') fetchAccounts();
    else if (view === 'ledger') fetchLedger();
    else if (view === 'vat') fetchVAT();
  }, [view]);

  const fetchAccounts = async () => {
    try {
      const venueId = localStorage.getItem('currentVenueId');
      const response = await api.get(`/venues/${venueId}/accounting/gl-accounts`);
      setAccounts(response.data || []);
    } catch (error) {
      logger.error('Failed to fetch accounts:', error);
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchLedger = async () => {
    try {
      const venueId = localStorage.getItem('currentVenueId');
      const response = await api.get(`/venues/${venueId}/accounting/ledger-entries`);
      setLedger(response.data || []);
    } catch (error) {
      logger.error('Failed to fetch ledger:', error);
      setLedger([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchVAT = async () => {
    try {
      const venueId = localStorage.getItem('currentVenueId');
      const response = await api.get(`/venues/${venueId}/accounting/vat-returns`);
      setVat(response.data || []);
    } catch (error) {
      logger.error('Failed to fetch VAT:', error);
      setVat([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const venueId = localStorage.getItem('currentVenueId');
      await api.post(`/venues/${venueId}/accounting/gl-accounts`, formData);
      setShowModal(false);
      fetchAccounts();
    } catch (error) {
      logger.error('Failed to create account:', error);
    }
  };

  return (
    <PermissionGate requiredRole="OWNER">
      <PageContainer
        title="SFM Accounting Integration"
        description="GL, Ledger, VAT & Bank Reconciliation"
        actions={
          view === 'gl' && (
            <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-foreground rounded-lg hover:bg-blue-700">
              <Plus className="h-4 w-4" />
              New Account
            </button>
          )
        }
      >
        <div className="space-y-6">
          <div className="flex gap-2">
            <button onClick={() => setView('gl')} className={`px-4 py-2 rounded ${view === 'gl' ? 'bg-blue-600' : 'bg-slate-700'}`}>GL Accounts</button>
            <button onClick={() => setView('ledger')} className={`px-4 py-2 rounded ${view === 'ledger' ? 'bg-blue-600' : 'bg-slate-700'}`}>Ledger</button>
            <button onClick={() => setView('vat')} className={`px-4 py-2 rounded ${view === 'vat' ? 'bg-blue-600' : 'bg-slate-700'}`}>VAT Returns</button>
            <button onClick={() => setView('bank')} className={`px-4 py-2 rounded ${view === 'bank' ? 'bg-blue-600' : 'bg-slate-700'}`}>Bank Reconciliation</button>
          </div>

          {view === 'gl' && (
            <div className="space-y-4">
              {loading ? <Card><CardContent className="p-8 text-center">Loading...</CardContent></Card> : accounts.length === 0 ? <Card><CardContent className="p-8 text-center text-slate-400">{"No "}GL accounts</CardContent></Card> : accounts.map((acc) => (
                <Card key={acc.id} className="border-slate-700"><CardContent className="p-6"><div className="flex items-start justify-between"><div className="flex-1"><div className="flex items-center gap-3 mb-2"><DollarSign className="h-5 w-5 text-green-400" /><h3 className="text-lg font-semibold text-slate-50">{acc.account_name}</h3><Badge className="bg-blue-600/20 text-blue-100">{acc.account_code}</Badge></div><div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm"><div><p className="text-slate-400">Type</p><p className="font-medium">{acc.account_type}</p></div><div><p className="text-slate-400">Balance</p><p className="font-medium text-green-400">${acc.balance}</p></div><div><p className="text-slate-400">Status</p><p className="font-medium">{acc.active ? 'Active' : 'Inactive'}</p></div></div></div></div></CardContent></Card>
              ))}
            </div>
          )}

          {view === 'ledger' && (
            <div className="space-y-4">
              {loading ? <Card><CardContent className="p-8 text-center">Loading...</CardContent></Card> : ledger.length === 0 ? <Card><CardContent className="p-8 text-center text-slate-400">{"No "}ledger entries</CardContent></Card> : ledger.map((entry) => (
                <Card key={entry.id} className="border-slate-700"><CardContent className="p-6"><div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm"><div><p className="text-slate-400">Date</p><p className="font-medium">{new Date(entry.entry_date).toLocaleDateString()}</p></div><div><p className="text-slate-400">Account</p><p className="font-medium">{entry.account_code}</p></div><div><p className="text-slate-400">Debit</p><p className="font-medium text-red-400">${entry.debit}</p></div><div><p className="text-slate-400">Credit</p><p className="font-medium text-green-400">${entry.credit}</p></div><div><p className="text-slate-400">Source</p><p className="font-medium">{entry.source}</p></div></div></CardContent></Card>
              ))}
            </div>
          )}

          {view === 'vat' && (
            <div className="space-y-4">
              {loading ? <Card><CardContent className="p-8 text-center">Loading...</CardContent></Card> : vat.length === 0 ? <Card><CardContent className="p-8 text-center text-slate-400">{"No "}VAT returns</CardContent></Card> : vat.map((v) => (
                <Card key={v.id} className="border-slate-700"><CardContent className="p-6"><div className="flex items-start justify-between"><div className="flex-1"><h3 className="text-lg font-semibold text-slate-50 mb-3">{v.period_start} - {v.period_end}</h3><div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm"><div><p className="text-slate-400">Total Sales</p><p className="font-medium text-green-400">${v.total_sales}</p></div><div><p className="text-slate-400">VAT on Sales</p><p className="font-medium">${v.vat_on_sales}</p></div><div><p className="text-slate-400">Total Purchases</p><p className="font-medium">${v.total_purchases}</p></div><div><p className="text-slate-400">VAT Payable</p><p className="font-medium text-red-400">${v.vat_payable}</p></div></div></div></div></CardContent></Card>
              ))}
            </div>
          )}

          {view === 'bank' && (
            <Card><CardContent className="p-8 text-center text-slate-400">Bank reconciliation coming soon</CardContent></Card>
          )}
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl"><CardContent className="p-6"><div className="flex items-center justify-between mb-6"><h3 className="text-xl font-semibold">Create GL Account</h3><button onClick={() => setShowModal(false)}><X className="h-5 w-5" /></button></div><div className="space-y-4"><div><label className="block text-sm font-medium mb-1">Account Code</label><input type="text" value={formData.account_code} onChange={(e) = aria-label="Input field"> setFormData({ ...formData, account_code: e.target.value })} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded" placeholder="e.g., 1000" /></div><div><label className="block text-sm font-medium mb-1">Account Name</label><input type="text" value={formData.account_name} onChange={(e) = aria-label="Input field"> setFormData({ ...formData, account_name: e.target.value })} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded" placeholder="e.g., Cash" /></div><div><label className="block text-sm font-medium mb-1">Account Type</label><select value={formData.account_type} onChange={(e) = aria-label="Input field"> setFormData({ ...formData, account_type: e.target.value })} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded"><option value="asset">Asset</option><option value="liability">Liability</option><option value="equity">Equity</option><option value="revenue">Revenue</option><option value="expense">Expense</option></select></div><div className="flex gap-2 pt-4"><button onClick={handleCreate} className="flex-1 px-4 py-2 bg-blue-600 text-foreground rounded hover:bg-blue-700">Create Account</button><button onClick={() => setShowModal(false)} className="px-4 py-2 bg-slate-700 rounded hover:bg-slate-600">Cancel</button></div></div></CardContent></Card>
          </div>
        )}
      </PageContainer>
    </PermissionGate>
  );
}