import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../../../layouts/PageContainer';
import { Card, CardContent } from '../../../components/ui/card';
import { Upload, FileText, AlertTriangle, CheckCircle } from 'lucide-react';

const MODULES = [
  { key: 'ocr', title: 'Invoice OCR', desc: 'AI-powered invoice scanning', icon: Upload, path: '/admin/ai-invoice/ocr', color: 'blue' },
  { key: 'variance', title: 'Variance Analysis', desc: 'Detect price & quantity differences', icon: AlertTriangle, path: '/admin/ai-invoice/variance', color: 'yellow' },
  { key: 'matching', title: 'PO Matching', desc: 'Match invoices to purchase orders', icon: CheckCircle, path: '/admin/ai-invoice/matching', color: 'green' },
  { key: 'list', title: 'Invoice List', desc: 'View all processed invoices', icon: FileText, path: '/admin/ai-invoice/list', color: 'purple' }
];

export default function AIInvoiceHub() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ total: 0, pending: 0, matched: 0, variance: 0 });

  useEffect(() => {
    setStats({ total: 45, pending: 8, matched: 32, variance: 5 });
  }, []);

  return (
    <PageContainer title="AI Invoice Processing" description="Automated invoice OCR, variance detection & PO matching">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-blue-500/50 bg-blue-900/20"><CardContent className="p-6"><p className="text-[10px] font-black uppercase tracking-widest text-blue-400/80 mb-1">Total Invoices</p><p className="text-3xl font-black text-white">{stats.total}</p></CardContent></Card>
          <Card className="border-yellow-500/50 bg-yellow-900/20"><CardContent className="p-6"><p className="text-[10px] font-black uppercase tracking-widest text-yellow-400/80 mb-1">Pending</p><p className="text-3xl font-black text-white">{stats.pending}</p></CardContent></Card>
          <Card className="border-green-500/50 bg-green-900/20"><CardContent className="p-6"><p className="text-[10px] font-black uppercase tracking-widest text-green-400/80 mb-1">Matched</p><p className="text-3xl font-black text-white">{stats.matched}</p></CardContent></Card>
          <Card className="border-red-500/50 bg-red-900/20"><CardContent className="p-6"><p className="text-[10px] font-black uppercase tracking-widest text-red-400/80 mb-1">Variances</p><p className="text-3xl font-black text-white">{stats.variance}</p></CardContent></Card>
        </div>
        <Card className="bg-zinc-950 border-white/5 shadow-2xl overflow-hidden">
          <CardContent className="p-6">
            <h3 className="text-sm font-black uppercase tracking-widest text-zinc-500 mb-6">AI Invoice Modules</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {MODULES.map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.key}
                    onClick={() => navigate(m.path)}
                    className="flex items-start gap-4 p-4 rounded-xl border border-white/5 bg-zinc-900 transition-all hover:bg-zinc-800 hover:border-blue-500/50 group text-left"
                  >
                    <div className="p-2 rounded-lg bg-zinc-950 border border-white/5 group-hover:border-blue-500/30">
                      <Icon className="h-6 w-6 text-blue-500" />
                    </div>
                    <div>
                      <p className="font-black text-white uppercase tracking-tight group-hover:text-blue-400 transition-colors">{m.title}</p>
                      <p className="text-xs font-medium text-zinc-500">{m.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
