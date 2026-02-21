import { AlertCircle,Award,FileCheck,ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card,CardContent } from '../../../components/ui/card';
import PageContainer from '../../../layouts/PageContainer';

const MODULES = [
  { title: 'Quality Audits', desc: 'HACCP & safety audits', icon: ShieldCheck, path: '/manager/quality/audits' },
  { title: 'Allergen Matrix', desc: 'Track allergens', icon: AlertCircle, path: '/manager/quality/allergens' },
  { title: 'Compliance', desc: 'Licenses & certificates', icon: FileCheck, path: '/manager/quality/compliance' },
  { title: 'Standards', desc: 'Quality standards', icon: Award, path: '/manager/quality/standards' }
];

export default function QualityHub() {
  const navigate = useNavigate();
  return (
    <PageContainer title="Quality & Compliance" description="HACCP, allergens & certifications">
      <Card><CardContent className="p-6"><div className="grid gap-4 md:grid-cols-2">{MODULES.map(m => { const Icon = m.icon; return (<button key={m.title} onClick={() => navigate(m.path)} className="flex items-start gap-4 p-4 rounded-lg border border-slate-700 hover:border-yellow-500 bg-slate-800"><Icon className="h-6 w-6 text-yellow-400" /><div><p className="font-semibold text-slate-50">{m.title}</p><p className="text-sm text-slate-400">{m.desc}</p></div></button>); })}</div></CardContent></Card>
    </PageContainer>
  );
}
