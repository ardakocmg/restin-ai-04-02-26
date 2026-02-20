import { useNavigate } from 'react-router-dom';
import PageContainer from '../../../layouts/PageContainer';
import { Card, CardContent } from '../../../components/ui/card';
import { TrendingUp, BarChart, Calendar, Settings } from 'lucide-react';

const MODULES = [
  { title: 'Demand Dashboard', desc: 'View forecasts & predictions', icon: TrendingUp, path: '/manager/forecasting/dashboard' },
  { title: 'Forecast Models', desc: 'Configure forecasting methods', icon: BarChart, path: '/manager/forecasting/models' },
  { title: 'Seasonal Patterns', desc: 'Detect seasonality', icon: Calendar, path: '/manager/forecasting/seasonal' },
  { title: 'Settings', desc: 'AI & algorithm config', icon: Settings, path: '/manager/forecasting/settings' }
];

export default function ForecastingHub() {
  const navigate = useNavigate();
  return (
    <PageContainer title="Demand Forecasting" description="AI-powered demand predictions">
      <Card><CardContent className="p-6"><div className="grid gap-4 md:grid-cols-2">{MODULES.map(m => { const Icon = m.icon; return (<button key={m.title} onClick={() => navigate(m.path)} className="flex items-start gap-4 p-4 rounded-lg border border-slate-700 hover:border-blue-500 bg-slate-800"><Icon className="h-6 w-6 text-blue-400" /><div><p className="font-semibold text-slate-50">{m.title}</p><p className="text-sm text-slate-400">{m.desc}</p></div></button>); })}</div></CardContent></Card>
    </PageContainer>
  );
}
