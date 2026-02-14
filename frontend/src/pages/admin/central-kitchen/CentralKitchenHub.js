import { useNavigate } from 'react-router-dom';
import PageContainer from '../../../layouts/PageContainer';
import { Card, CardContent } from '../../../components/ui/card';
import { Factory, Package, Truck, ClipboardList } from 'lucide-react';

const MODULES = [
  { title: 'Production Batches', desc: 'Manage production runs', icon: Factory, path: '/manager/central-kitchen/batches' },
  { title: 'Internal Orders', desc: 'Outlet requests', icon: ClipboardList, path: '/manager/central-kitchen/orders' },
  { title: 'Distribution', desc: 'Track deliveries', icon: Truck, path: '/manager/central-kitchen/distribution' },
  { title: 'Inventory Transfer', desc: 'Cross-location stock', icon: Package, path: '/manager/central-kitchen/transfer' }
];

export default function CentralKitchenHub() {
  const navigate = useNavigate();
  return (
    <PageContainer title="Central Kitchen" description="Production & distribution management">
      <Card><CardContent className="p-6"><div className="grid gap-4 md:grid-cols-2">{MODULES.map(m => { const Icon = m.icon; return (<button key={m.title} onClick={() => navigate(m.path)} className="flex items-start gap-4 p-4 rounded-lg border border-slate-700 hover:border-blue-500 bg-slate-800"><Icon className="h-6 w-6 text-purple-400" /><div><p className="font-semibold text-slate-50">{m.title}</p><p className="text-sm text-slate-400">{m.desc}</p></div></button>); })}</div></CardContent></Card>
    </PageContainer>
  );
}
